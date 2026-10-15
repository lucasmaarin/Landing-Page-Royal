import { QUIZ_CONFIG } from './quiz-config.mjs';

export class QuizValidationError extends TypeError {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'QuizValidationError';
        this.code = code;
        this.details = { ...details };
    }
}

const ehObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);

const criarPlacarVazio = (idsServicos) => Object.fromEntries(
    idsServicos.map((id) => [id, 0])
);

const obterOpcao = (pergunta, idOpcao) => pergunta.opcoes.find((opcao) => opcao.id === idOpcao);

function validarConfiguracao(configuracao) {
    if (!ehObjeto(configuracao) || !ehObjeto(configuracao.servicos) || !Array.isArray(configuracao.perguntas)) {
        throw new TypeError('A configuração do quiz é inválida.');
    }

    const idsServicos = Object.keys(configuracao.servicos);
    if (idsServicos.length < 2) {
        throw new TypeError('A configuração precisa declarar pelo menos dois serviços.');
    }

    if (!Number.isFinite(configuracao.limiarHibrido)
        || configuracao.limiarHibrido < 0
        || configuracao.limiarHibrido > 1) {
        throw new TypeError('O limiar híbrido deve estar entre 0 e 1.');
    }

    return idsServicos;
}

function normalizarEValidarRespostas(respostas, configuracao) {
    if (!ehObjeto(respostas)) {
        throw new QuizValidationError(
            'As respostas devem ser informadas em um objeto.',
            'RESPOSTAS_INVALIDAS'
        );
    }

    const idsPerguntas = new Set(configuracao.perguntas.map((pergunta) => pergunta.id));
    const idsDesconhecidos = Object.keys(respostas).filter((id) => !idsPerguntas.has(id));

    if (idsDesconhecidos.length > 0) {
        throw new QuizValidationError(
            `Foram recebidas respostas para perguntas desconhecidas: ${idsDesconhecidos.join(', ')}.`,
            'PERGUNTA_DESCONHECIDA',
            { idsPerguntas: idsDesconhecidos }
        );
    }

    const respostasNormalizadas = {};

    for (const pergunta of configuracao.perguntas) {
        const possuiResposta = Object.prototype.hasOwnProperty.call(respostas, pergunta.id);

        if (!possuiResposta) {
            if (pergunta.obrigatoria !== false) {
                throw new QuizValidationError(
                    `A pergunta ${pergunta.id} precisa ser respondida.`,
                    'RESPOSTA_AUSENTE',
                    { idPergunta: pergunta.id }
                );
            }

            continue;
        }

        const resposta = respostas[pergunta.id];

        if (pergunta.tipo === 'multipla') {
            if (!Array.isArray(resposta) || resposta.length === 0) {
                throw new QuizValidationError(
                    `A resposta de ${pergunta.id} deve ser uma lista não vazia.`,
                    'FORMATO_RESPOSTA_INVALIDO',
                    { idPergunta: pergunta.id, tipoEsperado: 'multipla' }
                );
            }

            if (resposta.some((idOpcao) => typeof idOpcao !== 'string')) {
                throw new QuizValidationError(
                    `Todas as opções de ${pergunta.id} devem ser identificadores de texto.`,
                    'FORMATO_RESPOSTA_INVALIDO',
                    { idPergunta: pergunta.id, tipoEsperado: 'multipla' }
                );
            }

            const idsUnicos = [...new Set(resposta)];
            if (idsUnicos.length !== resposta.length) {
                throw new QuizValidationError(
                    `A resposta de ${pergunta.id} contém opções duplicadas.`,
                    'OPCAO_DUPLICADA',
                    { idPergunta: pergunta.id }
                );
            }

            const idsInvalidos = idsUnicos.filter((idOpcao) => !obterOpcao(pergunta, idOpcao));
            if (idsInvalidos.length > 0) {
                throw new QuizValidationError(
                    `A pergunta ${pergunta.id} contém opções inválidas: ${idsInvalidos.join(', ')}.`,
                    'OPCAO_INVALIDA',
                    { idPergunta: pergunta.id, idsOpcoes: idsInvalidos }
                );
            }

            if (pergunta.opcaoExclusiva
                && idsUnicos.includes(pergunta.opcaoExclusiva)
                && idsUnicos.length > 1) {
                throw new QuizValidationError(
                    `A opção ${pergunta.opcaoExclusiva} deve ser selecionada sozinha em ${pergunta.id}.`,
                    'OPCAO_EXCLUSIVA_COMBINADA',
                    { idPergunta: pergunta.id, idOpcao: pergunta.opcaoExclusiva }
                );
            }

            respostasNormalizadas[pergunta.id] = idsUnicos;
            continue;
        }

        if (typeof resposta !== 'string' || !obterOpcao(pergunta, resposta)) {
            throw new QuizValidationError(
                `A resposta de ${pergunta.id} não corresponde a uma opção válida.`,
                'OPCAO_INVALIDA',
                { idPergunta: pergunta.id, idOpcao: resposta }
            );
        }

        respostasNormalizadas[pergunta.id] = resposta;
    }

    return respostasNormalizadas;
}

