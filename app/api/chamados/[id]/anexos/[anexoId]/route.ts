import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio, podeVisualizarAdmin } from "@/lib/condominioAuth";
import { emVisaoRestrita, emailsDaAdministracao } from "@/lib/condominioPrivacidade";
import { ehUrlPrivada, lerAnexoPrivado, migrarAnexoPublico, armazenamentoPrivadoConfigurado } from "@/lib/condominioAnexos";

export const dynamic = "force-dynamic";

// Entrega o arquivo de um anexo. É a única porta de acesso às fotos e PDFs:
// confere login e permissão no chamado a cada pedido, e o endereço real do
// arquivo no armazenamento nunca chega ao navegador.
export async function GET(request: NextRequest, { params }: { params: { id: string; anexoId: string } }) {
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { id, anexoId } = params;
    if (!/^\d+$/.test(id ?? "") || !/^\d+$/.test(anexoId ?? "")) {
      return NextResponse.json({ error: "Anexo inválido." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const rows = await sql`
      SELECT a.id, a.arquivo_url, a.tipo_anexo, a.enviado_por_email, c.global, c.aberto_por_email
      FROM anexos a
      JOIN chamados c ON c.id = a.chamado_id
      WHERE a.id = ${anexoId} AND a.chamado_id = ${id}
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Anexo não encontrado." }, { status: 404 });
    }
    const anexo = rows[0];

    const podeVerChamado =
      podeVisualizarAdmin(usuario.perfil) || anexo.global || anexo.aberto_por_email === usuario.email;
    if (!podeVerChamado) {
      return NextResponse.json({ error: "Você não tem acesso a este anexo." }, { status: 403 });
    }
    // Mesma regra da listagem: em chamado global de outra pessoa, só os
    // anexos do próprio usuário ou da administração.
    if (emVisaoRestrita(usuario, anexo) && anexo.enviado_por_email !== usuario.email) {
      const administracao = await emailsDaAdministracao([anexo.enviado_por_email]);
      if (!administracao.has(anexo.enviado_por_email)) {
        return NextResponse.json({ error: "Você não tem acesso a este anexo." }, { status: 403 });
      }
    }

    if (!armazenamentoPrivadoConfigurado()) {
      return NextResponse.json({ error: "Armazenamento privado de anexos não configurado." }, { status: 503 });
    }

    // Anexo antigo, ainda no armazenamento público: migra agora para o
    // privado (e apaga o público) antes de entregar.
    let url: string = anexo.arquivo_url;
    if (!ehUrlPrivada(url)) {
      url = await migrarAnexoPublico(id, url, anexo.tipo_anexo);
      await sql`UPDATE anexos SET arquivo_url = ${url} WHERE id = ${anexo.id}`;
    }

    const resultado = await lerAnexoPrivado(url);
    if (!resultado || resultado.statusCode !== 200) {
      return NextResponse.json({ error: "Arquivo do anexo não encontrado." }, { status: 404 });
    }

    const nomeDownload = anexo.tipo_anexo === "application/pdf" ? `anexo-${anexo.id}.pdf` : `anexo-${anexo.id}`;
    return new NextResponse(resultado.stream, {
      status: 200,
      headers: {
        "Content-Type": resultado.blob.contentType || anexo.tipo_anexo || "application/octet-stream",
        "Content-Disposition": `inline; filename="${nomeDownload}"`,
        // Conteúdo pessoal: nada de cache compartilhado (CDN/proxy).
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao abrir o anexo." }, { status: 500 });
  }
}
