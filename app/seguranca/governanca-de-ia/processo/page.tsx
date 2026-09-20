import Footer from "@/components/Footer";

export default function GovernancaDeIAProcesso() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Governança de IA</span>
          <h1>Processo</h1>
          <p className="lede">
            O processo de governança de IA é o caminho que toda solicitação
            de uso de um sistema de inteligência artificial percorre antes
            de ser liberada — da abertura do pedido até o registro (ou
            recusa) no Inventário de Sistemas de IA.
          </p>

          <div className="body wide-body">
            <p>O processo segue cinco etapas:</p>
            <ul>
              <li>
                <strong>Solicitação</strong> — o usuário solicita o uso de um
                sistema de IA, abrindo um chamado na ferramenta de ITSM.
              </li>
              <li>
                <strong>Triagem</strong> — o Service Desk avalia a
                completude do pedido (sistema, finalidade, área e dados que
                serão tratados) e encaminha para a Cibersegurança.
              </li>
              <li>
                <strong>Avaliação de Cibersegurança</strong> — análise de
                risco técnico e de segurança do sistema, com três desfechos
                possíveis: aprovar, reprovar, ou encaminhar para a Proteção
                de Dados quando houver tratamento de dados pessoais e/ou
                sensíveis (LGPD/GDPR).
              </li>
              <li>
                <strong>Avaliação de Proteção de Dados</strong> — só ocorre
                quando acionada pela Cibersegurança; verifica base legal,
                adequação à LGPD/GDPR e necessidade de RIPD/DPIA, emitindo
                seu próprio parecer de aprovação ou reprovação.
              </li>
              <li>
                <strong>Registro ou Encerramento</strong> — aprovado, o
                sistema é cadastrado no Inventário de Sistemas de IA com o
                número do chamado; reprovado, o solicitante é comunicado e o
                chamado é encerrado sem registro.
              </li>
            </ul>
            <p>
              Todas as etapas tramitam num único chamado na{" "}
              <strong>ferramenta de ITSM</strong> — é esse mesmo número de
              chamado que fica registrado no campo{" "}
              <strong>Número do Chamado</strong> do{" "}
              <strong>Cadastro de Sistema de IA</strong>, ligando a decisão
              formal ao registro que aparece no Inventário e no Dashboard.
            </p>

            <h2>Fluxo do processo</h2>
            <div className="flow-diagram-wrap">
              <svg
                viewBox="0 0 1260 400"
                style={{ minWidth: "1000px" }}
                role="img"
                aria-label="Fluxograma do processo de governança de IA: Solicitação, Triagem, Avaliação de Cibersegurança, decisão de Cibersegurança que pode Aprovar (indo direto para Registro no Inventário de IA), Reprovar (indo para Encerramento) ou encaminhar para Dados pessoais/sensíveis (LGPD/GDPR), que segue para Avaliação de Proteção de Dados — cujo parecer também aprova (voltando para o Registro no Inventário de IA) ou reprova (indo para o Encerramento)"
              >
                <defs>
                  <marker id="flow-arrow-ia" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-muted)" />
                  </marker>
                </defs>

                <text x="630" y="20" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--text)">
                  Processo de Governança de IA
                </text>

                {/* Linha principal */}
                <path d="M 165 95 L 205 95" stroke="var(--text-muted)" strokeWidth="1.5" markerEnd="url(#flow-arrow-ia)" />
                <path d="M 355 95 L 395 95" stroke="var(--text-muted)" strokeWidth="1.5" markerEnd="url(#flow-arrow-ia)" />
                <path d="M 545 95 L 575 95" stroke="var(--text-muted)" strokeWidth="1.5" markerEnd="url(#flow-arrow-ia)" />

                {/* Diamante -> Aprovado (direto pro registro) */}
                <path d="M 745 95 L 905 95" stroke="var(--text-muted)" strokeWidth="1.5" markerEnd="url(#flow-arrow-ia)" />
                <text x="825" y="85" textAnchor="middle" fontSize="12" fill="var(--accent)" fontWeight="600">Aprovado</text>

                {/* Diamante -> tronco comum descendo */}
                <path d="M 660 150 L 660 190" stroke="var(--text-muted)" strokeWidth="1.5" fill="none" />
                {/* Tronco -> Reprovado (esquerda) */}
                <path d="M 660 190 L 500 190 L 500 226" stroke="var(--text-muted)" strokeWidth="1.5" fill="none" markerEnd="url(#flow-arrow-ia)" />
                <text x="565" y="182" textAnchor="middle" fontSize="12" fill="var(--accent)" fontWeight="600">Reprovado</text>
                {/* Tronco -> Dados pessoais/sensíveis (direita) */}
                <path d="M 660 190 L 820 190 L 820 226" stroke="var(--text-muted)" strokeWidth="1.5" fill="none" markerEnd="url(#flow-arrow-ia)" />
                <text x="740" y="166" textAnchor="middle" fontSize="10.5" fill="var(--accent)" fontWeight="600">
                  <tspan x="740" dy="0">Dados pessoais/</tspan>
                  <tspan x="740" dy="12">sensíveis (LGPD/GDPR)</tspan>
                </text>

                {/* Proteção de Dados -> Reprovado (funde em F1) */}
                <path d="M 745 271 L 575 271" stroke="var(--text-muted)" strokeWidth="1.5" markerEnd="url(#flow-arrow-ia)" />
                <text x="660" y="263" textAnchor="middle" fontSize="11" fill="var(--accent)" fontWeight="600">Reprovado</text>

                {/* Proteção de Dados -> Aprovado (funde em G, contorna por fora) */}
                <path d="M 895 271 L 1145 271 L 1145 95 L 1085 95" stroke="var(--text-muted)" strokeWidth="1.5" fill="none" markerEnd="url(#flow-arrow-ia)" />
                <text x="1160" y="185" fontSize="11" fill="var(--accent)" fontWeight="600" textAnchor="middle" transform="rotate(90 1160 185)">Aprovado</text>

                {/* Caixa A - Solicitação */}
                <rect x="15" y="50" width="150" height="90" rx="3" fill="var(--surface)" stroke="var(--border)" />
                <text x="90" y="72" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text)">Solicitação</text>
                <text x="90" y="94" textAnchor="middle" fontSize="10.5" fill="var(--text-muted)">
                  <tspan x="90" dy="0">Usuário solicita o uso</tspan>
                  <tspan x="90" dy="14">de um sistema de IA</tspan>
                  <tspan x="90" dy="14">via ITSM.</tspan>
                </text>

                {/* Caixa B - Triagem */}
                <rect x="205" y="50" width="150" height="90" rx="3" fill="var(--surface)" stroke="var(--border)" />
                <text x="280" y="72" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text)">Triagem</text>
                <text x="280" y="94" textAnchor="middle" fontSize="10.5" fill="var(--text-muted)">
                  <tspan x="280" dy="0">Service Desk avalia</tspan>
                  <tspan x="280" dy="14">completude do pedido</tspan>
                  <tspan x="280" dy="14">e encaminha.</tspan>
                </text>

                {/* Caixa C - Avaliação de Cibersegurança */}
                <rect x="395" y="50" width="150" height="90" rx="3" fill="var(--surface)" stroke="var(--border)" />
                <text x="470" y="68" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text)">
                  <tspan x="470" dy="0">Avaliação de</tspan>
                  <tspan x="470" dy="14">Cibersegurança</tspan>
                </text>
                <text x="470" y="103" textAnchor="middle" fontSize="10.5" fill="var(--text-muted)">
                  <tspan x="470" dy="0">Análise de risco</tspan>
                  <tspan x="470" dy="14">técnico e de segurança.</tspan>
                </text>

                {/* Diamante - Decisão de Cibersegurança */}
                <polygon points="660,40 745,95 660,150 575,95" fill="var(--bg)" stroke="var(--accent)" strokeWidth="1.5" />
                <text x="660" y="88" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text)">Decisão de</text>
                <text x="660" y="101" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text)">Cibersegurança</text>

                {/* Caixa G - Registro no Inventário */}
                <rect x="905" y="50" width="180" height="90" rx="3" fill="var(--surface)" stroke="var(--border)" />
                <text x="995" y="68" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text)">
                  <tspan x="995" dy="0">Registro no</tspan>
                  <tspan x="995" dy="14">Inventário de IA</tspan>
                </text>
                <text x="995" y="103" textAnchor="middle" fontSize="10.5" fill="var(--text-muted)">
                  <tspan x="995" dy="0">Cadastro vinculado ao</tspan>
                  <tspan x="995" dy="14">número do chamado.</tspan>
                </text>

                {/* Caixa F1 - Encerramento Reprovado */}
                <rect x="425" y="226" width="150" height="90" rx="3" fill="var(--surface)" stroke="var(--border)" />
                <text x="500" y="248" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text)">
                  <tspan x="500" dy="0">Encerramento</tspan>
                  <tspan x="500" dy="14">— Reprovado</tspan>
                </text>
                <text x="500" y="284" textAnchor="middle" fontSize="10.5" fill="var(--text-muted)">
                  <tspan x="500" dy="0">Solicitante é</tspan>
                  <tspan x="500" dy="14">comunicado, sem</tspan>
                  <tspan x="500" dy="14">registro no Inventário.</tspan>
                </text>

                {/* Caixa E - Avaliação de Proteção de Dados */}
                <rect x="745" y="226" width="150" height="90" rx="3" fill="var(--surface)" stroke="var(--border)" />
                <text x="820" y="248" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text)">
                  <tspan x="820" dy="0">Avaliação de</tspan>
                  <tspan x="820" dy="14">Proteção de Dados</tspan>
                </text>
                <text x="820" y="284" textAnchor="middle" fontSize="10.5" fill="var(--text-muted)">
                  <tspan x="820" dy="0">Base legal, LGPD/</tspan>
                  <tspan x="820" dy="14">GDPR e necessidade</tspan>
                  <tspan x="820" dy="14">de RIPD/DPIA.</tspan>
                </text>
              </svg>
            </div>

            <p>
              A Cibersegurança é sempre o primeiro filtro técnico: toda
              solicitação passa por ela antes de qualquer decisão. Quando o
              pedido não envolve dados pessoais ou sensíveis, a própria
              Cibersegurança aprova ou reprova diretamente. Quando envolve —
              por exemplo, um sistema que vai processar dados de clientes ou
              de colaboradores —, o chamado é encaminhado para a{" "}
              <strong>Proteção de Dados</strong>, que avalia a conformidade
              com LGPD/GDPR e decide se avança ou não. Em nenhum dos dois
              casos a Cibersegurança perde a visibilidade: o parecer final,
              seja dela ou da Proteção de Dados, fecha o mesmo chamado que
              deu início ao processo.
            </p>
            <p>
              Só sistemas com parecer <strong>aprovado</strong> —seja da
              Cibersegurança diretamente, seja da Proteção de Dados nos
              casos de dados pessoais/sensíveis— chegam ao{" "}
              <strong>Cadastro de Sistema de IA</strong>. Um pedido{" "}
              <strong>reprovado</strong> não gera registro: o chamado é
              encerrado no ITSM com a justificativa, e essa é a informação
              que o solicitante recebe de volta.
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
