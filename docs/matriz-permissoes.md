# Gestão de Riscos — perfis e matriz de permissões

Fonte no código: `lib/perfisRiscos.ts` (mantenha os dois iguais). Testes:
`tests/perfisRiscos.test.mts` e `tests/rotasProtegidas.test.mts`.

O perfil fica no Clerk: **Users > usuário > Metadata > Public**, chave
`perfilRiscos`. Exemplo: `{"perfilRiscos": "analista_grc"}`.
Conta **sem a chave** não tem acesso nenhum ao módulo (ex.: moradores do
Gestão de Condomínio).

| Perfil (`perfilRiscos`) | Rótulo | Ler | Editar riscos | Editar planos | Ver auditoria | Auditar |
|---|---|:-:|:-:|:-:|:-:|:-:|
| *(sem a chave)* | Sem acesso | — | — | — | — | — |
| `usuario` | Leitura | ✓ | — | — | — | — |
| `analista_grc` | Analista GRC | ✓ | ✓ | ✓ | ✓ | — |
| `auditor` | Auditor | ✓ | — | — | ✓ | ✓ |
| `coordenador` | Coordenador | ✓ | ✓ | — | ✓ | ✓ |
| `gerente` | Gerente | ✓ | ✓ | — | ✓ | ✓ |
| `ciso` | CISO | ✓ | ✓ | — | ✓ | ✓ |
| `administrador` | Administrador | ✓ | ✓ | ✓ | ✓ | ✓ |

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

## Alçada de aceitação de risco (B16)

Aceitar um risco exige uma Carta de Risco (PDF ou DOCX) e a aprovação de alguém com alçada para o nível **no momento do pedido**:

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
