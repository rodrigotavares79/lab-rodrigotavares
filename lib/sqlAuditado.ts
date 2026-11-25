import { neon } from "@neondatabase/serverless";

// Cliente SQL das rotas que gravam no Gestão de Riscos (B06).
//
// Usa-se exatamente como o `sql` do neon (sql`...`), mas cada consulta roda
// numa transação que antes informa ao banco quem é o usuário
// (app.usuario_email / app.usuario_nome). Os triggers de log_alteracoes
// (db/migrations/0017) leem essas variáveis para registrar o autor de cada
// alteração. `true` em set_config limita o valor à própria transação, então
// ele não vaza para outra requisição.

type Usuario = { email: string; nome: string };

export function sqlAuditado(usuario: Usuario) {
  const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
  const email = usuario.email || "desconhecido";
  const nome = usuario.nome || email;

  return async function sqlComUsuario(strings: TemplateStringsArray, ...valores: any[]): Promise<any[]> {
    const [, resultado] = await sql.transaction([
      sql`SELECT set_config('app.usuario_email', ${email}, true), set_config('app.usuario_nome', ${nome}, true)`,
      sql(strings, ...valores),
    ]);
    return resultado as any[];
  };
}
