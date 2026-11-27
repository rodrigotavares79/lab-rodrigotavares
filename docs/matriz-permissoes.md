# Gestão de Riscos — perfis e matriz de permissões

Fonte no código: `lib/perfisRiscos.ts` (mantenha os dois iguais). Testes:
`tests/perfisRiscos.test.mts` e `tests/rotasProtegidas.test.mts`.

O perfil fica no Clerk, no `publicMetadata`, chave `perfilRiscos`. Exemplo:
`{"perfilRiscos": "analista_grc"}`. Administrador e CISO o definem pela tela
**Administração → Usuários e perfis**, sem precisar do painel do Clerk.
Conta **sem a chave** não tem acesso nenhum ao módulo (ex.: moradores do
Gestão de Condomínio).

| Perfil (`perfilRiscos`) | Rótulo | Ler | Editar riscos | Editar planos | Ver auditoria | Auditar | Gerir usuários |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|
| *(sem a chave)* | Sem acesso | — | — | — | — | — | — |
| `usuario` | Leitura | ✓ | — | — | — | — | — |
| `analista_grc` | Analista GRC | ✓ | ✓ | ✓ | ✓ | — | — |
| `auditor` | Auditor | ✓ | — | — | ✓ | ✓ | — |
| `coordenador` | Coordenador | ✓ | ✓ | — | ✓ | ✓ | — |
| `gerente` | Gerente | ✓ | ✓ | — | ✓ | ✓ | — |
| `ciso` | CISO | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| `administrador` | Administrador | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Valores antigos aceitos: `gestor` = `gerente`, `analista_senior` = `analista_grc`.
Valor desconhecido = Leitura.

## O que cada permissão libera

- **Ler**: todas as telas e APIs de consulta do módulo (Início, Dashboard,
  riscos, planos, evidências, relatórios executivos, conformidade).
- **Editar riscos**: cadastrar e importar riscos, reavaliar (status,
  impacto/probabilidade inerentes, revisão periódica), fatores de risco.
- **Editar planos**: criar e editar planos de ação, ações e evidências.
- **Ver auditoria**: Auditoria de Planos, Relatório de Auditoria, log de
  alterações (CSV) e registros de auditoria na linha do tempo.
- **Auditar**: classificar planos como Conforme / Não conforme.
- **Gerir usuários**: convidar por e-mail, mudar perfis e remover o acesso
  ao módulo (tela Usuários e perfis).

## Usuários e perfis

- Só **Administrador** e **CISO** gerenciam usuários.
- Ninguém altera o próprio perfil.
- Só um Administrador concede, altera ou convida o perfil Administrador.
- O último Administrador não pode ser rebaixado.
- Remover o acesso grava `perfilRiscos = "sem_acesso"`; a conta continua no
  lab (os metadados de outros módulos não são tocados).
- Com SSO, `perfilRiscosOrigem = "grupo"` marca o perfil definido por grupo
  do provedor de identidade: a tela o mostra travado.
- Cada convite, mudança e remoção grava em `log_alteracoes` (tabela
  `usuarios`), com autor, valor anterior e novo.
- Regras em `lib/perfisRiscos.ts` (`validarMudancaPerfil`, `validarConvite`),
  testadas em `tests/gestaoUsuarios.test.mts`.

## Dono do risco e inventário de ativos (B14)

- Todo risco novo tem um **dono**, distinto de quem levantou: um usuário do módulo ou um **contato de negócio** sem acesso ao sistema (tela "Contatos de negócio"). Definir ou trocar o dono exige `editarRiscos`.
- Risco com dono externo tem sempre um **ponto focal** com perfil **Analista GRC**, que atualiza o risco em nome do dono. A aprovação de aceitação (B16) continua exigindo usuário com alçada; a concordância do dono externo vai na Carta de Risco.
- Contatos de negócio e o inventário de **ativos e processos críticos** é consultado por qualquer perfil com `ler` e cadastrado/editado por quem tem `editarRiscos`.
- A lista de usuários (para escolher dono ou responsável por ação) é liberada para quem tem `editarRiscos` ou `editarPlanos`.

## Catálogo de cenários e risco corporativo (B27)

- O catálogo é consultado por qualquer perfil com `ler`; criar, editar, inativar cenários, ligar riscos a cenários e registrar risco corporativo exige `editarRiscos`.
- O risco corporativo é um risco do projeto "Corporativo (transversal)" e segue as mesmas regras dos demais (dono, planos, aceitação com alçada, revisão).

## Controles existentes (B15)

- O cadastro exige ao menos um controle existente (fator de risco com controle) ou a declaração "sem controles" com justificativa. Declarar ou desfazer exige `editarRiscos`.
- Plano de ação pode indicar o controle que implementa; quando o plano é auditado como Conforme (perfil com `auditar`), o controle passa a "Implementado e validado" e o nível atual é recalculado.

## Alçada de aceitação de risco (B16)

Aceitar um risco exige uma Carta de Risco (PDF ou DOCX) e a aprovação de alguém com alçada para o nível **atual** do risco (se o risco mudar de nível depois do pedido, vale a alçada do nível novo):

| Nível do risco | Quem pode aprovar |
|---|---|
| Baixo / Médio | Coordenador, Gerente, CISO |
| Alto | Gerente, CISO |
| Crítico | CISO |

- O solicitante nunca aprova a própria aceitação (segregação de funções); tentativas bloqueadas são registradas em `eventos_seguranca` (`aceitacao_bloqueada`).
- O perfil Administrador **não** tem alçada de aceitação: administra o sistema, não assume risco de negócio.
- A aceitação vale de 1 a 24 meses (padrão 12). Ao vencer, o risco aparece em "Revisões vencidas".
- Trocar a opção de tratamento para algo diferente de "Aceitar" revoga a aceitação pendente ou vigente.

