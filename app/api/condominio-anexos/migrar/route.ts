import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio } from "@/lib/condominioAuth";
import { ehUrlPrivada, migrarAnexoPublico, tokenPrivado } from "@/lib/condominioAnexos";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Migração única dos anexos antigos (store público) para o store privado.
// Só o síndico executa. Pode ser chamada mais de uma vez: anexos já
// migrados são ignorados, e cada lote processa até 50 arquivos.
//   GET  → quantos anexos ainda estão no armazenamento público
//   POST → migra o próximo lote
async function exigirSindico() {
  const usuario = await getUsuarioCondominio();
  if (!usuario || usuario.perfil !== "sindico") return null;
  return usuario;
}

export async function GET() {
  if (!(await exigirSindico())) {
    return NextResponse.json({ error: "Só o síndico pode consultar a migração de anexos." }, { status: 403 });
  }
  const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
  const rows = await sql`
    SELECT count(*)::int AS pendentes FROM anexos
    WHERE arquivo_url IS NOT NULL AND arquivo_url NOT LIKE '%.private.blob.vercel-storage.com%'
  `;
  return NextResponse.json({ pendentes: rows[0].pendentes, armazenamentoPrivadoConfigurado: !!tokenPrivado() });
}

export async function POST() {
  if (!(await exigirSindico())) {
    return NextResponse.json({ error: "Só o síndico pode migrar anexos." }, { status: 403 });
  }
  if (!tokenPrivado()) {
    return NextResponse.json({ error: "Armazenamento privado de anexos não configurado." }, { status: 503 });
  }

  const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
  const lote = await sql`
    SELECT id, chamado_id, arquivo_url, tipo_anexo FROM anexos
    WHERE arquivo_url IS NOT NULL AND arquivo_url NOT LIKE '%.private.blob.vercel-storage.com%'
    ORDER BY id LIMIT 50
  `;

  let migrados = 0;
  const falhas: { id: number; erro: string }[] = [];
  for (const a of lote) {
    if (ehUrlPrivada(a.arquivo_url)) continue;
    try {
      const novaUrl = await migrarAnexoPublico(a.chamado_id, a.arquivo_url, a.tipo_anexo);
      await sql`UPDATE anexos SET arquivo_url = ${novaUrl} WHERE id = ${a.id}`;
      migrados += 1;
    } catch (err) {
      falhas.push({ id: a.id, erro: err instanceof Error ? err.message : String(err) });
    }
  }

  const restantes = await sql`
    SELECT count(*)::int AS pendentes FROM anexos
    WHERE arquivo_url IS NOT NULL AND arquivo_url NOT LIKE '%.private.blob.vercel-storage.com%'
  `;
  return NextResponse.json({ migrados, falhas, pendentes: restantes[0].pendentes });
}
