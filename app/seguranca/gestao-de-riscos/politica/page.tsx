import Footer from "@/components/Footer";
import MatrizRiscos from "@/components/riscos/MatrizRiscos";
import { ApetiteVigente, BotaoImprimir } from "@/components/riscos/DocumentosRisco";
import { FAIXAS_NIVEL_RISCO, ROTULOS_ESCALA_5 } from "@/lib/metodologiaRisco";
import { CATEGORIAS_RISCO, ETAPAS_PROCESSO, EXEMPLO_EXPOSICAO as X } from "@/lib/politicaRiscos";
import { moeda } from "@/lib/exposicaoRisco";

// B20 · Política harmonizada com o Processo e com o sistema: mesmas seis
// etapas, mesma escala de níveis, critérios de avaliação como critério da
// organização, categorias com fronteira, apetite e quantificação financeira.
// Categorias, etapas e exemplo vêm de lib/politicaRiscos (fonte única).

const BASE = "/seguranca/gestao-de-riscos";

export default function Politica() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Política</h1>
          <p className="lede">Política de Gestão de Riscos de TI e Segurança da Informação — Monstros S.A.</p>

          <div className="policy-meta">
            <span><strong>Código do documento:</strong> POL-RISK-001</span>
            <span><strong>Classificação:</strong> Uso Interno</span>
            <span><strong>Versão atual:</strong> 2.0</span>
          </div>

          <div style={{ margin: "1rem 0" }}>
            <BotaoImprimir />
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
                <tr>
                  <td>2.0</td>
                  <td>26/11/2026</td>
                  <td>
                    Harmonização com o Processo (seis etapas) e com o sistema: escala única de níveis, faixas como critério da
                    organização, categorias com fronteira definida, apetite e tolerância, quantificação financeira, KRIs, revisão
                    periódica e alçadas de aceitação
                  </td>
                  <td>Marina Kowalski, Analista de Riscos</td>
                  <td>Renato Bousquet, CISO</td>
                </tr>
              </tbody>
            </table>

            <h2>1. Objetivo</h2>
            <p>
              Estabelecer como a Monstros S.A. identifica, avalia, trata e monitora os riscos de tecnologia da informação e de
              segurança da informação, de forma consistente e proporcional ao impacto no negócio, e dentro do apetite a risco
              aprovado pela organização.
            </p>

            <h2>2. Escopo</h2>
            <p>
              Aplica-se aos riscos que têm origem em ativos, sistemas, processos, projetos e fornecedores de tecnologia e de segurança
              da informação da Monstros S.A., incluindo colaboradores próprios, terceiros e parceiros com acesso a esses ativos.
            </p>
            <p>
              O escopo inclui as consequências desses riscos fora da TI: perdas financeiras, atrasos em objetivos estratégicos,
              descumprimento de leis e contratos e danos à reputação. Por isso a política usa as sete categorias da seção 4, e não só
              as categorias técnicas. Riscos de negócio sem relação com TI ou segurança da informação ficam fora desta política.
            </p>

            <h2>3. Definições</h2>
            <ul>
              <li><strong>Risco:</strong> efeito da incerteza sobre os objetivos, descrito como um cenário: causa, evento e consequência.</li>
              <li>
                <strong>Cenário de risco:</strong> frase no padrão &quot;Risco de [evento] devido a [causa], resultando em
                [consequência]&quot;.
              </li>
              <li><strong>Ponto de gatilho:</strong> sinal observável que indica que o risco pode se materializar; é a base dos KRIs.</li>
              <li><strong>Dono do risco:</strong> pessoa com autoridade e responsabilidade para decidir o tratamento do risco.</li>
              <li><strong>Nível inerente:</strong> nível do risco sem considerar os controles existentes.</li>
              <li><strong>Nível atual:</strong> nível do risco considerando os controles existentes e o grau em que estão implementados.</li>
              <li><strong>Nível projetado:</strong> nível esperado quando todos os controles cadastrados estiverem totalmente implementados.</li>
              <li>
                <strong>Apetite a risco:</strong> o nível de risco que a organização aceita, em cada categoria, sem ação adicional.
              </li>
              <li>
                <strong>Tolerância a risco:</strong> o nível máximo que a organização suporta, por tempo limitado, enquanto o risco é
                tratado.
              </li>
              <li><strong>Plano de ação:</strong> conjunto de ações, com responsáveis e prazos, para mitigar, transferir ou evitar o risco.</li>
              <li><strong>Carta de Risco:</strong> documento que formaliza a aceitação de um risco, com justificativa, aprovador e validade.</li>
              <li><strong>KRI (indicador-chave de risco):</strong> métrica com limiares verde, amarelo e vermelho que antecipa a materialização do risco.</li>
              <li>
                <strong>Perda anual esperada:</strong> estimativa, em reais, de quanto o risco custa em média por ano (frequência anual ×
                perda por evento).
              </li>
            </ul>

            <h2 id="categorias">4. Categorias de risco</h2>
            <p>
              Cada risco recebe uma única categoria, que indica a sua natureza predominante. A mesma lista é usada no cadastro, no
              catálogo de cenários, no apetite a risco e nos relatórios.
            </p>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Pergunta-chave</th>
                  <th>Definição</th>
                  <th>Exemplos</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIAS_RISCO.map((c) => (
                  <tr key={c.nome}>
                    <td><strong>{c.nome}</strong></td>
                    <td>{c.pergunta}</td>
                    <td>{c.definicao}</td>
                    <td>{c.exemplos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              <strong>Regra de classificação.</strong> Responda às perguntas-chave na ordem da tabela e use a primeira categoria com
              resposta &quot;sim&quot;. As três primeiras classificam pela <em>causa</em> (segurança, tecnologia, processo); as
              demais, pela <em>consequência principal</em>.
            </p>
            <p>
              <strong>Fronteira entre Segurança da Informação e Tecnológico.</strong> O que separa as duas é a presença de um agente de
              ameaça ou a violação de um controle de segurança. Um servidor que para por defeito de disco é Tecnológico; o mesmo
              servidor parado por ransomware é Segurança da Informação. Uma vulnerabilidade sem correção é Segurança da Informação,
              porque o dano depende de alguém explorá-la.
            </p>

            <h2>5. Critérios de avaliação</h2>
            <p>
              Probabilidade e impacto são avaliados numa escala de 1 a 5: {ROTULOS_ESCALA_5.map((r, i) => `${i + 1} ${r}`).join(", ")}.
              A pontuação do risco é <strong>Probabilidade × Impacto</strong>, de 1 a 25, e define o nível do risco:
            </p>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Nível</th>
                  <th>Pontuação</th>
                  <th>Prazo de revisão</th>
                </tr>
              </thead>
              <tbody>
                {FAIXAS_NIVEL_RISCO.map((f) => (
                  <tr key={f.nivel}>
                    <td><strong>{f.rotulo}</strong></td>
                    <td>{f.min} a {f.max}</td>
                    <td>{{ Baixo: "365 dias", "Médio": "180 dias", Alto: "90 dias", "Crítico": "30 dias" }[f.rotulo]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              Essas faixas são <strong>critérios definidos pela Monstros S.A.</strong> A ISO/IEC 27005 orienta que cada organização
              estabeleça os próprios critérios de avaliação e não fixa faixas; a ISO 31000 e o NIST SP 800-30 seguem a mesma linha.
              Mudanças nas faixas exigem nova versão desta política.
            </p>
            <p>
              <strong>Termos únicos.</strong> O nível de um risco é sempre Baixo, Médio, Alto ou Crítico, em todas as telas, relatórios
              e documentos. Os termos &quot;Muito Baixo&quot; e &quot;Muito Alto&quot; existem só nas escalas de probabilidade e
              impacto, nunca como nível.
            </p>
            <MatrizRiscos />
            <p>
              Os controles existentes reduzem a probabilidade, o impacto ou ambos, conforme a eficácia e o grau de implementação de
              cada um, e geram o nível atual. É o nível atual que se compara com o apetite.
            </p>

            <h2 id="apetite">6. Apetite e tolerância a risco</h2>
            <p>
              O apetite e a tolerância respondem a uma pergunta: <strong>quanto risco a Monstros S.A. aceita correr em cada
              categoria?</strong> São definidos por categoria, na mesma escala de níveis da seção 5.
            </p>
            <ul>
              <li>
                <strong>Apetite</strong> é o nível mais alto que a organização aceita sem fazer nada além do monitoramento normal.
              </li>
              <li>
                <strong>Tolerância</strong> é o nível mais alto que ela suporta temporariamente, enquanto o risco está sendo tratado.
                A tolerância nunca é menor que o apetite.
              </li>
            </ul>
            <h3>6.1 Como um risco é comparado</h3>
            <p>
              O <strong>nível atual</strong> do risco (depois dos controles existentes) é comparado com o apetite e a tolerância da sua
              categoria. Riscos mitigados não entram na comparação. O resultado é uma de três situações:
            </p>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Situação</th>
                  <th>Quando</th>
                  <th>O que a política exige</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Dentro do apetite</strong></td>
                  <td>Nível atual até o apetite</td>
                  <td>Nenhuma ação adicional; o risco segue o monitoramento e a revisão periódica do seu nível.</td>
                </tr>
                <tr>
                  <td><strong>▲ Acima do apetite</strong></td>
                  <td>Acima do apetite, até a tolerância</td>
                  <td>
                    Tratamento obrigatório: plano de ação com prazo ou aceitação formal pela alçada do nível, com validade. O risco
                    aparece em destaque nas listas e no Relatório Executivo.
                  </td>
                </tr>
                <tr>
                  <td><strong>▲▲ Acima da tolerância</strong></td>
                  <td>Acima da tolerância</td>
                  <td>
                    Situação não suportada: tratamento imediato, prioridade máxima na fila e reporte ao Comitê de Riscos na reunião
                    seguinte. A aceitação nessa situação só pode ser decidida pelo CISO, com ciência do Comitê.
                  </td>
                </tr>
              </tbody>
            </table>
            <p>
              <strong>Exemplo.</strong> Se a categoria Financeiro tem apetite Baixo e tolerância Médio, um risco Financeiro com nível
              atual Baixo está dentro do apetite; com nível Médio está acima do apetite e precisa de tratamento com prazo; com nível
              Alto ou Crítico está acima da tolerância e exige ação imediata.
            </p>
            <h3>6.2 Limites vigentes</h3>
            <p>Esta tabela é lida diretamente do sistema e mostra sempre a versão aprovada em vigor:</p>
            <ApetiteVigente />
            <h3>6.3 Como os limites são definidos e alterados</h3>
            <ol>
              <li>
                O Analista de Riscos propõe uma nova versão no sistema, com os limites de cada categoria e a justificativa (por
                exemplo, mudança de estratégia, novo requisito regulatório ou resultado de incidentes).
              </li>
              <li>A proposta fica <strong>Pendente</strong> e não altera a avaliação de nenhum risco enquanto não for aprovada.</li>
              <li>
                Somente o <strong>CISO</strong> aprova ou recusa. Quem propôs não pode aprovar a própria proposta.
              </li>
              <li>
                Ao ser aprovada, a versão passa a <strong>Vigente</strong> e a anterior a <strong>Substituída</strong>; todos os riscos
                são reavaliados contra os novos limites na mesma hora. O histórico de versões fica guardado.
              </li>
              <li>Os limites são revistos pelo menos uma vez por ano, junto com esta política.</li>
            </ol>

            <h2 id="quantificacao">7. Quantificação financeira</h2>
            <p>
              Riscos Alto e Crítico devem ter a exposição estimada em reais sempre que houver base para isso: o custo de
              indisponibilidade do ativo afetado ou uma estimativa de perda por evento. A estimativa complementa o nível, sem
              substituí-lo, e apoia a priorização e a decisão de investir no tratamento.
            </p>
            <ul>
              <li>
                <strong>Frequência anual</strong> e <strong>perda por evento</strong> são informadas em faixas (mínimo, provável,
                máximo), porque a incerteza é parte da informação.
              </li>
              <li>
                A perda por evento pode vir do inventário de ativos (custo por hora de indisponibilidade × horas de parada) ou ser
                informada diretamente (multas, ressarcimentos, custo de resposta, perda de receita).
              </li>
              <li>
                Cada faixa é resumida pela <strong>média PERT</strong>: (mínimo + 4 × provável + máximo) ÷ 6.
              </li>
              <li>
                <strong>Perda anual esperada = frequência PERT × perda PERT.</strong> A faixa vai de mínimo × mínimo a máximo × máximo.
              </li>
              <li>As premissas usadas (de onde vieram os números) devem ser registradas junto com a estimativa.</li>
            </ul>
            <p>
              Exemplo: indisponibilidade do {X.ativo} por falha de storage, com custo de {moeda(X.custoHora)} por hora, resulta em
              perda anual esperada de {moeda(X.esperado.ale)} (faixa de {moeda(X.esperado.aleMin)} a {moeda(X.esperado.aleMax)}). O
              passo a passo completo está no{" "}
              <a href={`${BASE}/processo#apontamento-financeiro`}>Processo, seção Apontamento financeiro</a>.
            </p>

            <h2>8. Diretrizes de tratamento</h2>
            <ul>
              <li>
                Todo risco identificado deve ser registrado no sistema, com cenário, categoria, ativo ou processo afetado e dono. A
                ausência de registro de um risco conhecido não isenta a área responsável da sua gestão.
              </li>
              <li>
                Riscos Alto e Crítico devem ter tratamento definido (plano de ação ou aceitação válida) em até{" "}
                <strong>15 dias</strong> do cadastro. Fora desse prazo, entram na fila &quot;Riscos sem tratamento&quot;.
              </li>
              <li>As opções de tratamento são: mitigar, transferir, evitar ou aceitar.</li>
              <li>
                <strong>Aceitação</strong> exige Carta de Risco aprovada pela alçada do nível: Baixo e Médio — Coordenador, Gerente
                ou CISO; Alto — Gerente ou CISO; Crítico — CISO. A validade padrão é de 12 meses (máximo 24); ao vencer, o risco volta
                à avaliação.
              </li>
              <li>
                <strong>Priorização:</strong> primeiro os riscos acima da tolerância, depois os acima do apetite; dentro de cada
                grupo, a maior pontuação e, em caso de empate, a maior perda anual esperada.
              </li>
              <li>
                Um risco só é encerrado como Mitigado depois que todos os seus planos forem auditados como Conformes, com evidência.
                O auditor não pode avaliar plano que criou ou em que é responsável por alguma ação.
              </li>
            </ul>

            <h2>9. Processo</h2>
            <p>O ciclo de vida de um risco tem seis etapas, detalhadas na página <a href={`${BASE}/processo`}>Processo</a>:</p>
            <ol>
              {ETAPAS_PROCESSO.map((e) => (
                <li key={e.nome}>
                  <strong>{e.nome}</strong> — {e.detalhe}
                </li>
              ))}
            </ol>

            <h2>10. Monitoramento</h2>
            <ul>
              <li>Cada risco ativo é reavaliado no prazo do seu nível (seção 5).</li>
              <li>
                KRIs são medidos na frequência definida em cada um; um KRI no vermelho antecipa a revisão do risco vinculado.
              </li>
              <li>
                Os indicadores são fotografados mensalmente, o que permite acompanhar a tendência no Dashboard, em Tendências e no
                Relatório Executivo.
              </li>
              <li>Toda alteração em riscos, planos, ações e auditorias fica registrada na trilha de auditoria.</li>
            </ul>

            <h2>11. Papéis e Responsabilidades</h2>
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
                  <td>Aprova a política e o apetite a risco; aceita riscos Críticos e decide sobre riscos acima da tolerância</td>
                  <td>Renato Bousquet</td>
                </tr>
                <tr>
                  <td>Comitê de Riscos</td>
                  <td>Revisa o portfólio, os riscos acima da tolerância e o andamento dos planos</td>
                  <td>Presidido por Alana Ferreira, Diretora de TI</td>
                </tr>
                <tr>
                  <td>Analista de Riscos</td>
                  <td>Registra, avalia e acompanha os riscos; propõe versões do apetite; mantém o catálogo de cenários</td>
                  <td>Marina Kowalski</td>
                </tr>
                <tr>
                  <td>Dono do risco</td>
                  <td>Decide o tratamento, responde pelo risco e mantém KRIs e estimativas atualizados</td>
                  <td>Conforme cadastro do risco</td>
                </tr>
                <tr>
                  <td>Gestores de Área</td>
                  <td>Executam as ações dos planos sob sua responsabilidade e aprovam aceitações dentro da sua alçada</td>
                  <td>Conforme cadastro do risco</td>
                </tr>
                <tr>
                  <td>Auditor</td>
                  <td>Avalia os planos concluídos com base em evidências, com independência</td>
                  <td>Auditoria interna</td>
                </tr>
              </tbody>
            </table>

            <h2>12. Revisão da Política</h2>
            <p>
              Esta política, incluindo as faixas de avaliação e os limites de apetite e tolerância, deve ser revisada anualmente ou
              sempre que houver mudança relevante no ambiente de TI, na estrutura organizacional, na estratégia ou na legislação
              aplicável.
            </p>

            <h2>13. Aprovação</h2>
            <p>Documento aprovado por Renato Bousquet, CISO da Monstros S.A., em 26/11/2026.</p>
          </div>

          <a href={BASE} className="status-tag">
            ← Voltar para Gestão de Riscos
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