function calcularPontuacoes(respostas, configuracao, idsServicos) {
    const pontuacoes = criarPlacarVazio(idsServicos);
    const pontuacoesPorPergunta = {};

    for (const pergunta of configuracao.perguntas) {
        const subtotal = criarPlacarVazio(idsServicos);
        const idsSelecionados = Array.isArray(respostas[pergunta.id])
            ? respostas[pergunta.id]
            : [respostas[pergunta.id]];

        if (pergunta.pontua !== false) {
            for (const idOpcao of idsSelecionados) {
                const opcao = obterOpcao(pergunta, idOpcao);

                for (const [idServico, peso] of Object.entries(opcao.pesos ?? {})) {
                    if (!idsServicos.includes(idServico)) {
                        throw new TypeError(`O serviço ${idServico} usado em ${pergunta.id} não existe na configuração.`);
                    }

                    if (!Number.isFinite(peso) || peso < 0) {
                        throw new TypeError(`O peso de ${idServico} em ${pergunta.id}/${idOpcao} é inválido.`);
                    }

                    subtotal[idServico] += peso;
                }
            }

            for (const [idServico, limite] of Object.entries(pergunta.limitesPontuacaoPorServico ?? {})) {
                if (!idsServicos.includes(idServico) || !Number.isFinite(limite) || limite < 0) {
                    throw new TypeError(`O limite de pontuação de ${idServico} em ${pergunta.id} é inválido.`);
                }

                subtotal[idServico] = Math.min(subtotal[idServico], limite);
            }
        }

        for (const idServico of idsServicos) {
            pontuacoes[idServico] += subtotal[idServico];
        }

        pontuacoesPorPergunta[pergunta.id] = subtotal;
    }

    return { pontuacoes, pontuacoesPorPergunta };
}

function obterPesosDoDesempate(respostas, configuracao, idsServicos) {
    const pergunta = configuracao.perguntas.find(
        (item) => item.id === configuracao.perguntaDesempate
    );

    if (!pergunta) {
        throw new TypeError(`A pergunta de desempate ${configuracao.perguntaDesempate} não existe.`);
    }

    const resposta = respostas[pergunta.id];
    const idOpcao = Array.isArray(resposta) ? resposta[0] : resposta;
    const opcao = obterOpcao(pergunta, idOpcao);

    return Object.fromEntries(idsServicos.map((idServico) => [
        idServico,
        opcao.pesos?.[idServico] ?? 0
    ]));
}

function montarRanking(pontuacoes, pesosDesempate, configuracao, idsServicos) {
    const ordemEstavel = configuracao.ordemDesempate ?? idsServicos;

    return [...idsServicos].sort((servicoA, servicoB) => {
        const diferencaPlacar = pontuacoes[servicoB] - pontuacoes[servicoA];
        if (diferencaPlacar !== 0) return diferencaPlacar;

        const diferencaDesempate = pesosDesempate[servicoB] - pesosDesempate[servicoA];
        if (diferencaDesempate !== 0) return diferencaDesempate;

        return ordemEstavel.indexOf(servicoA) - ordemEstavel.indexOf(servicoB);
    });
}

