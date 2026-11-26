import Footer from "@/components/Footer";
import MatrizRiscos from "@/components/riscos/MatrizRiscos";
import { ETAPAS_PROCESSO } from "@/lib/politicaRiscos";

// Guia de Uso do módulo Gestão de Riscos: passo a passo por tarefa, na ordem
// do ciclo de vida do risco, mais a referência técnica. Etapas vêm de
// lib/politicaRiscos (as mesmas da Política e do Processo).

const B = "/seguranca/gestao-de-riscos";

const SUMARIO: [string, string][] = [
  ["visao-geral", "Visão geral"],
  ["navegar", "1. Início e menu"],
  ["perfis", "2. Perfis de acesso"],
  ["cadastrar", "3. Cadastrar um risco"],
  ["importar", "4. Importar riscos (CSV)"],
  ["matriz", "5. Classificação: matriz 5×5"],
  ["detalhe", "6. O detalhe do risco"],
  ["tratar", "7. Tratar: plano de ação ou aceitação"],
  ["auditoria", "8. Auditoria dos planos"],
  ["monitorar", "9. Revisão periódica e KRIs"],
  ["apetite", "10. Apetite e tolerância"],
  ["exposicao", "11. Exposição financeira"],
  ["catalogo", "12. Cenários, risco corporativo e repetidos"],
  ["inventario", "13. Ativos, processos e contatos"],
  ["frameworks", "14. Frameworks (CIS, NIST, ISO)"],
  ["dashboard", "15. Dashboard, Tendências e Relatório"],
  ["trilha", "16. Trilha de auditoria"],
  ["tecnologia", "17. Tecnologia empregada"],
  ["faq", "Perguntas frequentes"],
];

