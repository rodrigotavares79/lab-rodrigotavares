import Footer from "@/components/Footer";

export default function GuiaDeUso() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Guia de Uso</h1>
          <p className="lede">
            Passo a passo prático de como usar o sistema de Gestão de Riscos —
            do cadastro de um risco até a emissão do relatório executivo.
          </p>

          <div className="body wide-body">
            <p>
              Este guia é voltado para quem vai operar o dia a dia do
              sistema: cadastrar riscos, acompanhar planos de ação e
              consultar o dashboard. Para entender as regras de governança
              por trás dessas telas, veja a{" "}
              <a href="/seguranca/gestao-de-riscos/politica">Política</a> e o{" "}
              <a href="/seguranca/gestao-de-riscos/processo">Processo</a>.
            </p>

            <h2>Visão geral</h2>
            <p>
              Cada risco nasce no <strong>Cadastro de Riscos</strong>, aparece
              na <strong>Lista de Riscos</strong> e evolui dentro da sua
              própria página de <strong>Detalhe</strong>, onde você registra
              fatores de risco, controles e planos de ação. O{" "}
              <strong>Dashboard</strong> consolida tudo isso em indicadores, e
              o <strong>Relatório Executivo</strong> empacota esses
              indicadores em um documento para impressão ou envio.
            </p>

            <h2>1. Cadastrar um risco</h2>
            <p>
              Acesse <strong>Cadastro de Riscos</strong>. Por padrão o
              formulário está na aba <strong>Cadastro Individual</strong>.
            </p>
            <ol>
              <li>
                <strong>Identificação do Risco</strong> — selecione o
                Projeto, a Categoria (Tecnológico, Operacional,
                Estratégico...), descreva o Ponto de Gatilho (o que dispara o
                risco) e o Resultado Potencial. Informe quem está levantando
                o risco (campo <em>Levantado Por</em>) — um e-mail de
                confirmação com os dados cadastrados é enviado
                automaticamente para esse endereço.
              </li>
              <li>
                <strong>Análise do Risco</strong> — escolha Impacto e
                Probabilidade, cada um numa escala de 1 (Muito Baixo) a 5
                (Muito Alto). A Pontuação da Matriz e o selo de nível
                qualitativo (Baixo, Moderado, Significativo ou Alto) são
                calculados automaticamente — veja a seção{" "}
                <a href="#matriz">"Como funciona a classificação"</a> abaixo.
              </li>
              <li>
                <strong>Impacto Financeiro (opcional)</strong> — só aparece
                depois de vincular um Sistema Crítico. Veja a seção{" "}
                <a href="#financeiro">"Impacto financeiro e simulação"</a>.
              </li>
            </ol>
            <p className="field-helper">
              Ao clicar em <strong>Cadastrar Risco</strong>, o formulário é
              limpo e o risco já aparece na Lista de Riscos.
            </p>

            <h2>2. Importar vários riscos de uma vez (CSV)</h2>
            <p>
              Para cadastrar muitos riscos de uma vez — por exemplo, o
              resultado de uma auditoria — use a aba{" "}
              <strong>Importação em Lote (CSV)</strong>, na própria página de
              Cadastro de Riscos.
            </p>
            <ol>
              <li>Baixe o modelo CSV pelo botão "Baixar modelo CSV".</li>
              <li>
                Preencha uma linha por risco no Excel ou Google Sheets,
                mantendo os nomes de coluna do modelo, e salve como .csv.
              </li>
              <li>
                Envie o arquivo. O sistema mostra uma prévia das primeiras 10
                linhas antes de importar.
              </li>
              <li>
                Clique em <strong>Importar</strong>. Linhas com problema não
                bloqueiam as demais: elas são separadas em erros (não
                importadas) e avisos.
              </li>
              <li>
                Linhas marcadas como <strong>suspeita de duplicidade</strong>{" "}
                (parecidas com um risco já cadastrado) ficam pendentes — você
                decide quais confirmar e importar mesmo assim.
              </li>
            </ol>
            <p className="field-helper">
              A importação em lote não envia e-mail de confirmação — isso só
              acontece no cadastro individual.
            </p>

            <h2 id="matriz">3. Como funciona a classificação (matriz 5×5)</h2>
            <p>
              Impacto e Probabilidade (1 a 5 cada) são cruzados numa matriz
              5×5 que gera um nível qualitativo:
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", margin: "1rem 0 1.25rem" }}>
              <span className="badge badge-baixo">Baixo</span>
              <span className="badge badge-medio">Moderado</span>
              <span className="badge badge-alto">Significativo</span>
              <span className="badge badge-critico">Alto</span>
            </div>
            <p>
              Esse nível calculado no momento do cadastro (com Impacto e
              Probabilidade informados ali, sem considerar nenhum controle)
              fica registrado como o nível <strong>Inerente</strong> do
              risco — ele não muda depois, mesmo que você reavalie o risco ou
              cadastre controles. É a referência de "o quão grave seria isso
              sem nenhuma proteção".
            </p>

            <h2>4. Acompanhar na Lista de Riscos</h2>
            <p>
              Em <strong>Lista de Riscos</strong> você vê todos os riscos
              cadastrados, com filtro por Projeto. A coluna Nível mostra o
              nível <strong>atual</strong> do risco (já considerando
              controles), e a coluna Status mostra se ele está{" "}
              <em>Identificado</em>, <em>Em Tratamento</em> ou{" "}
              <em>Mitigado</em>. Clique no ID (#) para abrir o detalhe
              completo.
            </p>

            <h2>5. Abrir o detalhe de um risco</h2>

            <h3>Nível Inerente, Atual e Projetado</h3>
            <p>
              A página de detalhe mostra três visões do mesmo risco lado a
              lado:
            </p>
            <ul>
              <li>
                <strong>Inerente</strong> — o nível calculado no cadastro,
                sem nenhum controle. Fixo.
              </li>
              <li>
                <strong>Atual</strong> — o nível depois de aplicar os
                controles já implementados hoje (campo{" "}
                <em>Status de Implementação</em> de cada fator de risco).
                Recalculado automaticamente a cada mudança.
              </li>
              <li>
                <strong>Projetado</strong> — o nível que o risco teria{" "}
                <em>se todos os controles cadastrados estivessem 100%
                implementados</em>. Serve para mostrar o ganho potencial de
                terminar o que já foi planejado.
              </li>
            </ul>

            <h3>Reavaliar o risco e mudar o status</h3>
            <p>
              No formulário de reavaliação você pode ajustar o Impacto e a
              Probabilidade <strong>inerentes</strong> (caso a avaliação
              inicial precise de correção) e mudar o Status entre{" "}
              <em>Identificado</em>, <em>Em Tratamento</em> e{" "}
              <em>Mitigado</em>. Ao marcar como <strong>Mitigado</strong>, o
              risco é congelado por completo: não é mais possível editar
              fatores de risco, planos de ação ou reavaliar o risco.
            </p>

            <h3>Fatores de Risco e Controles</h3>
            <p>
              Um <strong>Fator de Risco</strong> representa uma causa ou
              vulnerabilidade concreta por trás do risco, junto com o
              controle que existe (ou está planejado) para tratá-la. Cada
              fator tem:
            </p>
            <ul>
              <li>
                <strong>Natureza do Fator</strong> — Exposição (facilita o
                risco acontecer), Amplificação (piora as consequências, sem
                mudar a chance) ou Misto (as duas coisas).
              </li>
              <li>
                <strong>Criticidade</strong> — o peso desse fator dentro do
                conjunto de fatores do risco.
              </li>
              <li>
                <strong>Tipo de Controle</strong> — Preventivo, Detectivo,
                Corretivo ou Diretivo/Governança.
              </li>
              <li>
                <strong>Natureza do Controle</strong> — técnico automatizado,
                técnico com intervenção manual, ou processo/manual.
              </li>
              <li>
                <strong>Eficácia Potencial</strong> — quão bem o controle
                funcionaria se estivesse 100% implementado.
              </li>
              <li>
                <strong>Status de Implementação</strong> — de "Não iniciado"
                a "Implementado e validado". É o que diferencia o nível Atual
                do Projetado.
              </li>
            </ul>
            <p>
              A combinação de Natureza do Fator e Tipo de Controle sugere se
              o controle atua sobre a Probabilidade, o Impacto ou Ambos — é
              possível sobrepor essa sugestão manualmente (com justificativa)
              quando o caso concreto pedir. Cada fator adicionado, editado ou
              removido recalcula automaticamente o Índice de Mitigação e, por
              consequência, os níveis Atual e Projetado.
            </p>

            <h3>Planos de Ação e Ações</h3>
            <p>
              Um risco pode ter um ou mais <strong>Planos de Ação</strong>,
              cada um com várias <strong>Ações</strong> (descrição,
              responsável e prazo). Ações com prazo vencido aparecem
              marcadas. Um plano só pode ser concluído quando todas as suas
              ações estiverem com status <em>Concluído</em>; depois disso ele
              fica congelado e não aceita novas ações.
            </p>

            <h2 id="financeiro">6. Impacto financeiro e simulação</h2>
            <p>
              Ao cadastrar ou editar um risco, é possível vincular um{" "}
              <strong>Sistema Crítico</strong> (um ativo com custo de hora de
              indisponibilidade e custo de hora/homem de restauração já
              conhecidos) e estimar:
            </p>
            <ul>
              <li>Duração da indisponibilidade (horas)</li>
              <li>% de degradação no cenário de Alto Impacto</li>
              <li>Pessoas envolvidas na restauração</li>
              <li>Horas de restauração por pessoa</li>
            </ul>
            <p>
              Cada campo aceita um valor único ou uma faixa (mínimo / mais
              provável / máximo). Quando você informa uma faixa, o sistema
              roda uma simulação (distribuição PERT, por Monte Carlo) para
              estimar não só o valor mais provável, mas também a incerteza em
              torno dele — mostrada como a faixa entre o percentil 10 e o
              percentil 90 (p10–p90). O resultado é exibido em dois cenários:
            </p>
            <ul>
              <li>
                <strong>Evento Crítico</strong> — indisponibilidade total do
                sistema pelo tempo estimado.
              </li>
              <li>
                <strong>Evento Alto Impacto</strong> — degradação parcial, na
                proporção informada no campo de % de degradação.
              </li>
            </ul>
            <p className="field-helper">
              A prévia que aparece durante o cadastro é só uma aproximação
              rápida (poucas iterações). O valor gravado de fato é
              recalculado no servidor com mais iterações.
            </p>

            <h2>7. Dashboard executivo</h2>
            <p>
              O <strong>Dashboard</strong> consolida o portfólio de riscos:
              total cadastrado, riscos Altos em aberto, exposição financeira,
              evolução mensal, distribuição por categoria e por nível, e a
              comparação entre nível inerente e nível atual (quantos riscos
              melhoraram, mantiveram ou pioraram de nível). Use o filtro de
              Projeto no topo para ver os indicadores de um projeto
              específico — sem filtro, o dashboard mostra o consolidado de
              todos os projetos, incluindo uma tabela por projeto.
            </p>

            <h2>8. Relatório Executivo (PDF)</h2>
            <p>
              Com um Projeto selecionado no filtro do Dashboard, o botão{" "}
              <strong>📄 Emitir Relatório Executivo</strong> abre uma versão
              formatada para impressão, com resumo executivo, riscos
              Significativos/Altos em aberto, situação dos planos de ação e o
              ranking de maior exposição financeira daquele projeto. Use{" "}
              <strong>🖶 Imprimir / Salvar como PDF</strong> dentro do
              relatório para gerar o arquivo.
            </p>

            <h2>Perguntas frequentes</h2>
            <ul>
              <li>
                <strong>Por que o nível Atual não mudou depois que marquei um
                controle como implementado?</strong> Verifique a Eficácia
                Potencial e a Natureza do Controle do fator — controles de
                baixa eficácia ou aplicados de forma manual pesam menos no
                Índice de Mitigação, então pode ser necessário mais de um
                fator (ou um fator mais forte) para reduzir um nível inteiro.
              </li>
              <li>
                <strong>Consigo editar um risco Mitigado?</strong> Não.
                Mitigado congela o risco por completo — reavaliação, fatores
                de risco e planos de ação deixam de ser editáveis.
              </li>
              <li>
                <strong>O e-mail de confirmação é obrigatório?</strong> O
                campo "Levantado Por" é obrigatório no cadastro individual, e
                o e-mail é enviado automaticamente para esse endereço. Na
                importação em lote não há envio de e-mail.
              </li>
            </ul>
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