function montarTextoResultado(perfil, configuracao) {
    const servicoPrincipal = configuracao.servicos[perfil];
    const texto = configuracao.textosResultado.direto[perfil];

    return {
        ...texto,
        cta: servicoPrincipal.cta,
        linhaPersonalizada: servicoPrincipal.linhaPersonalizada
    };
}

function montarResumoRespostas(respostas, configuracao) {
    return configuracao.perguntas.map((pergunta) => {
        const idsSelecionados = Array.isArray(respostas[pergunta.id])
            ? respostas[pergunta.id]
            : [respostas[pergunta.id]];
        const opcoes = idsSelecionados.map((idOpcao) => {
            const opcao = obterOpcao(pergunta, idOpcao);
            return {
                id: opcao.id,
                label: opcao.label,
                insight: opcao.insight
            };
        });

        return {
            id: pergunta.id,
            pergunta: pergunta.titulo,
            resposta: opcoes.map((opcao) => opcao.label).join(', '),
            opcoes
        };
    });
}

/**
 * Calcula uma recomendação sem acessar DOM, storage, URL ou relógio.
 * A mesma entrada e configuração sempre produzem a mesma saída.
 */
export function calcularResultado(respostas, configuracao = QUIZ_CONFIG) {
    const idsServicos = validarConfiguracao(configuracao);
    const respostasValidas = normalizarEValidarRespostas(respostas, configuracao);
    const { pontuacoes, pontuacoesPorPergunta } = calcularPontuacoes(
        respostasValidas,
        configuracao,
        idsServicos
    );
    const pesosDesempate = obterPesosDoDesempate(
        respostasValidas,
        configuracao,
        idsServicos
    );
    const ranking = montarRanking(pontuacoes, pesosDesempate, configuracao, idsServicos);
    const maiorPontuacao = pontuacoes[ranking[0]];
    const empatados = ranking.filter((idServico) => pontuacoes[idServico] === maiorPontuacao);
    const perfil = ranking[0];
    const perfilSecundarioCandidato = ranking[1];
    const segundaPontuacao = pontuacoes[perfilSecundarioCandidato];
    const proporcaoSecundaria = maiorPontuacao === 0 ? 0 : segundaPontuacao / maiorPontuacao;
    const hibrido = proporcaoSecundaria >= configuracao.limiarHibrido;
    const houveEmpate = empatados.length > 1;
    const tipo = houveEmpate ? 'empate' : (hibrido ? 'hibrido' : 'direto');
    const perfilSecundario = hibrido ? perfilSecundarioCandidato : null;
    const maiorPesoDesempate = Math.max(...empatados.map((id) => pesosDesempate[id]));
    const lideresPeloDesempate = empatados.filter(
        (id) => pesosDesempate[id] === maiorPesoDesempate
    );
    const criterioDesempate = houveEmpate
        ? (lideresPeloDesempate.length === 1 ? 'q1' : 'ordem_estavel')
        : null;
    const perfisSecundarios = ranking.slice(1).filter(
        (idServico) => pontuacoes[idServico] / maiorPontuacao >= configuracao.limiarHibrido
    );

    return {
        perfil,
        perfilSecundario,
        perfisSecundarios,
        tipo,
        hibrido,
        houveEmpate,
        empatados,
        criterioDesempate,
        pontuacoes: { ...pontuacoes },
        pontuacoesPorPergunta,
        ranking,
        proporcaoSecundaria,
        limiarHibrido: configuracao.limiarHibrido,
        textoResultado: montarTextoResultado(perfil, configuracao),
        resumoRespostas: montarResumoRespostas(respostasValidas, configuracao),
        preferenciaModelo: respostasValidas.q7,
        destino: `${configuracao.servicos[perfil].rota}?origem=quiz&perfil=${perfil}`
    };
}

