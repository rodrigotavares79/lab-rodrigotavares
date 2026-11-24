import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio, podeGerirChamados } from "@/lib/condominioAuth";

export const dynamic = "force-dynamic";

const URGENCIAS_VALIDAS = ["Baixa", "Média", "Urgente"];
const TIPOS_VALIDOS = ["Problema", "Demanda"];

// Edita um serviço do catálogo e/ou o ativa/desativa. Serviço nunca é
// apagado: desativado, ele some do formulário de abertura de chamado, mas
// continua nos chamados antigos. Mudar urgência ou SLA vale só para os
// chamados abertos depois da alteração — o prazo dos já abertos não muda.
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario || !podeGerirChamados(usuario.perfil)) {
      return NextResponse.json({ error: "Só o síndico ou conselheiro pode alterar serviços." }, { status: 403 });
    }
    const { id } = params;
    if (!/^\d+$/.test(id ?? "")) {
      return NextResponse.json({ error: "Serviço inválido." }, { status: 400 });
    }

    const body = (await request.json()) ?? {};
    const editandoDados = ["nome", "categoria", "urgencia", "tipo", "slaHoras"].some((c) => body[c] !== undefined);
    let sla: number | null = null;
    if (editandoDados) {
      if (!body.nome || typeof body.nome !== "string" || !body.nome.trim()) {
        return NextResponse.json({ error: "Nome (serviço) é obrigatório." }, { status: 400 });
      }
      if (!URGENCIAS_VALIDAS.includes(body.urgencia)) {
        return NextResponse.json({ error: `Urgência inválida. Use uma de: ${URGENCIAS_VALIDAS.join(", ")}.` }, { status: 400 });
      }
      if (!TIPOS_VALIDOS.includes(body.tipo)) {
        return NextResponse.json({ error: `Tipo inválido. Use um de: ${TIPOS_VALIDOS.join(", ")}.` }, { status: 400 });
      }
      sla = Number(body.slaHoras);
      if (!Number.isFinite(sla) || sla <= 0) {
        return NextResponse.json({ error: "SLA (horas) deve ser um número maior que zero." }, { status: 400 });
      }
    }
    const ativo: boolean | null = body.ativo !== undefined ? Boolean(body.ativo) : null;
    const categoria = editandoDados ? String(body.categoria ?? "").trim() || null : null;

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const rows = await sql`
      UPDATE catalogo_servicos SET
        nome           = CASE WHEN ${editandoDados}::boolean THEN ${editandoDados ? String(body.nome).trim() : null}::text ELSE nome END,
        categoria      = CASE WHEN ${editandoDados}::boolean THEN ${categoria}::text ELSE categoria END,
        urgencia       = CASE WHEN ${editandoDados}::boolean THEN ${editandoDados ? body.urgencia : null}::text ELSE urgencia END,
        tipo           = CASE WHEN ${editandoDados}::boolean THEN ${editandoDados ? body.tipo : null}::text ELSE tipo END,
        sla_horas      = CASE WHEN ${editandoDados}::boolean THEN ${sla}::int ELSE sla_horas END,
        ativo          = COALESCE(${ativo}::boolean, ativo),
        atualizado_em  = now(),
        atualizado_por = ${usuario.email}
      WHERE id = ${id}
      RETURNING id, nome, categoria, urgencia, tipo, sla_horas, ativo
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ servico: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao atualizar o serviço." }, { status: 500 });
  }
}
