import Footer from "@/components/Footer";

export default function GovernancaDeIAInventario() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Governança de IA</span>
          <h1>Inventário de Sistemas de IA</h1>
          <p className="lede">
            [placeholder] Catálogo dos modelos e ferramentas de IA em uso na
            organização, com finalidade, dono e nível de risco.
          </p>

          <div className="body">
            <p>
              [placeholder] Lista dos sistemas cadastrados — ainda sem
              formulário de cadastro nem banco de dados.
            </p>
            <p className="text-muted">
              [placeholder] Quando ganhar cadastro próprio, cada sistema
              deve trazer finalidade, dados que processa, fornecedor e
              status de aprovação.
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
