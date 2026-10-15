import { PERGUNTAS, QUIZ_CONFIG } from './quiz-config.mjs';
import { calcularResultado } from './quiz-engine.mjs';
import {
    carregarEstadoQuiz,
    estadoInicialQuiz,
    limparEstadoQuiz,
    salvarEstadoQuiz
} from './quiz-storage.mjs';
import { getLeadEndpoint, submitLead } from './lead-adapter.mjs';
import { track } from './tracking.mjs';
import {
    abrirWhatsApp,
    criarMensagemQuiz,
    mensagemServico
} from './whatsapp.mjs';

const quizRoot = document.querySelector('#quiz-root');
const quizRegion = document.querySelector('#quiz');
const quizHero = document.querySelector('.quiz-hero');
const liveRegion = document.querySelector('#quiz-live');
const reducedMotion = globalThis.matchMedia('(prefers-reduced-motion: reduce)');
const CHECK_ICON = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m5 12 4 4L19 6"></path>
    </svg>`;

let state = carregarEstadoQuiz();
let advanceTimer = null;
let lastTrackedResult = null;

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function announce(message) {
    if (!liveRegion) return;
    liveRegion.textContent = '';
    requestAnimationFrame(() => {
        liveRegion.textContent = message;
    });
}

function scrollToQuiz() {
    quizRegion?.scrollIntoView({
        behavior: reducedMotion.matches ? 'auto' : 'smooth',
        block: 'start'
    });
}

function persist() {
    salvarEstadoQuiz(state);
}

function setHeroCollapsed(collapsed) {
    quizHero?.classList.toggle('is-collapsed', collapsed);
}

function renderIntro() {
    clearTimeout(advanceTimer);
    setHeroCollapsed(false);
    const hasProgress = Object.keys(state.answers).length > 0;

    quizRoot.innerHTML = `
        <div class="quiz-intro quiz-stage">
            <span class="quiz-intro-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 3 4 7v5c0 4.6 3.4 7.6 8 9 4.6-1.4 8-4.4 8-9V7l-8-4Z"></path>
                    <path d="m9 12 2 2 4-4"></path>
                </svg>
            </span>
            <h2>Uma recomendação baseada no seu momento</h2>
            <p>São 7 perguntas objetivas. Você vê o resultado antes de informar qualquer dado de contato.</p>
            <button class="button button-primary" type="button" data-start-inside>
                ${hasProgress ? 'Continuar de onde parei' : 'Começar agora'} <span class="arrow" aria-hidden="true">→</span>
            </button>
        </div>`;

    quizRoot.querySelector('[data-start-inside]')?.addEventListener('click', startQuiz);
}

function startQuiz() {
    const firstStart = !state.startedAt;
    state = {
        ...state,
        status: 'questions',
        currentStep: Math.min(state.currentStep || 0, PERGUNTAS.length - 1),
        startedAt: state.startedAt || new Date().toISOString()
    };
    persist();

    if (firstStart) {
        track('quiz_start', {
            total_steps: PERGUNTAS.length
        });
    }

    renderQuestion();
    scrollToQuiz();
}

function selectedIds(question) {
    const answer = state.answers[question.id];
    if (question.tipo === 'multipla') {
        return Array.isArray(answer) ? answer : [];
    }
    return answer ? [answer] : [];
}

function optionTemplate(question, option, index) {
    const selected = selectedIds(question).includes(option.id);
    const type = question.tipo === 'multipla' ? 'checkbox' : 'radio';

    return `
        <label class="quiz-option">
            <input
                type="${type}"
                name="${escapeHtml(question.id)}"
                value="${escapeHtml(option.id)}"
                ${selected ? 'checked' : ''}
            >
            <span class="option-index" aria-hidden="true">${String.fromCharCode(65 + index)}</span>
            <span>${escapeHtml(option.label)}</span>
            <span class="option-check" aria-hidden="true">${CHECK_ICON}</span>
        </label>`;
}

function renderQuestion() {
    clearTimeout(advanceTimer);
    setHeroCollapsed(true);
    const question = PERGUNTAS[state.currentStep];
    const step = state.currentStep + 1;
    const progress = Math.round((step / PERGUNTAS.length) * 100);
    const hasSelection = selectedIds(question).length > 0;

    quizRoot.innerHTML = `
        <div class="quiz-stage">
            <div class="quiz-progress-header">
                <span>Pergunta ${step} de ${PERGUNTAS.length}</span>
                <span>${progress}% concluído</span>
            </div>
            <div class="quiz-progress-track" role="progressbar" aria-label="Progresso do quiz" aria-valuemin="1" aria-valuemax="${PERGUNTAS.length}" aria-valuenow="${step}" aria-valuetext="Pergunta ${step} de ${PERGUNTAS.length}">
                <div class="quiz-progress-value" style="width: ${progress}%"></div>
            </div>

            <fieldset class="quiz-question">
                <legend tabindex="-1">${escapeHtml(question.titulo)}</legend>
                <span class="quiz-question-hint">${escapeHtml(question.instrucao || 'Escolha a opção que mais se aproxima do seu momento.')}</span>
                <div class="quiz-options">
                    ${question.opcoes.map((option, index) => optionTemplate(question, option, index)).join('')}
                </div>
            </fieldset>

            <p class="quiz-error" role="alert" aria-live="assertive"></p>
            <div class="quiz-controls">
                <button class="button button-ghost" type="button" data-back>← Voltar</button>
                ${question.tipo === 'multipla' ? `
                    <button class="button button-primary" type="button" data-continue ${hasSelection ? '' : 'disabled'}>
                        Continuar <span class="arrow" aria-hidden="true">→</span>
                    </button>` : '<span aria-hidden="true"></span>'}
            </div>
        </div>`;

    const legend = quizRoot.querySelector('legend');
    requestAnimationFrame(() => legend?.focus({ preventScroll: true }));
    announce(`Pergunta ${step} de ${PERGUNTAS.length}: ${question.titulo}`);

    quizRoot.querySelector('[data-back]')?.addEventListener('click', goBack);
    quizRoot.querySelector('[data-continue]')?.addEventListener('click', () => confirmAnswer(question));

    quizRoot.querySelectorAll('input').forEach((input) => {
        input.addEventListener('change', () => handleOptionChange(question, input));
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                input.click();
            }
        });
    });
}

function handleOptionChange(question, input) {
    const error = quizRoot.querySelector('.quiz-error');
    if (error) error.textContent = '';

    if (question.tipo === 'multipla') {
        const exclusiveId = question.opcaoExclusiva;
        const inputs = [...quizRoot.querySelectorAll('input[type="checkbox"]')];

        if (input.value === exclusiveId && input.checked) {
            inputs.forEach((candidate) => {
                if (candidate !== input) candidate.checked = false;
            });
        } else if (input.checked) {
            const exclusive = inputs.find((candidate) => candidate.value === exclusiveId);
            if (exclusive) exclusive.checked = false;
        }

        const values = inputs.filter((candidate) => candidate.checked).map((candidate) => candidate.value);
        state.answers[question.id] = values;
        persist();

        const continueButton = quizRoot.querySelector('[data-continue]');
        if (continueButton) continueButton.disabled = values.length === 0;
        announce(values.length ? `${values.length} opção ou opções selecionadas.` : 'Nenhuma opção selecionada.');
        return;
    }

    state.answers[question.id] = input.value;
    persist();
    announce('Opção selecionada. Avançando.');

    quizRoot.querySelectorAll('input').forEach((candidate) => {
        candidate.disabled = true;
    });

    advanceTimer = setTimeout(
        () => confirmAnswer(question),
        reducedMotion.matches ? 0 : 250
    );
}

function confirmAnswer(question) {
    const answer = state.answers[question.id];
    const values = Array.isArray(answer) ? answer : [answer].filter(Boolean);

    if (!values.length) {
        const error = quizRoot.querySelector('.quiz-error');
        if (error) error.textContent = 'Selecione pelo menos uma opção para continuar.';
        quizRoot.querySelector('input')?.focus();
        return;
    }

    track('quiz_step', {
        question_id: question.id,
        step: state.currentStep + 1,
        option_ids: values
    });

    if (state.currentStep < PERGUNTAS.length - 1) {
        state.currentStep += 1;
        persist();
        renderQuestion();
        return;
    }

    completeQuiz();
}

function goBack() {
    clearTimeout(advanceTimer);

    if (state.currentStep === 0) {
        state.status = 'intro';
        persist();
        renderIntro();
        announce('Você voltou ao início do quiz.');
        return;
    }

    state.currentStep -= 1;
    persist();
    renderQuestion();
}

function collectReasons(result) {
    const candidates = [];

    for (const question of PERGUNTAS.filter((item) => item.pontua !== false)) {
        const answer = state.answers[question.id];
        const ids = Array.isArray(answer) ? answer : [answer];

        for (const id of ids) {
            const option = question.opcoes.find((item) => item.id === id);
            if (!option) continue;

            candidates.push({
                insight: option.insight,
                primaryWeight: option.pesos?.[result.perfil] || 0,
                totalWeight: Object.values(option.pesos || {}).reduce((sum, value) => sum + value, 0),
                order: question.ordem
            });
        }
    }

    candidates.sort((a, b) => (
        b.primaryWeight - a.primaryWeight
        || b.totalWeight - a.totalWeight
        || a.order - b.order
    ));

    const unique = [];
    for (const item of candidates) {
        if (!unique.includes(item.insight)) unique.push(item.insight);
        if (unique.length === 3) break;
    }

    return unique;
}

function completeQuiz() {
    const result = calcularResultado(state.answers);
    state = {
        ...state,
        status: 'result',
        currentStep: PERGUNTAS.length - 1,
        result,
        completedAt: new Date().toISOString()
    };
    persist();

    track('quiz_complete', {
        perfil: result.perfil,
        perfil_secundario: result.perfilSecundario,
        tipo: result.tipo,
        pontuacoes: result.pontuacoes,
        modelo: result.preferenciaModelo
    });

    renderResult();
}

function modelRecommendation(preference) {
    const messages = {
        escopo_fechado: '<strong>Formato indicado: Modelo Comum.</strong> Você prefere escopo, prazo e investimento definidos antes do início.',
        parceria_estrategica: '<strong>Formato indicado: Parceria Estratégica.</strong> A oportunidade pode ser avaliada para uma construção de longo prazo.',
        ainda_nao_sei: '<strong>Formato em aberto.</strong> Na próxima página, você poderá comparar os dois caminhos sem compromisso.'
    };
    return messages[preference] || messages.ainda_nao_sei;
}

function renderLeadPanel(result) {
    if (!getLeadEndpoint()) return '';

    return `
        <aside class="lead-panel" aria-labelledby="lead-title">
            <h3 id="lead-title">Quer receber este diagnóstico?</h3>
            <p>Opcional. Seu resultado já está liberado acima.</p>
            <form class="lead-form" data-lead-form novalidate>
                <div class="field">
                    <label for="lead-name">Nome</label>
                    <input id="lead-name" name="name" autocomplete="name" required placeholder="Como podemos chamar você?">
                </div>
                <div class="field">
                    <label for="lead-phone">WhatsApp</label>
                    <input id="lead-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="(11) 99999-9999">
                </div>
                <button class="button button-secondary" type="submit">Receber diagnóstico</button>
            </form>
            <p class="form-status" data-form-status role="status" aria-live="polite"></p>
        </aside>`;
}

function renderResult() {
    setHeroCollapsed(true);
    const result = state.result || calcularResultado(state.answers);
    state.result = result;
    persist();
    const secondary = result.perfilSecundario
        ? QUIZ_CONFIG.servicos[result.perfilSecundario]
        : null;
    const reasons = collectReasons(result);

    quizRoot.innerHTML = `
        <div class="result-view quiz-stage">
            <div class="result-top">
                <span class="result-mark" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m12 3 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 3Z"></path>
                    </svg>
                </span>
                <span class="pill-badge">Melhor encaixe para você</span>
                <h2 class="result-title" tabindex="-1">${escapeHtml(result.textoResultado.titulo)}</h2>
                <p class="result-copy">${escapeHtml(result.textoResultado.descricao)}</p>
                ${secondary ? `<p class="result-secondary"><strong>Também combina com:</strong> ${escapeHtml(secondary.nome)}. As duas frentes podem ser planejadas em etapas.</p>` : ''}
            </div>

            <h3>Por que recomendamos</h3>
            <ul class="result-reasons">
                ${reasons.map((reason) => `<li><span class="check-icon" aria-hidden="true">${CHECK_ICON}</span><span>${escapeHtml(reason)}</span></li>`).join('')}
            </ul>

            <p class="result-model">${modelRecommendation(result.preferenciaModelo)}</p>
            <p class="result-disclaimer">Recomendação baseada nas suas respostas, não um diagnóstico definitivo.</p>

            <div class="result-actions">
                <a class="button button-primary" href="${escapeHtml(result.destino)}" data-result-lp>
                    Ver a solução ideal <span class="arrow" aria-hidden="true">→</span>
                </a>
                <button class="button button-secondary" type="button" data-result-whatsapp>Chamar no WhatsApp</button>
                <button class="button button-text" type="button" data-restart>Refazer quiz</button>
            </div>

            ${renderLeadPanel(result)}
        </div>`;

    const title = quizRoot.querySelector('.result-title');
    requestAnimationFrame(() => title?.focus({ preventScroll: true }));
    announce(`Resultado: ${result.textoResultado.titulo}`);

    if (lastTrackedResult !== state.completedAt) {
        track('result_view', {
            perfil: result.perfil,
            perfil_secundario: result.perfilSecundario,
            tipo: result.tipo,
            modelo: result.preferenciaModelo
        });
        lastTrackedResult = state.completedAt;
    }

    quizRoot.querySelector('[data-result-lp]')?.addEventListener('click', () => {
        track('cta_click_lp', {
            perfil: result.perfil,
            destino: result.destino,
            origem: 'quiz_result'
        });
    });

    quizRoot.querySelector('[data-result-whatsapp]')?.addEventListener('click', () => {
        track('cta_click_whatsapp', {
            perfil: result.perfil,
            origem: 'quiz_result'
        });
        abrirWhatsApp(criarMensagemQuiz({
            respostas: state.answers,
            resultado: result,
            perguntas: PERGUNTAS
        }));
    });

    quizRoot.querySelector('[data-restart]')?.addEventListener('click', restartQuiz);
    quizRoot.querySelector('[data-lead-form]')?.addEventListener('submit', (event) => submitLeadForm(event, result));
}

async function submitLeadForm(event, result) {
    event.preventDefault();
    const form = event.currentTarget;
    const status = quizRoot.querySelector('[data-form-status]');

    if (!form.reportValidity()) return;

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    status.classList.remove('is-success');
    status.textContent = 'Enviando seus dados…';

    const formData = new FormData(form);

    try {
        await submitLead({
            name: String(formData.get('name') || '').trim(),
            whatsapp: String(formData.get('phone') || '').trim(),
            source: 'quiz_result',
            profile: result.perfil,
            secondaryProfile: result.perfilSecundario,
            modelPreference: result.preferenciaModelo,
            answers: result.resumoRespostas
        });
        status.classList.add('is-success');
        status.textContent = 'Recebemos seus dados. A Royal entrará em contato.';
        form.reset();
    } catch {
        status.textContent = 'Não foi possível enviar agora. Use o botão do WhatsApp acima.';
    } finally {
        submitButton.disabled = false;
    }
}

function restartQuiz() {
    clearTimeout(advanceTimer);
    limparEstadoQuiz();
    state = estadoInicialQuiz();
    lastTrackedResult = null;
    renderIntro();
    scrollToQuiz();
    announce('Quiz reiniciado.');
}

function initializeHeader() {
    document.querySelectorAll('[data-current-year]').forEach((element) => {
        element.textContent = String(new Date().getFullYear());
    });

    document.querySelectorAll('[data-start-quiz]').forEach((button) => {
        button.addEventListener('click', startQuiz);
    });

    document.querySelector('[data-quick-whatsapp]')?.addEventListener('click', (event) => {
        event.preventDefault();
        track('cta_click_whatsapp', {
            origem: 'quiz_header',
            location: event.currentTarget.dataset.location
        });
        abrirWhatsApp(mensagemServico('geral'));
    });

    document.querySelectorAll('[data-track-lp]').forEach((element) => {
        element.addEventListener('click', () => {
            track('cta_click_lp', {
                service: element.dataset.trackLp,
                origem: 'quiz_home'
            });
        });
    });

    const serviceMenu = document.querySelector('.nav-services');
    document.addEventListener('click', (event) => {
        if (serviceMenu?.open && !serviceMenu.contains(event.target)) {
            serviceMenu.removeAttribute('open');
        }
    });
}

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    const serviceMenu = document.querySelector('.nav-services');
    if (serviceMenu?.open) {
        serviceMenu.removeAttribute('open');
        serviceMenu.querySelector('summary')?.focus();
        return;
    }

    if (state.status === 'questions') goBack();
});

initializeHeader();

if (state.status === 'result') {
    try {
        state.result = calcularResultado(state.answers);
        renderResult();
    } catch {
        limparEstadoQuiz();
        state = estadoInicialQuiz();
        renderIntro();
    }
} else if (state.status === 'questions') {
    renderQuestion();
} else {
    renderIntro();
}
