import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const port = process.env.ROYAL_QA_CDP_PORT || '9225';
const origin = process.env.ROYAL_QA_ORIGIN || 'http://127.0.0.1:4173';
const outputDirectory = await mkdtemp(join(tmpdir(), 'royal-browser-qa-'));
await mkdir(outputDirectory, { recursive: true });

const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => {
    if (!response.ok) throw new Error(`CDP indisponível: HTTP ${response.status}`);
    return response.json();
});

const target = targets.find((item) => item.type === 'page');
if (!target?.webSocketDebuggerUrl) throw new Error('Nenhuma aba do Chrome disponível para QA.');

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const eventWaiters = new Map();
const browserErrors = [];
let commandId = 0;

socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(String(data));

    if (message.id) {
        const handler = pending.get(message.id);
        if (!handler) return;
        pending.delete(message.id);
        if (message.error) handler.reject(new Error(message.error.message));
        else handler.resolve(message.result);
        return;
    }

    const waiters = eventWaiters.get(message.method) || [];
    for (const waiter of [...waiters]) {
        if (!waiter.predicate(message.params)) continue;
        clearTimeout(waiter.timer);
        eventWaiters.set(message.method, waiters.filter((item) => item !== waiter));
        waiter.resolve(message.params);
    }

    if (message.method === 'Runtime.exceptionThrown') {
        browserErrors.push(message.params.exceptionDetails?.text || 'Exceção sem descrição');
    }
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
        browserErrors.push(message.params.entry.text);
    }
});

await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
});

function send(method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = ++commandId;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
    });
}

function waitForEvent(method, predicate = () => true, timeoutMs = 10_000) {
    return new Promise((resolve, reject) => {
        const waiter = {
            predicate,
            resolve,
            timer: setTimeout(() => {
                const waiters = eventWaiters.get(method) || [];
                eventWaiters.set(method, waiters.filter((item) => item !== waiter));
                reject(new Error(`Tempo excedido aguardando ${method}.`));
            }, timeoutMs)
        };
        eventWaiters.set(method, [...(eventWaiters.get(method) || []), waiter]);
    });
}

async function evaluate(expression) {
    const response = await send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
        userGesture: true
    });

    if (response.exceptionDetails) {
        throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    }
    return response.result.value;
}

async function waitFor(expression, description, timeoutMs = 5_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await evaluate(`Boolean(${expression})`)) return;
        await new Promise((resolve) => setTimeout(resolve, 40));
    }
    throw new Error(`Tempo excedido aguardando ${description}.`);
}

async function setViewport(width, height) {
    await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 768,
        screenWidth: width,
        screenHeight: height
    });
    await evaluate(`new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
}

async function navigate(path) {
    const loaded = waitForEvent('Page.loadEventFired');
    await send('Page.navigate', { url: `${origin}${path}` });
    await loaded;
    await waitFor('document.readyState === "complete"', `carregamento de ${path}`);
}

async function reload() {
    const loaded = waitForEvent('Page.loadEventFired');
    await send('Page.reload', { ignoreCache: true });
    await loaded;
    await waitFor('document.readyState === "complete"', 'recarregamento da página');
}

async function click(selector) {
    const encoded = JSON.stringify(selector);
    const count = await evaluate(`document.querySelectorAll(${encoded}).length`);
    if (count !== 1) throw new Error(`Seletor ${selector} retornou ${count} elementos.`);
    await evaluate(`document.querySelector(${encoded}).click()`);
}

async function pressKey(key, code, windowsVirtualKeyCode) {
    const params = { key, code, windowsVirtualKeyCode, nativeVirtualKeyCode: windowsVirtualKeyCode };
    await send('Input.dispatchKeyEvent', { type: 'keyDown', ...params });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...params });
}

async function screenshot(name) {
    await evaluate(`document.fonts?.ready || Promise.resolve()`);
    await waitFor(`document.getAnimations().every((animation) => animation.playState !== 'running')`, 'fim das transições visuais', 2_000);
    await evaluate(`new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
    const response = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
        fromSurface: true
    });
    const destination = join(outputDirectory, `${name}.png`);
    await writeFile(destination, Buffer.from(response.data, 'base64'));
    return destination;
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

await Promise.all([
    send('Page.enable'),
    send('Runtime.enable'),
    send('Log.enable'),
    send('Network.enable')
]);

const report = { screenshots: [], checks: [] };

