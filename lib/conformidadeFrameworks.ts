// Mapeamento automático de riscos para frameworks de segurança:
//   - CIS Controls v8.1 (18 controles)
//   - NIST Cybersecurity Framework (CSF) 2.0 (subcategorias)
//   - ISO/IEC 27001:2022, Anexo A (93 controles)
//
// Como funciona: cada TEMA de segurança tem palavras-chave e os controles
// correspondentes nos três frameworks. O texto do risco (gatilho, resultado
// potencial, categoria e fatores/controles cadastrados) é comparado com as
// palavras-chave; os temas encontrados definem os controles relacionados.
// É um mapeamento indicativo, determinístico e explicável (mostra os termos
// que levaram a cada tema). Os títulos dos controles são resumos próprios em
// português — consulte o texto oficial de cada framework.

export type Controle = { id: string; titulo: string };

export type Tema = {
  id: string;
  nome: string;
  // Radicais sem acento, em minúsculas; casam no início de palavra. Com "$"
  // no fim, exigem a palavra inteira (para siglas e palavras curtas).
  palavras: string[];
  cis: Controle[];
  nist: Controle[];
  iso: Controle[];
};

export const FRAMEWORKS = {
  cis: { nome: "CIS Controls", versao: "v8.1" },
  nist: { nome: "NIST CSF", versao: "2.0" },
  iso: { nome: "ISO/IEC 27001", versao: "2022 · Anexo A" },
} as const;

export type FrameworkId = keyof typeof FRAMEWORKS;

