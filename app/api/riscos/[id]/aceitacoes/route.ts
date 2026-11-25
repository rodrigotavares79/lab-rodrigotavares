import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { podeAprovarAceitacao, rotuloAlcada } from "@/lib/perfisRiscos";
import { TIPOS_CARTA, VALIDADE_PADRAO_MESES, validarSolicitacao } from "@/lib/aceitacaoRisco";
import { validarConteudoEvidencia } from "@/lib/assinaturaArquivo";
import {
  armazenamentoEvidenciasConfigurado,
  enviarCartaRisco,
  sha256Hex,
  TAMANHO_MAXIMO_EVIDENCIA,
} from "@/lib/riscosEvidencias";

export const dynamic = "force-dynamic";

// B16 · Aceitação formal do risco.
// GET: histórico de aceitações do risco, a alçada exigida pelo nível atual e,
//      para cada pendente, se o usuário logado pode decidir.
// POST (multipart: carta, justificativa, validadeMeses): solicita a
//      aceitação. Define a opção de tratamento como "Aceitar".

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "ID de risco inválido." }, { status: 400 });
    const usuario = guarda.usuario;
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const [risco] = await sql`SELECT impacto_qualitativo FROM riscos WHERE id = ${id}`;
    if (!risco) return NextResponse.json({ error: "Risco não encontrado." }, { status: 404 });

    const aceitacoes = await sql`
      SELECT id, situacao, justificativa, validade_meses, nivel_no_pedido,
             carta_nome, carta_tipo, carta_tamanho, carta_sha256,
             solicitado_por_email, solicitado_por_nome, solicitado_em,
             decidido_por_nome, decidido_por_perfil, decidido_em, motivo_decisao,
             to_char(valido_ate, 'YYYY-MM-DD') AS valido_ate, revogado_em,
             (valido_ate IS NOT NULL AND valido_ate < (now() AT TIME ZONE 'America/Sao_Paulo')::date) AS vencida
      FROM aceitacoes_risco WHERE risco_id = ${id}
      ORDER BY id DESC
    `;
    const temAlcada = podeAprovarAceitacao(usuario.perfil, risco.impacto_qualitativo);
    return NextResponse.json({
      alcada: rotuloAlcada(risco.impacto_qualitativo),
      aceitacoes: aceitacoes.map(({ solicitado_por_email, ...a }: any) => ({
        ...a,
        cartaUrl: `/api/riscos/${id}/aceitacoes/${a.id}/carta`,
        podeDecidir:
          a.situacao === "Pendente" &&
          temAlcada &&
          solicitado_por_email.toLowerCase() !== usuario.email.toLowerCase(),
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar as aceitações." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "ID de risco inválido." }, { status: 400 });
    const usuario = guarda.usuario;
    const sql = sqlAuditado(usuario);

    const [risco] = await sql`SELECT status, impacto_qualitativo FROM riscos WHERE id = ${id}`;
    if (!risco) return NextResponse.json({ error: "Risco não encontrado." }, { status: 404 });
    const [{ ativas }] = await sql`
      SELECT COUNT(*)::int AS ativas FROM aceitacoes_risco
      WHERE risco_id = ${id} AND situacao IN ('Pendente', 'Aprovada')
    `;

    const form = await request.formData();
    const carta = form.get("carta");
    const justificativa = typeof form.get("justificativa") === "string" ? String(form.get("justificativa")).trim().slice(0, 4000) : "";
    const validadeMeses = Number(form.get("validadeMeses") || VALIDADE_PADRAO_MESES);

    const invalida = validarSolicitacao({ statusRisco: risco.status, justificativa, validadeMeses, temAtiva: ativas > 0 });
    if (invalida) return NextResponse.json({ error: invalida }, { status: ativas > 0 ? 409 : 400 });

    if (!(carta instanceof File) || carta.size === 0) {
      return NextResponse.json({ error: "Anexe a Carta de Risco assinada (PDF ou DOCX)." }, { status: 400 });
    }
    if (!TIPOS_CARTA.includes(carta.type)) {
      return NextResponse.json({ error: "A Carta de Risco deve ser PDF ou DOCX." }, { status: 400 });
    }
    if (carta.size > TAMANHO_MAXIMO_EVIDENCIA) {
      return NextResponse.json({ error: "Arquivo muito grande — o limite é 10 MB." }, { status: 400 });
    }
    const dados = new Uint8Array(await carta.arrayBuffer());
    const conteudoInvalido = validarConteudoEvidencia(carta.type, carta.name, dados);
    if (conteudoInvalido) return NextResponse.json({ error: conteudoInvalido }, { status: 400 });
    if (!armazenamentoEvidenciasConfigurado()) {
      return NextResponse.json({ error: "O armazenamento privado ainda não foi configurado." }, { status: 503 });
    }

    const blob = await enviarCartaRisco(id, dados, carta.type);
    const [aceitacao] = await sql`
      INSERT INTO aceitacoes_risco
        (risco_id, justificativa, validade_meses, nivel_no_pedido,
         carta_url, carta_nome, carta_tipo, carta_tamanho, carta_sha256,
         solicitado_por_email, solicitado_por_nome)
      VALUES
        (${id}, ${justificativa}, ${validadeMeses}, ${risco.impacto_qualitativo ?? "—"},
         ${blob.url}, ${carta.name.slice(0, 200)}, ${carta.type}, ${carta.size}, ${sha256Hex(dados)},
         ${usuario.email}, ${usuario.nome})
      RETURNING id, situacao
    `;
    await sql`UPDATE riscos SET opcao_tratamento = 'Aceitar' WHERE id = ${id} AND opcao_tratamento IS DISTINCT FROM 'Aceitar'`;

    return NextResponse.json({ aceitacao, alcada: rotuloAlcada(risco.impacto_qualitativo) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao solicitar a aceitação." }, { status: 500 });
  }
}
