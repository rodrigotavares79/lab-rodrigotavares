# lab.rodrigotavares.com.br

Subdomínio de projetos técnicos. Design minimalista, separado do site
principal (rodrigotavares.com.br), com menu horizontal fixo no topo.

## Rodar localmente

npm install
npm run dev

## Estrutura

- app/page.tsx                                  → home
- app/condominio/page.tsx                        → Gestão de Condomínio
- app/seguranca/gestao-de-riscos/page.tsx        → Gestão de Riscos
- app/seguranca/penteste/page.tsx                → Penteste
- app/seguranca/conscientizacao/page.tsx         → Programa de Conscientização
- components/Nav.tsx                             → menu horizontal com dropdown

## Adicionar um novo item ao menu

Edite components/Nav.tsx:
- Item de topo sem submenu: adicione um novo bloco `<div className="nav-item">`
  como o de "Gestão de Condomínio".
- Item dentro de "Segurança da Informação": adicione uma entrada em
  SEGURANCA_ITEMS.

## Login (Clerk)

O site inteiro fica atrás de login (feito com Clerk). Pra funcionar, é
preciso configurar 3 variáveis de ambiente no projeto da Vercel
(Settings > Environment Variables):

- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in

As duas primeiras vêm do painel do Clerk (dashboard.clerk.com > sua
aplicação > API Keys). Sem elas, o build falha.

Quem pode logar é controlado no painel do Clerk (Users > Invite), não
no código — cadastro público deve ficar desativado (User & Authentication
> Restrictions > "Allow sign-ups" desligado), pra funcionar só por convite.

## Gestão de Condomínio

Reconstrução do app que estava sendo feito no Bubble (app "tavaresrodrigo").
Schema em `db/migrations/0005_condominio_schema.sql` — rode no Neon antes de
usar o módulo (`psql "$DATABASE_URL" -f db/migrations/0005_condominio_schema.sql`).

Não existe uma tabela própria de usuários — papel e unidade de cada pessoa
ficam no Clerk (Dashboard > Users > selecionar o usuário > Metadata > Public),
como um JSON:

```json
{
  "perfilCondominio": "sindico",
  "unidadeCondominio": "Bloco 2, Apto 304"
}
```

`perfilCondominio` aceita `"sindico"`, `"conselheiro"`, `"conselheiro_admin"`
ou `"condomino"`. Sem esse campo definido, o usuário é tratado como condômino
(perfil menos privilegiado). Síndico e conselheiro veem e resolvem todos os
chamados, cadastram fornecedor/tipo de chamado e gerenciam condôminos;
condômino só vê os chamados que abriu, mais os marcados como "visível a
todos".

### Sucessão de síndico (conselheiro-admin)

Só pode existir **um síndico** e **um conselheiro-admin** por vez — a API
bloqueia um segundo cadastro de qualquer um dos dois (`409`).

O síndico não promove outro usuário a síndico diretamente. Pra trocar de
síndico (fim de mandato, por exemplo), o fluxo é:

1. O síndico elege um condômino como **conselheiro-admin** (editando o
   perfil dele em Manutenção de Condôminos). Isso abre um prazo de **30 dias
   úteis**, gravado em `conselheiroAdminPrazoAte`.
2. Dentro do prazo, o conselheiro-admin tem as funções de condômino, mais o
   poder exclusivo de cadastrar o novo síndico (`POST
   /api/condominio-cadastrar-sindico`). Em tudo mais que é exclusivo de
   síndico (dashboard, todos os chamados, lista de condôminos), ele só
   visualiza — não edita.
3. Ao cadastrar o novo síndico, ele escolhe o que acontece com o síndico
   atual: rebaixar para Conselheiro, rebaixar para Condômino, ou Inativar
   (bane o acesso via Clerk — para o caso de síndico profissional,
   não-morador). Essa decisão não é automática, depende da assembleia.
4. Depois disso, o novo síndico decide se mantém ou remove o conselheiro-admin
   (edição normal de perfil).

O prazo é renovável a qualquer momento, tanto pelo síndico quanto pelo
próprio conselheiro-admin (`POST
/api/condominio-usuarios/[id]/renovar-prazo`). Faltando 7 dias úteis pro
vencimento, o conselheiro-admin recebe um aviso em tela (banner na página de
Manutenção de Condôminos) e um e-mail único por ciclo (via Resend — precisa
de `RESEND_API_KEY` configurada; sem ela, só o aviso em tela funciona). Se o
prazo vencer sem renovação, o usuário continua marcado como conselheiro-admin
(histórico), mas a ação de cadastrar síndico fica bloqueada até alguém
renovar.

Upload de anexo (foto/vídeo do chamado) ainda não está implementado — a
tabela `anexos` já existe no schema, mas falta decidir e configurar onde
os arquivos ficam armazenados (ex.: Vercel Blob) antes de ligar essa tela.

## Deploy

Mesmo fluxo dos outros projetos: repositório próprio no GitHub, importado
como projeto separado na Vercel, domínio lab.rodrigotavares.com.br
apontado via Cloudflare (CNAME).
