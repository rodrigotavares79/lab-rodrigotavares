import Footer from "@/components/Footer";
import { ExemploExposicao, BotaoImprimir } from "@/components/riscos/DocumentosRisco";
import { ETAPAS_PROCESSO } from "@/lib/politicaRiscos";

// B20 · Processo com as mesmas seis etapas da Política (lib/politicaRiscos),
// o fluxo com a decisão de tratamento e o ciclo de reavaliação, e o passo a
// passo do apontamento financeiro com um exemplo calculado pelo motor do
// sistema.

const BASE = "/seguranca/gestao-de-riscos";

function quebrar(texto: string, max = 26): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const p of texto.split(" ")) {
    if ((atual + " " + p).trim().length > max) {
      linhas.push(atual);
      atual = p;
    } else atual = (atual + " " + p).trim();
  }
  if (atual) linhas.push(atual);
  return linhas;
}

function Fluxo() {
  const W = 180, H = 100, Y = 110, PASSO = 220, X0 = 20;
  const x = (i: number) => X0 + i * PASSO;
  const cx = (i: number) => x(i) + W / 2;
  const seta = "url(#seta-fluxo)";
  return (
    <svg
      viewBox="0 0 1340 390"
      style={{ minWidth: "1000px" }}
      role="img"
      aria-label={`Fluxo do processo em seis etapas: ${ETAPAS_PROCESSO.map((e, i) => `${i + 1} ${e.nome}`).join(", ")}. Na etapa Tratamento, a opção Aceitar segue para a Carta de Risco e depois para o Monitoramento. Do Monitoramento, a reavaliação volta para Análise e Avaliação.`}
    >
      <defs>
        <marker id="seta-fluxo" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-muted)" />
        </marker>
      </defs>

      {/* Ciclo de reavaliação: Monitoramento → Análise e Avaliação */}
      <path d={`M ${cx(4)} ${Y} L ${cx(4)} 55 L ${cx(2)} 55 L ${cx(2)} ${Y - 4}`} stroke="var(--rs-primaria, var(--accent))" strokeWidth="1.5" strokeDasharray="5 4" fill="none" markerEnd={seta} />
      <text x={(cx(2) + cx(4)) / 2} y="45" textAnchor="middle" fontSize="12" fill="var(--rs-primaria, var(--accent))" fontWeight="600">
        Reavaliação: prazo de revisão do nível, KRI no vermelho ou aceitação vencida
      </text>

      {/* Setas principais */}
      {ETAPAS_PROCESSO.slice(0, -1).map((_, i) => (
        <path key={i} d={`M ${x(i) + W} ${Y + H / 2} L ${x(i + 1) - 4} ${Y + H / 2}`} stroke="var(--text-muted)" strokeWidth="1.5" markerEnd={seta} />
      ))}

      {/* Ramo Aceitar: Tratamento → Carta de Risco → Monitoramento */}
      <path d={`M ${cx(3)} ${Y + H} L ${cx(3)} ${Y + H + 56}`} stroke="var(--text-muted)" strokeWidth="1.5" markerEnd={seta} />
      <text x={cx(3) + 8} y={Y + H + 32} fontSize="12" fill="var(--rs-primaria, var(--accent))" fontWeight="600">Aceitar</text>
      <path d={`M ${x(3) + W} ${Y + H + 105} L ${cx(4)} ${Y + H + 105} L ${cx(4)} ${Y + H + 4}`} stroke="var(--text-muted)" strokeWidth="1.5" fill="none" markerEnd={seta} />
      <rect x={x(3)} y={Y + H + 60} width={W} height="90" rx="4" fill="var(--surface)" stroke="var(--border)" />
      <text x={cx(3)} y={Y + H + 82} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="var(--text)">Carta de Risco</text>
      <text x={cx(3)} y={Y + H + 102} textAnchor="middle" fontSize="10.5" fill="var(--text-muted)">
        {["Aprovação pela alçada", "do nível, com validade", "de até 24 meses"].map((l, k) => (
          <tspan key={k} x={cx(3)} dy={k ? 14 : 0}>{l}</tspan>
        ))}
      </text>

      {/* Caixas das seis etapas */}
      {ETAPAS_PROCESSO.map((e, i) => {
        const nome = quebrar(e.nome, 18);
        const resumo = quebrar(e.resumo);
        return (
          <g key={e.nome}>
            <rect x={x(i)} y={Y} width={W} height={H} rx="4" fill="var(--surface)" stroke={i === 3 ? "var(--rs-primaria, var(--accent))" : "var(--border)"} strokeWidth={i === 3 ? 1.5 : 1} />
            <circle cx={x(i) + 18} cy={Y + 18} r="11" fill="var(--rs-primaria, var(--accent))" />
            <text x={x(i) + 18} y={Y + 22} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{i + 1}</text>
            <text x={cx(i) + 8} y={Y + 23} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="var(--text)">
              {nome.map((l, k) => (
                <tspan key={k} x={cx(i) + 8} dy={k ? 14 : 0}>{l}</tspan>
              ))}
            </text>
            <text x={cx(i)} y={Y + 46 + (nome.length - 1) * 10} textAnchor="middle" fontSize="10.5" fill="var(--text-muted)">
              {resumo.map((l, k) => (
                <tspan key={k} x={cx(i)} dy={k ? 14 : 0}>{l}</tspan>
              ))}
            </text>
          </g>
        );
      })}
      <text x={cx(3)} y={Y - 8} textAnchor="middle" fontSize="10.5" fill="var(--text-muted)">Mitigar · Transferir · Evitar → plano</text>
    </svg>
  );
}

