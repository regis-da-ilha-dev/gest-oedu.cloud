import { Question, Flashcard } from '../types';

export const PMMA_SUBJECT_NAME = "Estatuto da Polícia Militar do Maranhão — Lei nº 6.513/1995";

export interface PmmaTopicData {
  id: string;
  name: string;
  description: string;
}

export const PMMA_TOPICS: PmmaTopicData[] = [
  {
    id: "pmma-generalidades-ingresso",
    name: "Generalidades e Ingresso na Corporação",
    description: "Conceito, situação dos servidores militares (ativa e inatividade) e requisitos para ingresso."
  },
  {
    id: "pmma-hierarquia-disciplina",
    name: "Hierarquia, Disciplina e Círculos Hierárquicos",
    description: "Postos, graduações, precedência hierárquica e praças especiais."
  },
  {
    id: "pmma-cargo-funcao",
    name: "Cargo e Função Policial-Militar",
    description: "Provimento, vacância, substituições e exercício em órgãos civis/externos."
  },
  {
    id: "pmma-deveres-etica",
    name: "Valor, Ética e Deveres Policiais-Militares",
    description: "Preceitos éticos, proibições de comércio/gestão, compromisso de honra e comando."
  },
  {
    id: "pmma-violacao-conselhos",
    name: "Violação dos Deveres, Conselho de Justificação e Disciplina",
    description: "Processos disciplinares, afastamento do cargo e julgamento de incapacidade."
  },
  {
    id: "pmma-direitos-remuneracao",
    name: "Direitos, Estabilidade e Remuneração",
    description: "Garantia de patente, estabilidade de praças (5 anos), subsídio e recursos administrativos."
  },
  {
    id: "pmma-promocao",
    name: "Promoções na Carreira Militar",
    description: "Critérios de promoção, datas anuais e ressarcimento de preterição."
  },
  {
    id: "pmma-ferias-licencas",
    name: "Férias, Afastamentos e Licenças",
    description: "Núpcias, luto, trânsito, instalação, licença-prêmio, saúde, LTIP e paternidade/maternidade."
  },
  {
    id: "pmma-prerrogativas-uniformes",
    name: "Prerrogativas e Uso dos Uniformes",
    description: "Prisão em flagrante, cumprimento de pena e regras para uso do fardamento."
  },
  {
    id: "pmma-situacoes-especiais",
    name: "Agregação, Reversão, Excedente, Ausente e Extraviado",
    description: "Hipóteses de afastamento temporário, retorno ao quadro e situações atípicas."
  },
  {
    id: "pmma-desligamento-inatividade",
    name: "Desligamento, Reserva Remunerada, Reforma e Exclusão",
    description: "Passagem para a inatividade, limites de idade, demissão de oficiais e licenciamento/exclusão de praças."
  }
];