export const TEMAS: Tema[] = [
  {
    id: "vulnerabilidades",
    nome: "Gestão de vulnerabilidades e correções",
    palavras: ["vulnerab", "cvss", "cve$", "cves$", "patch", "correcao de seguranca", "atualizacao de seguranca", "exploit", "zero day", "obsolet", "fim de suporte", "sem suporte", "legado", "desatualiz", "atualizacao critica"],
    cis: [
      { id: "CIS 7", titulo: "Gestão contínua de vulnerabilidades" },
      { id: "CIS 18", titulo: "Testes de invasão" },
    ],
    nist: [
      { id: "ID.RA-01", titulo: "Vulnerabilidades dos ativos são identificadas e registradas" },
      { id: "ID.RA-08", titulo: "Processos para receber, analisar e responder a vulnerabilidades" },
      { id: "PR.PS-02", titulo: "Software é mantido, substituído ou removido conforme o risco" },
    ],
    iso: [
      { id: "A.8.8", titulo: "Gestão de vulnerabilidades técnicas" },
      { id: "A.8.19", titulo: "Instalação de software em sistemas operacionais" },
    ],
  },
  {
    id: "identidade",
    nome: "Identidade, autenticação e controle de acesso",
    palavras: ["controle de acesso", "acesso nao autorizado", "acesso indevido", "direitos de acesso", "acessos$", "senha", "credencia", "mfa$", "multifator", "dois fatores", "2fa$", "sso$", "single sign", "autentica", "privilegi", "administrador", "conta de usuario", "contas de usuario", "login", "identidade", "permiss", "perfil de acesso"],
    cis: [
      { id: "CIS 5", titulo: "Gestão de contas" },
      { id: "CIS 6", titulo: "Gestão do controle de acesso" },
    ],
    nist: [
      { id: "PR.AA-01", titulo: "Identidades e credenciais são gerenciadas" },
      { id: "PR.AA-03", titulo: "Usuários, serviços e equipamentos são autenticados" },
      { id: "PR.AA-05", titulo: "Permissões de acesso seguem menor privilégio e segregação de funções" },
    ],
    iso: [
      { id: "A.5.15", titulo: "Controle de acesso" },
      { id: "A.5.16", titulo: "Gestão de identidades" },
      { id: "A.5.17", titulo: "Informações de autenticação" },
      { id: "A.5.18", titulo: "Direitos de acesso" },
      { id: "A.8.2", titulo: "Direitos de acesso privilegiado" },
      { id: "A.8.5", titulo: "Autenticação segura" },
    ],
  },
  {
    id: "backup",
    nome: "Backup e recuperação de dados",
    palavras: ["backup", "copia de seguranca", "restaura", "recuperacao de dados", "perda de dados"],
    cis: [{ id: "CIS 11", titulo: "Recuperação de dados" }],
    nist: [
      { id: "PR.DS-11", titulo: "Backups são criados, protegidos, mantidos e testados" },
      { id: "RC.RP-01", titulo: "Plano de recuperação é executado após um incidente" },
    ],
    iso: [{ id: "A.8.13", titulo: "Backup das informações" }],
  },
  {
    id: "continuidade",
    nome: "Disponibilidade, continuidade e capacidade",
    palavras: ["indisponib", "disponibilidade", "queda de servico", "queda do", "queda da", "queda de energia", "queda de link", "interrup", "parada", "atraso", "continuidade", "contingencia", "redundan", "capacidade", "lentidao", "desempenho", "performance", "energia", "link$", "instabilidade", "enlace", "saturac", "esgotamento", "armazenamento", "espaco em disco", "pico", "negacao de servico", "ddos$", "nobreak"],
    cis: [
      { id: "CIS 11", titulo: "Recuperação de dados" },
      { id: "CIS 12", titulo: "Gestão da infraestrutura de rede" },
    ],
    nist: [
      { id: "PR.IR-03", titulo: "Mecanismos garantem resiliência em situações normais e adversas" },
      { id: "PR.IR-04", titulo: "Capacidade de recursos adequada para garantir disponibilidade" },
      { id: "RC.RP-01", titulo: "Plano de recuperação é executado após um incidente" },
    ],
    iso: [
      { id: "A.5.29", titulo: "Segurança da informação durante disrupção" },
      { id: "A.5.30", titulo: "Prontidão de TIC para continuidade de negócios" },
      { id: "A.8.6", titulo: "Gestão de capacidade" },
      { id: "A.8.14", titulo: "Redundância dos recursos de processamento" },
    ],
  },
  {
    id: "malware",
    nome: "Malware, ransomware e ameaças por e-mail/web",
    palavras: ["malware", "ransomware", "virus", "trojan", "phishing", "e-mail", "email", "spam", "navegador", "antivirus", "endpoint", "edr$"],
    cis: [
      { id: "CIS 9", titulo: "Proteções de e-mail e navegador" },
      { id: "CIS 10", titulo: "Defesas contra malware" },
    ],
    nist: [
      { id: "DE.CM-09", titulo: "Hardware, software e dados são monitorados contra eventos adversos" },
      { id: "PR.PS-05", titulo: "Instalação de software não autorizado é prevenida" },
    ],
    iso: [
      { id: "A.8.7", titulo: "Proteção contra malware" },
      { id: "A.8.23", titulo: "Filtragem web" },
      { id: "A.8.1", titulo: "Dispositivos de usuário final" },
    ],
  },
  {
    id: "conscientizacao",
    nome: "Conscientização e capacitação",
    palavras: ["treinamento", "conscientiza", "capacita", "engenharia social", "erro humano", "falha humana", "colaborador"],
    cis: [{ id: "CIS 14", titulo: "Conscientização e treinamento em segurança" }],
    nist: [
      { id: "PR.AT-01", titulo: "Pessoal recebe conscientização e treinamento em segurança" },
      { id: "PR.AT-02", titulo: "Funções especializadas recebem treinamento específico" },
    ],
    iso: [{ id: "A.6.3", titulo: "Conscientização, educação e treinamento em segurança da informação" }],
  },
  {
    id: "fornecedores",
    nome: "Fornecedores, terceiros e nuvem",
    palavras: ["fornecedor", "terceiro", "terceiriz", "prestador", "contrato", "sla$", "acordo de nivel", "parceiro", "nuvem", "cloud", "saas", "outsourc", "gateway", "servico externo"],
    cis: [{ id: "CIS 15", titulo: "Gestão de provedores de serviço" }],
    nist: [
      { id: "GV.SC-05", titulo: "Requisitos de segurança da cadeia de suprimentos em contratos" },
      { id: "GV.SC-07", titulo: "Riscos de fornecedores são identificados, avaliados e monitorados" },
      { id: "ID.AM-04", titulo: "Inventário dos serviços prestados por fornecedores" },
    ],
    iso: [
      { id: "A.5.19", titulo: "Segurança da informação nas relações com fornecedores" },
      { id: "A.5.20", titulo: "Segurança da informação nos contratos com fornecedores" },
      { id: "A.5.22", titulo: "Monitoramento e revisão dos serviços de fornecedores" },
      { id: "A.5.23", titulo: "Segurança da informação no uso de serviços em nuvem" },
    ],
  },
  {
    id: "monitoramento",
    nome: "Registros (logs), monitoramento e detecção",
    palavras: ["log$", "logs$", "monitora", "detec", "alerta", "siem$", "soc$", "trilha de auditoria", "rastreab"],
    cis: [
      { id: "CIS 8", titulo: "Gestão de logs de auditoria" },
      { id: "CIS 13", titulo: "Monitoramento e defesa de rede" },
    ],
    nist: [
      { id: "PR.PS-04", titulo: "Registros de log são gerados e disponibilizados para monitoramento" },
      { id: "DE.CM-01", titulo: "Redes e serviços de rede são monitorados" },
      { id: "DE.AE-02", titulo: "Eventos potencialmente adversos são analisados" },
    ],
    iso: [
      { id: "A.8.15", titulo: "Registro de logs" },
      { id: "A.8.16", titulo: "Atividades de monitoramento" },
    ],
  },
  {
    id: "incidentes",
    nome: "Gestão de incidentes",
    palavras: ["incidente", "resposta a incidente", "ataque", "invasao", "comprometimento", "vazamento", "violacao"],
    cis: [{ id: "CIS 17", titulo: "Gestão de resposta a incidentes" }],
    nist: [
      { id: "DE.AE-08", titulo: "Incidentes são declarados quando atendem aos critérios" },
      { id: "RS.MA-01", titulo: "Plano de resposta a incidentes é executado" },
      { id: "RS.MI-01", titulo: "Incidentes são contidos" },
    ],
    iso: [
      { id: "A.5.24", titulo: "Planejamento e preparação da gestão de incidentes" },
      { id: "A.5.25", titulo: "Avaliação e decisão sobre eventos de segurança" },
      { id: "A.5.26", titulo: "Resposta a incidentes de segurança da informação" },
      { id: "A.6.8", titulo: "Notificação de eventos de segurança da informação" },
    ],
  },
  {
    id: "dados",
    nome: "Proteção de dados e privacidade",
    palavras: ["dados pessoais", "dado pessoal", "lgpd", "privacidade", "vazamento", "criptograf", "cifra", "sigilo", "confidencial", "classificacao da informacao", "dlp$", "titular", "certificado", "ssl$", "tls$"],
    cis: [{ id: "CIS 3", titulo: "Proteção de dados" }],
    nist: [
      { id: "ID.AM-07", titulo: "Inventário de dados e metadados" },
      { id: "PR.DS-01", titulo: "Confidencialidade, integridade e disponibilidade de dados em repouso" },
      { id: "PR.DS-02", titulo: "Confidencialidade, integridade e disponibilidade de dados em trânsito" },
    ],
    iso: [
      { id: "A.5.12", titulo: "Classificação da informação" },
      { id: "A.5.34", titulo: "Privacidade e proteção de dados pessoais" },
      { id: "A.8.12", titulo: "Prevenção de vazamento de dados" },
      { id: "A.8.24", titulo: "Uso de criptografia" },
    ],
  },
  {
    id: "ativos",
    nome: "Inventário de ativos e software",
    palavras: ["inventario", "ativo", "shadow", "nao autorizado", "nao homologad", "licenca", "software nao"],
    cis: [
      { id: "CIS 1", titulo: "Inventário e controle de ativos corporativos" },
      { id: "CIS 2", titulo: "Inventário e controle de ativos de software" },
    ],
    nist: [
      { id: "ID.AM-01", titulo: "Inventário de hardware" },
      { id: "ID.AM-02", titulo: "Inventário de software, serviços e sistemas" },
    ],
    iso: [
      { id: "A.5.9", titulo: "Inventário de informações e outros ativos associados" },
      { id: "A.8.19", titulo: "Instalação de software em sistemas operacionais" },
    ],
  },
  {
    id: "configuracao",
    nome: "Configuração segura e gestão de mudanças",
    palavras: ["configura", "hardening", "mudanca", "change", "padrao de seguranca", "baseline", "deploy", "implantacao", "regra temporaria", "excecao", "excecoes"],
    cis: [{ id: "CIS 4", titulo: "Configuração segura de ativos e software" }],
    nist: [
      { id: "PR.PS-01", titulo: "Práticas de gestão de configuração são estabelecidas e aplicadas" },
      { id: "ID.RA-07", titulo: "Mudanças e exceções são gerenciadas e avaliadas quanto ao risco" },
    ],
    iso: [
      { id: "A.8.9", titulo: "Gestão de configuração" },
      { id: "A.8.32", titulo: "Gestão de mudanças" },
    ],
  },
  {
    id: "rede",
    nome: "Segurança de redes",
    palavras: ["rede$", "redes$", "rede corporativa", "rede interna", "firewall", "segmenta", "vpn$", "perimetro", "wi-fi", "wifi", "porta aberta", "exposto a internet", "dns$", "negacao de servico", "ddos$"],
    cis: [
      { id: "CIS 12", titulo: "Gestão da infraestrutura de rede" },
      { id: "CIS 13", titulo: "Monitoramento e defesa de rede" },
    ],
    nist: [
      { id: "PR.IR-01", titulo: "Redes e ambientes são protegidos contra acesso e uso não autorizados" },
      { id: "DE.CM-01", titulo: "Redes e serviços de rede são monitorados" },
    ],
    iso: [
      { id: "A.8.20", titulo: "Segurança de redes" },
      { id: "A.8.21", titulo: "Segurança dos serviços de rede" },
      { id: "A.8.22", titulo: "Segregação de redes" },
    ],
  },
  {
    id: "aplicacoes",
    nome: "Desenvolvimento e segurança de aplicações",
    palavras: ["aplicacao", "aplicativo", "desenvolv", "codigo fonte", "codigo-fonte", "api$", "apis$", "sistema web", "portal", "software proprio", "homologacao", "integracao", "biblioteca", "dependencia"],
    cis: [{ id: "CIS 16", titulo: "Segurança de software aplicativo" }],
    nist: [{ id: "PR.PS-06", titulo: "Práticas de desenvolvimento seguro são integradas e monitoradas" }],
    iso: [
      { id: "A.8.25", titulo: "Ciclo de vida de desenvolvimento seguro" },
      { id: "A.8.26", titulo: "Requisitos de segurança de aplicações" },
      { id: "A.8.28", titulo: "Codificação segura" },
      { id: "A.8.29", titulo: "Testes de segurança no desenvolvimento e aceitação" },
    ],
  },
  {
    id: "governanca",
    nome: "Governança, processos e conformidade",
    palavras: ["processo", "politica", "governanca", "conformidade", "regulat", "legal", "norma", "auditoria", "custo", "orcamento", "estrateg", "satisfacao", "indicador", "metas$", "procedimento", "papeis", "responsabilidade"],
    cis: [],
    nist: [
      { id: "GV.OC-03", titulo: "Requisitos legais, regulatórios e contratuais são compreendidos e gerenciados" },
      { id: "GV.PO-01", titulo: "Política de gestão de riscos de cibersegurança é estabelecida" },
      { id: "GV.OV-01", titulo: "Resultados da estratégia de risco são revisados para ajustar a direção" },
      { id: "GV.RR-02", titulo: "Papéis, responsabilidades e autoridades são definidos e comunicados" },
    ],
    iso: [
      { id: "A.5.1", titulo: "Políticas de segurança da informação" },
      { id: "A.5.2", titulo: "Papéis e responsabilidades de segurança da informação" },
      { id: "A.5.31", titulo: "Requisitos legais, estatutários, regulatórios e contratuais" },
      { id: "A.5.36", titulo: "Conformidade com políticas, regras e normas" },
      { id: "A.5.37", titulo: "Procedimentos operacionais documentados" },
    ],
  },
  {
    id: "fisico",
    nome: "Segurança física e ambiental",
    palavras: ["fisic", "datacenter", "data center", "incendio", "inundac", "climatiza", "sala de servidor", "furto", "roubo", "catraca"],
    cis: [],
    nist: [
      { id: "PR.AA-06", titulo: "Acesso físico aos ativos é gerenciado, monitorado e aplicado" },
      { id: "PR.IR-02", titulo: "Ativos de tecnologia são protegidos contra ameaças ambientais" },
    ],
    iso: [
      { id: "A.7.1", titulo: "Perímetros de segurança física" },
      { id: "A.7.2", titulo: "Entrada física" },
      { id: "A.7.5", titulo: "Proteção contra ameaças físicas e ambientais" },
      { id: "A.7.11", titulo: "Serviços de infraestrutura (utilidades)" },
    ],
  },
];

