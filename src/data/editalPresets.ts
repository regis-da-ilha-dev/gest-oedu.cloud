export interface PresetSubject {
  name: string;
  color: string;
  icon: string;
  topics: string[];
}

export interface EditalPreset {
  id: string;
  title: string;
  institution: string;
  banca: string;
  description: string;
  difficulty: "Médio" | "Superior";
  subjects: PresetSubject[];
}

export const EDITAL_PRESETS: EditalPreset[] = [
  {
    id: "pmma-soldado-oficial",
    title: "Soldado e Oficial da Polícia Militar e Bombeiros",
    institution: "PMMA / CBMMA",
    banca: "FGV / Cebraspe",
    difficulty: "Médio",
    description: "Carreira militar estadual do Maranhão com legislação institucional totalmente atualizada.",
    subjects: [
      {
        name: "Estatuto da Polícia Militar do Maranhão — Lei nº 6.513/1995",
        color: "#16a34a",
        icon: "Shield",
        topics: [
          "Generalidades e Ingresso na Corporação",
          "Hierarquia, Disciplina e Círculos Hierárquicos",
          "Cargo e Função Policial-Militar",
          "Valor, Ética e Deveres Policiais-Militares",
          "Violação dos Deveres, Conselho de Justificação e Disciplina",
          "Direitos, Estabilidade e Remuneração",
          "Promoções na Carreira Militar",
          "Férias, Afastamentos e Licenças",
          "Prerrogativas e Uso dos Uniformes",
          "Agregação, Reversão, Excedente, Ausente e Extraviado",
          "Desligamento, Reserva Remunerada, Reforma e Exclusão"
        ]
      },
      {
        name: "Língua Portuguesa",
        color: "#7c3aed",
        icon: "BookOpen",
        topics: [
          "Compreensão e interpretação de textos de gêneros variados",
          "Domínio da ortografia oficial e regras de acentuação",
          "Classes de palavras e colocação pronominal",
          "Sintaxe da oração e do período",
          "Concordância e regência verbal e nominal",
          "Emprego do sinal indicativo de crase e pontuação"
        ]
      },
      {
        name: "História e Geografia do Maranhão",
        color: "#d97706",
        icon: "Bookmark",
        topics: [
          "Formação territorial e aspectos históricos do Estado do Maranhão",
          "Geografia física, vegetação, relevo e clima maranhense",
          "Socioeconomia, população, urbanização e aspectos culturais do Maranhão",
          "Conflitos agrários e vulnerabilidades socioambientais no Maranhão"
        ]
      },
      {
        name: "Noções de Direito Constitucional e Administrativo",
        color: "#2563eb",
        icon: "Layers",
        topics: [
          "Direitos e garantias fundamentais (Art. 5º da CF/88)",
          "Segurança Pública e Forças Auxiliares (Art. 144 da CF/88)",
          "Princípios da Administração Pública e Atos Administrativos",
          "Poderes da Administração e Improbidade Administrativa"
        ]
      }
    ]
  },
  {
    id: "inss-tecnico",
    title: "Técnico do Seguro Social",
    institution: "INSS",
    banca: "Cebraspe",
    difficulty: "Médio",
    description: "Um dos concursos mais concorridos do Brasil, com foco em Direito Previdenciário.",
    subjects: [
      {
        name: "Direito Previdenciário (Seguridade Social)",
        color: "#16a34a",
        icon: "Shield",
        topics: [
          "Origem e evolução legislativa da Seguridade Social no Brasil",
          "Conceito e princípios constitucionais da Seguridade Social",
          "Regime Geral de Previdência Social: Segurados obrigatórios e facultativos",
          "Filiação e inscrição na Previdência Social",
          "Conceito de empresa e empregador doméstico para fins previdenciários",
          "Financiamento da Seguridade Social: Receitas da União, contribuições dos segurados e empresa",
          "Decadência e prescrição na arrecadação e cobrança das contribuições",
          "Prestações em Geral: Benefícios e serviços (Carência, Período de Graça)",
          "Aposentadoria por incapacidade permanente e temporária",
          "Aposentadoria programada (idade, tempo de contribuição especial)",
          "Salário-família, Salário-maternidade e Auxílio-reclusão",
          "Pensão por morte e regras de acumulação de benefícios",
          "Lei de Organização da Seguridade Social (Lei 8.212/90)",
          "Lei de Planos de Benefícios da Previdência Social (Lei 8.213/90)",
          "Regulamento da Previdência Social (Decreto 3.048/99)",
          "Recursos das decisões administrativas no âmbito da previdência"
        ]
      },
      {
        name: "Direito Constitucional",
        color: "#d97706",
        icon: "Bookmark",
        topics: [
          "Constituição Federal de 1988: Conceito, classificação e princípios fundamentais",
          "Direitos e garantias fundamentais: Direitos e deveres individuais e coletivos",
          "Direitos Sociais, Nacionalidade e Direitos Políticos",
          "Organização do Estado: Administração Pública (Disposições Gerais e Servidores)",
          "Poder Executivo: Atribuições e responsabilidades do Presidente da República",
          "A Ordem Social: Disposições Gerais e a base constitucional da Seguridade Social"
        ]
      },
      {
        name: "Direito Administrativo",
        color: "#2563eb",
        icon: "Layers",
        topics: [
          "Estado, Governo e Administração Pública: Conceitos, elementos e poderes",
          "Direito Administrativo: Fontes, princípios básicos e regime jurídico-administrativo",
          "Administração Indireta e Autarquias: O INSS como Autarquia Federal",
          "Atos Administrativos: Conceito, requisitos, atributos, classificação e extinção",
          "Poderes da Administração Pública: Vinculado, Discricionário, Hierárquico, Disciplinar, Regulamentar e de Polícia",
          "Regime Jurídico dos Servidores Públicos Federais (Lei 8.112/1990)",
          "Processo Administrativo Federal (Lei 9.784/1999)"
        ]
      },
      {
        name: "Língua Portuguesa",
        color: "#7c3aed",
        icon: "BookOpen",
        topics: [
          "Compreensão e interpretação de textos de gêneros variados",
          "Reconhecimento de tipos e gêneros textuais",
          "Ortografia oficial e emprego do acento indicativo de crase",
          "Emprego das classes de palavras: Verbos, pronomes, conjunções e preposições",
          "Relações de coordenação e subordinação entre orações",
          "Sintaxe da oração e do período: Concordância nominal e verbal",
          "Regência nominal e verbal",
          "Pontuação: Emprego de vírgula, ponto e vírgula, dois-pontos",
          "Significação das palavras: Sinônimos, antônimos, homônimos e parônimos"
        ]
      },
      {
        name: "Raciocínio Lógico-Matemático",
        color: "#db2777",
        icon: "Target",
        topics: [
          "Conceito e estruturas lógicas de proposições simples e compostas",
          "Tabelas-verdade: Conectivos lógicos (conjunção, disjunção, condicional, bicondicional)",
          "Equivalências lógicas e negação de proposições",
          "Lógica de argumentação: Dedução, indução e analogia",
          "Operações com conjuntos",
          "Problemas aritméticos, geométricos e matriciais"
        ]
      },
      {
        name: "Ética no Serviço Público",
        color: "#4f46e5",
        icon: "Shield",
        topics: [
          "Ética e Moral: Princípios éticos fundamentais no serviço público",
          "Código de Ética Profissional do Servidor Público Civil do Executivo Federal (Decreto 1.171/1994)",
          "Comissão de Ética do INSS: Composição, deveres e penalidades aplicáveis",
          "Lei de Improbidade Administrativa (Lei 8.429/1992)"
        ]
      }
    ]
  },
  {
    id: "tjsp-escrevente",
    title: "Escrevente Técnico Judiciário",
    institution: "TJ-SP",
    banca: "Vunesp",
    difficulty: "Médio",
    description: "Grande oportunidade no Judiciário Paulista, com foco na legislação processual escrita.",
    subjects: [
      {
        name: "Língua Portuguesa",
        color: "#7c3aed",
        icon: "BookOpen",
        topics: [
          "Análise, compreensão e interpretação de texto",
          "Vocabulário: Sentido próprio e figurado das palavras",
          "Classes de palavras: Substantivo, adjetivo, numeral, pronome, verbo, advérbio, preposição e conjunção",
          "Colocação pronominal: Próclise, mesóclise e ênclise",
          "Concordância verbal e nominal",
          "Regência verbal e nominal",
          "Uso da crase",
          "Pontuação e sua relevância expressiva"
        ]
      },
      {
        name: "Direito Constitucional",
        color: "#d97706",
        icon: "Bookmark",
        topics: [
          "Título II da CF/88 - Capítulo I: Dos Direitos e Deveres Individuais e Coletivos",
          "Título II da CF/88 - Capítulo II: Dos Direitos Sociais",
          "Título III da CF/88 - Capítulo VII: Da Administração Pública (artigos 37 a 41)",
          "Poder Judiciário no Estado de São Paulo: Disposições e Estrutura",
          "Funções Essenciais à Justiça: Ministério Público e Defensoria Pública"
        ]
      },
      {
        name: "Direito Processual Civil",
        color: "#0891b2",
        icon: "Layers",
        topics: [
          "Código de Processo Civil: Impedimento e suspeição dos juízos",
          "Atos Processuais: Forma, tempo e lugar dos atos judiciais",
          "Prazos processuais: Contagem e suspensão",
          "Comunicação dos atos processuais: Citação, intimação e cartas de ordem",
          "Tutela provisória: Urgência e evidência",
          "Procedimento Comum: Petição inicial e audiência de conciliação",
          "Contestação e revelia do réu",
          "Juizados Especiais Cíveis (Lei 9.099/95 - artigos 3º ao 19)"
        ]
      },
      {
        name: "Direito Processual Penal",
        color: "#b91c1c",
        icon: "Shield",
        topics: [
          "Código de Processo Penal: Inquérito Policial e Ação Penal",
          "Juiz, Ministério Público, acusado e defensor no CPP",
          "Prisão, medidas cautelares e liberdade provisória",
          "Processo de Crimes de Responsabilidade dos Funcionários Públicos (artigos 513 a 518 do CPP)",
          "Juizados Especiais Criminais (Lei 9.099/95 - artigos 60 ao 83)"
        ]
      },
      {
        name: "Normas da Corregedoria",
        color: "#4f46e5",
        icon: "Shield",
        topics: [
          "Normas da Corregedoria Geral da Justiça do TJSP: Capítulo II sobre a função correicional",
          "Capítulo III: Do Ofício de Justiça em Geral",
          "Seção I: Das atribuições gerais do Escrivão e Escrevente",
          "Seção II: Da escrituração de livros, classificados e processos eletrônicos",
          "Do Processo Eletrônico no TJSP"
        ]
      },
      {
        name: "Direito Penal",
        color: "#be185d",
        icon: "Target",
        topics: [
          "Crimes Contra a Administração Pública praticados por Funcionário Público (arts. 312 a 327 do CP)",
          "Peculato, Concussão, Corrupção Passiva, Prevaricação e Advocacia Administrativa",
          "Crimes Praticados de Particular Contra a Administração em Geral (arts. 328 a 337 do CP)",
          "Resistência, Desobediência, Desacato e Contrabando",
          "Crimes Contra a Administração da Justiça (arts. 338 a 359 do CP)"
        ]
      }
    ]
  },
  {
    id: "tre-tecnico",
    title: "Técnico Judiciário - Administrativa",
    institution: "TRE-Unificado",
    banca: "Cebraspe",
    difficulty: "Superior",
    description: "O maior concurso eleitoral unificado do país, com foco em Direito Eleitoral e Administrativo.",
    subjects: [
      {
        name: "Direito Eleitoral",
        color: "#4f46e5",
        icon: "Target",
        topics: [
          "Fontes do Direito Eleitoral: Constituição, Código Eleitoral e Resoluções do TSE",
          "Princípios e regras fundamentais aplicáveis ao Direito Eleitoral",
          "Direitos Políticos: Alistamento eleitoral, elegibilidade e inelegibilidades",
          "Sistemas Eleitorais: Majoritário e Proporcional (quociente eleitoral e partidário)",
          "Justiça Eleitoral: Organização, competências do TSE, TREs e Juízes Eleitorais",
          "Propaganda Eleitoral na internet, rádio, TV e imprensa escrita",
          "Condutas vedadas aos agentes públicos em campanhas eleitorais",
          "Recursos Eleitorais típicos e ações eleitorais judiciais",
          "Súmulas do Tribunal Superior Eleitoral (TSE)"
        ]
      },
      {
        name: "Língua Portuguesa",
        color: "#7c3aed",
        icon: "BookOpen",
        topics: [
          "Compreensão e interpretação de textos de gêneros variados",
          "Domínio da ortografia oficial e regras vigentes de acentuação",
          "Emprego da crase em sintaxe de regência",
          "Sintaxe da oração e do período compostos",
          "Concordância verbal e nominal aplicadas",
          "Regência verbal e nominal de termos práticos",
          "Tipologia textual e coesão referencial"
        ]
      },
      {
        name: "Noções de Direito Constitucional",
        color: "#d97706",
        icon: "Bookmark",
        topics: [
          "Direitos e Deveres Individuais e Coletivos (Artigo 5º da CF)",
          "Direitos Sociais, Nacionalidade, Direitos Políticos e Partidos Políticos (Arts. 6º ao 17 da CF)",
          "Organização Político-Administrativa do Estado Brasileiro",
          "Poder Judiciário: Disposições Gerais e Órgãos da Justiça Eleitoral",
          "Administração Pública Constitucional (Disposições Gerais e Servidores)"
        ]
      },
      {
        name: "Noções de Direito Administrativo",
        color: "#2563eb",
        icon: "Layers",
        topics: [
          "Princípios expressos e implícitos da Administração Pública estadual",
          "Atos Administrativos: Elementos, atributos e desfazimento (anulação e revogação)",
          "Organização Administrativa: Administração Direta e Indireta",
          "Regime Jurídico Único dos Servidores Civis Federais (Lei 8.112/1990)",
          "Nova Lei de Licitações e Contratos Administrativos (Lei 14.133/2021) - Aspectos Gerais",
          "Lei de Improbidade Administrativa (Lei 8.429/1992)"
        ]
      }
    ]
  },
  {
    id: "policia-federal-agente",
    title: "Agente da Polícia Federal",
    institution: "Polícia Federal",
    banca: "Cebraspe",
    difficulty: "Superior",
    description: "Carreira policial federal de ponta, exigindo forte preparo em Informática, Contabilidade e Estatística.",
    subjects: [
      {
        name: "Noções de Informática (PF)",
        color: "#0891b2",
        icon: "Layers",
        topics: [
          "Conceito de internet, intranet, navegadores e ferramentas de busca",
          "Sistemas operacionais: Windows e Linux (Comandos, estrutura de de diretórios e permissões)",
          "Redes de Computadores: Arquiteturas, protocolos (TCP/IP), segurança e criptografia",
          "Computação em Nuvem (Cloud Computing) e virtualização",
          "Bancos de Dados: Conceitos básicos, modelo relacional, noções de SQL e NoSQL",
          "Teoria da Informação e Big Data: Conceitos estruturais de inteligência de dados",
          "Linguagens de Programação: Noções estruturais de Python e R",
          "Segurança da Informação: Vírus, cavalos de troia, phishing, firewalls e backups"
        ]
      },
      {
        name: "Noções de Contabilidade",
        color: "#0d9488",
        icon: "Bookmark",
        topics: [
          "Conceitos, objetivos e finalidade da Contabilidade Geral",
          "Patrimônio: Componentes patrimoniais (Ativo, Passivo e Patrimônio Líquido)",
          "Equação fundamental do patrimônio e variações patrimoniais",
          "Contas e Lançamentos contábeis típicos (Débito e Crédito)",
          "Método das partidas dobradas",
          "Regime de Caixa e Regime de Competência",
          "Balancete de verificação e noções de demonstrações contábeis"
        ]
      },
      {
        name: "Direito Constitucional",
        color: "#d97706",
        icon: "Bookmark",
        topics: [
          "Direitos e garantias fundamentais na Constituição de 1988",
          "Direitos e deveres individuais, coletivos e sociais",
          "Garantias constitucionais e remédios (Habeas Corpus, Mandado de Segurança, etc.)",
          "Defesa do Estado e das Instituições Democráticas: Segurança Pública (Art. 144 da CF)"
        ]
      },
      {
        name: "Direito Administrativo",
        color: "#2563eb",
        icon: "Layers",
        topics: [
          "Atos Administrativos: Requisitos, atributos, vigência e extinção",
          "Poderes da Administração Pública e controle administrativo",
          "Regime Jurídico dos Servidores Públicos da União (Lei 8.112/1990)",
          "Responsabilidade Civil do Estado pelos atos de seus agentes",
          "Segurança Pública na esfera federal"
        ]
      },
      {
        name: "Noções de Direito Penal",
        color: "#b91c1c",
        icon: "Shield",
        topics: [
          "Princípios básicos do Direito Penal aplicados",
          "Aplicação da lei penal: Tempo e lugar do crime",
          "Teoria do Crime: Fato típico, ilicitude, culpabilidade",
          "Crimes contra a pessoa e crimes contra o patrimônio",
          "Crimes contra a Administração Pública federal ou suas autarquias"
        ]
      },
      {
        name: "Noções de Processo Penal",
        color: "#7f1d1d",
        icon: "Shield",
        topics: [
          "Inquérito Policial federal: Histórico, características e valor probatório",
          "Ação Penal: Características gerais e propositura",
          "Prisão em flagrante e prisões preventivas no processo penal",
          "Medidas assecuratórias da prova"
        ]
      },
      {
        name: "Estatística de Concurso",
        color: "#db2777",
        icon: "Target",
        topics: [
          "Apresentação de dados estatísticos: Tabelas e gráficos representativos",
          "Medidas de tendência central: Média aritmética, mediana e moda",
          "Medidas de dispersão: Variância, desvio-padrão e coeficiente de variação",
          "Cálculo de probabilidade elementar",
          "Distribuição de probabilidades importantes (Discreta e Contínua)"
        ]
      }
    ]
  }
];
