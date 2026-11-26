import { NextRequest, NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { podeAprovarApetite } from "@/lib/perfisRiscos";
import { validarDecisaoApetite } from "@/lib/apetiteRisco";

export const dynamic = "force-dynamic";

// B18 · POST { decisao: "Aprovar" | "Recusar", motivo? }
// Só o CISO (e o Administrador) decide, e nunca sobre a própria proposta.
// Aprovar torna a versão Vigente e a anterior Substituída, numa só operação.
// Tentativas sem alçada ou de quem propôs ficam em eventos_seguranca.
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "Versão inválida." }, { status: 400 });
    const usuario = guarda.usuario;
    const body = await request.json().catch(() => ({}));
    const motivo = typeof body?.motivo === "string" && body.motivo.trim() ? body.motivo.trim().slice(0, 2000) : null;
    const sql = sqlAuditado(usuario);
    const [versao] = await sql`SELECT situacao, proposto_por_email FROM apetite_versoes WHERE id = ${id}`;
    if (!versao) return NextResponse.json({ error: "Versão não encontrada." }, { status: 404 });

    const invalida = validarDecisaoApetite({
      decisao: body?.decisao,
      motivo,
      situacao: versao.situacao,
      aprovadorEmail: usuario.email,
      propostoPorEmail: versao.proposto_por_email,
      temAlcada: podeAprovarApetite(usuario.perfil),
    });
    if (invalida) {
      const semAlcada = !podeAprovarApetite(usuario.perfil);
      const propria = usuario.email.toLowerCase() === String(versao.proposto_por_email).toLowerCase();
      if (semAlcada || propria) {
        await sql`
          INSERT INTO eventos_seguranca (tipo, usuario_email, usuario_nome, registro, detalhe)
          VALUES ('apetite_decisao_bloqueada', ${usuario.email}, ${usuario.nome}, ${"apetite_versoes:" + id}, ${invalida})
        `;
      }
      return NextResponse.json({ error: invalida }, { status: semAlcada || propria ? 403 : 400 });
    }

    if (body.decisao === "Recusar") {
      await sql`
        UPDATE apetite_versoes
        SET situacao = 'Recusada', decidido_por_email = ${usuario.email}, decidido_por_nome = ${usuario.nome},
            decidido_por_perfil = ${usuario.perfil}, decidido_em = now(), motivo_decisao = ${motivo}
        WHERE id = ${id} AND situacao = 'Pendente'
      `;
      return NextResponse.json({ situacao: "Recusada" });
    }
    const [r] = await sql`SELECT fn_aprovar_apetite(${Number(id)}, ${usuario.email}, ${usuario.nome}, ${usuario.perfil}, ${motivo}) AS versao`;
    return NextResponse.json({ situacao: "Vigente", versao: r.versao });
  } catch (err: any) {
    if (String(err?.message || "").includes("proposta_nao_pendente")) {
      return NextResponse.json({ error: "Esta proposta já foi decidida." }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Erro ao registrar a decisão." }, { status: 500 });
  }
}