// Quando nenhum tema é identificado, o risco ainda se liga aos requisitos
// gerais de gestão de riscos de cada framework.
export const TEMA_GERAL: Tema = {
  id: "geral",
  nome: "Gestão de riscos (genérico)",
  palavras: [],
  cis: [],
  nist: [
    { id: "ID.RA-05", titulo: "Ameaças, vulnerabilidades, probabilidades e impactos são usados para priorizar riscos" },
    { id: "ID.RA-06", titulo: "Respostas aos riscos são escolhidas, priorizadas, planejadas e acompanhadas" },
  ],
  iso: [
    { id: "6.1.2", titulo: "Avaliação de riscos de segurança da informação (cláusula)" },
    { id: "6.1.3", titulo: "Tratamento de riscos de segurança da informação (cláusula)" },
  ],
};

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escaparRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function padrao(p: string): RegExp {
  const inteira = p.endsWith("$");
  const base = escaparRegex(inteira ? p.slice(0, -1) : p);
  return new RegExp(`(^|\\s)${base}${inteira ? "(?=\\s|$)" : ""}`);
}

const PADROES = new Map(
  TEMAS.map((t) => [t.id, t.palavras.map((p) => ({ palavra: p.replace(/\$$/, ""), re: padrao(p) }))])
);

export type TemaEncontrado = { tema: Tema; termos: string[] };

