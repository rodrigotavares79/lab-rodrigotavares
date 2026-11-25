import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";

export const dynamic = "force-dynamic";

// GET ?inicio=AAAA-MM-DD&fim=AAAA-MM-DD → CSV do log de alterações (B06) no
// período (datas no fuso de São Paulo, fim inclusive). Só para quem vê a
// auditoria. Separador ";" e BOM UTF-8 para abrir direto no Excel em pt-BR.

const DATA = /^\d{4}-\d{2}-\d{2}$/;

function celula(valor: unknown): string {
  let texto =
    valor === null || valor === undefined
      ? ""
      : typeof valor === "string"
        ? valor
        : JSON.stringify(valor);
  // Evita que o Excel interprete o conteúdo como fórmula (injeção de CSV).
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const guarda = await exigirPermissao("verAuditoria");
  if (guarda.resposta) return guarda.resposta;
  try {
    const inicio = request.nextUrl.searchParams.get("inicio") ?? "";
    const fim = request.nextUrl.searchParams.get("fim") ?? "";
    if (!DATA.test(inicio) || !DATA.test(fim)) {
      return NextResponse.json({ error: "Informe início e fim no formato AAAA-MM-DD." }, { status: 400 });
    }
    if (inicio > fim) {
      return NextResponse.json({ error: "A data inicial é posterior à final." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const linhas = await sql`
      SELECT
        to_char(ocorrido_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS') AS data_hora,
        usuario_nome, usuario_email, origem, tabela, registro_id, risco_id,
        operacao, campo, valor_anterior, valor_novo, transacao
      FROM log_alteracoes
      WHERE (ocorrido_em AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN ${inicio}::date AND ${fim}::date
      ORDER BY ocorrido_em, id
    `;

    const cabecalho = [
      "Data/hora (São Paulo)", "Usuário", "E-mail", "Origem", "Tabela", "Registro", "Risco",
      "Operação", "Campo", "Valor anterior", "Valor novo", "Transação",
    ];
    const corpo = linhas.map((l: any) =>
      [
        l.data_hora, l.usuario_nome, l.usuario_email, l.origem, l.tabela, l.registro_id, l.risco_id,
        l.operacao, l.campo, l.valor_anterior, l.valor_novo, l.transacao,
      ]
        .map(celula)
        .join(";")
    );
    const csv = "﻿" + [cabecalho.map(celula).join(";"), ...corpo].join("\r\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="log-alteracoes-${inicio}-a-${fim}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao exportar o log de alterações." }, { status: 500 });
  }
}
