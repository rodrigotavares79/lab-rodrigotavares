import Footer from "@/components/Footer";

export default function GovernancaDeIAPolitica() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Governança de IA</span>
          <h1>Política</h1>
          <p className="lede">
            Política de Governança de Inteligência Artificial — Monstros S.A.
          </p>

          <div className="policy-meta">
            <span><strong>Código do documento:</strong> POL-IA-001</span>
            <span><strong>Classificação:</strong> Uso Interno</span>
            <span><strong>Versão atual:</strong> 1.0</span>
          </div>

          <div className="body policy-body">
            <h2>Histórico de Revisões</h2>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Versão</th>
                  <th>Data</th>
                  <th>Descrição da alteração</th>
                  <th>Autor</th>
                  <th>Aprovado por</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1.0</td>
                  <td>20/09/2026</td>
                  <td>Emissão inicial do documento</td>
                  <td>Renato Bousquet, CISO</td>
                  <td>Alana Ferreira, Diretora de TI</td>
                </tr>
              </tbody>
            </table>

            <h2>1. Objetivo</h2>
            <p>
              Esta política estabelece as diretrizes para a adoção e o uso
              de sistemas de inteligência artificial (IA) na Monstros S.A.,
              assegurando que o ganho de eficiência trazido por essas
              ferramentas não venha às custas de riscos de segurança,
              privacidade ou conformidade legal — em especial quanto ao
              tratamento de dados pessoais e sensíveis, nos termos da LGPD
              e, quando aplicável, do GDPR.
            </p>

            <h2>2. Escopo</h2>
            <p>
              Aplica-se a todo sistema, ferramenta, modelo ou serviço de IA
              — de terceiros ou desenvolvido internamente — utilizado por
              colaboradores, áreas ou fornecedores da Monstros S.A. no
              exercício de suas atividades, independentemente do
              fornecedor, da forma de contratação ou do volume de uso.
            </p>

            <h2>3. Definições</h2>
            <ul>
              <li>
                <strong>Sistema de IA:</strong> qualquer ferramenta ou
                serviço que utilize inteligência artificial para gerar
                texto, imagem, vídeo, áudio, código ou análises — de uso
                direto (ex: chatbots) ou incorporado a outro produto.
              </li>
              <li>
                <strong>Dados Pessoais / Dados Sensíveis:</strong> conforme
                definidos pela LGPD (Lei 13.709/2018) e, quando aplicável,
                pelo GDPR — informações que identificam ou tornam
                identificável uma pessoa natural, incluindo categorias
                sensíveis (saúde, origem étnica, dados biométricos, entre
                outras).
              </li>
              <li>
                <strong>Parecer de Cibersegurança:</strong> decisão formal
                — aprovação ou reprovação — emitida pela equipe de
                Cibersegurança (e, quando aplicável, pela Proteção de
                Dados) sobre o uso de um sistema de IA, registrada num
                chamado da ferramenta de ITSM.
              </li>
              <li>
                <strong>Inventário de Sistemas de IA:</strong> registro
                centralizado, mantido pela equipe de Cibersegurança, de
                todo sistema de IA aprovado para uso, com sua finalidade,
                área responsável, dados tratados e histórico de revisões.
              </li>
            </ul>

            <h2>4. Diretrizes Gerais</h2>
            <p>
              Nenhum sistema de IA pode ser utilizado sem aprovação prévia.
              Toda solicitação de uso deve tramitar por um chamado na
              ferramenta de ITSM, seguindo o processo formal de avaliação
              descrito na página <strong>Processo</strong> — o uso de uma
              ferramenta de IA sem chamado aberto é tratado como não
              autorizado, independentemente da finalidade.
            </p>
            <p>
              O registro no Inventário de Sistemas de IA é responsabilidade
              exclusiva da equipe de Cibersegurança, feito somente depois
              que o chamado de aprovação já percorreu a ferramenta de ITSM
              e reúne os pareceres de Service Desk, Cibersegurança e, se
              aplicável, Proteção de Dados — o Inventário não é uma
              ferramenta de autoatendimento para os usuários finais.
            </p>
            <p>
              Todo sistema de IA que trate dados pessoais e/ou sensíveis é
              automaticamente sinalizado como <strong>&quot;Requer
              atenção&quot;</strong> no Inventário e fica sujeito à
              avaliação da Proteção de Dados antes da aprovação, incluindo,
              quando necessário, a elaboração de um Relatório de Impacto à
              Proteção de Dados (RIPD/DPIA).
            </p>
            <p>
              Todo sistema aprovado é revisado periodicamente — a cada{" "}
              <strong>6 meses</strong> se tratar dados pessoais e/ou
              sensíveis, ou a cada <strong>1 ano</strong> nos demais casos
              — para confirmar que a aprovação ainda é válida. Uma revisão
              reprovada revoga a aprovação vigente e o sistema passa a
              constar como bloqueado no Inventário, mesmo que tenha sido
              aprovado originalmente.
            </p>

            <h2>5. Processo</h2>
            <p>
              A avaliação de uma solicitação de uso de IA segue cinco
              etapas, detalhadas na página <strong>Processo</strong>:
            </p>
            <ol>
              <li>
                <strong>Solicitação</strong> — o usuário solicita o uso de
                um sistema de IA, abrindo um chamado na ferramenta de
                ITSM.
              </li>
              <li>
                <strong>Triagem</strong> — o Service Desk avalia a
                completude do pedido e encaminha para a Cibersegurança.
              </li>
              <li>
                <strong>Avaliação de Cibersegurança</strong> — análise de
                risco técnico e de segurança, com decisão de aprovar,
                reprovar, ou encaminhar para a Proteção de Dados quando há
                tratamento de dados pessoais e/ou sensíveis.
              </li>
              <li>
                <strong>Avaliação de Proteção de Dados</strong> — quando
                acionada, avalia base legal, adequação à LGPD/GDPR e
                necessidade de RIPD/DPIA.
              </li>
              <li>
                <strong>Registro ou Encerramento</strong> — aprovado, o
                sistema é cadastrado no Inventário de Sistemas de IA;
                reprovado, o chamado é encerrado sem registro.
              </li>
            </ol>

            <h2>6. Papéis e Responsabilidades</h2>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Papel</th>
                  <th>Responsabilidade</th>
                  <th>Responsável</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>CISO</td>
                  <td>Aprovação da política e decisões sobre bloqueios controversos</td>
                  <td>Renato Bousquet</td>
                </tr>
                <tr>
                  <td>Cibersegurança</td>
                  <td>Avaliação técnica dos pedidos, registro e manutenção do Inventário, condução das revisões periódicas</td>
                  <td>Equipe de Cibersegurança</td>
                </tr>
                <tr>
                  <td>Proteção de Dados (DPO)</td>
                  <td>Avaliação de conformidade com LGPD/GDPR, RIPD/DPIA, quando dados pessoais e/ou sensíveis estão envolvidos</td>
                  <td>Cecília Andrade, Encarregada de Proteção de Dados</td>
                </tr>
                <tr>
                  <td>Service Desk</td>
                  <td>Triagem inicial dos chamados de solicitação de uso</td>
                  <td>Equipe de Service Desk</td>
                </tr>
                <tr>
                  <td>Solicitante / Área Usuária</td>
                  <td>Abertura do chamado e uso do sistema conforme aprovado — sem uso não autorizado</td>
                  <td>Conforme Inventário de Sistemas de IA</td>
                </tr>
              </tbody>
            </table>

            <h2>7. Revisão da Política</h2>
            <p>
              Esta política deve ser revisada anualmente, ou sempre que
              houver mudança relevante na legislação de proteção de dados,
              na ferramenta de ITSM, ou na estrutura organizacional das
              áreas envolvidas. Isso é independente da revisão periódica
              de cada sistema individualmente cadastrado, que segue a
              cadência descrita na Seção 4.
            </p>

            <h2>8. Aprovação</h2>
            <p>
              Documento aprovado por Renato Bousquet, CISO da Monstros
              S.A., em 20/09/2026.
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
