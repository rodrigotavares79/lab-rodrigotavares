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
