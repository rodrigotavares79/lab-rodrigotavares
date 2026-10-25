import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio, podeGerirChamados } from "@/lib/condominioAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario || !podeGerirChamados(usuario.perfil)) {
      return NextResponse.json({ error: "Só o síndico ou conselheiro vê o dashboard." }, { status: 403 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    const kpisRows = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status NOT IN ('Resolvido', 'Cancelado'))::int AS em_aberto,
        COUNT(*) FILTER (WHERE status NOT IN ('Resolvido', 'Cancelado') AND prazo_sla < now())::int AS sla_vencido,
        COUNT(*) FILTER (WHERE status = 'Resolvido')::int AS resolvidos
      FROM chamados
    `;

    const porStatus = await sql`
      SELECT status, COUNT(*)::int AS total FROM chamados GROUP BY status ORDER BY total DESC
    `;

    const porUrgencia = await sql`
      SELECT urgencia, COUNT(*)::int AS total FROM chamados
      WHERE urgencia IS NOT NULL GROUP BY urgencia
    `;

    const porTipo = await sql`
      SELECT t.nome AS tipo, COUNT(*)::int AS total
      FROM chamados c JOIN tipos_chamado t ON t.id = c.tipo_id
      GROUP BY t.nome ORDER BY total DESC
    `;

    const recentes = await sql`
      SELECT c.id, c.titulo, c.status, c.urgencia, c.aberto_por_nome, c.criado_em
      FROM chamados c ORDER BY c.criado_em DESC LIMIT 8
    `;

    return NextResponse.json({
      kpis: kpisRows[0],
      porStatus,
      porUrgencia,
      porTipo,
      recentes,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar dados do dashboard." }, { status: 500 });
  }
}
