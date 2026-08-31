import Footer from "@/components/Footer";

export default function Processo() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Processo</h1>
          <p className="lede">
            O processo de gestão de riscos de TI é o caminho estruturado que
            transforma uma ameaça identificada em uma ação concreta de
            tratamento. Ele garante que nenhum risco fique apenas registrado
            sem que alguém avalie sua relevância e defina o que fazer a
            respeito.
          </p>

          <div className="body">
            <p>O processo segue cinco etapas:</p>
            <ul>
              <li>
                <strong>Identificação</strong> — reconhecer o risco, sua
                origem e o que poderia desencadeá-lo.
              </li>
              <li>
                <strong>Classificação</strong> — categorizar o risco
                (tecnológico, operacional, estratégico, entre outros) e
                definir sua fonte.
              </li>
              <li>
                <strong>Priorização</strong> — avaliar impacto e
                probabilidade para calcular a pontuação da matriz de risco e
                sua criticidade.
              </li>
              <li>
                <strong>Tratamento</strong> — definir e registrar o plano de
                ação responsável por mitigar o risco.
              </li>
              <li>
                <strong>Monitoramento</strong> — acompanhar a execução do
                plano e reavaliar o risco periodicamente até sua mitigação.
              </li>
            </ul>
            <p>
              Essas etapas alimentam diretamente o{" "}
              <strong>Cadastro de Riscos</strong> e o{" "}
              <strong>Dashboard</strong>, mantendo a visão executiva sempre
              atualizada.
            </p>
          </div>

          <a href="/seguranca/gestao-de-riscos" className="status-tag">
            ← Voltar para Gestão de Riscos
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