export const PMMA_QUESTIONS: Omit<Question, 'id' | 'createdAt' | 'authorId'>[] = [
  {
    text: "Em relação à situação dos servidores públicos militares do Estado do Maranhão, assinale a opção correta quanto aos militares que se encontram na situação de inatividade.",
    options: [
      "Os alunos dos cursos de formação de policiais militares e os componentes da reserva quando convocados.",
      "Os militares de carreira e os incluídos voluntariamente na Corporação pelo tempo do compromisso.",
      "Os militares na reserva remunerada sujeitos à convocação e os reformados dispensados definitivamente do serviço ativo.",
      "Apenas os militares que foram demitidos a pedido ou licenciados a bem da disciplina.",
      "Apenas os praças com menos de cinco anos de efetivo serviço que se encontram afastados."
    ],
    correctOptionIndex: 2,
    explanation: "Conforme o Estatuto dos Policiais e Bombeiros Militares do Maranhão (Art. 2º, § 2º, II), encontram-se na inatividade: a) os militares na reserva remunerada, quando sujeitos à convocação; b) os reformados, por terem sido dispensados definitivamente da prestação de serviço na ativa, continuando a perceber remuneração do Estado.",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-generalidades-ingresso",
    year: 2026,
    bank: "Inédita",
    institution: "PMMA / CBMMA",
    position: "Soldado / Oficial",
    difficulty: "easy",
    source: "human"
  },
  {
    text: "Considerando as condições exigidas para a matrícula nos estabelecimentos de ensino militar destinados à formação de praças e oficiais, marque a alternativa correta.",
    options: [
      "Exige-se obrigatoriamente a condição de solteiro para todos os candidatos ao ingresso na Corporação.",
      "A idade máxima permitida para inscrição no concurso público de ingresso é de trinta e cinco anos.",
      "A altura mínima exigida para candidatos do sexo masculino é de um metro e sessenta e cinco centímetros.",
      "O exame toxicológico possui caráter puramente informativo, não podendo eliminar o candidato.",
      "A habilitação para condução de veículos automotores é exigida no mínimo na categoria C para praças."
    ],
    correctOptionIndex: 1,
    explanation: "Conforme atualização promovida pela legislação estadual (Art. 9º, IV do Estatuto e Medida Provisória nº 554/2026), exige-se até a data limite da inscrição a idade máxima de 35 (trinta e cinco) anos. A exigência de ser solteiro foi revogada pela Lei nº 8.362/2005. A altura mínima é de 1,60m para homens e 1,55m para mulheres. O exame toxicológico tem caráter eliminatório e a CNH exigida é no mínimo categoria 'A' ou 'B'.",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-generalidades-ingresso",
    year: 2026,
    bank: "Inédita",
    institution: "PMMA / CBMMA",
    position: "Soldado / Oficial",
    difficulty: "medium",
    source: "human"
  },
  {
    text: "Sobre os postos e graduações na escala hierárquica da Corporação Militar Estadual, assinale a afirmativa correta.",
    options: [
      "O posto é o grau hierárquico da praça, conferido por ato do Comandante-Geral da Polícia Militar.",
      "A graduação é o grau hierárquico do oficial, conferida por decreto do Governador do Estado e confirmada em Carta Patente.",
      "O Capitão pertence ao Círculo de Oficiais Superiores da Corporação.",
      "O posto é o grau hierárquico do oficial, conferido por decreto do Governador do Estado e confirmado em Carta Patente.",
      "Os Subtenentes e Sargentos pertencem ao mesmo círculo hierárquico que os Cabos e Soldados."
    ],
    correctOptionIndex: 3,
    explanation: "De acordo com o Estatuto (Art. 19, §§ 1º e 2º), Posto é o grau hierárquico do oficial, conferido por decreto do Governador do Estado e confirmado em Carta Patente. Já Graduação é o grau hierárquico da praça, conferido por ato do Comandante-Geral. Capitão pertence ao Círculo de Oficiais Intermediários.",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-hierarquia-disciplina",
    year: 2026,
    bank: "Inédita",
    institution: "PMMA / CBMMA",
    position: "Soldado / Oficial",
    difficulty: "easy",
    source: "human"
  },
  {
    text: "Análise a precedência hierárquica referente às praças especiais e demais praças da Corporação e assinale a opção correta.",
    options: [
      "Os Subtenentes são hierarquicamente superiores aos Cadetes.",
      "Os Cadetes são hierarquicamente superiores aos Subtenentes.",
      "Os Alunos do Curso de Formação de Cabos têm precedência hierárquica sobre os Sargentos.",
      "Os Aspirantes-a-Oficial possuem o mesmo grau e equivalência hierárquica que os Cabos e Soldados.",
      "Os Alunos do Curso de Formação de Sargentos estão subordinados hierarquicamente aos Cabos."
    ],
    correctOptionIndex: 1,
    explanation: "Segundo as normas expressas no Estatuto (Art. 22), na precedência entre praças especiais e demais praças: I - os Aspirantes-a-Oficial são hierarquicamente superiores às demais praças; II - os Cadetes são hierarquicamente superiores aos Subtenentes; III - os Alunos do CFS têm precedência sobre os Cabos; IV - os Alunos do CFC têm precedência sobre os demais Soldados.",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-hierarquia-disciplina",
    year: 2026,
    bank: "Inédita",
    institution: "PMMA / CBMMA",
    position: "Soldado / Oficial",
    difficulty: "medium",
    source: "human"
  },
  {
    text: "O servidor militar da ativa convocado para prestar serviços no Gabinete de Segurança Institucional do Tribunal de Justiça ou na Defensoria Pública do Estado encontra-se em qual situação quanto ao exercício funcional?",
    options: [
      "Será considerado em exercício de função de natureza estritamente civil, devendo ser imediatamente agregado.",
      "Será considerado no exercício de função militar, de natureza militar ou de interesse militar, não se aplicando o instituto da agregação.",
      "Será reformado compulsoriamente por exercer cargo fora da estrutura da Polícia Militar.",
      "Será transferido automaticamente para a reserva não remunerada após noventa dias de cessão.",
      "Ficará impedido de concorrer a qualquer promoção por antiguidade enquanto permanecer no órgão."
    ],
    correctOptionIndex: 1,
    explanation: "Conforme o Estatuto com a redação dada pela Lei nº 12.597/2025 (Art. 36, X e XII e § 3º), os serviços prestados nesses órgãos são considerados no exercício de função militar, de natureza militar ou de interesse militar, e ao militar posto à disposição de tais órgãos não se aplica o instituto da agregação.",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-cargo-funcao",
    year: 2026,
    bank: "Inédita",
    institution: "PMMA / CBMMA",
    position: "Soldado / Oficial",
    difficulty: "hard",
    source: "human"
  },
  {
    text: "No que se refere às vedações éticas e ao exercício de atividades econômicas pelos policiais militares da ativa, assinale a afirmativa correta.",
    options: [
      "É permitido ao policial militar da ativa gerenciar ou administrar livremente qualquer empresa comercial.",
      "É vedado ao policial militar da ativa comerciar ou tomar parte na administração de sociedade, exceto como acionista ou cotista em sociedade anônima ou por quotas de responsabilidade limitada.",
      "O policial militar da ativa é proibido de realizar a gestão direta dos seus próprios bens pessoais.",
      "Aos integrantes do Quadro de Saúde é proibido o exercício de qualquer atividade profissional no meio civil.",
      "O militar da ativa pode ser sócio fundador e administrador de firma individual sem restrições."
    ],
    correctOptionIndex: 1,
    explanation: "De acordo com o Estatuto (Art. 41 e § 2º), ao policial militar da ativa é vedado comerciar ou tomar parte na administração ou gerência de sociedade ou dela ser sócio, exceto como acionista ou quotista em sociedade anônima ou por quotas de responsabilidade limitada. É ressalvada a gestão direta dos seus próprios bens.",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-deveres-etica",
    year: 2026,
    bank: "Inédita",
    institution: "PMMA / CBMMA",
    position: "Soldado / Oficial",
    difficulty: "medium",
    source: "human"
  },
  {
    text: "Em caso de concurso entre crime militar e transgressão disciplinar pela mesma conduta praticada por um policial militar, qual será a penalidade aplicável segundo as normas do Estatuto?",
    options: [
      "Serão aplicadas cumulativamente a pena do crime militar e a sanção disciplinar de prisão.",
      "Será aplicada somente a pena relativa ao crime.",
      "Será aplicada apenas a sanção administrativa da transgressão disciplinar, arquivando-se o processo penal.",
      "O militar será sumariamente excluído da Corporação sem necessidade de processo formal.",
      "A sanção disciplinar absorve o crime militar quando a pena privativa de liberdade for inferior a dois anos."
    ],
    correctOptionIndex: 1,
    explanation: "Dispõe o Estatuto (Art. 55, § 2º) de forma expressa que: 'No concurso de crime militar e de transgressão disciplinar será aplicada somente a pena relativa ao crime.'",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-violacao-conselhos",
    year: 2026,
    bank: "Inédita",
    institution: "PMMA / CBMMA",
    position: "Soldado / Oficial",
    difficulty: "medium",
    source: "human"
  },
  {
    text: "Qual é o órgão administrativo/processual competente para julgar e apreciar a incapacidade de permanência na ativa de um Oficial e de uma Praça com estabilidade assegurada, respectivamente?",
    options: [
      "Conselho de Disciplina para o Oficial e Conselho de Justificação para a Praça estável.",
      "Conselho de Justificação para o Oficial e Conselho de Disciplina para a Praça estável.",
      "Conselho Permanente de Justiça para ambos os casos.",
      "Comissão de Promoção de Oficiais para ambos os casos.",
      "Junta Superior de Saúde para o Oficial e Tribunal Maranhense para a Praça."
    ],
    correctOptionIndex: 1,
    explanation: "Conforme o Estatuto (Art. 60 e Art. 61), o Oficial presumivelmente incapaz de permanecer na ativa é submetido a Conselho de Justificação (julgado em última instância pelo Tribunal de Justiça do Estado). Já o Aspirante-a-Oficial e as Praças com estabilidade assegurada são submetidos a Conselho de Disciplina.",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-violacao-conselhos",
    year: 2026,
    bank: "Inédita",
    institution: "PMMA / CBMMA",
    position: "Soldado / Oficial",
    difficulty: "medium",
    source: "human"
  },
  {
    text: "Com quantos anos de efetivo exercício a praça da Polícia Militar do Maranhão adquire a estabilidade na Corporação?",
    options: [
      "Três anos de efetivo exercício.",
      "Dez anos de efetivo exercício.",
      "Cinco anos de efetivo exercício.",
      "Dois anos de efetivo exercício.",
      "Série contínua de sete anos sem punições disciplinares."
    ],
    correctOptionIndex: 2,
    explanation: "De acordo com o Estatuto com a redação dada pela Lei nº 9.131/2010 (Art. 62, III, 'a'), as praças adquirem a estabilidade com 5 (cinco) anos de efetivo exercício.",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-direitos-remuneracao",
    year: 2026,
    bank: "Inédita",
    institution: "PMMA / CBMMA",
    position: "Soldado / Oficial",
    difficulty: "easy",
    source: "human"
  },
  {
    text: "Qual é o prazo de prescrição do direito de recorrer na esfera administrativa quando o militar se julgar prejudicado quanto à composição de Quadro de Acesso para promoção?",
    options: [
      "Cento e vinte dias corridos a contar da publicação.",
      "Trinta dias a contar do recebimento da comunicação oficial.",
      "Sessenta dias úteis contados do ato do Comandante-Geral.",
      "Quinze dias corridos sem direito a pedido de reconsideração.",
      "Cinco anos a contar do ato administrativo impugnado."
    ],
    correctOptionIndex: 1,
    explanation: "Segundo o Estatuto (Art. 63, § 1º, I), o direito de recorrer na esfera administrativa prescreverá em 30 (trinta) dias a contar do recebimento da comunicação oficial, quando se tratar de composição de Quadro de Acesso para promoção. Para os demais casos, o prazo é de 120 (cento e vinte) dias corridos (inciso II).",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-direitos-remuneracao",
    year: 2026,
    bank: "Inédita",
    institution: "PMMA / CBMMA",
    position: "Soldado / Oficial",
    difficulty: "medium",
    source: "human"
  },
  {
    text: "Assinale a alternativa correta a respeito dos meses em que ocorrem ordinariamente as promoções dos militares estaduais do Maranhão.",
    options: [
      "As promoções ocorrem semestralmente nos meses de junho e dezembro de cada ano.",
      "As promoções ocorrem anualmente nos meses de março, agosto e dezembro.",
      "As promoções ocorrem exclusivamente no mês de abril, em comemoração ao aniversário da Corporação.",
      "As promoções são realizadas a cada dois anos nos meses de janeiro e julho.",
      "As promoções acontecem sempre nos meses de maio, setembro e novembro."
    ],
    correctOptionIndex: 1,
    explanation: "Conforme a legislação atualizada (Art. 79-A do Estatuto e Medida Provisória nº 542/2026), as promoções dos militares estaduais ocorrem anualmente nos meses de março, agosto e dezembro.",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-promocao",
    year: 2026,
    bank: "Inédita",
    institution: "PMMA / CBMMA",
    position: "Soldado / Oficial",
    difficulty: "easy",
    source: "human"
  },
  {
    text: "Qual é a duração da licença-prêmio concedida ao servidor militar a cada quinquênio de efetivo serviço prestado?",
    options: [
      "Seis meses, podendo ser parcelada em até três vezes.",
      "Três meses, gozada de uma só vez.",
      "Um mês a cada ano trabalhado, somando cinco meses.",
      "Sessenta dias consecutivos com perda das gratificações de função.",
      "Quarenta e cinco dias, condicionado à prévia aprovação do Comandante-Geral."
    ],
    correctOptionIndex: 1,
    explanation: "De acordo com o Estatuto (Art. 93, § 1º), a licença-prêmio tem a duração de 03 (três) meses, gozada de uma só vez, a cada quinquênio de serviço prestado, quando solicitado pelo interessado, sem prejuízo da remuneração.",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-ferias-licencas",
    year: 2026,
    bank: "Inédita",
    institution: "PMMA / CBMMA",
    position: "Soldado / Oficial",
    difficulty: "easy",
    source: "human"
  },
  {
    text: "A respeito das regras para concessão da Licença para Tratar de Interesse Particular (LTIP), assinale a opção correta.",
    options: [
      "Pode ser concedida a qualquer militar desde a data de sua incorporação, com remuneração mantida.",
      "É concedida ao militar com mais de dez anos de efetivo serviço, sempre com prejuízo da remuneração e do tempo de serviço, não podendo exceder a dois anos.",
      "Não interrompe a contagem de tempo de serviço nem prejudica as promoções por antiguidade.",
      "Tem prazo máximo de cinco anos e garante a contagem de tempo para fins de aposentadoria.",
      "Pode ser concedida por prazo indeterminado desde que autorizada pelo Governador."
    ],
    correctOptionIndex: 1,
    explanation: "Conforme estabelece o Estatuto (Art. 95), a Licença para tratar de interesse particular é a autorização concedida ao militar com mais de 10 (dez) anos de efetivo serviço que a requerer, com prejuízo da remuneração e do tempo de serviço, não podendo exceder a 02 (dois) anos.",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-ferias-licencas",
    year: 2026,
    bank: "Inédita",
    institution: "PMMA / CBMMA",
    position: "Soldado / Oficial",
    difficulty: "medium",
    source: "human"
  },
  {
    text: "Sobre as prerrogativas dos policiais militares quanto à prisão e lavratura de flagrante delito por autoridade policial civil, assinale a opção correta.",
    options: [
      "O policial militar pode ser recolhido a qualquer presídio comum até o julgamento final.",
      "O policial militar só pode ser preso por autoridade policial civil em caso de flagrante delito, devendo ser detido na delegacia apenas durante o tempo necessário para a lavratura do auto e imediatamente entregue à autoridade militar mais próxima.",
      "O policial militar jamais poderá ser detido por autoridade policial civil, mesmo que pego em flagrante delito.",
      "A lavratura do flagrante de policial militar deve ser feita obrigatoriamente dentro de um prazo máximo de quarenta e oito horas em delegacia especializada.",
      "A autoridade militar mais próxima só assume a custódia após autorização expressa do Juiz de Direito."
    ],
    correctOptionIndex: 1,
    explanation: "De acordo com o Estatuto (Art. 100 e § 1º), o policial-militar só poderá ser preso por autoridade policial em caso de flagrante delito. Quando se der tal caso, o militar só poderá ser detido na delegacia durante o tempo necessário para a lavratura do flagrante, sendo imediatamente apresentado à autoridade militar mais próxima.",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-prerrogativas-uniformes",
    year: 2026,
    bank: "Inédita",
    institution: "PMMA / CBMMA",
    position: "Soldado / Oficial",
    difficulty: "medium",
    source: "human"
  },
  {
    text: "O que caracteriza a situação de Agregação do policial militar na estrutura da Corporação?",
    options: [
      "É o desligamento definitivo do serviço ativo com perda total do posto ou graduação.",
      "É a situação na qual o policial militar da ativa deixa de ocupar vaga na escala hierárquica do seu quadro, nela permanecendo sem número.",
      "É o retorno automático ao serviço ativo do militar que se encontrava reformado.",
      "É a movimentação do militar entre diferentes batalhões do interior do Estado por conveniência da disciplina.",
      "É a punição disciplinar aplicada em decorrência de sentença condenatória por crime comum."
    ],
    correctOptionIndex: 1,
    explanation: "Define o Estatuto (Art. 106) que Agregação é a situação na qual o policial-militar da ativa deixa de ocupar vaga na escala hierárquica do seu quadro, nela permanecendo sem número.",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-situacoes-especiais",
    year: 2026,
    bank: "Inédita",
    institution: "PMMA / CBMMA",
    position: "Soldado / Oficial",
    difficulty: "easy",
    source: "human"
  },
  {
    text: "Quando um policial militar da ativa, no desempenho de suas funções ou em operações de serviço, tem seu paradeiro ignorado por mais de oito dias consecutivos sem indícios de deserção, ele é considerado:",
    options: [
      "Ausente.",
      "Desertor.",
      "Desaparecido.",
      "Extraviado.",
      "Excedente."
    ],
    correctOptionIndex: 2,
    explanation: "Conforme o Estatuto (Art. 113), é considerado desaparecido o militar da ativa que, no desempenho de qualquer serviço, em viagens ou em operações militares, tiver paradeiro ignorado por mais de 08 (oito) dias consecutivos. Se permanecer desaparecido por mais de 30 (trinta) dias, será oficialmente considerado extraviado (Art. 114).",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-situacoes-especiais",
    year: 2026,
    bank: "Inédita",
    institution: "PMMA / CBMMA",
    position: "Soldado / Oficial",
    difficulty: "easy",
    source: "human"
  },
  {
    text: "Em relação à idade limite para a transferência compulsória (ex-offício) do militar para a reserva remunerada, assinale a alternativa correta conforme a legislação em vigor.",
    options: [
      "Para os Coronéis a idade limite é de setenta anos, e para as Praças de sessenta anos.",
      "Para os Coronéis a idade limite é de sessenta e sete anos, e para as demais categorias de Oficiais e Praças é de sessenta e cinco anos.",
      "Para todos os militares da ativa, independentemente do posto ou graduação, a idade limite é de trinta e cinco anos de serviço.",
      "A reserva compulsória por idade aplica-se apenas aos militares que ingressaram na Corporação antes do ano de dois mil.",
      "Para os Oficiais de Saúde a idade limite é de cinquenta e oito anos."
    ],
    correctOptionIndex: 1,
    explanation: "Com base nas alterações da legislação (Art. 120, I, 'a' e 'c', trazidas pela LC 224/2020 e Lei nº 11.295/2020), o militar será compulsoriamente transferido para a reserva remunerada ao atingir as seguintes idades limites: Coronel: 67 (sessenta e sete) anos; demais postos de Oficiais e Praças: 65 (sessenta e cinco) anos.",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-desligamento-inatividade",
    year: 2026,
    bank: "Inédita",
    institution: "PMMA / CBMMA",
    position: "Soldado / Oficial",
    difficulty: "medium",
    source: "human"
  },
  {
    text: "Qual sanção de desligamento do serviço ativo aplica-se exclusivamente aos Oficiais e qual se aplica exclusivamente às Praças sem estabilidade assegurada que ingressarem no mau comportamento, respectivamente?",
    options: [
      "Exclusão a bem da disciplina para o Oficial e Demissão para a Praça.",
      "Demissão para o Oficial e Licenciamento a bem da disciplina para a Praça sem estabilidade.",
      "Reforma compulsória para o Oficial e Deserção para a Praça.",
      "Licenciamento para o Oficial e Demissão a pedido para a Praça.",
      "Agregação compulsória para o Oficial e Extravio para a Praça."
    ],
    correctOptionIndex: 1,
    explanation: "Conforme o Estatuto (Art. 133 e Art. 139, § 4º), a demissão é uma forma de desligamento aplicada exclusivamente aos oficiais. Por sua vez, o licenciamento aplica-se somente às praças, sendo o licenciamento a bem da disciplina aplicado especificamente às praças sem estabilidade assegurada que ingressarem no mau comportamento.",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-desligamento-inatividade",
    year: 2026,
    bank: "Inédita",
    institution: "PMMA / CBMMA",
    position: "Soldado / Oficial",
    difficulty: "medium",
    source: "human"
  }
];

