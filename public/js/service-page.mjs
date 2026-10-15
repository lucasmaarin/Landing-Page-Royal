import { track } from './tracking.mjs';
import { carregarEstadoQuiz } from './quiz-storage.mjs';
import { abrirWhatsApp, criarMensagemQuiz, mensagemServico } from './whatsapp.mjs';
import { PERGUNTAS } from './quiz-config.mjs';

const service = document.body.dataset.service;
const params = new URLSearchParams(globalThis.location.search);
const fromQuiz = params.get('origem') === 'quiz';
const requestedProfile = params.get('perfil');
const quizState = carregarEstadoQuiz();

document.querySelectorAll('[data-current-year]').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
});

if (fromQuiz && requestedProfile === service) {
    const note = document.querySelector('[data-personalized]');
    note?.classList.add('is-visible');
}

function setFeaturedModel(preference) {
    const cards = [...document.querySelectorAll('.model-card[data-model]')];
    if (!cards.length) return;

    if (preference === 'escopo_fechado') {
        cards.forEach((card) => {
            const selected = card.dataset.model === preference;
            card.classList.toggle('is-featured', selected);
            card.querySelector('[data-model-badge]')?.replaceChildren(
                selected ? 'Modelo Comum · Recomendado' : 'Parceria Estratégica'
            );
        });
        return;
    }

    if (preference === 'parceria_estrategica') {
        cards.forEach((card) => {
            const selected = card.dataset.model === preference;
            card.classList.toggle('is-featured', selected);
            card.querySelector('[data-model-badge]')?.replaceChildren(
                selected
                    ? (service === 'app' ? 'Mais Popular · Recomendado' : 'Parceria Estratégica · Recomendado')
                    : 'Modelo Comum'
            );
        });
        return;
    }

    if (preference === 'ainda_nao_sei') {
        cards.forEach((card) => {
            card.classList.remove('is-featured');
            card.querySelector('[data-model-badge]')?.replaceChildren(
                card.dataset.model === 'parceria_estrategica' ? 'Parceria Estratégica' : 'Modelo Comum'
            );
        });
    }
}

if (fromQuiz && quizState.answers?.q7) {
    setFeaturedModel(quizState.answers.q7);
}

function getWhatsAppMessage(model) {
    if (fromQuiz && quizState.result && Object.keys(quizState.answers || {}).length === PERGUNTAS.length) {
        return criarMensagemQuiz({
            respostas: quizState.answers,
            resultado: quizState.result,
            perguntas: PERGUNTAS
        });
    }

    return mensagemServico(service, model);
}

document.querySelectorAll('[data-whatsapp]').forEach((element) => {
    element.addEventListener('click', (event) => {
        event.preventDefault();
        const model = element.dataset.model || 'diagnostico';
        const eventName = model === 'parceria_estrategica' ? 'cta_click_parceria' : 'cta_click_whatsapp';

        track(eventName, {
            service,
            location: element.dataset.location || 'page',
            origem: fromQuiz ? 'quiz' : 'direto'
        });

        abrirWhatsApp(getWhatsAppMessage(model));
    });
});

document.querySelectorAll('[data-track="cta_click_lp"]').forEach((element) => {
    element.addEventListener('click', () => {
        track('cta_click_lp', {
            service: element.dataset.profile,
            origem: 'service_navigation'
        });
    });
});

const serviceMenu = document.querySelector('.nav-services');

document.addEventListener('click', (event) => {
    if (serviceMenu?.open && !serviceMenu.contains(event.target)) {
        serviceMenu.removeAttribute('open');
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && serviceMenu?.open) {
        serviceMenu.removeAttribute('open');
        serviceMenu.querySelector('summary')?.focus();
    }
});
