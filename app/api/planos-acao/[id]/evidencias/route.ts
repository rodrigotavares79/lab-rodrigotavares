import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { validarConteudoEvidencia } from "@/lib/assinaturaArquivo";
import { exigirPermissao } from "@/lib/riscosAuth";
import {
  armazenamentoEvidenciasConfigurado,
  enviarEvidencia,
  sha256Hex,
  TAMANHO_MAXIMO_EVIDENCIA,
  TIPOS_EVIDENCIA,
  urlDaEvidencia,
} from "@/lib/riscosEvidencias";

export const dynamic = "force-dynamic";

// GET: evidências de um Plano de Ação. O endereço real do arquivo nunca sai
// da API — o navegador abre cada uma pela rota /evidencias/[evidenciaId].
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) {
      return NextResponse.json({ error: "ID de plano de ação inválido." }, { status: 400 });
    }
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const rows = await sql`
      SELECT id, descricao, nome_arquivo, tipo_arquivo, tamanho_bytes, enviado_por_nome, criado_em, sha256
      FROM planos_acao_evidencias
      WHERE plano_acao_id = ${id}
      ORDER BY criado_em ASC
    `;
    return NextResponse.json({
      evidencias: rows.map((e: any) => ({ ...e, url: urlDaEvidencia(id, e.id) })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar evidências." }, { status: 500 });
  }
}

// POST: anexa uma evidência (multipart: arquivo + descricao opcional).
// Só com o plano Aberto e o risco não Mitigado — depois de concluído, o
// material que o auditor avalia não muda.
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  try {
    const guarda = await exigirPermissao("editarPlanos");
    if (guarda.resposta) return guarda.resposta;
    const usuario = guarda.usuario;
    if (!/^\d+$/.test(id ?? "")) {
      return NextResponse.json({ error: "ID de plano de ação inválido." }, { status: 400 });
    }

    const sql = sqlAuditado(guarda.usuario);
    const planoRows = await sql`
      SELECT pa.status, r.status AS risco_status
      FROM planos_acao pa JOIN riscos r ON r.id = pa.risco_id
      WHERE pa.id = ${id}
    `;
    if (planoRows.length === 0) {
      return NextResponse.json({ error: "Plano de ação não encontrado." }, { status: 404 });
    }
    if (planoRows[0].risco_status === "Mitigado") {
      return NextResponse.json({ error: "O risco deste plano já foi mitigado." }, { status: 409 });
    }
    if (planoRows[0].status === "Concluído") {
      return NextResponse.json(
        { error: "Plano concluído: as evidências não podem mais ser alteradas." },
        { status: 409 }
      );
    }

    const formData = await request.formData();
    const arquivo = formData.get("arquivo");
    const descricaoBruta = formData.get("descricao");
    const descricao = typeof descricaoBruta === "string" && descricaoBruta.trim() ? descricaoBruta.trim() : null;

    if (!(arquivo instanceof File) || arquivo.size === 0) {
      return NextResponse.json({ error: "Selecione um arquivo." }, { status: 400 });
    }
    if (!TIPOS_EVIDENCIA[arquivo.type]) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido. Envie PDF, imagem (PNG, JPEG, WEBP), TXT, CSV, XLSX, DOCX ou EML." },
        { status: 400 }
      );
    }
    if (arquivo.size > TAMANHO_MAXIMO_EVIDENCIA) {
      return NextResponse.json({ error: "Arquivo muito grande — o limite é 10 MB." }, { status: 400 });
    }
    if (!armazenamentoEvidenciasConfigurado()) {
      return NextResponse.json(
        { error: "O armazenamento privado de evidências ainda não foi configurado." },
        { status: 503 }
      );
    }

    // B12: o conteúdo precisa corresponder ao tipo e à extensão declarados.
    const dados = new Uint8Array(await arquivo.arrayBuffer());
    const invalido = validarConteudoEvidencia(arquivo.type, arquivo.name, dados);
    if (invalido) {
      return NextResponse.json({ error: invalido }, { status: 400 });
    }
    const hash = sha256Hex(dados);

    const blob = await enviarEvidencia(id, dados, arquivo.type);
    const rows = await sql`
      INSERT INTO planos_acao_evidencias
        (plano_acao_id, descricao, nome_arquivo, tipo_arquivo, tamanho_bytes, arquivo_url, enviado_por_nome, enviado_por_email, sha256)
      VALUES
        (${id}, ${descricao}, ${arquivo.name.slice(0, 200)}, ${arquivo.type}, ${arquivo.size}, ${blob.url}, ${usuario.nome}, ${usuario.email}, ${hash})
      RETURNING id, descricao, nome_arquivo, tipo_arquivo, tamanho_bytes, enviado_por_nome, criado_em, sha256
    `;
    return NextResponse.json({ evidencia: { ...rows[0], url: urlDaEvidencia(id, rows[0].id) } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao enviar a evidência." }, { status: 500 });
  }
}
