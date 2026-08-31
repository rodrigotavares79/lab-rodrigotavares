import Footer from "@/components/Footer";

export default function Processo() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Processo</h1>
          <p className="lede">
            [placeholder] Uma linha sobre o processo de identificação,
            análise e tratamento de riscos.
          </p>

          <div className="body">
            <p>
              [placeholder] Etapas do processo — identificação,
              classificação, priorização, tratamento e monitoramento — e
              como cada uma se conecta ao plano de ação.
            </p>
            <p className="text-muted">
              [placeholder] Fluxograma ou diagrama do processo, se fizer
              sentido incluir.
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
