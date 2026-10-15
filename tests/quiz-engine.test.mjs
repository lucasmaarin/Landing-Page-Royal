import test from 'node:test';
import assert from 'node:assert/strict';

import {
    calcularResultado,
    QuizValidationError
} from '../public/js/quiz-engine.mjs';

const respostaSite = {
    q1: 'poucos_clientes_confianca',
    q2: 'mais_contatos_vendas',
    q3: 'site_sem_contatos',
    q4: 'visitantes',
    q5: ['nenhuma_ainda'],
    q6: 'rodando_crescer_online',
    q7: 'escopo_fechado'
};

const respostaApp = {
    q1: 'produto_plataforma_propria',
    q2: 'validar_ideia_mvp',
    q3: 'conta_login_painel',
    q4: 'clientes_com_login',
    q5: ['nenhuma_ainda'],
    q6: 'produto_escalar',
    q7: 'parceria_estrategica'
};

const respostaAutomacao = {
    q1: 'tarefas_repetitivas',
    q2: 'ganhar_tempo_retrabalho',
    q3: 'whatsapp_manual',
    q4: 'time_interno',
    q5: ['whatsapp', 'crm', 'planilhas', 'formularios_email', 'sistema_erp'],
    q6: 'rodando_desorganizado',
    q7: 'ainda_nao_sei'
};

test('recomenda sites quando os sinais de aquisição e confiança predominam', () => {
    const resultado = calcularResultado(respostaSite);

    assert.equal(resultado.perfil, 'site');
    assert.equal(resultado.tipo, 'direto');
    assert.deepEqual(resultado.pontuacoes, {
        site: 13,
        app: 0,
        automacao: 2
    });
    assert.equal(resultado.textoResultado.titulo, 'Seu próximo passo: um site que vende por você');
    assert.equal(resultado.destino, '/sites?origem=quiz&perfil=site');
});

test('recomenda aplicativos quando produto e uso autenticado predominam', () => {
    const resultado = calcularResultado(respostaApp);

    assert.equal(resultado.perfil, 'app');
    assert.equal(resultado.tipo, 'direto');
    assert.deepEqual(resultado.pontuacoes, {
        site: 1,
        app: 14,
        automacao: 1
    });
    assert.equal(resultado.textoResultado.titulo, 'Seu próximo passo: transformar sua ideia em app');
    assert.equal(resultado.destino, '/apps?origem=quiz&perfil=app');
});

test('recomenda automações quando trabalho manual e integrações predominam', () => {
    const resultado = calcularResultado(respostaAutomacao);

    assert.equal(resultado.perfil, 'automacao');
    assert.equal(resultado.tipo, 'direto');
    assert.deepEqual(resultado.pontuacoes, {
        site: 0,
        app: 1,
        automacao: 16
    });
    assert.equal(resultado.textoResultado.titulo, 'Seu próximo passo: automatizar sua operação');
    assert.equal(resultado.destino, '/automacoes?origem=quiz&perfil=automacao');
});

test('resolve empate pelo peso da resposta de Q1', () => {
    const resultado = calcularResultado({
        q1: 'poucos_clientes_confianca',
        q2: 'mais_contatos_vendas',
        q3: 'whatsapp_manual',
        q4: 'visitantes',
        q5: ['whatsapp'],
        q6: 'rodando_desorganizado',
        q7: 'escopo_fechado'
    });

    assert.deepEqual(resultado.pontuacoes, {
        site: 7,
        app: 0,
        automacao: 7
    });
    assert.equal(resultado.perfil, 'site');
    assert.equal(resultado.tipo, 'empate');
    assert.equal(resultado.houveEmpate, true);
    assert.equal(resultado.hibrido, true);
    assert.equal(resultado.criterioDesempate, 'q1');
    assert.deepEqual(resultado.empatados, ['site', 'automacao']);
    assert.equal(resultado.textoResultado.titulo, 'Seu próximo passo: um site que vende por você');
});

test('classifica como híbrido quando o segundo colocado atinge 60% do primeiro', () => {
    const resultado = calcularResultado({
        q1: 'poucos_clientes_confianca',
        q2: 'mais_contatos_vendas',
        q3: 'whatsapp_manual',
        q4: 'visitantes',
        q5: ['whatsapp'],
        q6: 'rodando_crescer_online',
        q7: 'ainda_nao_sei'
    });

    assert.deepEqual(resultado.pontuacoes, {
        site: 9,
        app: 0,
        automacao: 6
    });
    assert.equal(resultado.perfil, 'site');
    assert.equal(resultado.perfilSecundario, 'automacao');
    assert.equal(resultado.tipo, 'hibrido');
    assert.equal(resultado.hibrido, true);
    assert.equal(resultado.houveEmpate, false);
    assert.equal(resultado.proporcaoSecundaria, 6 / 9);
    assert.equal(resultado.textoResultado.titulo, 'Seu próximo passo: um site que vende por você');
});

test('considera híbrido quando o segundo colocado atinge exatamente 60%', () => {
    const resultado = calcularResultado({
        q1: 'tarefas_repetitivas',
        q2: 'ganhar_tempo_retrabalho',
        q3: 'conta_login_painel',
        q4: 'time_interno',
        q5: ['whatsapp'],
        q6: 'produto_escalar',
        q7: 'ainda_nao_sei'
    });

    assert.deepEqual(resultado.pontuacoes, {
        site: 0,
        app: 6,
        automacao: 10
    });
    assert.equal(resultado.perfil, 'automacao');
    assert.equal(resultado.perfilSecundario, 'app');
    assert.equal(resultado.proporcaoSecundaria, 0.6);
    assert.equal(resultado.hibrido, true);
});

test('limita a contribuição de Q5 para automação a três pontos', () => {
    const resultado = calcularResultado(respostaAutomacao);

    assert.deepEqual(resultado.pontuacoesPorPergunta.q5, {
        site: 0,
        app: 0,
        automacao: 3
    });
});

test('Q7 altera o resumo, mas não altera a pontuação ou a recomendação', () => {
    const comum = calcularResultado({ ...respostaSite, q7: 'escopo_fechado' });
    const parceria = calcularResultado({ ...respostaSite, q7: 'parceria_estrategica' });
    const incerto = calcularResultado({ ...respostaSite, q7: 'ainda_nao_sei' });

    assert.deepEqual(comum.pontuacoes, parceria.pontuacoes);
    assert.deepEqual(comum.pontuacoes, incerto.pontuacoes);
    assert.equal(comum.perfil, parceria.perfil);
    assert.equal(comum.perfil, incerto.perfil);
    assert.equal(comum.preferenciaModelo, 'escopo_fechado');
    assert.equal(parceria.preferenciaModelo, 'parceria_estrategica');
    assert.equal(incerto.preferenciaModelo, 'ainda_nao_sei');
    assert.deepEqual(comum.pontuacoesPorPergunta.q7, {
        site: 0,
        app: 0,
        automacao: 0
    });
    assert.notEqual(
        comum.resumoRespostas.at(-1).resposta,
        parceria.resumoRespostas.at(-1).resposta
    );
});

test('rejeita respostas incompletas ou opções exclusivas combinadas', () => {
    assert.throws(
        () => calcularResultado({ q1: 'poucos_clientes_confianca' }),
        (erro) => erro instanceof QuizValidationError && erro.code === 'RESPOSTA_AUSENTE'
    );

    assert.throws(
        () => calcularResultado({
            ...respostaSite,
            q5: ['nenhuma_ainda', 'whatsapp']
        }),
        (erro) => erro instanceof QuizValidationError
            && erro.code === 'OPCAO_EXCLUSIVA_COMBINADA'
    );
});

