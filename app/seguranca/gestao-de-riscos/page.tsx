import Footer from "@/components/Footer";

// Página inicial do módulo. A navegação fica só no menu lateral
// (RiscosShell); aqui os atalhos aparecem como cards com descrição, para
// explicar cada frente sem repetir o menu.

const BASE = "/seguranca/gestao-de-riscos";

const FRENTES = [
  {
    grupo: "Governança",
    titulo: "Política",
    href: `${BASE}/politica`,
    descricao:
      "As diretrizes que orientam como os riscos são tratados, incluindo papéis, responsabilidades e periodicidade de revisão.",
  },
  {
    grupo: "Governança",
    titulo: "Processo",
    href: `${BASE}/processo`,
    descricao: "O passo a passo utilizado para identificar, classificar, priorizar e tratar cada risco.",
  },
  {
    grupo: "Operação",
    titulo: "Cadastro de Riscos",
    href: `${BASE}/cadastro-de-riscos`,
    descricao:
      "O formulário onde os riscos são registrados individualmente ou em lote (CSV), com identificação e análise de impacto.",
  },
  {
    grupo: "Operação",
    titulo: "Lista de Riscos",
    href: `${BASE}/riscos`,
    descricao:
      "Todos os riscos cadastrados, com acesso ao detalhe, nível atual e plano de ação de cada um.",
  },
  {
    grupo: "Visão geral",
    titulo: "Dashboard",
    href: `${BASE}/dashboard`,
    descricao:
      "A visão executiva com indicadores, gráficos e o status consolidado dos riscos e planos de ação.",
  },
  {
    grupo: "Apoio",
    titulo: "Guia de Uso",
    href: `${BASE}/guia-de-uso`,
    descricao:
      "Como usar cada tela no dia a dia, a matriz de riscos 5×5 e a tecnologia por trás do sistema.",
  },
];

export default function GestaoDeRiscos() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Segurança da Informação</span>
          <h1>Gestão de Riscos</h1>

          <p className="lede">
            Gestão de Riscos de TI é o processo de identificar, analisar e
            tratar situações que podem comprometer a segurança, a
            disponibilidade ou a integridade dos ativos de tecnologia de uma
            organização.
          </p>

          <div className="body">
            <p>
              Na prática, significa mapear o que pode dar errado — desde uma
              falha técnica até uma brecha de segurança — avaliar o quanto
              isso impactaria o negócio e definir ações para reduzir essa
              exposição antes que o problema aconteça.
            </p>
            <p>O processo está organizado em seis frentes:</p>
          </div>

          <div className="section-grid riscos-frentes">
            {FRENTES.map((f) => (
              <a key={f.href} className="section-card" href={f.href}>
                <span className="eyebrow">{f.grupo}</span>
                <h3>{f.titulo}</h3>
                <p>{f.descricao}</p>
              </a>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
