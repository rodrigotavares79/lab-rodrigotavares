import Footer from "@/components/Footer";

export default function PoliticaDePrivacidade() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Condomínio</span>
          <h1>Política de Privacidade</h1>
          <p className="lede">
            Como os dados dos condôminos são tratados neste sistema de gestão de chamados.
          </p>
          <p className="field-helper" style={{ marginTop: "-0.5rem" }}>
            Última atualização: 25/10/2026.
          </p>

          <div className="dashboard" style={{ marginTop: "1.5rem" }}>
            <div className="dash-panel">
              <div className="dash-panel-header">Quem trata os dados</div>
              <div className="dash-panel-body">
                <p style={{ margin: 0 }}>
                  Este sistema é operado pelo síndico do condomínio para organizar a
                  abertura e o acompanhamento de chamados de manutenção e assistência.
                  Dúvidas sobre esta política ou sobre os dados tratados aqui podem ser
                  enviadas para{" "}
                  <a href="mailto:condominio@rodrigotavares.com.br">condominio@rodrigotavares.com.br</a>.
                </p>
              </div>
            </div>

            <div className="dash-panel">
              <div className="dash-panel-header">Quais dados coletamos</div>
              <div className="dash-panel-body">
                <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                  <li>Nome, e-mail e unidade (bloco/apartamento) de cada condômino.</li>
                  <li>Título, descrição, status e histórico de movimentação dos chamados abertos.</li>
                  <li>Fotos ou PDFs anexados a um chamado, quando enviados.</li>
                  <li>Mensagens trocadas dentro de um chamado.</li>
                </ul>
                <p className="field-helper" style={{ marginBottom: 0 }}>
                  Não coletamos telefone, CPF, dados financeiros ou qualquer dado
                  sensível (saúde, origem racial, convicção religiosa, etc.).
                </p>
              </div>
            </div>

            <div className="dash-panel">
              <div className="dash-panel-header">Por que coletamos (finalidade)</div>
              <div className="dash-panel-body">
                <p style={{ margin: 0 }}>
                  Exclusivamente para operar o sistema de chamados: permitir que um
                  condômino registre um problema, que o síndico/conselheiro acompanhe e
                  resolva, e que ambos tenham um histórico do que foi feito. A base
                  legal é o uso do sistema pelo próprio condômino (execução do serviço
                  de gestão do condomínio que ele integra) e o legítimo interesse do
                  condomínio em manter um registro organizado de manutenção.
                </p>
              </div>
            </div>

            <div className="dash-panel">
              <div className="dash-panel-header">Quem mais tem acesso</div>
              <div className="dash-panel-body">
                <p style={{ margin: 0, marginBottom: "0.75rem" }}>
                  Dentro do condomínio: o síndico e os conselheiros veem e gerenciam
                  todos os chamados; o conselheiro-admin só visualiza; cada condômino vê
                  os chamados que ele mesmo abriu, mais os marcados como "visíveis a
                  todos".
                </p>
                <p style={{ margin: 0 }}>
                  Fora do condomínio, usamos prestadores de infraestrutura que
                  armazenam ou processam esses dados só para o sistema funcionar — eles
                  não usam os dados para nenhuma outra finalidade:
                </p>
                <ul style={{ marginTop: "0.5rem", marginBottom: 0, paddingLeft: "1.25rem" }}>
                  <li><strong>Clerk</strong> — login e identificação de cada usuário.</li>
                  <li><strong>Neon</strong> — banco de dados onde os chamados e cadastros ficam guardados.</li>
                  <li><strong>Vercel</strong> — hospedagem do site e armazenamento das fotos/PDFs anexados.</li>
                  <li><strong>Resend</strong> — envio dos e-mails automáticos (ex.: aviso de mudança de status).</li>
                </ul>
              </div>
            </div>

            <div className="dash-panel">
              <div className="dash-panel-header">Por quanto tempo guardamos</div>
              <div className="dash-panel-body">
                <p style={{ margin: 0 }}>
                  Enquanto o condômino fizer parte do condomínio e usar o sistema, e por
                  um período adicional depois disso para manter o histórico de
                  manutenção do prédio (ex.: comprovar que um reparo foi feito). Se você
                  quiser que seus dados sejam removidos antes disso, entre em contato —
                  ver "Seus direitos" abaixo.
                </p>
              </div>
            </div>

            <div className="dash-panel">
              <div className="dash-panel-header">Como protegemos</div>
              <div className="dash-panel-body">
                <p style={{ margin: 0 }}>
                  Login é feito por convite (não existe cadastro público); cada tela
                  restrita confere o perfil do usuário antes de mostrar dados; toda a
                  comunicação é feita por HTTPS; o banco de dados e o armazenamento de
                  arquivos são geridos por fornecedores especializados (Neon e Vercel).
                </p>
              </div>
            </div>

            <div className="dash-panel">
              <div className="dash-panel-header">Seus direitos (LGPD)</div>
              <div className="dash-panel-body">
                <p style={{ margin: 0, marginBottom: "0.5rem" }}>
                  Você pode, a qualquer momento, pedir ao síndico (pelo e-mail acima):
                </p>
                <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                  <li>Confirmação de quais dados seus estão registrados.</li>
                  <li>Correção de dados incorretos ou desatualizados.</li>
                  <li>Exclusão de dados que não precisem mais ser mantidos.</li>
                  <li>Uma cópia dos seus dados em formato legível.</li>
                </ul>
              </div>
            </div>

            <div className="dash-panel" style={{ background: "var(--bg)" }}>
              <div className="dash-panel-body">
                <p className="field-helper" style={{ margin: 0 }}>
                  Este texto é um modelo básico de referência, não uma peça jurídica —
                  antes de usar o sistema com moradores de verdade, vale uma revisão por
                  quem cuida juridicamente do condomínio.
                </p>
              </div>
            </div>
          </div>

          <a
            href="/condominio"
            className="status-tag"
            style={{ marginTop: "2.5rem", display: "inline-block" }}
          >
            ← Voltar para Gestão de Condomínio
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
