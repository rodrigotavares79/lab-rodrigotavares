import Footer from "@/components/Footer";

export default function Processo() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Processo</h1>
          <p className="lede">
            O processo de gestão de riscos de TI é o caminho estruturado que
            transforma uma ameaça identificada em uma ação concreta de
            tratamento. Ele garante que nenhum risco fique apenas registrado
            sem que alguém avalie sua relevância e defina o que fazer a
            respeito.
          </p>

          <div className="body wide-body">
            <p>O processo segue cinco etapas:</p>
            <ul>
              <li>
                <strong>Identificação</strong> — reconhecer o risco, sua
                origem e o que poderia desencadeá-lo.
              </li>
              <li>
                <strong>Classificação</strong> — categorizar o risco
                (tecnológico, operacional, estratégico, entre outros) e
                definir sua fonte.
              </li>
              <li>
                <strong>Priorização</strong> — avaliar impacto e
                probabilidade para calcular a pontuação da matriz de risco e
                sua criticidade.
              </li>
              <li>
                <strong>Tratamento</strong> — definir e registrar o plano de
                ação responsável por mitigar o risco.
              </li>
              <li>
                <strong>Monitoramento</strong> — acompanhar a execução do
                plano e reavaliar o risco periodicamente até sua mitigação.
              </li>
            </ul>
            <p>
              Essas etapas alimentam diretamente o{" "}
              <strong>Cadastro de Riscos</strong> e o{" "}
              <strong>Dashboard</strong>, mantendo a visão executiva sempre
              atualizada.
            </p>

            <h2>Fluxo do processo</h2>
            <div className="flow-diagram-wrap">
              <svg
                viewBox="0 0 1320 340"
                style={{ minWidth: "1000px" }}
                role="img"
                aria-label="Fluxograma do processo de gestão de riscos: Identificação, Cadastro, Análise e Classificação, decisão Exige Tratamento, seguindo para Definição do Plano de Ação, Acompanhamento e Encerramento quando sim, ou para Emissão de Carta de Risco e Encerramento quando não"
              >
                <defs>
                  <marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b6b66" />
                  </marker>
                </defs>

                <text x="660" y="20" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1a1a18">
                  Processo de Gestão de Riscos
                </text>

                {/* Setas principais */}
                <path d="M 165 95 L 205 95" stroke="#6b6b66" strokeWidth="1.5" markerEnd="url(#flow-arrow)" />
                <path d="M 355 95 L 395 95" stroke="#6b6b66" strokeWidth="1.5" markerEnd="url(#flow-arrow)" />
                <path d="M 545 95 L 575 95" stroke="#6b6b66" strokeWidth="1.5" markerEnd="url(#flow-arrow)" />
                <path d="M 745 95 L 775 95" stroke="#6b6b66" strokeWidth="1.5" markerEnd="url(#flow-arrow)" />
                <text x="760" y="85" textAnchor="middle" fontSize="12" fill="#2b3a4a" fontWeight="600">Sim</text>
                <path d="M 925 95 L 965 95" stroke="#6b6b66" strokeWidth="1.5" markerEnd="url(#flow-arrow)" />
                <path d="M 1115 95 L 1155 95" stroke="#6b6b66" strokeWidth="1.5" markerEnd="url(#flow-arrow)" />

                {/* Ramo "Não" */}
                <path d="M 660 150 L 660 190 L 850 190 L 850 226" stroke="#6b6b66" strokeWidth="1.5" fill="none" markerEnd="url(#flow-arrow)" />
                <text x="672" y="172" fontSize="12" fill="#2b3a4a" fontWeight="600">Não</text>
                <path d="M 925 275 L 1230 275 L 1230 146" stroke="#6b6b66" strokeWidth="1.5" fill="none" markerEnd="url(#flow-arrow)" />

                {/* Caixa 1 - Identificação */}
                <rect x="15" y="50" width="150" height="90" rx="3" fill="#ffffff" stroke="#e4e2dd" />
                <text x="90" y="72" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1a1a18">Identificação</text>
                <text x="90" y="94" textAnchor="middle" fontSize="10.5" fill="#6b6b66">
                  <tspan x="90" dy="0">Reconhecimento do risco</tspan>
                  <tspan x="90" dy="14">por colaborador, área ou</tspan>
                  <tspan x="90" dy="14">auditoria.</tspan>
                </text>

                {/* Caixa 2 - Cadastro */}
                <rect x="205" y="50" width="150" height="90" rx="3" fill="#ffffff" stroke="#e4e2dd" />
                <text x="280" y="72" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1a1a18">Cadastro</text>
                <text x="280" y="94" textAnchor="middle" fontSize="10.5" fill="#6b6b66">
                  <tspan x="280" dy="0">Registro formal no</tspan>
                  <tspan x="280" dy="14">Cadastro de Riscos.</tspan>
                </text>

                {/* Caixa 3 - Análise e Classificação */}
                <rect x="395" y="50" width="150" height="90" rx="3" fill="#ffffff" stroke="#e4e2dd" />
                <text x="470" y="72" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1a1a18">Análise e Classificação</text>
                <text x="470" y="94" textAnchor="middle" fontSize="10.5" fill="#6b6b66">
                  <tspan x="470" dy="0">Avaliação de impacto e</tspan>
                  <tspan x="470" dy="14">probabilidade na matriz</tspan>
                  <tspan x="470" dy="14">de risco.</tspan>
                </text>

                {/* Diamante - Exige Tratamento? */}
                <polygon points="660,40 745,95 660,150 575,95" fill="#fafaf9" stroke="#2b3a4a" strokeWidth="1.5" />
                <text x="660" y="88" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#1a1a18">Exige</text>
                <text x="660" y="101" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#1a1a18">Tratamento?</text>

                {/* Caixa 5 - Definição do Plano de Ação */}
                <rect x="775" y="50" width="150" height="90" rx="3" fill="#ffffff" stroke="#e4e2dd" />
                <text x="850" y="68" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1a1a18">
                  <tspan x="850" dy="0">Definição do Plano</tspan>
                  <tspan x="850" dy="14">de Ação</tspan>
                </text>
                <text x="850" y="103" textAnchor="middle" fontSize="10.5" fill="#6b6b66">
                  <tspan x="850" dy="0">Definição de objetivo,</tspan>
                  <tspan x="850" dy="14">responsável e prazo.</tspan>
                </text>

                {/* Caixa 6 - Acompanhamento */}
                <rect x="965" y="50" width="150" height="90" rx="3" fill="#ffffff" stroke="#e4e2dd" />
                <text x="1040" y="72" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1a1a18">Acompanhamento</text>
                <text x="1040" y="94" textAnchor="middle" fontSize="10.5" fill="#6b6b66">
                  <tspan x="1040" dy="0">Monitoramento periódico</tspan>
                  <tspan x="1040" dy="14">e revisão pelo Comitê.</tspan>
                </text>

                {/* Caixa 7 - Encerramento */}
                <rect x="1155" y="50" width="150" height="90" rx="3" fill="#ffffff" stroke="#e4e2dd" />
                <text x="1230" y="72" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1a1a18">Encerramento</text>
                <text x="1230" y="94" textAnchor="middle" fontSize="10.5" fill="#6b6b66">
                  <tspan x="1230" dy="0">Reavaliação e</tspan>
                  <tspan x="1230" dy="14">encerramento formal</tspan>
                  <tspan x="1230" dy="14">no Cadastro.</tspan>
                </text>

                {/* Caixa inferior - Emissão de Carta de Risco */}
                <rect x="775" y="230" width="150" height="90" rx="3" fill="#ffffff" stroke="#e4e2dd" />
                <text x="850" y="248" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1a1a18">
                  <tspan x="850" dy="0">Emissão de Carta</tspan>
                  <tspan x="850" dy="14">de Risco</tspan>
                </text>
                <text x="850" y="284" textAnchor="middle" fontSize="10.5" fill="#6b6b66">
                  <tspan x="850" dy="0">Registro formal da</tspan>
                  <tspan x="850" dy="14">aceitação do risco sem</tspan>
                  <tspan x="850" dy="14">plano de ação.</tspan>
                </text>
              </svg>
            </div>

            <p>
              Nem todo risco identificado exige um plano de ação. Após a
              análise e classificação, o processo passa por um ponto de
              decisão: se o risco for considerado relevante o suficiente
              para justificar tratamento, ele segue para a definição do
              plano de ação, acompanhamento periódico e, só então, para o
              encerramento.
            </p>
            <p>
              Se não exigir tratamento — por exemplo, um risco de baixa
              criticidade —, ele não é simplesmente descartado: é
              formalmente aceito através da emissão de uma{" "}
              <strong>Carta de Risco</strong>, documento que registra a
              decisão, sua justificativa e o responsável pela aceitação, e
              só então o risco é encerrado. Isso garante que mesmo a decisão
              de não agir fique documentada e rastreável.
            </p>

            <div className="download-card">
              <div>
                <span className="download-card-label">Modelo para download</span>
                <p className="download-card-title">Carta de Risco (.docx)</p>
                <p className="download-card-desc">
                  Modelo pronto, em papel timbrado, para formalizar a
                  aceitação de um risco sem plano de ação.
                </p>
              </div>
              <a
                href="/modelo-carta-de-risco.docx"
                download="Carta_de_Risco.docx"
                className="btn-primary"
              >
                Baixar modelo
              </a>
            </div>
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
