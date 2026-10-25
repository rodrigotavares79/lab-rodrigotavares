import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";
import { getUsuarioCondominio, podeVisualizarAdmin } from "@/lib/condominioAuth";

export const dynamic = "force-dynamic";

const TAMANHO_MAXIMO_BYTES = 8 * 1024 * 1024; // 8 MB
const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { id } = params;
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "ID de chamado inválido." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    const chamadoRows = await sql`SELECT global, aberto_por_email FROM chamados WHERE id = ${id}`;
    if (chamadoRows.length === 0) {
      return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });
    }
    const chamado = chamadoRows[0];
    const podeVer = podeVisualizarAdmin(usuario.perfil) || chamado.global || chamado.aberto_por_email === usuario.email;
    if (!podeVer) {
      return NextResponse.json({ error: "Você não tem acesso a este chamado." }, { status: 403 });
    }

    const rows = await sql`
      SELECT id, arquivo_url, tipo_anexo, enviado_por_nome, criado_em
      FROM anexos WHERE chamado_id = ${id} ORDER BY criado_em ASC
    `;

    return NextResponse.json({ anexos: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar anexos." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { id } = params;
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "ID de chamado inválido." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    const chamadoRows = await sql`SELECT global, aberto_por_email FROM chamados WHERE id = ${id}`;
    if (chamadoRows.length === 0) {
      return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });
    }
    const chamado = chamadoRows[0];
    const podeVer = podeVisualizarAdmin(usuario.perfil) || chamado.global || chamado.aberto_por_email === usuario.email;
    if (!podeVer) {
      return NextResponse.json({ error: "Você não tem acesso a este chamado." }, { status: 403 });
    }

    const formData = await request.formData();
    const arquivo = formData.get("arquivo");
    if (!(arquivo instanceof File) || arquivo.size === 0) {
      return NextResponse.json({ error: "Selecione um arquivo." }, { status: 400 });
    }
    if (!TIPOS_PERMITIDOS.includes(arquivo.type)) {
      return NextResponse.json({ error: "Tipo de arquivo não permitido. Envie foto (JPEG, PNG, WEBP, HEIC) ou PDF." }, { status: 400 });
    }
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      return NextResponse.json({ error: "Arquivo muito grande — o limite é 8 MB." }, { status: 400 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "Upload de anexos não está configurado neste ambiente." }, { status: 503 });
    }

    const nomeNoStorage = `chamados/${id}/${Date.now()}-${arquivo.name}`;
    const blob = await put(nomeNoStorage, arquivo, {
      access: "public",
      addRandomSuffix: true,
    });

    const rows = await sql`
      INSERT INTO anexos (chamado_id, arquivo_url, tipo_anexo, enviado_por_email, enviado_por_nome)
      VALUES (${id}, ${blob.url}, ${arquivo.type}, ${usuario.email}, ${usuario.nome})
      RETURNING id, arquivo_url, tipo_anexo, enviado_por_nome, criado_em
    `;

    return NextResponse.json({ anexo: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao enviar o anexo." }, { status: 500 });
  }
}
