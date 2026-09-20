import Footer from "@/components/Footer";

export default function GovernancaDeIAInventario() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Governança de IA</span>
          <h1>Inventário de Sistemas de IA</h1>
          <p className="lede">
            Catálogo dos sistemas e ferramentas de IA em uso na organização,
            com finalidade, área responsável, dados tratados e status do
            parecer de Cibersegurança.
          </p>

          <div className="body">
            <p>
              Todo sistema de IA em uso deve estar registrado aqui antes de
              ser considerado aprovado para uso — o registro é o que
              sustenta a visibilidade sobre onde e como a IA está sendo
              usada na organização.
            </p>
          </div>

          <div className="form-actions" style={{ marginTop: "1.5rem" }}>
            <a href="/seguranca/governanca-de-ia/inventario/cadastro" className="btn-primary">
              Cadastrar Sistema de IA
            </a>
            <a
              href="/seguranca/governanca-de-ia/dashboard"
              className="status-tag"
              style={{ marginLeft: "1rem" }}
            >
              Ver todos os registros →
            </a>
          </div>

          <a
            href="/seguranca/governanca-de-ia"
            className="status-tag"
            style={{ marginTop: "2.5rem", display: "inline-block" }}
          >
            ← Voltar para Governança de IA
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