export default function Processo() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Processo</h1>
          <p className="lede">
            O caminho que transforma uma ameaça identificada numa decisão registrada e acompanhada. São as mesmas seis etapas da{" "}
            <a href={`${BASE}/politica`}>Política</a>, aqui com o passo a passo de cada uma no sistema.
          </p>

          <div style={{ margin: "1rem 0" }}>
            <BotaoImprimir />
          </div>

          <div className="body wide-body">
            <h2>As seis etapas</h2>
            <ol>
              {ETAPAS_PROCESSO.map((e) => (
                <li key={e.nome} style={{ marginBottom: "0.5rem" }}>
                  <strong>{e.nome}</strong> — {e.detalhe}
                </li>
              ))}
            </ol>

            <h2>Fluxo do processo</h2>
            <div className="flow-diagram-wrap">
              <Fluxo />
            </div>
            <p>
              O processo não termina numa linha reta. Na etapa de <strong>Tratamento</strong>, o dono escolhe entre mitigar,
              transferir ou evitar, o que gera um plano de ação, ou aceitar, o que exige uma <strong>Carta de Risco</strong> aprovada
              pela alçada do nível. Mesmo aceito, o risco continua no <strong>Monitoramento</strong>: quando a aceitação vence, quando
              chega o prazo de revisão do nível ou quando um KRI fica vermelho, ele volta para <strong>Análise e Avaliação</strong>.
            </p>

            <div className="download-card">
              <div>
                <span className="download-card-label">Modelo para download</span>
                <p className="download-card-title">Carta de Risco (.docx)</p>
                <p className="download-card-desc">Modelo pronto, em papel timbrado, para formalizar a aceitação de um risco.</p>
              </div>
              <a href="/modelo-carta-de-risco.docx" download="Carta_de_Risco.docx" className="btn-primary">
                Baixar modelo
              </a>
            </div>

            <h2>Como o apetite entra no processo</h2>
            <p>
              Na etapa de <strong>Análise e Avaliação</strong>, o sistema compara o nível atual do risco com o apetite e a tolerância
              da sua categoria e mostra o resultado no próprio risco, na lista, no Dashboard e no Relatório Executivo:
            </p>
            <ul>
              <li>
                <strong>Dentro do apetite</strong> — o risco segue o monitoramento normal. Se não houver plano, a aceitação ainda
                precisa ser formalizada quando o nível for Alto ou Crítico.
              </li>
              <li>
                <strong>▲ Acima do apetite</strong> — o risco precisa de tratamento com prazo (plano de ação ou Carta de Risco com
                validade).
              </li>
              <li>
                <strong>▲▲ Acima da tolerância</strong> — prioridade máxima: tratamento imediato e reporte ao Comitê de Riscos.
              </li>
            </ul>
            <p>
              Os limites de cada categoria, a versão vigente e as regras de aprovação estão na{" "}
              <a href={`${BASE}/politica#apetite`}>Política, seção 6</a>.
            </p>

            <h2 id="apontamento-financeiro">Apontamento financeiro dos riscos</h2>
            <p>
              O nível diz se um risco é grave; o apontamento financeiro diz <strong>quanto ele pode custar</strong>. É feito na etapa
              de Análise e Avaliação, no painel <em>Exposição financeira</em> da tela do risco, e é obrigatório para riscos Alto e
              Crítico sempre que houver base para estimar.
            </p>

            <h3>Passo a passo no sistema</h3>
            <ol>
              <li>
                Abra o risco e, no painel <em>Exposição financeira (perda anual esperada)</em>, clique em <em>Estimar exposição</em>.
              </li>
              <li>
                Informe a <strong>frequência anual</strong>: quantas vezes por ano o evento deve ocorrer, em mínimo, provável e
                máximo. Valores menores que 1 indicam eventos raros: 0,2 é uma vez a cada 5 anos; 2 é duas vezes por ano.
              </li>
              <li>
                Informe a <strong>perda por evento</strong>, de uma de duas formas:
                <ul>
                  <li>
                    <strong>Pelo ativo:</strong> se o risco está ligado a um ativo crítico com custo de indisponibilidade por hora,
                    marque a opção de calcular pela indisponibilidade e informe as horas de parada por evento. O sistema multiplica
                    as horas pelo custo por hora.
                  </li>
                  <li>
                    <strong>Manual:</strong> informe o valor em reais quando a perda não é de parada: multas, ressarcimento a
                    clientes, custo de resposta a incidente, horas extras da equipe, perda de receita.
                  </li>
                </ul>
              </li>
              <li>
                Registre as <strong>premissas</strong>: de onde vieram os números (histórico de incidentes, contrato, benchmark do
                setor, opinião do dono ou do fornecedor). Quem revisar a estimativa depois precisa entender a base.
              </li>
              <li>
                Confira a prévia da perda anual esperada e salve. O valor passa a aparecer no risco, no ranking de exposição do
                Dashboard e do Relatório Executivo e no total do portfólio.
              </li>
              <li>
                Revise a estimativa sempre que o risco for reavaliado, depois de um incidente real ou quando o custo por hora do
                ativo mudar.
              </li>
            </ol>

            <h3>Metodologia de cálculo</h3>
            <p>
              O cálculo segue a lógica clássica de perda anual esperada (ALE, na sigla em inglês), com faixas de três pontos para
              tratar a incerteza:
            </p>
            <ol>
              <li>
                <strong>Faixas em vez de um número só.</strong> Ninguém sabe a frequência exata de uma falha. Pedir mínimo, provável
                e máximo é mais honesto e mais fácil de responder.
              </li>
              <li>
                <strong>Média PERT de cada faixa:</strong> (mínimo + 4 × provável + máximo) ÷ 6. O valor provável pesa mais, mas um
                máximo muito alto ainda puxa o resultado para cima, o que reflete o risco de cauda.
              </li>
              <li>
                <strong>Perda anual esperada = frequência PERT × perda por evento PERT.</strong>
              </li>
              <li>
                <strong>Faixa da exposição:</strong> do cenário otimista (frequência mínima × perda mínima) ao pessimista
                (frequência máxima × perda máxima).
              </li>
            </ol>

            <h3>Exemplo: indisponibilidade do ERP (caso fictício de tecnologia)</h3>
            <p className="text-muted" style={{ fontSize: "0.85rem" }}>
              Os valores abaixo são calculados pelo mesmo motor que o sistema usa, então o exemplo nunca diverge da tela.
            </p>
            <ExemploExposicao />

            <h3>Cuidados na leitura</h3>
            <ul>
              <li>
                A perda anual esperada é uma <strong>média de longo prazo</strong>. Ela serve para comparar riscos entre si e para
                comparar o custo de um tratamento com a redução de exposição que ele traz.
              </li>
              <li>
                O total do portfólio no Dashboard indica a ordem de grandeza da exposição, não um valor a provisionar: riscos
                diferentes raramente se materializam juntos.
              </li>
              <li>
                A estimativa complementa o nível do risco, sem substituí-lo. Um risco regulatório pode ter perda baixa em reais e
                ainda assim ser Crítico.
              </li>
            </ul>
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
