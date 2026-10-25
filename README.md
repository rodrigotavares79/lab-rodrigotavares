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

`perfilCondominio` aceita `"sindico"`, `"conselheiro"` ou `"condomino"`. Sem
esse campo definido, o usuário é tratado como condômino (perfil menos
privilegiado). Síndico e conselheiro veem e resolvem todos os chamados;
condômino só vê os que abriu, mais os marcados como "visível a todos".

Upload de anexo (foto/vídeo do chamado) ainda não está implementado — a
tabela `anexos` já existe no schema, mas falta decidir e configurar onde
os arquivos ficam armazenados (ex.: Vercel Blob) antes de ligar essa tela.

## Deploy

Mesmo fluxo dos outros projetos: repositório próprio no GitHub, importado
como projeto separado na Vercel, domínio lab.rodrigotavares.com.br
apontado via Cloudflare (CNAME).