## Regras adicionais

- **Segregação de funções (B07)**: mesmo com a permissão Auditar, ninguém
  audita um plano que criou ou em que é responsável por alguma ação, nem
  plano com ação sem responsável vinculado. Vale também para Administrador.
- **Estados congelados**: risco Mitigado e plano Conforme não podem ser
  alterados por nenhum perfil.
- Toda rota de API do módulo confere a permissão no servidor; a interface
  só esconde o que o perfil não pode usar.

## Pendente

- **Dono do risco**: depende do campo "dono do risco" (B14). Quando existir,
  o dono poderá editar o próprio risco e seus planos.

## Apetite e tolerância a risco (B18)

- Qualquer perfil com `ler` consulta a versão vigente, a proposta pendente e o histórico.
- Propor uma nova versão exige `editarRiscos`. Só cabe uma proposta pendente por vez.
- Aprovar ou recusar: **CISO** (e **Administrador**, para operar a demonstração). Quem propôs a versão não decide sobre ela; tentativas sem alçada ou do próprio proponente ficam em `eventos_seguranca`.
- Ao aprovar, a versão vira Vigente e a anterior, Substituída. Cada risco ativo é comparado pelo **nível atual** com o apetite e a tolerância da sua categoria; acima da tolerância aparece em destaque na lista, no menu ("Acima da tolerância") e no Relatório Executivo.

## Indicadores-chave de risco — KRIs (B21)

- Qualquer perfil com `ler` consulta os KRIs, as medições e a tendência.
- Cadastrar, ajustar limiares, inativar, registrar medição e importar CSV exigem `editarRiscos`.
- Medição no vermelho (a mais recente do KRI) antecipa a revisão do risco vinculado: ele entra na fila "Revisões vencidas" até ser reavaliado.

## Exposição financeira (B23)

- Qualquer perfil com `ler` vê a estimativa na tela do risco e o ranking no Relatório Executivo.
- Estimar, revisar ou remover exige `editarRiscos` (risco mitigado não pode ser alterado).
- Frequência anual e perda por evento em faixas (mín, provável, máx); a perda pode ser calculada pelo custo de indisponibilidade por hora do ativo crítico × horas de parada.

## Mapeamento curado de frameworks (B24)

- Qualquer perfil com `ler` vê a cobertura, as lacunas e os controles de cada risco na tela de Conformidade.
- Confirmar (com status Implementado / Parcial / Ausente), descartar, desfazer ou incluir controle manualmente exige `editarRiscos`; o mesmo vale para a biblioteca de controles de cada cenário.
- Palavra-chave e biblioteca só sugerem: a cobertura considera apenas controles confirmados.

## Assessments de segurança (B28)

- Qualquer perfil com `ler` consulta assessments e relatórios.
- Criar um assessment, responder o questionário e registrar riscos a partir de uma resposta exigem `editarRiscos`, e só enquanto o assessment está em **Rascunho**.
- Enviar para revisão exige todas as perguntas das áreas escolhidas respondidas (objetiva com Sim / Não / Parcial / N/A; descritiva com texto).
- Aprovar (Concluído) ou devolver a Rascunho (com motivo obrigatório) exige `auditar`. **Quem conduziu não revisa o próprio assessment**: a regra está em `lib/assessmentRegras.ts` e também numa restrição do banco (`revisor_email` diferente de `analista_email`).
- Concluído trava o assessment; o relatório guarda uma foto (`snapshot`) das respostas, da maturidade e dos riscos vinculados naquele momento.
- Relatório (prévia antes da conclusão, versão aprovada depois): qualquer perfil com `ler`.
- Uma resposta Não ou Parcial **sugere** um risco (categoria, causa e ponto de gatilho pré-preenchidos); o analista decide se registra, pelo cadastro de riscos normal (exige `editarRiscos` e o assessment em Rascunho). O vínculo fica em `assessment_riscos`; a Fonte do risco é escolhida na lista do próprio cadastro.

## Cadastros da Administração (B29)

- **Projetos** (Administração → Projetos): cadastrar, renomear, descrever, desativar e reativar exige `gerirUsuarios` (Administrador e CISO). Projeto não se exclui: inativo sai das listas de cadastro (riscos, ativos críticos, assessments) e continua nos filtros, relatórios e no histórico. Nome único, sem diferenciar maiúsculas, acentos e espaços.
- **Solicitação de inclusão de projeto**: quem tem `editarRiscos` e não acha o projeto pede a inclusão pelo link embaixo do campo Projeto, com justificativa. Administrador ou CISO aprova (cria o projeto ou aponta um existente, reativando-o se preciso) ou recusa com motivo. Quem pediu não decide a própria solicitação e vê a decisão no mesmo lugar onde pediu. O menu mostra o número de solicitações pendentes.
- **Parâmetros da política** (prazo de tratamento e periodicidade de revisão por nível): consulta com `ler`, alteração com `gerirUsuarios`. Nível mais grave tem revisão igual ou mais frequente que um mais leve.
- **Perguntas dos assessments**: cadastrar, corrigir e ativar/desativar exige `gerirUsuarios`. Texto e tipo só mudam enquanto a pergunta não tem respostas; depois, desativa-se e cadastra-se outra. Pergunta não se exclui.
- Tudo grava em `log_alteracoes` com autor, valor anterior e novo.
