import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio, podeVisualizarAdmin } from "@/lib/condominioAuth";
import { emVisaoRestrita, emailsDaAdministracao, nomeVisivel } from "@/lib/condominioPrivacidade";
import { enviarAnexoPrivado, armazenamentoPrivadoConfigurado, urlDoAnexoNaApi } from "@/lib/condominioAnexos";

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
      SELECT id, tipo_anexo, enviado_por_email, enviado_por_nome, criado_em
      FROM anexos WHERE chamado_id = ${id} ORDER BY criado_em ASC
    `;

    // Em chamado global de outra pessoa, o condômino só vê os anexos que ele
    // mesmo enviou ou que a administração enviou — fotos de outros moradores
    // (que podem mostrar o interior de um apartamento) ficam ocultas.
    const restrita = emVisaoRestrita(usuario, chamado);
    const administracao = restrita ? await emailsDaAdministracao(rows.map((a) => a.enviado_por_email)) : new Set<string>();
    const anexos = rows
      .filter((a) => !restrita || a.enviado_por_email === usuario.email || administracao.has(a.enviado_por_email))
      .map(({ enviado_por_email, ...a }) => ({
        ...a,
        // O endereço real do arquivo nunca sai da API: o navegador abre o
        // anexo pela rota que confere a permissão a cada acesso.
        arquivo_url: urlDoAnexoNaApi(id, a.id),
        enviado_por_nome: restrita ? nomeVisivel(enviado_por_email, a.enviado_por_nome, usuario, administracao) : a.enviado_por_nome,
      }));

    return NextResponse.json({ anexos });
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

    if (!armazenamentoPrivadoConfigurado()) {
      return NextResponse.json(
        { error: "O armazenamento privado de anexos ainda não foi configurado. Avise o síndico." },
        { status: 503 }
      );
    }

    const blob = await enviarAnexoPrivado(id, arquivo, arquivo.name, arquivo.type);

    const rows = await sql`
      INSERT INTO anexos (chamado_id, arquivo_url, tipo_anexo, enviado_por_email, enviado_por_nome)
      VALUES (${id}, ${blob.url}, ${arquivo.type}, ${usuario.email}, ${usuario.nome})
      RETURNING id, tipo_anexo, enviado_por_nome, criado_em
    `;
    rows[0].arquivo_url = urlDoAnexoNaApi(id, rows[0].id);

    return NextResponse.json({ anexo: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao enviar o anexo." }, { status: 500 });
  }
}
