import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { validarAtivo } from "@/lib/ativosCriticos";

export const dynamic = "force-dynamic";

// B14 · Inventário de ativos e processos críticos (tabela sistemas_criticos).
// GET ?projetoId=&inativos=1 · lista com a contagem de riscos vinculados.
export async function GET(request: NextRequest) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const projetoParam = request.nextUrl.searchParams.get("projetoId");
    const projetoId = projetoParam && /^\d+$/.test(projetoParam) ? Number(projetoParam) : null;
    const incluirInativos = request.nextUrl.searchParams.get("inativos") === "1";
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const ativos = await sql`
      SELECT s.id, s.projeto_id, p.nome AS projeto, s.nome, s.tipo, s.area_responsavel, s.descricao, s.ativo,
             s.custo_indisponibilidade_hora, s.custo_restauracao_hora_homem, s.criado_em,
             (SELECT COUNT(*) FROM riscos r WHERE r.sistema_critico_id = s.id)::int AS riscos
      FROM sistemas_criticos s
      JOIN projetos p ON p.id = s.projeto_id
      WHERE (${projetoId}::int IS NULL OR s.projeto_id = ${projetoId})
        AND (${incluirInativos} OR s.ativo)
      ORDER BY p.nome, s.nome, s.id
    `;
    return NextResponse.json({ ativos, podeEditar: !!guarda.usuario.permissoes.editarRiscos });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar o inventário." }, { status: 500 });
  }
}

// POST · cadastra um ativo ou processo (quem edita riscos).
export async function POST(request: NextRequest) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  try {
    const body = await request.json().catch(() => ({}));
    const projetoId = Number(body?.projetoId);
    if (!Number.isInteger(projetoId) || projetoId <= 0) {
      return NextResponse.json({ error: "Escolha o projeto." }, { status: 400 });
    }
    const v = validarAtivo(body ?? {});
    if ("erro" in v) return NextResponse.json({ error: v.erro }, { status: 400 });
    const a = v.ativo;
    const sql = sqlAuditado(guarda.usuario);
    const [projeto] = await sql`SELECT id FROM projetos WHERE id = ${projetoId} AND ativo`;
    if (!projeto) return NextResponse.json({ error: "Projeto não encontrado ou inativo." }, { status: 404 });
    const [duplicado] = await sql`
      SELECT id FROM sistemas_criticos
      WHERE projeto_id = ${projetoId} AND lower(nome) = lower(${a.nome}) AND ativo
    `;
    if (duplicado) {
      return NextResponse.json({ error: "Já existe um item ativo com esse nome neste projeto." }, { status: 409 });
    }
    const [novo] = await sql`
      INSERT INTO sistemas_criticos
        (projeto_id, nome, tipo, area_responsavel, descricao, custo_indisponibilidade_hora, custo_restauracao_hora_homem)
      VALUES (${projetoId}, ${a.nome}, ${a.tipo}, ${a.areaResponsavel}, ${a.descricao},
              ${a.custoIndisponibilidadeHora}, ${a.custoRestauracaoHoraHomem})
      RETURNING id
    `;
    return NextResponse.json({ id: novo.id }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao cadastrar o ativo." }, { status: 500 });
  }
}
