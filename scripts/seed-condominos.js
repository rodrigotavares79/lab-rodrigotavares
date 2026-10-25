// Cria 15 condôminos de demonstração como contas reais no Clerk (não existe
// tabela de usuários própria — perfil/unidade vivem no publicMetadata, ver
// lib/condominioAuth.ts). Não envia nenhum e-mail: usa users.createUser
// (diferente de invitations.createInvitation, que é o que a tela
// "Manutenção de Condôminos" usa pro convite normal).
//
// Distribuição: 1 conselheiro-admin, 3 conselheiros, 11 condôminos comuns.
// O síndico atual NÃO é tocado — este script nunca cria nem altera síndico.
// E-mails usam o domínio reservado para testes "@example.com" (RFC 2606),
// então não existem de verdade e nada é entregue a ninguém.
//
// Rode com:
//   node scripts/seed-condominos.js
//
// Idempotente: pula qualquer e-mail que já exista como usuário no Clerk.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClerkClient } = require("@clerk/backend");

function carregarEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const texto = fs.readFileSync(envPath, "utf8");
  for (const linha of texto.split("\n")) {
    const match = linha.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

// Mesma regra de dias úteis usada em lib/condominioAuth.ts, pro prazo do
// conselheiro-admin sair consistente com o resto do app.
function adicionarDiasUteis(base, diasUteis) {
  const resultado = new Date(base);
  let restantes = diasUteis;
  while (restantes > 0) {
    resultado.setUTCDate(resultado.getUTCDate() + 1);
    const dia = resultado.getUTCDay();
    if (dia !== 0 && dia !== 6) restantes -= 1;
  }
  return resultado;
}

const CONDOMINOS = [
  { nome: "Mariana Silva",    unidade: "Bloco 1, Apto 501", perfil: "conselheiro_admin" },
  { nome: "Carlos Pereira",   unidade: "Bloco 1, Apto 302", perfil: "conselheiro" },
  { nome: "Juliana Costa",    unidade: "Bloco 2, Apto 204", perfil: "conselheiro" },
  { nome: "Roberto Almeida",  unidade: "Bloco 3, Apto 110", perfil: "conselheiro" },
  { nome: "Fernanda Lima",    unidade: "Bloco 1, Apto 105", perfil: "condomino" },
  { nome: "André Santos",     unidade: "Bloco 1, Apto 208", perfil: "condomino" },
  { nome: "Patrícia Oliveira",unidade: "Bloco 1, Apto 310", perfil: "condomino" },
  { nome: "Bruno Carvalho",   unidade: "Bloco 2, Apto 103", perfil: "condomino" },
  { nome: "Camila Rodrigues", unidade: "Bloco 2, Apto 207", perfil: "condomino" },
  { nome: "Eduardo Martins",  unidade: "Bloco 2, Apto 309", perfil: "condomino" },
  { nome: "Larissa Souza",    unidade: "Bloco 3, Apto 102", perfil: "condomino" },
  { nome: "Gustavo Ferreira", unidade: "Bloco 3, Apto 206", perfil: "condomino" },
  { nome: "Beatriz Gomes",    unidade: "Bloco 3, Apto 308", perfil: "condomino" },
  { nome: "Thiago Barbosa",   unidade: "Bloco 1, Apto 404", perfil: "condomino" },
  { nome: "Vanessa Ribeiro",  unidade: "Bloco 2, Apto 406", perfil: "condomino" },
];

function partesDoNome(nome) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/);
}

function emailDe(nome) {
  const slug = partesDoNome(nome).join(".");
  // Clerk valida o formato do e-mail e rejeita TLDs "soltos" como .example —
  // example.com é o domínio reservado (RFC 2606) com cara de domínio real,
  // passa na validação, e continua não entregando nada de verdade.
  return `${slug}@example.com`;
}

function usernameDe(nome) {
  // Esta instância do Clerk exige username — underscore em vez de ponto
  // porque nem toda configuração de username aceita ponto.
  return partesDoNome(nome).join("_");
}

async function main() {
  carregarEnvLocal();
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY não encontrada em .env.local.");
  }

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  const existentes = await clerk.users.getUserList({ limit: 200 });
  const emailsExistentes = new Set(
    existentes.data.flatMap((u) => u.emailAddresses.map((e) => e.emailAddress.toLowerCase()))
  );
  const jaTemConselheiroAdmin = existentes.data.some(
    (u) => (u.publicMetadata || {}).perfilCondominio === "conselheiro_admin"
  );

  let criados = 0;
  let pulados = 0;

  for (const c of CONDOMINOS) {
    const email = emailDe(c.nome);

    if (emailsExistentes.has(email.toLowerCase())) {
      console.log(`– pulado (já existe): ${c.nome} <${email}>`);
      pulados += 1;
      continue;
    }
    if (c.perfil === "conselheiro_admin" && jaTemConselheiroAdmin) {
      console.log(`– pulado (já existe um conselheiro-admin ativo): ${c.nome} <${email}>`);
      pulados += 1;
      continue;
    }

    const [firstName, ...resto] = c.nome.split(" ");
    const lastName = resto.join(" ");

    const publicMetadata = {
      perfilCondominio: c.perfil,
      unidadeCondominio: c.unidade,
    };
    if (c.perfil === "conselheiro_admin") {
      publicMetadata.conselheiroAdminPrazoAte = adicionarDiasUteis(new Date(), 30).toISOString();
      publicMetadata.conselheiroAdminAvisado = false;
    }

    await clerk.users.createUser({
      emailAddress: [email],
      username: usernameDe(c.nome),
      password: crypto.randomBytes(18).toString("base64url"),
      firstName,
      lastName,
      publicMetadata,
      skipPasswordChecks: true,
    });

    console.log(`✓ criado: ${c.nome} <${email}> — ${c.perfil} — ${c.unidade}`);
    criados += 1;
  }

  console.log(`\nPronto. ${criados} criado(s), ${pulados} pulado(s).`);
}

main().catch((err) => {
  console.error("Falha ao popular condôminos:", err);
  process.exit(1);
});