export type Mapeamento = {
  temas: TemaEncontrado[];
  generico: boolean;
  cis: Controle[];
  nist: Controle[];
  iso: Controle[];
};

const MAX_TEMAS = 4;

/** Mapeia o texto de um risco para os temas e controles dos três frameworks. */
export function mapearRisco(texto: string): Mapeamento {
  const alvo = ` ${normalizar(texto)} `;
  const encontrados: TemaEncontrado[] = [];
  for (const tema of TEMAS) {
    const termos = (PADROES.get(tema.id) || []).filter((p) => p.re.test(alvo)).map((p) => p.palavra);
    if (termos.length) encontrados.push({ tema, termos });
  }
  encontrados.sort((a, b) => b.termos.length - a.termos.length);
  const temas = encontrados.slice(0, MAX_TEMAS);
  const generico = temas.length === 0;
  const fonte = generico ? [TEMA_GERAL] : temas.map((t) => t.tema);

  const juntar = (lista: Controle[][]) => {
    const vistos = new Map<string, Controle>();
    for (const c of lista.flat()) if (!vistos.has(c.id)) vistos.set(c.id, c);
    return [...vistos.values()];
  };

  return {
    temas,
    generico,
    cis: juntar(fonte.map((t) => t.cis)),
    nist: juntar(fonte.map((t) => t.nist)),
    iso: juntar(fonte.map((t) => t.iso)),
  };
}
