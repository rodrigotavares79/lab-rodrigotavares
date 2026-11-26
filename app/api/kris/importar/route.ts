import { NextRequest, NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { lerCsvMedicoes } from "@/lib/kriRisco";
import { hojeSaoPaulo } from "@/lib/revisaoRisco";
import { registrarMedicao } from "@/lib/kriServidor";

export const dynamic = "force-dynamic";

const MAX_LINHAS = 500;

// B21 · POST { texto, simular? }: importa medições de um CSV
// (codigo;referencia;valor;observacao). Com simular=true só valida e devolve
// o que seria gravado. Linhas com erro não impedem as demais.
export async function POST(request: NextRequest) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  try {
    const d = await request.json().catch(() => ({}));
    if (typeof d?.texto !== "string" || !d.texto.trim()) {
      return NextResponse.json({ error: "Envie o conteúdo do arquivo CSV." }, { status: 400 });
    }
    const { linhas, erros } = lerCsvMedicoes(d.texto);
    if (linhas.length > MAX_LINHAS) {
      return NextResponse.json({ error: `O arquivo tem ${linhas.length} medições; o limite é ${MAX_LINHAS}.` }, { status: 400 });
    }
    const sql = sqlAuditado(guarda.usuario);
    const kris = await sql`SELECT * FROM kris`;
    const porCodigo = new Map(kris.map((k: any) => [k.codigo, k]));
    const hoje = hojeSaoPaulo();
    const validas: typeof linhas = [];
    for (const l of linhas) {
      const k: any = porCodigo.get(l.codigo);
      if (!k) erros.push(`Linha ${l.linha}: ${l.codigo} não existe.`);
      else if (!k.ativo) erros.push(`Linha ${l.linha}: ${l.codigo} está inativo.`);
      else if (l.referencia > hoje) erros.push(`Linha ${l.linha}: data futura.`);
      else validas.push(l);
    }
    if (d.simular) return NextResponse.json({ validas: validas.length, erros });

    const resultado = { gravadas: 0, vermelhos: 0, revisoesAntecipadas: 0 };
    // Em ordem de data, para o alerta valer para a medição mais recente.
    for (const l of validas.sort((a, b) => a.referencia.localeCompare(b.referencia))) {
      const r = await registrarMedicao(
        sql,
        porCodigo.get(l.codigo),
        { referencia: l.referencia, valor: l.valor, observacao: l.observacao, origem: "importado" },
        guarda.usuario
      );
      resultado.gravadas++;
      if (r.faixa === "vermelho") resultado.vermelhos++;
      if (r.revisaoAntecipada) resultado.revisoesAntecipadas++;
    }
    return NextResponse.json({ ...resultado, erros });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao importar as medições." }, { status: 500 });
  }
}
