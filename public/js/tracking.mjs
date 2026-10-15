const EVENTOS_PERMITIDOS = new Set([
    'quiz_start',
    'quiz_step',
    'quiz_complete',
    'result_view',
    'cta_click_whatsapp',
    'cta_click_lp',
    'cta_click_parceria'
]);

export function track(evento, dados = {}) {
    if (!EVENTOS_PERMITIDOS.has(evento)) {
        throw new Error(`Evento de tracking desconhecido: ${evento}`);
    }

    const payload = {
        event: evento,
        ...dados
    };

    if (Array.isArray(globalThis.dataLayer)) {
        globalThis.dataLayer.push(payload);
    }

    if (typeof globalThis.fbq === 'function') {
        globalThis.fbq('trackCustom', evento, dados);
    }

    return payload;
}
