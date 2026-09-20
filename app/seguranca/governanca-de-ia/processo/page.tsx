import Footer from "@/components/Footer";

export default function GovernancaDeIAProcesso() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Governança de IA</span>
          <h1>Processo</h1>
          <p className="lede">
            [placeholder] O passo a passo para avaliar, aprovar e monitorar
            a adoção de um sistema de IA.
          </p>

          <div className="body">
            <p>
              [placeholder] Etapas do ciclo de vida — da solicitação de uso
              até o monitoramento contínuo pós-aprovação.
            </p>
            <p className="text-muted">
              [placeholder] Critérios de avaliação de risco e quem aprova
              cada nível.
            </p>
          </div>

          <a href="/seguranca/governanca-de-ia" className="status-tag">
            ← Voltar para Governança de IA
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