export default function GuiaDeUso() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Guia de Uso</h1>
          <p className="lede">
            Passo a passo de como usar o sistema de Gestão de Riscos, do cadastro de um risco até o relatório para a diretoria.
          </p>

          <div className="body wide-body">
            <p>
              Este guia é para quem opera o sistema no dia a dia. As regras de governança por trás das telas estão na{" "}
              <a href={`${B}/politica`}>Política</a> e no <a href={`${B}/processo`}>Processo</a>.
            </p>

            <nav aria-label="Sumário do guia" className="dash-panel" style={{ margin: "1.5rem 0" }}>
              <div className="dash-panel-header">Sumário</div>
              <div className="dash-panel-body">
                <ol style={{ columns: "2 16rem", margin: 0, paddingLeft: "1.1rem", listStyle: "none" }}>
                  {SUMARIO.map(([id, t]) => (
                    <li key={id} style={{ breakInside: "avoid", marginBottom: "0.3rem" }}>
                      <a href={`#${id}`}>{t}</a>
                    </li>
                  ))}
                </ol>
              </div>
            </nav>

            <h2 id="visao-geral">Visão geral</h2>
            <p>O sistema acompanha cada risco ao longo das mesmas seis etapas da Política:</p>
            <ol>
              {ETAPAS_PROCESSO.map((e) => (
                <li key={e.nome}>
                  <strong>{e.nome}</strong> — {e.resumo}
                </li>
              ))}
            </ol>
            <p>
              Cada etapa tem uma tela. O <strong>Início</strong> mostra o que precisa da sua atenção, o <strong>Dashboard</strong> dá a
              visão gerencial e o <strong>Relatório Executivo</strong> empacota tudo num documento para a diretoria.
            </p>

            <h2 id="navegar">1. Início e menu</h2>
            <p>
              O <strong>Início</strong> é a sua fila de trabalho: alertas (ações vencidas, revisões vencidas, riscos sem tratamento),
              os riscos Críticos e Altos com destaque para os que estão <em>sem plano</em>, <em>sem prazo</em> ou{" "}
              <em>atrasados</em>, as três categorias com mais riscos, os riscos por nível e o velocímetro da meta trimestral de
              mitigação.
            </p>
            <p>O menu lateral é organizado em grupos:</p>
            <table className="dash-table tabela-guia">
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>O que tem</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Riscos</td><td>Lista, cadastro, KRIs, catálogo de cenários, ativos e processos, contatos de negócio e riscos repetidos.</td></tr>
                <tr><td>Acompanhamento</td><td>Filas que pedem ação: KRIs no vermelho, acima da tolerância, revisões vencidas, riscos sem tratamento, sem dono e controles não avaliados.</td></tr>
                <tr><td>Planos de Ação</td><td>Todos os planos, ações atrasadas e aceitações pendentes.</td></tr>
                <tr><td>Auditoria</td><td>Fila de auditoria e relatório de auditoria.</td></tr>
                <tr><td>Conformidade</td><td>Apetite e tolerância, frameworks, Política e Processo.</td></tr>
                <tr><td>Relatórios</td><td>Relatório executivo, Dashboard e Tendências.</td></tr>
              </tbody>
            </table>
            <p>
              Os grupos funcionam como sanfona: passar o mouse abre um grupo e fecha o anterior; clicar fixa o grupo aberto. Os
              números ao lado dos itens são contadores; os vermelhos indicam algo atrasado ou fora do limite. Um grupo fechado mostra a
              soma dos contadores dos seus itens.
            </p>

            <h2 id="perfis">2. Perfis de acesso</h2>
            <p>O que cada pessoa vê e faz depende do perfil atribuído pelo administrador:</p>
            <table className="dash-table tabela-guia">
              <thead>
                <tr>
                  <th>Perfil</th>
                  <th>Pode</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Leitura</td><td>Consultar riscos, planos, indicadores e relatórios.</td></tr>
                <tr><td>Analista GRC</td><td>Cadastrar e editar riscos, planos, ações e evidências; propor versões do apetite.</td></tr>
                <tr><td>Auditor</td><td>Auditar planos concluídos; ver auditoria e trilha de alterações.</td></tr>
                <tr><td>Coordenador e Gerente</td><td>Editar riscos, auditar e aprovar aceitações dentro da sua alçada.</td></tr>
                <tr><td>CISO</td><td>Tudo do Gerente, mais aceitar riscos Críticos e aprovar o apetite a risco.</td></tr>
                <tr><td>Administrador</td><td>Todas as funções (usado na demonstração).</td></tr>
              </tbody>
            </table>
            <p className="field-helper">
              Toda permissão é verificada também no servidor: esconder um botão não é a única barreira.
            </p>

            <h2 id="cadastrar">3. Cadastrar um risco</h2>
            <p>
              Em <strong>Riscos → Cadastrar risco</strong>, aba <em>Cadastro Individual</em>:
            </p>
            <ol>
              <li>
                <strong>Projeto e categoria.</strong> A categoria indica a natureza predominante do risco. Na dúvida entre duas, use a
                regra da <a href={`${B}/politica#categorias`}>Política, seção 4</a>: a diferença entre Segurança da Informação e
                Tecnológico é a presença de um agente de ameaça.
              </li>
              <li>
                <strong>Cenário: causa, evento e consequência.</strong> O título do risco é montado sozinho no padrão &quot;Risco de
                [evento] devido a [causa], resultando em [consequência]&quot;. Enquanto você digita, o sistema mostra riscos
                parecidos do mesmo projeto e cenários do catálogo. Se for o mesmo risco, registre uma nova <em>ocorrência</em> em vez
                de duplicar.
              </li>
              <li>
                <strong>Ponto de gatilho.</strong> O sinal observável que indica que o risco está se aproximando (por exemplo,
                &quot;CVE com CVSS ≥ 9,0 sem correção há 15 dias&quot;). É a base dos KRIs.
              </li>
              <li>
                <strong>Dono do risco e ativo afetado.</strong> O dono é quem decide o tratamento: um usuário do sistema ou um
                contato de negócio. O ativo ou processo vem do inventário, com a área responsável.
              </li>
              <li>
                <strong>Probabilidade e impacto</strong>, de 1 (Muito Baixo) a 5 (Muito Alto). A pontuação e o nível aparecem na hora
                (veja a <a href="#matriz">seção 5</a>).
              </li>
              <li>
                <strong>Controles existentes.</strong> Informe ao menos um controle que já existe ou marque{" "}
                <em>sem controles</em>. Os controles geram o nível atual.
              </li>
            </ol>
            <p className="field-helper">
              O campo <em>Levantado por</em> vem do seu login e não pode ser alterado. O e-mail de confirmação vai só para usuários
              cadastrados.
            </p>

            <h2 id="importar">4. Importar riscos (CSV)</h2>
            <p>Para muitos riscos de uma vez, como o resultado de uma auditoria, use a aba <em>Importação em Lote (CSV)</em>:</p>
            <ol>
              <li>Baixe o modelo CSV e preencha uma linha por risco, mantendo os nomes das colunas.</li>
              <li>Envie o arquivo e confira a prévia das primeiras linhas.</li>
              <li>
                Clique em <strong>Importar</strong>. Linhas com erro não bloqueiam as demais; linhas parecidas com riscos já
                cadastrados ficam pendentes até você confirmar.
              </li>
            </ol>

            <h2 id="matriz">5. Classificação: matriz 5×5</h2>
            <p>
              A pontuação é <strong>Probabilidade × Impacto</strong> (1 a 25) e define o nível pelos critérios da Política:{" "}
              <strong>Baixo</strong> (1 a 4), <strong>Médio</strong> (5 a 9), <strong>Alto</strong> (10 a 16) e{" "}
              <strong>Crítico</strong> (20 a 25). Encontre a linha da probabilidade e a coluna do impacto: a célula é o nível.
            </p>
            <MatrizRiscos />
            <p>
              A matriz é simétrica: um risco só chega a Crítico quando probabilidade e impacto estão altos ao mesmo tempo. O nível de
              um risco é sempre Baixo, Médio, Alto ou Crítico; &quot;Muito Alto&quot; existe só na escala de entrada.
            </p>

            <h2 id="detalhe">6. O detalhe do risco</h2>
            <p>Clique no número do risco em qualquer lista. A página reúne:</p>
            <ul>
              <li>
                <strong>Nível do risco</strong> em três visões: <em>Inerente</em> (sem controles, calculado no cadastro),{" "}
                <em>Atual</em> (com os controles no grau em que estão implementados hoje) e <em>Projetado</em> (com todos os
                controles cadastrados totalmente implementados). O selo de apetite mostra se o nível atual está dentro do apetite,
                acima do apetite ou acima da tolerância.
              </li>
              <li>
                <strong>Responsabilidade:</strong> dono, ponto focal, quem levantou, ativo ou processo e área.
              </li>
              <li>
                <strong>Fatores de risco e controles.</strong> Cada fator registra uma causa concreta e o controle que a trata, com
                tipo, natureza, eficácia potencial e status de implementação. Cada mudança recalcula os níveis Atual e Projetado.
              </li>
              <li><strong>Planos de ação</strong>, com ações, responsáveis, prazos, evidências e situação da auditoria.</li>
              <li><strong>Aceitação do risco</strong>, quando a opção de tratamento for aceitar.</li>
              <li><strong>Exposição financeira</strong> (perda anual esperada), quando estimada.</li>
              <li><strong>Indicadores (KRIs)</strong> vinculados, com a última medição.</li>
              <li><strong>Ocorrências:</strong> as vezes em que o mesmo risco foi identificado de novo.</li>
              <li><strong>Biblioteca de controles:</strong> controles CIS, NIST e ISO sugeridos para o cenário, a confirmar.</li>
              <li><strong>Revisão:</strong> data da última e da próxima revisão.</li>
              <li><strong>Linha do tempo:</strong> todas as alterações, com quem fez, quando, valor anterior e novo.</li>
            </ul>

            <h2 id="tratar">7. Tratar: plano de ação ou aceitação</h2>
            <p>
              Riscos Alto e Crítico precisam de tratamento definido em até 15 dias do cadastro; depois disso entram em{" "}
              <strong>Acompanhamento → Riscos sem tratamento</strong>.
            </p>
            <h3>Plano de ação (mitigar, transferir ou evitar)</h3>
            <ol>
              <li>No detalhe do risco, crie o plano com objetivo e prazo.</li>
              <li>
                Adicione as ações, cada uma com responsável escolhido da lista de usuários e prazo. Ações vencidas aparecem em{" "}
                <strong>Planos de Ação → Ações atrasadas</strong>.
              </li>
              <li>
                Anexe as evidências: PDF, imagens, TXT, CSV, XLSX, DOCX ou EML, até 10 MB. O arquivo é guardado em área privada, com
                nome aleatório e registro do hash SHA-256.
              </li>
              <li>Com todas as ações concluídas, conclua o plano: ele vai para a fila de auditoria.</li>
            </ol>
            <p>
              Regras de status: o risco passa a <em>Em Tratamento</em> quando tem plano ativo; só vira <em>Mitigado</em> quando todos
              os planos foram auditados como Conformes; um plano Não conforme devolve o risco para Em Tratamento.
            </p>
            <h3>Aceitação (Carta de Risco)</h3>
            <ol>
              <li>
                No painel <em>Aceitação do risco</em>, escolha <em>Aceitar</em>, anexe a Carta de Risco (o modelo está no{" "}
                <a href={`${B}/processo`}>Processo</a>), justifique e defina a validade (padrão 12 meses, máximo 24).
              </li>
              <li>
                A aceitação fica pendente em <strong>Planos de Ação → Aceitações pendentes</strong> até alguém da alçada aprovar:
                Baixo e Médio — Coordenador, Gerente ou CISO; Alto — Gerente ou CISO; Crítico — só o CISO.
              </li>
              <li>Aprovada, o risco fica com status <em>Aceito</em>. Quando a validade vence, ele volta para reavaliação.</li>
            </ol>

            <h2 id="auditoria">8. Auditoria dos planos</h2>
            <ol>
              <li>Em <strong>Auditoria → Fila de auditoria</strong>, abra um plano concluído.</li>
              <li>Analise as ações e as evidências anexadas.</li>
              <li>
                Marque <strong>Conforme</strong> (exige pelo menos uma evidência) ou <strong>Não conforme</strong> (exige motivo).
              </li>
            </ol>
            <p>
              Segregação de funções: ninguém audita plano que criou ou em que é responsável por alguma ação, nem o Administrador. A
              tentativa fica registrada. O <strong>Relatório de auditoria</strong> lista as decisões por período.
            </p>

            <h2 id="monitorar">9. Revisão periódica e KRIs</h2>
            <p>
              Cada risco ativo tem uma próxima revisão calculada pelo nível: Crítico a cada 30 dias, Alto 90, Médio 180 e Baixo 365.
              As vencidas aparecem em <strong>Acompanhamento → Revisões vencidas</strong>. Para revisar, abra o risco, confira
              probabilidade, impacto e controles e registre a reavaliação.
            </p>
            <p>
              Um <strong>KRI</strong> transforma o ponto de gatilho numa métrica com limiares verde, amarelo e vermelho. Em{" "}
              <strong>Riscos → Indicadores (KRIs)</strong>:
            </p>
            <ol>
              <li>Crie o KRI vinculado a um risco, com métrica, unidade, direção (quanto maior pior, ou o contrário), limiares, fonte e frequência.</li>
              <li>Registre as medições à mão ou importe um CSV com várias de uma vez.</li>
              <li>
                Se a medição mais recente cair no vermelho, o sistema <strong>antecipa a revisão</strong> do risco vinculado, que
                entra na fila de revisões vencidas com o motivo.
              </li>
            </ol>

            <h2 id="apetite">10. Apetite e tolerância</h2>
            <p>
              Em <strong>Conformidade → Apetite e tolerância</strong> ficam os limites por categoria. O nível atual de cada risco é
              comparado com o limite da sua categoria:
            </p>
            <ul>
              <li><strong>Dentro do apetite</strong> — segue o monitoramento normal.</li>
              <li><strong>▲ Acima do apetite</strong> — precisa de tratamento com prazo.</li>
              <li><strong>▲▲ Acima da tolerância</strong> — tratamento imediato e reporte ao Comitê; aparece em destaque nas listas.</li>
            </ul>
            <p>Para mudar os limites:</p>
            <ol>
              <li>Clique em <em>Propor nova versão</em>, ajuste apetite e tolerância de cada categoria e escreva a justificativa.</li>
              <li>A proposta fica <em>Pendente</em> e não muda nada até ser aprovada. A tela destaca o que muda em relação à versão vigente.</li>
              <li>O CISO aprova ou recusa. Quem propôs não pode aprovar. Aprovada, ela passa a valer na hora e a anterior fica no histórico.</li>
            </ol>
            <p>
              A <a href={`${B}/politica#apetite`}>Política, seção 6</a> traz a tabela vigente e a leitura de cada categoria.
            </p>

            <h2 id="exposicao">11. Exposição financeira</h2>
            <p>
              No painel <em>Exposição financeira</em> do risco, clique em <em>Estimar exposição</em> e informe, em mínimo, provável e
              máximo:
            </p>
            <ul>
              <li>a <strong>frequência anual</strong> do evento (0,2 = uma vez a cada 5 anos);</li>
              <li>
                a <strong>perda por evento</strong>: pelo ativo (custo por hora de indisponibilidade × horas de parada) ou manual, em
                reais;
              </li>
              <li>as premissas de onde vieram os números.</li>
            </ul>
            <p>
              O sistema calcula a <strong>perda anual esperada</strong> (média PERT da frequência × média PERT da perda) e a faixa
              otimista–pessimista. O valor entra no ranking de exposição do Dashboard e do Relatório. A metodologia completa e um
              exemplo calculado estão no <a href={`${B}/processo#apontamento-financeiro`}>Processo</a>.
            </p>

            <h2 id="catalogo">12. Cenários, risco corporativo e repetidos</h2>
            <ul>
              <li>
                <strong>Catálogo de cenários</strong> — biblioteca de cenários padrão (causa, evento, consequência). Ligar riscos de
                projetos a um cenário mostra quantos projetos têm o mesmo problema, a distribuição por nível e a situação do
                tratamento.
              </li>
              <li>
                <strong>Risco corporativo</strong> — a partir de um cenário, registre um risco com dono e tratamento centrais, ligado
                aos riscos dos projetos. Serve para causas comuns, tratadas uma vez para todos.
              </li>
              <li>
                <strong>Riscos repetidos</strong> — lista de riscos com o mesmo texto no mesmo projeto. Consolide-os num só: os demais
                viram ocorrências do principal, sem perder o histórico.
              </li>
            </ul>

            <h2 id="inventario">13. Ativos, processos e contatos</h2>
            <ul>
              <li>
                <strong>Ativos e processos</strong> — inventário de sistemas e processos críticos, com área responsável e custo de
                indisponibilidade por hora. O custo alimenta o cálculo da exposição financeira.
              </li>
              <li>
                <strong>Contatos de negócio</strong> — donos de risco que não usam o sistema (por exemplo, um diretor de outra área),
                com ponto focal interno. A partir de um contato você vê todos os riscos dele.
              </li>
            </ul>

            <h2 id="frameworks">14. Frameworks (CIS, NIST, ISO)</h2>
            <p>
              Em <strong>Conformidade → Frameworks</strong>, cada risco recebe sugestões de controles do CIS Controls v8.1, NIST CSF
              2.0 e ISO/IEC 27001:2022, a partir de uma biblioteca revisada por tema. A sugestão não vale até alguém confirmar:
            </p>
            <ol>
              <li>Abra o risco ou a tela de frameworks e veja as sugestões.</li>
              <li>Confirme as que fazem sentido, informando o status: Implementado, Parcial ou Ausente. Descarte as demais.</li>
              <li>
                A cobertura de cada framework é calculada só com os controles confirmados (Implementado vale 100%, Parcial 50%,
                Ausente 0%).
              </li>
            </ol>
            <p>Controles confirmados num cenário do catálogo valem como referência para todos os riscos ligados a ele.</p>

            <h2 id="dashboard">15. Dashboard, Tendências e Relatório</h2>
            <h3>Dashboard (cockpit)</h3>
            <p>Visão gerencial ao vivo, em cinco faixas:</p>
            <ol>
              <li>
                <strong>Indicadores principais:</strong> riscos ativos, críticos e altos, acima da tolerância, perda anual esperada,
                % de críticos e altos com tratamento e ações atrasadas. Quando há histórico, o card mostra a variação contra o mês
                anterior (verde quando melhora, vermelho quando piora) e a minilinha dos últimos 6 meses.
              </li>
              <li><strong>Onde está o risco:</strong> matriz de calor e apetite por categoria.</li>
              <li><strong>O tratamento está andando?</strong> Funil do tratamento, ações por prazo, aceitações e Inerente × Atual.</li>
              <li><strong>Sinais de alerta:</strong> semáforo dos KRIs e os cinco riscos de maior exposição.</li>
              <li><strong>Governança:</strong> cobertura por framework, pendências e consolidado por projeto.</li>
            </ol>
            <p>
              Clique em qualquer número para abrir a lista correspondente <strong>numa nova aba</strong>, sem sair do Dashboard. A
              lista abre já filtrada e mostra o aviso &quot;Filtro do Dashboard&quot;, com a opção de limpar. O filtro de projeto vale
              para a página inteira; clicar num projeto do consolidado também filtra.
            </p>
            <h3>Tendências</h3>
            <p>
              Todo dia o sistema grava uma foto dos indicadores do mês, que fecha no dia 1 do mês seguinte. A tela mostra 6 ou 12
              meses de Alto/Crítico (inerente × atual × projetado), riscos por nível, pendências, conformidade com a política e
              riscos por mês (pela data de levantamento ou de cadastro). Cada gráfico tem a opção <em>Ver tabela</em>.
            </p>
            <h3>Relatório Executivo</h3>
            <p>
              Em <strong>Relatórios → Relatório executivo</strong>, escolha um projeto ou <em>Todos os projetos</em>. O relatório
              traz resumo, recomendações priorizadas, matriz, tendências, riscos acima da tolerância, KRIs em alerta, exposição
              financeira, cobertura de frameworks e situação dos planos. Use <em>Imprimir / Salvar como PDF</em>; o arquivo sai com a
              data de referência no nome.
            </p>

            <h2 id="trilha">16. Trilha de auditoria</h2>
            <p>
              Toda criação, alteração e exclusão em riscos, fatores, planos, ações, auditorias, aceitações, apetite, KRIs e
              mapeamentos de controles grava quem fez, quando, o campo, o valor anterior e o novo. A trilha aparece na linha do tempo
              de cada risco e pode ser exportada em CSV por período em <strong>Auditoria → Relatório de auditoria</strong>. A tabela
              só aceita inclusões: ninguém edita nem apaga o histórico.
            </p>

            <h2 id="tecnologia">17. Tecnologia empregada</h2>
            <p>
              O sistema é uma aplicação web única, escrita em TypeScript, em que as telas e a API rodam no mesmo projeto. As versões
              abaixo são as travadas no <code>package-lock.json</code>.
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
                <tr><td>Linguagem</td><td>TypeScript (modo <em>strict</em>)</td><td>5.9.3</td><td>Telas, API e motores de cálculo.</td></tr>
                <tr><td>Framework web</td><td>Next.js (App Router)</td><td>16.4.6</td><td>Páginas, renderização no servidor e rotas de API em <code>app/api/*</code>.</td></tr>
                <tr><td>Interface</td><td>React / React DOM</td><td>19.2.9</td><td>Componentes das telas, formulários e gráficos.</td></tr>
                <tr><td>Banco de dados</td><td>PostgreSQL gerenciado na Neon (serverless)</td><td>—</td><td>Riscos, planos, auditorias, apetite, KRIs, fotos e trilha de alterações.</td></tr>
                <tr><td>Driver do banco</td><td>@neondatabase/serverless</td><td>0.10.4</td><td>Consultas parametrizadas via HTTP.</td></tr>
                <tr><td>Autenticação</td><td>Clerk (@clerk/nextjs)</td><td>6.39.9</td><td>Login obrigatório, por convite; o perfil de acesso fica nos metadados do usuário.</td></tr>
                <tr><td>Tradução do login</td><td>@clerk/localizations (pt-BR)</td><td>3.37.11</td><td>Telas de login em português.</td></tr>
                <tr><td>Arquivos</td><td>Vercel Blob</td><td>2.4.0</td><td>Evidências e Cartas de Risco, em armazenamento privado.</td></tr>
                <tr><td>E-mail</td><td>Resend (API REST)</td><td>—</td><td>Confirmação de cadastro, só para usuários cadastrados.</td></tr>
                <tr><td>Importação CSV</td><td>PapaParse</td><td>5.7.0</td><td>Importação de riscos e de medições de KRI.</td></tr>
                <tr><td>Gráficos</td><td>SVG próprio</td><td>—</td><td>Dashboard, Tendências e Relatório, sem biblioteca externa.</td></tr>
                <tr><td>Estilo</td><td>CSS global e CSS Modules; Inter e IBM Plex Mono (next/font)</td><td>—</td><td>Visual do módulo, sem framework de UI.</td></tr>
                <tr><td>Rotinas agendadas</td><td>Vercel Cron</td><td>—</td><td>Foto diária dos indicadores (<code>/api/cron/fotos-mensais</code>).</td></tr>
                <tr><td>Hospedagem</td><td>Vercel</td><td>—</td><td><code>lab.rodrigotavares.com.br</code>, com ambiente de preview por branch e banco próprio na Neon.</td></tr>
                <tr><td>Código-fonte</td><td>GitHub</td><td>—</td><td>Versionamento e revisão por pull request.</td></tr>
              </tbody>
            </table>
            <p className="field-helper">&quot;—&quot; indica serviço gerenciado, sem versão fixada no código.</p>

            <h3>Arquitetura</h3>
            <ul>
              <li>
                <strong>Navegador → API.</strong> As telas chamam a API do próprio projeto; nenhuma tela acessa o banco diretamente.
                Toda rota exige sessão e verifica a permissão do perfil no servidor (um teste automatizado garante isso).
              </li>
              <li>
                <strong>Motores de cálculo puros</strong> em <code>lib/</code>, sem acesso ao banco e cobertos por testes: matriz e
                níveis (<code>metodologiaRisco</code>), apetite (<code>apetiteRisco</code>), KRIs (<code>kriRisco</code>), exposição
                (<code>exposicaoRisco</code>), indicadores (<code>indicadoresRiscos</code>, fonte única do Início, Dashboard e
                Relatório) e o texto da Política e do Processo (<code>politicaRiscos</code>).
              </li>
              <li>
                <strong>Trilha de auditoria no banco.</strong> Cada alteração roda numa transação que identifica o usuário; gatilhos do
                PostgreSQL gravam o antes e o depois.
              </li>
              <li>
                <strong>Operações atômicas no banco.</strong> A aprovação do apetite e a consolidação de riscos repetidos rodam em
                funções do PostgreSQL, numa única transação; a trilha de auditoria recusa edição e exclusão.
              </li>
            </ul>

            <h3>Banco de dados — principais tabelas</h3>
            <table className="dash-table tabela-guia">
              <thead>
                <tr>
                  <th>Tabela</th>
                  <th>Conteúdo</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><code>riscos</code></td><td>Cenário, avaliação, níveis, dono, ativo, status, revisão antecipada e exposição financeira.</td></tr>
                <tr><td><code>fatores_risco</code></td><td>Fatores e controles existentes de cada risco.</td></tr>
                <tr><td><code>planos_acao</code>, <code>acoes</code></td><td>Planos de ação e suas ações.</td></tr>
                <tr><td><code>planos_acao_evidencias</code>, <code>planos_acao_auditorias</code></td><td>Evidências (com SHA-256) e decisões de auditoria.</td></tr>
                <tr><td><code>aceitacoes_risco</code></td><td>Aceitações, aprovador, validade e Carta de Risco.</td></tr>
                <tr><td><code>sistemas_criticos</code>, <code>contatos_risco</code></td><td>Inventário de ativos e processos e contatos de negócio.</td></tr>
                <tr><td><code>cenarios_risco</code>, <code>ocorrencias_risco</code>, <code>riscos_consolidados</code></td><td>Catálogo de cenários, ocorrências e consolidação de repetidos.</td></tr>
                <tr><td><code>apetite_versoes</code>, <code>apetite_limites</code></td><td>Versões do apetite e limites por categoria.</td></tr>
                <tr><td><code>kris</code>, <code>kri_medicoes</code></td><td>Indicadores e suas medições.</td></tr>
                <tr><td><code>riscos_controles</code>, <code>cenario_controles</code></td><td>Controles de frameworks confirmados ou descartados.</td></tr>
                <tr><td><code>fotos_indicadores</code></td><td>Foto mensal dos indicadores por projeto.</td></tr>
                <tr><td><code>parametros_politica</code>, <code>parametros_revisao</code></td><td>Prazo de tratamento e prazos de revisão por nível.</td></tr>
                <tr><td><code>log_alteracoes</code></td><td>Trilha de auditoria (só inclusão).</td></tr>
              </tbody>
            </table>
            <p>
              As mudanças de esquema ficam versionadas em <code>db/migrations</code>. Antes de cada mudança em produção é criado um
              branch de backup na Neon, que expira em 7 dias; cada preview usa um branch próprio do banco, apagado depois do merge.
            </p>

            <h3>Configuração (variáveis de ambiente)</h3>
            <p>Os segredos ficam nas variáveis de ambiente da Vercel, nunca no código:</p>
            <ul>
              <li><code>DATABASE_URL</code> — conexão com o PostgreSQL (Neon).</li>
              <li>
                <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>, <code>CLERK_SECRET_KEY</code> e{" "}
                <code>NEXT_PUBLIC_CLERK_SIGN_IN_URL</code> — autenticação.
              </li>
              <li><code>BLOB_READ_WRITE_TOKEN</code> — armazenamento das evidências.</li>
              <li><code>RESEND_API_KEY</code> — envio de e-mail.</li>
              <li><code>CRON_SECRET</code> — proteção da rotina diária de fotos.</li>
              <li><code>NEXT_PUBLIC_ENV_NAME</code> — faixa de aviso nos ambientes que não são produção.</li>
            </ul>

            <h2 id="faq">Perguntas frequentes</h2>
            <ul>
              <li>
                <strong>Por que não consigo marcar o risco como Mitigado?</strong> Todos os planos do risco precisam estar auditados
                como Conformes. Veja a situação de cada plano no detalhe do risco.
              </li>
              <li>
                <strong>Por que o nível atual não caiu depois que implementei um controle?</strong> Confira a eficácia potencial e a
                natureza do controle: controles de baixa eficácia ou manuais pesam menos, e pode ser preciso mais de um para reduzir um
                nível inteiro.
              </li>
              <li>
                <strong>Por que não aparece o botão Conforme?</strong> O plano precisa ter pelo menos uma evidência, e você não pode
                ter criado o plano nem ser responsável por alguma ação dele.
              </li>
              <li>
                <strong>Quem aprova a minha aceitação?</strong> Depende do nível do risco: Baixo e Médio — Coordenador, Gerente ou
                CISO; Alto — Gerente ou CISO; Crítico — só o CISO.
              </li>
              <li>
                <strong>Mudei o apetite e nada mudou.</strong> A proposta só vale depois de aprovada pelo CISO. Veja em{" "}
                <strong>Conformidade → Apetite e tolerância</strong> se ela está pendente.
              </li>
              <li>
                <strong>Por que o risco apareceu em Revisões vencidas antes do prazo?</strong> Um KRI vinculado ficou vermelho, o que
                antecipa a revisão. O motivo aparece na fila e no risco.
              </li>
              <li>
                <strong>O Dashboard e o Início mostram números diferentes?</strong> Não deveriam: os dois leem a mesma fonte de
                indicadores. Confira se o filtro de projeto é o mesmo nas duas telas.
              </li>
            </ul>
          </div>

          <a href={B} className="status-tag">
            ← Voltar para Gestão de Riscos
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
