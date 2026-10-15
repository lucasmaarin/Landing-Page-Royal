export const QUIZ_STORAGE_KEY = 'royal:recommendation-quiz:v1';
export const QUIZ_STORAGE_VERSION = 1;

const STATUS_VALIDOS = new Set(['intro', 'questions', 'result']);

export function estadoInicialQuiz() {
    return {
        version: QUIZ_STORAGE_VERSION,
        status: 'intro',
        currentStep: 0,
        answers: {},
        result: null,
        startedAt: null,
        completedAt: null
    };
}

function estadoValido(value) {
    return Boolean(
        value
        && value.version === QUIZ_STORAGE_VERSION
        && STATUS_VALIDOS.has(value.status)
        && Number.isInteger(value.currentStep)
        && value.currentStep >= 0
        && value.currentStep <= 6
        && value.answers
        && typeof value.answers === 'object'
        && !Array.isArray(value.answers)
    );
}

export function carregarEstadoQuiz(storage = globalThis.sessionStorage) {
    try {
        const raw = storage?.getItem(QUIZ_STORAGE_KEY);
        if (!raw) return estadoInicialQuiz();

        const parsed = JSON.parse(raw);
        return estadoValido(parsed) ? parsed : estadoInicialQuiz();
    } catch {
        return estadoInicialQuiz();
    }
}

export function salvarEstadoQuiz(state, storage = globalThis.sessionStorage) {
    if (!estadoValido(state)) {
        throw new TypeError('Estado do quiz inválido.');
    }

    try {
        storage?.setItem(QUIZ_STORAGE_KEY, JSON.stringify(state));
    } catch {
        // sessionStorage pode estar indisponível em modo privado; o fluxo continua em memória.
    }

    return state;
}

export function limparEstadoQuiz(storage = globalThis.sessionStorage) {
    try {
        storage?.removeItem(QUIZ_STORAGE_KEY);
    } catch {
        // Falha de persistência não deve bloquear o usuário.
    }
}
