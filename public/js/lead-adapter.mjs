export function getLeadEndpoint() {
    const endpoint = globalThis.__ROYAL_CONFIG__?.leadEndpoint;
    return typeof endpoint === 'string' ? endpoint.trim() : '';
}

export async function submitLead(payload, { signal } = {}) {
    const endpoint = getLeadEndpoint();

    // TODO: configurar ROYAL_LEAD_ENDPOINT no ambiente de deploy.
    if (!endpoint) {
        return {
            ok: false,
            skipped: true,
            reason: 'not_configured'
        };
    }

    let parsedEndpoint;
    try {
        parsedEndpoint = new URL(endpoint, globalThis.location?.origin);
    } catch {
        throw new Error('ROYAL_LEAD_ENDPOINT possui formato inválido.');
    }

    if (!['http:', 'https:'].includes(parsedEndpoint.protocol)) {
        throw new Error('ROYAL_LEAD_ENDPOINT deve usar HTTP ou HTTPS.');
    }

    const response = await fetch(parsedEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal
    });

    if (!response.ok) {
        throw new Error(`Não foi possível enviar o lead (HTTP ${response.status}).`);
    }

    return {
        ok: true,
        skipped: false,
        status: response.status
    };
}