for (const viewport of [
    { width: 1440, height: 1000, name: 'home-1440' },
    { width: 768, height: 900, name: 'home-768' },
    { width: 375, height: 812, name: 'home-375' },
    { width: 812, height: 375, name: 'home-landscape' }
]) {
    await setViewport(viewport.width, viewport.height);
    await navigate('/');
    await evaluate('sessionStorage.clear()');
    await reload();
    const metrics = await evaluate(`({
        width: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        title: document.title,
        quizVisible: Boolean(document.querySelector('#quiz-root'))
    })`);
    assert(metrics.width === viewport.width, `Viewport inesperado em ${viewport.name}.`);
    assert(metrics.scrollWidth <= metrics.width, `Scroll horizontal em ${viewport.name}.`);
    assert(metrics.quizVisible, `Quiz ausente em ${viewport.name}.`);

    if (viewport.name === 'home-375') {
        const accessibility = await evaluate(`({
            h1Count: document.querySelectorAll('h1').length,
            imagesWithoutAlt: [...document.images].filter((image) => !image.hasAttribute('alt')).length,
            unnamedControls: [...document.querySelectorAll('a[href], button, summary')]
                .filter((element) => element.getClientRects().length)
                .filter((element) => !element.getAttribute('aria-label') && !element.textContent.trim() && !element.querySelector('img[alt]'))
                .length,
            smallTargets: [...document.querySelectorAll('a[href], button, summary')]
                .filter((element) => element.getClientRects().length)
                .map((element) => ({ element, rect: element.getBoundingClientRect() }))
                .filter(({ rect }) => rect.width < 44 || rect.height < 44)
                .map(({ element, rect }) => ({ tag: element.tagName, text: element.textContent.trim(), width: rect.width, height: rect.height }))
        })`);
        assert(accessibility.h1Count === 1, 'A home precisa ter exatamente um H1.');
        assert(accessibility.imagesWithoutAlt === 0, 'Há imagens sem atributo alt na home.');
        assert(accessibility.unnamedControls === 0, 'Há controles sem nome acessível na home.');
        assert(accessibility.smallTargets.length === 0, `Alvos menores que 44px: ${JSON.stringify(accessibility.smallTargets)}`);
        report.checks.push('home mobile: nomes acessíveis e alvos de toque ≥ 44px');
    }

    report.screenshots.push(await screenshot(viewport.name));
    report.checks.push(`${viewport.name}: sem scroll horizontal`);
}

await setViewport(375, 812);
await navigate('/');
await evaluate(`document.documentElement.style.fontSize = '200%'`);
assert(!(await evaluate('document.documentElement.scrollWidth > window.innerWidth')), 'A página tem scroll horizontal com texto a 200%.');
const textZoomOverflow = await evaluate(`[...document.querySelectorAll('body *')]
    .filter((element) => element.getClientRects().length)
    .map((element) => ({ element, rect: element.getBoundingClientRect() }))
    .filter(({ rect }) => rect.width > 0 && (rect.left < -1 || rect.right > window.innerWidth + 1))
    .map(({ element, rect }) => ({
        tag: element.tagName.toLowerCase(),
        className: element.className || '',
        left: Math.round(rect.left),
        right: Math.round(rect.right)
    }))
    .slice(0, 8)`);
assert(textZoomOverflow.length === 0, `Elementos cortados com texto a 200%: ${JSON.stringify(textZoomOverflow)}`);
report.screenshots.push(await screenshot('home-375-text-200'));
report.checks.push('texto a 200%: sem scroll horizontal');

await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
});
await navigate('/');
const motionState = await evaluate(`({
    matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    duration: getComputedStyle(document.querySelector('.button')).transitionDuration
})`);
assert(motionState.matches, 'A preferência por movimento reduzido não foi emulada.');
assert(motionState.duration === '0.001s', 'As transições não foram reduzidas pela media query.');
report.checks.push('prefers-reduced-motion: respeitado');
await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }]
});

await setViewport(1440, 1000);
await navigate('/');
await evaluate('sessionStorage.clear()');
await reload();
await click('[data-start-quiz]');
await waitFor(`document.querySelector('input[value="poucos_clientes_confianca"]')`, 'pergunta 1');
await setViewport(375, 812);
assert(!(await evaluate('document.documentElement.scrollWidth > window.innerWidth')), 'A pergunta do quiz tem scroll horizontal no mobile.');
const optionTargets = await evaluate(`[...document.querySelectorAll('.quiz-option')]
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width < 44 || rect.height < 44).length`);
assert(optionTargets === 0, 'Há opções do quiz menores que 44px no mobile.');
report.screenshots.push(await screenshot('quiz-question-375'));
report.checks.push('pergunta mobile: sem scroll horizontal');
await setViewport(1440, 1000);

await evaluate(`document.querySelector('input[value="poucos_clientes_confianca"]').focus()`);
await pressKey('ArrowDown', 'ArrowDown', 40);
await waitFor(`document.querySelector('input[value="mais_contatos_vendas"]')`, 'pergunta 2');
await pressKey('Escape', 'Escape', 27);
await waitFor(`document.querySelector('input[value="poucos_clientes_confianca"]')`, 'retorno à pergunta 1');
await waitFor(`document.activeElement?.tagName === 'LEGEND'`, 'foco no título da pergunta 1');
await evaluate(`document.querySelector('input[value="poucos_clientes_confianca"]').focus()`);
await pressKey('Enter', 'Enter', 13);
await waitFor(`document.querySelector('input[value="mais_contatos_vendas"]')`, 'pergunta 2 após Enter');
report.checks.push('teclado: setas, Enter e Escape/Voltar');
await click('input[value="mais_contatos_vendas"]');
await waitFor(`document.querySelector('input[value="indicacao_instagram_sem_site"]')`, 'pergunta 3');

