import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { classificarImpacto, calcularImpactoFinanceiro } from "@/lib/riscoUtils";

const MAX_LINHAS = 500;

type LinhaCsv = {
  projeto?: string;
  categoria?: string;
  gatilho?: string;
  resultado?: string;
  levantadoPor?: string;
  dataLevantamento?: string;
  fonte?: string;
  impacto?: string;
  probabilidade?: string;
  sistemaCritico?: string;
  duracaoHoras?: string;
  percentualDegradacao?: string;
  restauracaoPessoas?: string;
  restauracaoHoras?: string;
};

function parseNumero(valor: string | undefined): number | null {
  if (valor === undefined || valor === null || valor.trim() === "") return null;
  const normalizado = valor.trim().replace(",", ".");
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

function parseData(valor: string | undefined): string | null {
  if (!valor || !valor.trim()) return null;
  const v = valor.trim();
  // aceita DD/MM/AAAA ou AAAA-MM-DD
  const br = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const [, d, m, a] = br;
    return `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const iso = v.match(/^\d{4}-\d{2}-\d{2}$/);
  if (iso) return v;
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const linhas: LinhaCsv[] = Array.isArray(body?.linhas) ? body.linhas : [];

    if (linhas.length === 0) {
      return NextResponse.json({ error: "Nenhuma linha para importar." }, { status: 400 });
    }
    if (linhas.length > MAX_LINHAS) {
      return NextResponse.json(
        { error: `Máximo de ${MAX_LINHAS} linhas por importação. Divida o arquivo em partes menores.` },
        { status: 400 }
      );
    }

    const sql = neon(process.env.DATABASE_URL!);

    const projetoRows = await sql`SELECT id, nome FROM projetos`;
    const projetoPorNome = new Map<string, number>(
      projetoRows.map((p: any) => [String(p.nome).trim().toLowerCase(), p.id])
    );

    const sistemaRows = await sql`
      SELECT id, projeto_id, nome, custo_indisponibilidade_hora, custo_restauracao_hora_homem
      FROM sistemas_criticos
    `;
    const sistemaPorProjetoNome = new Map<string, any>(
      sistemaRows.map((s: any) => [`${s.projeto_id}::${String(s.nome).trim().toLowerCase()}`, s])
    );

    const erros: { linha: number; motivo: string }[] = [];
    const avisos: { linha: number; motivo: string }[] = [];
    const paraInserir: any[] = [];

    linhas.forEach((linha, idx) => {
      const numeroLinha = idx + 2; // +2 = considerando linha de cabeçalho (linha 1)
      const projetoNome = (linha.projeto || "").trim();
      const levantadoPor = (linha.levantadoPor || "").trim();

      if (!projetoNome) {
        erros.push({ linha: numeroLinha, motivo: "Projeto não informado." });
        return;
      }
      const projetoId = projetoPorNome.get(projetoNome.toLowerCase());
      if (!projetoId) {
        erros.push({ linha: numeroLinha, motivo: `Projeto "${projetoNome}" não encontrado.` });
        return;
      }

      if (!levantadoPor || !levantadoPor.includes("@")) {
        erros.push({ linha: numeroLinha, motivo: "'Levantado Por' ausente ou não é um e-mail válido." });
        return;
      }

      let impacto: number | null = null;
      let probabilidade: number | null = null;
      if (linha.impacto) {
        const n = parseNumero(linha.impacto);
        if (n === null || n < 1 || n > 5) {
          erros.push({ linha: numeroLinha, motivo: "Impacto deve ser um número de 1 a 5." });
          return;
        }
        impacto = n;
      }
      if (linha.probabilidade) {
        const n = parseNumero(linha.probabilidade);
        if (n === null || n < 1 || n > 5) {
          erros.push({ linha: numeroLinha, motivo: "Probabilidade deve ser um número de 1 a 5." });
          return;
        }
        probabilidade = n;
      }
      const matrixScore = impacto && probabilidade ? impacto * probabilidade : null;
      const classificacao = matrixScore ? classificarImpacto(matrixScore) : null;

      let sistema: any = null;
      const sistemaNome = (linha.sistemaCritico || "").trim();
      if (sistemaNome) {
        sistema = sistemaPorProjetoNome.get(`${projetoId}::${sistemaNome.toLowerCase()}`);
        if (!sistema) {
          avisos.push({
            linha: numeroLinha,
            motivo: `Sistema Crítico "${sistemaNome}" não encontrado no projeto — risco importado sem cálculo financeiro.`,
          });
        }
      }

      const duracaoHoras = parseNumero(linha.duracaoHoras);
      const percentualDegradacao = parseNumero(linha.percentualDegradacao) ?? (sistema ? 30 : null);
      const restauracaoPessoas = parseNumero(linha.restauracaoPessoas);
      const restauracaoHoras = parseNumero(linha.restauracaoHoras);

      const financeiro = calcularImpactoFinanceiro(sistema, {
        duracaoHoras,
        percentualDegradacao,
        restauracaoPessoas,
        restauracaoHoras,
      });

      const dataLevantamento = parseData(linha.dataLevantamento);
      if (linha.dataLevantamento && !dataLevantamento) {
        avisos.push({
          linha: numeroLinha,
          motivo: `Data "${linha.dataLevantamento}" não reconhecida (use DD/MM/AAAA) — campo salvo em branco.`,
        });
      }

      paraInserir.push({
        projetoId,
        categoria: linha.categoria || null,
        gatilho: linha.gatilho || null,
        resultado: linha.resultado || null,
        levantadoPor,
        dataLevantamento,
        fonte: linha.fonte || null,
        impacto,
        probabilidade,
        matrixScore,
        classificacao,
        sistemaCriticoId: sistema?.id || null,
        duracaoHoras,
        percentualDegradacao: sistema ? percentualDegradacao : null,
        restauracaoPessoas,
        restauracaoHoras,
        ...financeiro,
      });
    });

    for (const r of paraInserir) {
      await sql`
        INSERT INTO riscos (
          projeto_id, categoria, gatilho, resultado_potencial, levantado_por,
          data_levantamento, fonte, impacto, probabilidade, matrix_score, impacto_qualitativo,
          sistema_critico_id, duracao_horas, percentual_degradacao, restauracao_pessoas, restauracao_horas,
          impacto_critico_indisponibilidade, impacto_critico_restauracao, impacto_critico_total,
          impacto_alto_indisponibilidade, impacto_alto_restauracao, impacto_alto_total
        ) VALUES (
          ${r.projetoId}, ${r.categoria}, ${r.gatilho}, ${r.resultado}, ${r.levantadoPor},
          ${r.dataLevantamento}, ${r.fonte}, ${r.impacto}, ${r.probabilidade}, ${r.matrixScore}, ${r.classificacao},
          ${r.sistemaCriticoId}, ${r.duracaoHoras}, ${r.percentualDegradacao}, ${r.restauracaoPessoas}, ${r.restauracaoHoras},
          ${r.impactoCriticoIndisponibilidade || null}, ${r.impactoCriticoRestauracao || null}, ${r.impactoCriticoTotal || null},
          ${r.impactoAltoIndisponibilidade || null}, ${r.impactoAltoRestauracao || null}, ${r.impactoAltoTotal || null}
        )
      `;
    }

    return NextResponse.json({
      totalLinhas: linhas.length,
      inseridos: paraInserir.length,
      erros,
      avisos,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao processar a importação." }, { status: 500 });
  }
}
