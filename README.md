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

## Deploy

Mesmo fluxo dos outros projetos: repositório próprio no GitHub, importado
como projeto separado na Vercel, domínio lab.rodrigotavares.com.br
apontado via Cloudflare (CNAME).