const savedStep = await evaluate('JSON.parse(sessionStorage.getItem("royal:recommendation-quiz:v1")).currentStep');
assert(savedStep === 2, 'A etapa atual não foi persistida no sessionStorage.');
await reload();
await waitFor(`document.querySelector('input[value="indicacao_instagram_sem_site"]')`, 'retomada da pergunta 3');
report.checks.push('sessionStorage: retomada na pergunta 3');

await click('input[value="whatsapp_manual"]');
await waitFor(`document.querySelector('input[value="visitantes"]')`, 'pergunta 4');
await click('input[value="visitantes"]');
await waitFor(`document.querySelector('input[value="whatsapp"]')`, 'pergunta 5');
await click('input[value="whatsapp"]');
await click('input[value="crm"]');
await click('input[value="planilhas"]');
await click('input[value="formularios_email"]');
await click('[data-continue]');
await waitFor(`document.querySelector('input[value="rodando_crescer_online"]')`, 'pergunta 6');
await click('input[value="rodando_crescer_online"]');
await waitFor(`document.querySelector('input[value="parceria_estrategica"]')`, 'pergunta 7');
await click('input[value="parceria_estrategica"]');
await waitFor('document.querySelector(".result-view")', 'resultado do quiz');

const result = await evaluate(`({
    title: document.querySelector('.result-title')?.textContent.trim(),
    reasonCount: document.querySelectorAll('.result-reasons li').length,
    secondary: document.querySelector('.result-secondary')?.textContent.trim() || '',
    href: document.querySelector('[data-result-lp]')?.getAttribute('href') || '',
    active: document.activeElement?.className || ''
})`);
assert(result.title === 'Seu próximo passo: um site que vende por você', 'Resultado de site incorreto.');
assert(result.reasonCount === 3, 'O resultado não exibiu três justificativas.');
assert(result.secondary.includes('Automações'), 'O resultado híbrido não exibiu a solução secundária.');
assert(result.href === '/sites?origem=quiz&perfil=site', 'Destino do resultado incorreto.');
assert(result.active.includes('result-title'), 'Foco não foi enviado ao título do resultado.');
report.screenshots.push(await screenshot('quiz-result-site-1440'));
await setViewport(375, 812);
assert(!(await evaluate('document.documentElement.scrollWidth > window.innerWidth')), 'O resultado do quiz tem scroll horizontal no mobile.');
report.screenshots.push(await screenshot('quiz-result-site-375'));
await setViewport(1440, 1000);
report.checks.push('quiz completo: site + híbrido + 3 justificativas');

const loadedService = waitForEvent('Page.loadEventFired');
await click('[data-result-lp]');
await loadedService;
await waitFor('document.readyState === "complete"', 'LP de sites');
await waitFor('document.querySelector("[data-personalized]")?.classList.contains("is-visible")', 'linha personalizada da LP');

const serviceState = await evaluate(`({
    path: location.pathname,
    query: location.search,
    personalized: document.querySelector('[data-personalized]')?.textContent.trim(),
    highlighted: document.querySelector('.model-card.is-featured')?.dataset.model || '',
    overflow: document.documentElement.scrollWidth > window.innerWidth
})`);
assert(serviceState.path.startsWith('/sites'), 'A navegação não chegou à LP de sites.');
assert(serviceState.query.includes('origem=quiz') && serviceState.query.includes('perfil=site'), 'Query da LP perdeu a origem/perfil.');
assert(serviceState.personalized.includes('presença digital'), 'Linha personalizada da LP não corresponde ao perfil.');
assert(serviceState.highlighted === 'parceria_estrategica', 'Preferência por parceria não foi destacada.');
assert(!serviceState.overflow, 'A LP de sites tem scroll horizontal.');
report.screenshots.push(await screenshot('sites-personalized-1440'));
report.checks.push('quiz → /sites: query, personalização e modelo recomendado');

for (const route of ['/apps/', '/automacoes/']) {
    await navigate(route);
    const page = await evaluate(`({
        title: document.title,
        h1: document.querySelector('h1')?.textContent.replace(/\\s+/g, ' ').trim(),
        cards: document.querySelectorAll('.feature-card').length,
        models: document.querySelectorAll('.model-card').length,
        stats: document.querySelectorAll('.stat-card').length,
        overflow: document.documentElement.scrollWidth > window.innerWidth
    })`);
    assert(page.title && page.h1, `Metadados ou H1 ausentes em ${route}.`);
    assert(page.cards === 6, `A rota ${route} não tem seis cards.`);
    assert(page.models === 2, `A rota ${route} não tem dois modelos.`);
    assert(page.stats === 3, `A rota ${route} não tem três stats.`);
    assert(!page.overflow, `A rota ${route} tem scroll horizontal.`);
    report.checks.push(`${route}: esqueleto completo e sem overflow`);
}

assert(browserErrors.length === 0, `Erros no browser: ${browserErrors.join(' | ')}`);
report.checks.push('console: sem exceções JavaScript');
report.outputDirectory = outputDirectory;

console.log(JSON.stringify(report, null, 2));
socket.close();
