import Footer from "@/components/Footer";

export default function Politica() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Política</h1>
          <p className="lede">
            Política de Gerenciamento de Riscos de TI — Monstros S.A.
          </p>

          <div className="policy-meta">
            <span><strong>Código do documento:</strong> POL-RISK-001</span>
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
                  <td>01/03/2026</td>
                  <td>Emissão inicial do documento</td>
                  <td>Marina Kowalski, Analista de Riscos</td>
                  <td>Renato Bousquet, CISO</td>
                </tr>
              </tbody>
            </table>

            <h2>1. Objetivo</h2>
            <p>
              Esta política estabelece as diretrizes para identificação,
              análise, tratamento e monitoramento dos riscos de tecnologia
              da informação na Monstros S.A., assegurando que ameaças à
              segurança, disponibilidade e integridade dos ativos de TI
              sejam geridas de forma consistente e proporcional ao seu
              impacto no negócio.
            </p>

            <h2>2. Escopo</h2>
            <p>
              Aplica-se a todas as áreas, sistemas, projetos e fornecedores
              que utilizam ou dão suporte à infraestrutura de tecnologia da
              Monstros S.A., incluindo colaboradores próprios, terceiros e
              parceiros com acesso a esses ativos.
            </p>

            <h2>3. Definições</h2>
            <ul>
              <li>
                <strong>Risco de TI:</strong> possibilidade de um evento
                comprometer a confidencialidade, integridade ou
                disponibilidade de um ativo de tecnologia.
              </li>
              <li>
                <strong>Plano de Ação:</strong> conjunto de medidas
                definidas para reduzir a probabilidade ou o impacto de um
                risco identificado.
              </li>
              <li>
                <strong>Matriz de Risco:</strong> ferramenta que combina
                impacto e probabilidade para classificar a criticidade de
                um risco.
              </li>
            </ul>

            <h2>4. Diretrizes Gerais</h2>
            <p>
              Todo risco de TI identificado deve ser formalmente registrado
              no Cadastro de Riscos, com sua categoria, origem e resultado
              potencial descritos de forma clara, de modo que qualquer
              pessoa do Comitê de Riscos consiga compreender a natureza da
              ameaça sem depender de explicações verbais adicionais.
            </p>
            <p>
              Riscos classificados como Alto ou Muito Alto exigem a
              definição de um plano de ação formal, com responsável nomeado
              e prazo estabelecido; nesses casos, o acompanhamento deixa de
              ser opcional e passa a fazer parte da pauta recorrente do
              Comitê de Riscos até que o risco seja reduzido a um nível
              aceitável.
            </p>
            <p>
              A priorização do tratamento segue a pontuação da matriz de
              risco, calculada pela multiplicação entre impacto e
              probabilidade; quanto maior a pontuação, mais cedo o risco
              deve entrar na fila de tratamento em relação aos demais itens
              do portfólio, independentemente da ordem em que foram
              identificados.
            </p>
            <p>
              Riscos sem plano de ação associado devem ser reavaliados a
              cada ciclo de monitoramento, para verificar se a ausência de
              tratamento ainda é justificável — seja por baixa criticidade,
              seja por decisão formal de aceitação do risco — ou se as
              condições mudaram e o risco passou a exigir ação.
            </p>
            <p>
              A ausência de registro de um risco conhecido não isenta a
              área responsável de sua gestão; o desconhecimento formal por
              parte do Comitê de Riscos não elimina a exposição real da
              organização, e a responsabilidade pelo dano potencial
              permanece com a área que detinha o conhecimento do risco.
            </p>

            <h2>5. Processo</h2>
            <p>
              O gerenciamento de um risco de TI segue um ciclo de vida com
              seis etapas, desde sua origem até seu encerramento formal:
            </p>
            <ol>
              <li>
                <strong>Identificação</strong> — o risco é reconhecido por
                qualquer colaborador, área ou processo de auditoria, a
                partir de um ponto de gatilho observável (uma
                vulnerabilidade, um incidente, uma mudança de cenário).
              </li>
              <li>
                <strong>Cadastro</strong> — o risco é formalmente registrado
                no Cadastro de Riscos, com categoria, fonte, data de
                levantamento e responsável pela identificação.
              </li>
              <li>
                <strong>Análise e Classificação</strong> — impacto e
                probabilidade são avaliados, gerando a pontuação da matriz
                de risco e sua classificação qualitativa (Baixo, Médio,
                Alto ou Crítico).
              </li>
              <li>
                <strong>Definição do Plano de Ação</strong> — para riscos
                que exigem tratamento, é definido um plano de ação com
                objetivo claro, responsável nomeado e prazo, com foco em
                reduzir a probabilidade, o impacto, ou ambos.
              </li>
              <li>
                <strong>Acompanhamento</strong> — o andamento do plano de
                ação é monitorado periodicamente pelo responsável e
                revisado pelo Comitê de Riscos, que pode ajustar prazos,
                prioridades ou a própria estratégia de tratamento.
              </li>
              <li>
                <strong>Encerramento</strong> — uma vez mitigado, o risco é
                reavaliado para confirmar a eficácia do tratamento e
                formalmente encerrado no Cadastro de Riscos, com data e
                evidências do fechamento.
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
                  <td>Aprovação da política e decisões sobre riscos críticos</td>
                  <td>Renato Bousquet</td>
                </tr>
                <tr>
                  <td>Comitê de Riscos</td>
                  <td>Revisão periódica do portfólio de riscos e planos de ação</td>
                  <td>Presidido por Alana Ferreira, Diretora de TI</td>
                </tr>
                <tr>
                  <td>Analista de Riscos</td>
                  <td>Registro, análise e acompanhamento dos riscos</td>
                  <td>Marina Kowalski</td>
                </tr>
                <tr>
                  <td>Gestores de Área</td>
                  <td>Execução dos planos de ação sob sua responsabilidade</td>
                  <td>Conforme Cadastro de Riscos</td>
                </tr>
              </tbody>
            </table>

            <h2>7. Revisão da Política</h2>
            <p>
              Esta política deve ser revisada anualmente, ou sempre que
              houver mudança relevante no ambiente de TI, na estrutura
              organizacional ou na legislação aplicável.
            </p>

            <h2>8. Aprovação</h2>
            <p>
              Documento aprovado por Renato Bousquet, CISO da Monstros
              S.A., em 01/03/2026.
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
