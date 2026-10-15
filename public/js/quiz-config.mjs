/**
 * Configuracao editavel do quiz de recomendacao da Royal.
 *
 * A UI deve consumir estes dados sem duplicar perguntas, pesos ou textos.
 * Os identificadores sao estaveis para preservar respostas salvas na sessao.
 */

const congelarProfundamente = (valor) => {
    if (!valor || typeof valor !== 'object' || Object.isFrozen(valor)) {
        return valor;
    }

    Object.values(valor).forEach(congelarProfundamente);
    return Object.freeze(valor);
};

export const SERVICOS = congelarProfundamente({
    site: {
        id: 'site',
        nome: 'Sites',
        nomeSingular: 'site',
        rota: '/sites',
        cta: 'Ver a solução ideal →',
        linhaPersonalizada: 'Pelo que você respondeu, o gargalo está em transformar presença digital em novas conversas.'
    },
    app: {
        id: 'app',
        nome: 'Aplicativos',
        nomeSingular: 'aplicativo',
        rota: '/apps',
        cta: 'Ver a solução ideal →',
        linhaPersonalizada: 'Pelo que você respondeu, o gargalo está em transformar sua ideia ou processo em um produto que as pessoas possam usar.'
    },
    automacao: {
        id: 'automacao',
        nome: 'Automações',
        nomeSingular: 'automação',
        rota: '/automacoes',
        cta: 'Ver a solução ideal →',
        linhaPersonalizada: 'Pelo que você respondeu, o gargalo está em tarefas manuais que consomem tempo e atrasam sua operação.'
    }
});

