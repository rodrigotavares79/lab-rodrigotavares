import Footer from "@/components/Footer";
import MatrizRiscos from "@/components/riscos/MatrizRiscos";

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
              na tela <strong>Riscos</strong> e evolui dentro da sua
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
                qualitativo (Baixo, Médio, Alto ou Crítico) são
                calculados automaticamente — veja a seção{" "}
                <a href="#matriz">"Como funciona a classificação"</a> abaixo.
              </li>
              <li>
                <strong>Sistema Crítico Vinculado (opcional)</strong> — só
                aparece depois de selecionar um Projeto. Veja a seção{" "}
                <a href="#sistema-critico">"Vincular um Sistema Crítico"</a>.
              </li>
            </ol>
            <p className="field-helper">
              Ao clicar em <strong>Cadastrar Risco</strong>, o formulário é
              limpo e o risco já aparece na tela Riscos.
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
              5×5. A pontuação é Probabilidade × Impacto (de 1 a 25) e define
              o nível qualitativo, seguindo os critérios de avaliação de risco
              da ISO/IEC 27005: <strong>Baixo</strong> (1 a 4),{" "}
              <strong>Médio</strong> (5 a 9), <strong>Alto</strong> (10 a 16)
              e <strong>Crítico</strong> (20 a 25). Encontre a linha da
              Probabilidade e a coluna do Impacto: a célula onde elas se
              cruzam é o nível do risco.
            </p>
            <MatrizRiscos />
            <p>
              Como o nível sai da multiplicação, a matriz é simétrica:
              Probabilidade e Impacto pesam igual. Um risco só chega a
              Crítico quando os dois estão altos (por exemplo, 4 × 5 ou 5 × 5),
              e um extremo isolado (5 × 1 ou 1 × 5) fica em Médio. A ISO/IEC
              27005 deixa as faixas a critério da organização; estas são as
              adotadas por este sistema.
            </p>
            <p>
              Esse nível calculado no momento do cadastro (com Impacto e
              Probabilidade informados ali, sem considerar nenhum controle)
              fica registrado como o nível <strong>Inerente</strong> do
              risco — ele não muda depois, mesmo que você reavalie o risco ou
              cadastre controles. É a referência de "o quão grave seria isso
              sem nenhuma proteção".
            </p>

            <h2>4. Acompanhar na tela Riscos</h2>
            <p>
              Na tela <strong>Riscos</strong> você vê todos os riscos
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

            <h2 id="sistema-critico">6. Vincular um Sistema Crítico (opcional)</h2>
            <p>
              Ao cadastrar ou editar um risco, é possível vincular um{" "}
              <strong>Sistema Crítico</strong> e registrar, como referência
              operacional:
            </p>
            <ul>
              <li>Duração estimada da indisponibilidade (horas)</li>
              <li>% de degradação no cenário de Alto Impacto</li>
              <li>Pessoas envolvidas na restauração</li>
              <li>Horas de restauração por pessoa</li>
            </ul>
            <p>
              Cada campo aceita um valor único ou uma faixa (mínimo / mais
              provável / máximo), para registrar a incerteza da estimativa
              quando ela existir. Esses dados ficam salvos junto do risco e
              aparecem no seu Detalhe — o sistema não exibe hoje uma
              estimativa de custo em R$ a partir deles.
            </p>

            <h2>7. Dashboard executivo</h2>
            <p>
              O <strong>Dashboard</strong> consolida o portfólio de riscos:
              total cadastrado, riscos Altos em aberto, riscos em aberto,
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
              Críticos/Altos em aberto e a situação dos planos de ação
              daquele projeto. Use{" "}
              <strong>🖶 Imprimir / Salvar como PDF</strong> dentro do
              relatório para gerar o arquivo.
            </p>

            <h2 id="tecnologia">9. Tecnologia empregada</h2>
            <p>
              O sistema é uma aplicação web única, escrita em TypeScript,
              em que as telas e a API rodam no mesmo projeto. As versões
              abaixo são as que estão travadas no{" "}
              <code>package-lock.json</code> do repositório.
            </p>

            <h3>Pilha de tecnologia</h3>
            <table className="dash-table tabela-guia">
              <thead>
                <tr>
                  <th>Camada</th>
                  <th>Tecnologia</th>
                  <th>Versão</th>
                  <th>Uso no sistema</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Linguagem</td>
                  <td>TypeScript (modo <em>strict</em>)</td>
                  <td>5.9.3</td>
                  <td>Todo o código de telas, API e motor de cálculo.</td>
                </tr>
                <tr>
                  <td>Framework web</td>
                  <td>Next.js (App Router)</td>
                  <td>16.4.6</td>
                  <td>
                    Roteamento das páginas, renderização no servidor e as
                    rotas de API (<em>Route Handlers</em>) em{" "}
                    <code>app/api/*</code>.
                  </td>
                </tr>
                <tr>
                  <td>Interface</td>
                  <td>React / React DOM</td>
                  <td>19.2.9</td>
                  <td>Componentes das telas, formulários e dashboard.</td>
                </tr>
                <tr>
                  <td>Banco de dados</td>
                  <td>PostgreSQL gerenciado na Neon (serverless)</td>
                  <td>—</td>
                  <td>
                    Armazena projetos, riscos, fatores, planos de ação e
                    sistemas críticos.
                  </td>
                </tr>
                <tr>
                  <td>Driver do banco</td>
                  <td>@neondatabase/serverless</td>
                  <td>0.10.4</td>
                  <td>
                    Conexão via HTTP a partir das rotas de API, com consultas
                    parametrizadas.
                  </td>
                </tr>
                <tr>
                  <td>Autenticação</td>
                  <td>Clerk (@clerk/nextjs)</td>
                  <td>6.39.9</td>
                  <td>
                    Login obrigatório em todo o site, com acesso somente por
                    convite.
                  </td>
                </tr>
                <tr>
                  <td>Tradução do login</td>
                  <td>@clerk/localizations (pt-BR)</td>
                  <td>3.37.11</td>
                  <td>Telas de login e conta em português.</td>
                </tr>
                <tr>
                  <td>E-mail</td>
                  <td>Resend (API REST)</td>
                  <td>—</td>
                  <td>
                    E-mail de confirmação do cadastro individual, enviado
                    por <code>riscos@rodrigotavares.com.br</code>.
                  </td>
                </tr>
                <tr>
                  <td>Importação CSV</td>
                  <td>PapaParse</td>
                  <td>5.7.0</td>
                  <td>Leitura e prévia do arquivo da importação em lote.</td>
                </tr>
                <tr>
                  <td>Gráficos</td>
                  <td>SVG próprio (<code>lib/chartHelpers.ts</code>)</td>
                  <td>—</td>
                  <td>
                    Linhas, áreas e donuts do Dashboard, sem biblioteca de
                    gráficos externa.
                  </td>
                </tr>
                <tr>
                  <td>Estilo</td>
                  <td>CSS global + CSS Modules, fonte Inter (next/font)</td>
                  <td>—</td>
                  <td>Visual do módulo, sem framework de UI.</td>
                </tr>
                <tr>
                  <td>Relatório PDF</td>
                  <td>Impressão do navegador</td>
                  <td>—</td>
                  <td>
                    O Relatório Executivo é uma página formatada para
                    impressão; o PDF é gerado pelo &quot;Salvar como PDF&quot;
                    do navegador.
                  </td>
                </tr>
                <tr>
                  <td>Hospedagem</td>
                  <td>Vercel</td>
                  <td>—</td>
                  <td>
                    Publicação em <code>lab.rodrigotavares.com.br</code>,
                    com ambientes separados por branch.
                  </td>
                </tr>
                <tr>
                  <td>Código-fonte</td>
                  <td>GitHub</td>
                  <td>—</td>
                  <td>Versionamento e revisão das alterações por pull request.</td>
                </tr>
              </tbody>
            </table>
            <p className="field-helper">
              &quot;—&quot; indica serviço gerenciado, sem versão fixada no
              código.
            </p>

            <h3>Arquitetura</h3>
            <ul>
              <li>
                <strong>Navegador → Next.js</strong> — as telas chamam a API
                do próprio projeto (<code>/api/...</code>); nenhuma tela
                acessa o banco diretamente.
              </li>
              <li>
                <strong>API → banco</strong> — cada rota abre a conexão com o
                PostgreSQL pela variável <code>DATABASE_URL</code>, com cache
                desativado para sempre ler dados atuais.
              </li>
              <li>
                <strong>Motor de cálculo</strong> — a matriz 5×5, os pesos,
                o Índice de Mitigação e os níveis Atual e Projetado ficam em{" "}
                <code>lib/metodologiaRisco.ts</code>, um módulo sem acesso a
                banco, com parâmetros baseados na ISO/IEC 27005, ISO 31000,
                NIST SP 800-30 e NIST CSF 2.0. O recálculo é gravado no banco
                por <code>lib/recomputeRisco.ts</code> a cada mudança nos
                fatores ou na avaliação inerente.
              </li>
              <li>
                <strong>Proteção de acesso</strong> — o middleware do Clerk (
                <code>proxy.ts</code>) exige sessão em todas as páginas e
                rotas de API do módulo.
              </li>
            </ul>

            <h3>Banco de dados — tabelas do módulo</h3>
            <table className="dash-table tabela-guia">
              <thead>
                <tr>
                  <th>Tabela</th>
                  <th>Conteúdo</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>projetos</code></td>
                  <td>Lista fixa de projetos/escopos usada no cadastro e nos filtros.</td>
                </tr>
                <tr>
                  <td><code>riscos</code></td>
                  <td>
                    Cada risco, com avaliação inerente, níveis Atual e
                    Projetado, Índices de Mitigação e status.
                  </td>
                </tr>
                <tr>
                  <td><code>fatores_risco</code></td>
                  <td>Fatores de risco e controles vinculados a um risco.</td>
                </tr>
                <tr>
                  <td><code>planos_acao</code></td>
                  <td>Planos de ação de cada risco.</td>
                </tr>
                <tr>
                  <td><code>acoes</code></td>
                  <td>Ações de cada plano (descrição, responsável, prazo, status).</td>
                </tr>
                <tr>
                  <td><code>sistemas_criticos</code></td>
                  <td>
                    Sistemas críticos que podem ser vinculados a um risco, com
                    custos de referência.
                  </td>
                </tr>
              </tbody>
            </table>
            <p>
              As alterações de esquema ficam versionadas como scripts SQL em{" "}
              <code>db/migrations</code> e são aplicadas com{" "}
              <code>psql</code>. Além da recuperação pontual oferecida pela
              Neon, há um script de backup manual (
              <code>scripts/backup-db.sh</code>, com <code>pg_dump</code>)
              que mantém as 10 cópias mais recentes fora do repositório.
            </p>

            <h3>Rotas de API do módulo</h3>
            <table className="dash-table tabela-guia">
              <thead>
                <tr>
                  <th>Rota</th>
                  <th>Função</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>/api/cadastro-risco</code></td>
                  <td>Cadastro individual e envio do e-mail de confirmação.</td>
                </tr>
                <tr>
                  <td><code>/api/importar-riscos</code></td>
                  <td>Importação em lote (CSV), com checagem de duplicidade.</td>
                </tr>
                <tr>
                  <td><code>/api/riscos</code> e <code>/api/riscos/[id]</code></td>
                  <td>Lista, detalhe, reavaliação e mudança de status.</td>
                </tr>
                <tr>
                  <td><code>/api/fatores-risco</code></td>
                  <td>Fatores de risco e controles (dispara o recálculo).</td>
                </tr>
                <tr>
                  <td><code>/api/planos-acao</code> e <code>/api/acoes</code></td>
                  <td>Planos de ação e suas ações.</td>
                </tr>
                <tr>
                  <td><code>/api/projetos</code> e <code>/api/sistemas-criticos</code></td>
                  <td>Listas de apoio dos formulários.</td>
                </tr>
                <tr>
                  <td><code>/api/dashboard</code> e <code>/api/relatorio</code></td>
                  <td>Indicadores do Dashboard e dados do Relatório Executivo.</td>
                </tr>
              </tbody>
            </table>

            <h3>Configuração (variáveis de ambiente)</h3>
            <p>
              Os segredos ficam nas variáveis de ambiente da Vercel, nunca no
              código:
            </p>
            <ul>
              <li><code>DATABASE_URL</code> — conexão com o PostgreSQL (Neon).</li>
              <li>
                <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>,{" "}
                <code>CLERK_SECRET_KEY</code> e{" "}
                <code>NEXT_PUBLIC_CLERK_SIGN_IN_URL</code> — autenticação.
              </li>
              <li><code>RESEND_API_KEY</code> — envio de e-mail.</li>
              <li>
                <code>NEXT_PUBLIC_ENV_NAME</code> — mostra a faixa de aviso
                nos ambientes de desenvolvimento e homologação (vazia em
                produção).
              </li>
            </ul>

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
