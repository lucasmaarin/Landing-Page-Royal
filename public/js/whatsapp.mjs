export const WHATSAPP_NUMBER = '5511914910400';

const SERVICE_LABELS = {
    site: 'Sites',
    app: 'Aplicativos',
    automacao: 'Automações e agentes de IA'
};

export function criarWhatsAppUrl(mensagem, numero = WHATSAPP_NUMBER) {
    return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

export function abrirWhatsApp(mensagem) {
    const popup = globalThis.open(
        criarWhatsAppUrl(mensagem),
        '_blank',
        'noopener,noreferrer'
    );

    if (popup) popup.opener = null;
}

export function resumirRespostas(respostas, perguntas) {
    return perguntas.map((pergunta) => {
        const answer = respostas[pergunta.id];
        const answerIds = Array.isArray(answer) ? answer : [answer];
        const options = pergunta.options || pergunta.opcoes || [];
        const labels = answerIds
            .map((id) => options.find((option) => option.id === id)?.label)
            .filter(Boolean);

        return `${pergunta.shortLabel || pergunta.title || pergunta.titulo}: ${labels.join(', ')}`;
    });
}

export function criarMensagemQuiz({ respostas, resultado, perguntas }) {
    const linhas = resumirRespostas(respostas, perguntas);
    const principal = SERVICE_LABELS[resultado.perfil] || resultado.perfil;
    const secundaria = resultado.perfilSecundario
        ? SERVICE_LABELS[resultado.perfilSecundario] || resultado.perfilSecundario
        : null;

    return [
        'Olá! Respondi ao quiz da Royal e quero conversar sobre minha recomendação.',
        '',
        `Solução indicada: ${principal}.`,
        secundaria && resultado.hibrido ? `Também combina com: ${secundaria}.` : null,
        '',
        'Resumo das respostas:',
        ...linhas.map((linha) => `- ${linha}`),
        '',
        'Origem: quiz'
    ].filter(Boolean).join('\n');
}

export function mensagemServico(servico, modelo = 'diagnostico') {
    if (servico === 'geral') {
        return 'Olá! Quero conversar com a Royal para entender se meu próximo passo é um site, aplicativo ou automação.';
    }

    const servicos = {
        site: 'um site focado em conversão',
        app: 'um aplicativo web ou mobile',
        automacao: 'automações e agentes de IA'
    };

    if (modelo === 'parceria' || modelo === 'parceria_estrategica') {
        return `Olá! Quero avaliar uma parceria estratégica com a Royal para desenvolver ${servicos[servico] || 'uma solução digital'}.`;
    }

    return `Olá! Quero solicitar um diagnóstico para desenvolver ${servicos[servico] || 'uma solução digital'} com a Royal.`;
}