export const PERGUNTAS_QUIZ = congelarProfundamente([
    {
        id: 'q1',
        ordem: 1,
        tipo: 'unica',
        obrigatoria: true,
        titulo: 'O que mais trava seu negócio hoje?',
        opcoes: [
            {
                id: 'poucos_clientes_confianca',
                label: 'Poucos clientes me encontram ou confiam na minha marca online',
                pesos: { site: 3 },
                insight: 'Sua presença digital ainda não transmite confiança nem gera oportunidades suficientes.'
            },
            {
                id: 'tarefas_repetitivas',
                label: 'Meu time perde horas com tarefas repetitivas',
                pesos: { automacao: 3 },
                insight: 'O trabalho manual está consumindo tempo que deveria ir para atividades de maior valor.'
            },
            {
                id: 'produto_plataforma_propria',
                label: 'Quero lançar um produto ou plataforma digital própria',
                pesos: { app: 3 },
                insight: 'Sua oportunidade depende de uma experiência digital própria para os usuários.'
            },
            {
                id: 'atendimento_lento',
                label: 'Atendimento lento: leads esfriam antes de eu responder',
                pesos: { automacao: 2, site: 1 },
                insight: 'Há atrito entre a chegada do cliente e a velocidade com que sua empresa responde.'
            }
        ]
    },
    {
        id: 'q2',
        ordem: 2,
        tipo: 'unica',
        obrigatoria: true,
        titulo: 'Qual seu principal objetivo nos próximos 90 dias?',
        opcoes: [
            {
                id: 'mais_contatos_vendas',
                label: 'Gerar mais contatos e vendas',
                pesos: { site: 2, automacao: 1 },
                insight: 'Sua prioridade de curto prazo é criar e aproveitar melhor as oportunidades comerciais.'
            },
            {
                id: 'ganhar_tempo_retrabalho',
                label: 'Ganhar tempo e reduzir retrabalho',
                pesos: { automacao: 3 },
                insight: 'Eficiência operacional é o resultado mais urgente para o seu negócio.'
            },
            {
                id: 'validar_ideia_mvp',
                label: 'Validar uma ideia / lançar um MVP',
                pesos: { app: 3 },
                insight: 'Você precisa colocar uma experiência funcional nas mãos de usuários reais.'
            },
            {
                id: 'organizar_processos_dados',
                label: 'Organizar processos e dados',
                pesos: { automacao: 2, app: 1 },
                insight: 'Informações e etapas desconectadas estão dificultando a operação.'
            }
        ]
    },
    {
        id: 'q3',
        ordem: 3,
        tipo: 'unica',
        obrigatoria: true,
        titulo: 'Como seu cliente chega até você hoje?',
        opcoes: [
            {
                id: 'indicacao_instagram_sem_site',
                label: 'Por indicação e Instagram, sem site estruturado',
                pesos: { site: 3 },
                insight: 'Sua aquisição depende de canais emprestados e ainda não tem uma base digital própria.'
            },
            {
                id: 'site_sem_contatos',
                label: 'Tenho site, mas ele não gera contatos',
                pesos: { site: 3 },
                insight: 'Sua presença atual precisa ser reposicionada para conversão.'
            },
            {
                id: 'whatsapp_manual',
                label: 'Chega pelo WhatsApp e respondo tudo na mão',
                pesos: { automacao: 3 },
                insight: 'O WhatsApp concentra demanda, mas depende demais da disponibilidade do time.'
            },
            {
                id: 'conta_login_painel',
                label: 'Preciso que ele tenha conta, login ou painel',
                pesos: { app: 3 },
                insight: 'A experiência exige autenticação e funcionalidades recorrentes.'
            }
        ]
    },
    {
        id: 'q4',
        ordem: 4,
        tipo: 'unica',
        obrigatoria: true,
        titulo: 'Quem vai usar a solução no dia a dia?',
        opcoes: [
            {
                id: 'visitantes',
                label: 'Visitantes e potenciais clientes',
                pesos: { site: 2 },
                insight: 'A solução precisa informar, gerar confiança e facilitar o primeiro contato.'
            },
            {
                id: 'time_interno',
                label: 'Meu time interno',
                pesos: { automacao: 2, app: 1 },
                insight: 'A prioridade está em dar produtividade e controle para a equipe.'
            },
            {
                id: 'clientes_com_login',
                label: 'Meus clientes, com login e dados próprios',
                pesos: { app: 3 },
                insight: 'Seus clientes precisam de uma experiência autenticada e recorrente.'
            },
            {
                id: 'todos',
                label: 'Todos eles',
                pesos: { site: 1, app: 1, automacao: 1 },
                insight: 'Seu cenário conecta aquisição, experiência do cliente e operação interna.'
            }
        ]
    },
    {
        id: 'q5',
        ordem: 5,
        tipo: 'multipla',
        obrigatoria: true,
        titulo: 'Quais ferramentas você já usa?',
        instrucao: 'Selecione todas as opções que se aplicam.',
        opcaoExclusiva: 'nenhuma_ainda',
        limitesPontuacaoPorServico: { automacao: 3 },
        opcoes: [
            {
                id: 'whatsapp',
                label: 'WhatsApp',
                pesos: { automacao: 1 },
                insight: 'O WhatsApp pode ser conectado a fluxos de atendimento e acompanhamento.'
            },
            {
                id: 'crm',
                label: 'CRM',
                pesos: { automacao: 1 },
                insight: 'Seu CRM pode acionar e receber dados automaticamente.'
            },
            {
                id: 'planilhas',
                label: 'Planilhas',
                pesos: { automacao: 1 },
                insight: 'Planilhas indicam oportunidades de reduzir lançamentos e conferências manuais.'
            },
            {
                id: 'formularios_email',
                label: 'Formulários / e-mail',
                pesos: { automacao: 1 },
                insight: 'Formulários e e-mails podem alimentar outros sistemas e alertas sem redigitação.'
            },
            {
                id: 'sistema_erp',
                label: 'Sistema próprio / ERP',
                pesos: { automacao: 1 },
                insight: 'A integração com o ERP pode eliminar etapas duplicadas e manter dados consistentes.'
            },
            {
                id: 'nenhuma_ainda',
                label: 'Nenhuma ainda',
                pesos: { site: 1 },
                insight: 'Antes de integrar sistemas, sua empresa pode se beneficiar de uma base digital mais clara.'
            }
        ]
    },
    {
        id: 'q6',
        ordem: 6,
        tipo: 'unica',
        obrigatoria: true,
        titulo: 'Em que estágio está seu projeto?',
        opcoes: [
            {
                id: 'ideia',
                label: 'Só uma ideia',
                pesos: { app: 2, site: 1 },
                insight: 'Você precisa transformar uma ideia em algo concreto, testável e apresentável.'
            },
            {
                id: 'rodando_desorganizado',
                label: 'Negócio rodando, mas desorganizado',
                pesos: { automacao: 2 },
                insight: 'A operação já provou valor, mas precisa de processos mais consistentes.'
            },
            {
                id: 'rodando_crescer_online',
                label: 'Negócio rodando, quero crescer online',
                pesos: { site: 2, automacao: 1 },
                insight: 'O próximo salto depende de aquisição digital e capacidade para atender o crescimento.'
            },
            {
                id: 'produto_escalar',
                label: 'Já tenho produto e quero escalar',
                pesos: { app: 2, automacao: 1 },
                insight: 'Escala exige uma experiência de produto sólida e uma operação menos manual.'
            }
        ]
    },
    {
        id: 'q7',
        ordem: 7,
        tipo: 'unica',
        obrigatoria: true,
        pontua: false,
        titulo: 'Qual formato faz mais sentido?',
        opcoes: [
            {
                id: 'escopo_fechado',
                label: 'Escopo, prazo e investimento fechados',
                pesos: {},
                insight: 'Você prefere previsibilidade de escopo, prazo e investimento.'
            },
            {
                id: 'parceria_estrategica',
                label: 'Parceria de longo prazo com desconto pelo potencial de crescimento',
                pesos: {},
                insight: 'Você considera construir uma relação de longo prazo com interesses alinhados.'
            },
            {
                id: 'ainda_nao_sei',
                label: 'Ainda não sei',
                pesos: {},
                insight: 'O melhor modelo pode ser definido depois de entender escopo, estágio e potencial.'
            }
        ]
    }
]);

// Alias curto para a camada de interface.
export const PERGUNTAS = PERGUNTAS_QUIZ;

export const TEXTOS_RESULTADO = congelarProfundamente({
    direto: {
        site: {
            badge: 'Melhor encaixe para você',
            titulo: 'Seu próximo passo: um site que vende por você',
            descricao: 'Suas respostas mostram que a prioridade é transformar atenção em confiança, contatos e novas oportunidades.'
        },
        app: {
            badge: 'Melhor encaixe para você',
            titulo: 'Seu próximo passo: transformar sua ideia em app',
            descricao: 'Sua necessidade pede uma experiência própria, recorrente e com funcionalidades para usuários.'
        },
        automacao: {
            badge: 'Melhor encaixe para você',
            titulo: 'Seu próximo passo: automatizar sua operação',
            descricao: 'O maior gargalo está no trabalho manual e na circulação de dados entre pessoas e ferramentas.'
        }
    }
});

export const QUIZ_CONFIG = congelarProfundamente({
    versao: 1,
    servicos: SERVICOS,
    services: SERVICOS,
    ordemDesempate: ['site', 'app', 'automacao'],
    tieBreakOrder: ['site', 'app', 'automacao'],
    limiarHibrido: 0.6,
    perguntaDesempate: 'q1',
    perguntas: PERGUNTAS_QUIZ,
    questions: PERGUNTAS_QUIZ,
    textosResultado: TEXTOS_RESULTADO
});