export const PMMA_FLASHCARDS: Omit<Flashcard, 'id' | 'createdAt' | 'uid' | 'interval' | 'repetition' | 'easeFactor' | 'nextReviewDate'>[] = [
  {
    front: "Quais são as duas situações em que os servidores públicos militares do Estado do Maranhão podem se encontrar?",
    back: "Ativa e Inatividade.",
    explanation: "Art. 2º, § 2º: Ativa (militares de carreira, temporários/incluídos voluntariamente, reserva convocada e alunos dos cursos de formação) e Inatividade (reserva remunerada e reformados).",
    caption: "Situações dos Militares",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-generalidades-ingresso",
    isPublic: true
  },
  {
    front: "A carreira de Oficial da Polícia Militar do Maranhão é privativa de quem?",
    back: "Privativa de brasileiros natos.",
    explanation: "Art. 4º, § 2º: É privativa de brasileiros natos a carreira de Oficial da Polícia Militar.",
    caption: "Carreira de Oficial",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-generalidades-ingresso",
    isPublic: true
  },
  {
    front: "Qual é a idade máxima e a altura mínima exigidas para ingresso na Polícia Militar do Maranhão?",
    back: "Idade máxima: 35 anos (na data limite da inscrição). Altura mínima: 1,60m (homens) e 1,55m (mulheres).",
    explanation: "Art. 9º, IV e VII (conforme redação da Medida Provisória nº 554/2026).",
    caption: "Requisitos de Ingresso",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-generalidades-ingresso",
    isPublic: true
  },
  {
    front: "O exame toxicológico no concurso para formação de policiais militares é obrigatório e possui qual caráter?",
    back: "É obrigatório e possui caráter eliminatório.",
    explanation: "Art. 9º, Parágrafo único (acrescentado pela Lei nº 9.712/2012).",
    caption: "Exame Toxicológico",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-generalidades-ingresso",
    isPublic: true
  },
  {
    front: "Como são conferidos o Posto do Oficial e a Graduação da Praça?",
    back: "Posto: por Decreto do Governador e confirmado em Carta Patente. Graduação: por ato do Comandante-Geral.",
    explanation: "Art. 19, §§ 1º e 2º.",
    caption: "Posto vs. Graduação",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-hierarquia-disciplina",
    isPublic: true
  },
  {
    front: "Quais praças são denominadas Praças Especiais?",
    back: "Os Aspirantes-a-Oficial e os Cadetes.",
    explanation: "Art. 19, § 3º: Os Aspirantes-a-Oficial e os Cadetes são denominados Praças Especiais.",
    caption: "Praças Especiais",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-hierarquia-disciplina",
    isPublic: true
  },
  {
    front: "Qual a relação de precedência hierárquica entre Cadetes e Subtenentes?",
    back: "Os Cadetes são hierarquicamente superiores aos Subtenentes.",
    explanation: "Art. 22, II.",
    caption: "Precedência de Cadetes",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-hierarquia-disciplina",
    isPublic: true
  },
  {
    front: "É permitido ao policial militar da ativa tomar parte na administração ou gerência de sociedades comerciais?",
    back: "Não. É vedado comerciar ou administrar empresas, exceto como acionista ou cotista em S/A ou LTDA.",
    explanation: "Art. 41, caput.",
    caption: "Vedação ao Comércio",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-deveres-etica",
    isPublic: true
  },
  {
    front: "No concurso entre crime militar e transgressão disciplinar pela mesma conduta, qual pena é aplicada?",
    back: "Aplica-se somente a pena relativa ao crime.",
    explanation: "Art. 55, § 2º.",
    caption: "Crime vs. Transgressão",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-violacao-conselhos",
    isPublic: true
  },
  {
    front: "Qual a diferença entre Conselho de Justificação e Conselho de Disciplina quanto aos militares submetidos?",
    back: "Justificação: para Oficiais. Disciplina: para Aspirantes-a-Oficial e Praças com estabilidade assegurada.",
    explanation: "Art. 60 e Art. 61.",
    caption: "Conselhos de Apuração",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-violacao-conselhos",
    isPublic: true
  },
  {
    front: "Com quanto tempo de efetivo exercício a praça adquire a estabilidade na PMMA?",
    back: "Com 5 (cinco) anos de efetivo exercício.",
    explanation: "Art. 62, III, 'a' (Redação dada pela Lei nº 9.131/2010).",
    caption: "Estabilidade da Praça",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-direitos-remuneracao",
    isPublic: true
  },
  {
    front: "Qual é o tempo do afastamento total do serviço por motivo de núpcias e de luto?",
    back: "8 (oito) dias para núpcias e 8 (oito) dias para luto.",
    explanation: "Art. 84, I e II.",
    caption: "Afastamentos Núpcias e Luto",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-ferias-licencas",
    isPublic: true
  },
  {
    front: "Quais são as exigências para o militar requerer a Licença para Tratar de Interesse Particular (LTIP)?",
    back: "Ter mais de 10 anos de efetivo serviço. A licença é dada sem remuneração e sem contar tempo, no máximo de 2 anos.",
    explanation: "Art. 95.",
    caption: "Regras da LTIP",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-ferias-licencas",
    isPublic: true
  },
  {
    front: "Qual é o prazo da licença-paternidade e a sua possibilidade de prorrogação no serviço público militar do Maranhão?",
    back: "Prazo inicial de 5 dias consecutivos, podendo ser prorrogado por mais 15 dias (totalizando 20 dias).",
    explanation: "Art. 98, § 3º (Lei nº 10.464/2016). Requerimento em até 2 dias após o nascimento/adoção.",
    caption: "Licença-Paternidade",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-ferias-licencas",
    isPublic: true
  },
  {
    front: "Quando um policial militar é preso pela polícia civil em flagrante, qual o procedimento referente à sua detenção?",
    back: "Permanece na delegacia apenas o tempo necessário para a lavratura do auto e é imediatamente entregue à autoridade militar.",
    explanation: "Art. 100, § 1º.",
    caption: "Prisão em Flagrante",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-prerrogativas-uniformes",
    isPublic: true
  },
  {
    front: "Qual a diferença entre militar Ausente, Desaparecido e Extraviado?",
    back: "Ausente: falta por +24h. Desaparecido: paradeiro ignorado por +8 dias em serviço. Extraviado: desaparecido por +30 dias.",
    explanation: "Art. 111, Art. 113 e Art. 114.",
    caption: "Ausente, Desaparecido e Extraviado",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-situacoes-especiais",
    isPublic: true
  },
  {
    front: "Quais são as idades limites para a transferência compulsória (ex-offício) para a reserva remunerada por idade?",
    back: "Coronel: 67 anos. Demais postos de Oficiais e todas as Praças: 65 anos.",
    explanation: "Art. 120, I (Redação dada pela Lei nº 11.295/2020 e LC 224/2020).",
    caption: "Idade Limite para Reserva",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-desligamento-inatividade",
    isPublic: true
  },
  {
    front: "Qual é o requisito do tempo de oficialato para a demissão a pedido do Oficial Ocorrer SEM indenização ao Estado?",
    back: "Contar mais de 3 (três) anos de oficialato.",
    explanation: "Art. 134, I (Redação dada pela Lei nº 12.597/2025). Com menos de 3 anos de oficialato, exige indenização.",
    caption: "Demissão a Pedido do Oficial",
    subjectId: PMMA_SUBJECT_NAME,
    topicId: "pmma-desligamento-inatividade",
    isPublic: true
  }
];
