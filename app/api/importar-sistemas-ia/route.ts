import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { TIPOS, OPCOES_DADOS_TRATADOS } from "@/lib/inventarioIAConstants";

export const dynamic = "force-dynamic";

const MAX_LINHAS = 500;

type LinhaCsv = {
  sistema?: string;
  tipo?: string;
  descricao?: string;
  area?: string;
  areaUsuario?: string;
  usuarios?: string;
  emails?: string;
  dadosTratados?: string;
  aprovado?: string;
  numeroChamado?: string;
};

function normalizarTexto(valor: string | undefined | null): string {
  if (!valor) return "";
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function emailsValidos(emails: string): boolean {
  return emails
    .split(";")
    .map((e) => e.trim())
    .filter(Boolean)
    .every((e) => e.includes("@"));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const linhas: LinhaCsv[] = Array.isArray(body?.linhas) ? body.linhas : [];
    // números de linha (base 2, já contando o cabeçalho) que o usuário já
    // confirmou explicitamente que quer importar mesmo suspeitando de duplicidade
    const confirmarLinhas = new Set<number>(
      Array.isArray(body?.confirmarLinhas) ? body.confirmarLinhas : []
    );

    if (linhas.length === 0) {
      return NextResponse.json({ error: "Nenhuma linha para importar." }, { status: 400 });
    }
    if (linhas.length > MAX_LINHAS) {
      return NextResponse.json(
        { error: `Máximo de ${MAX_LINHAS} linhas por importação. Divida o arquivo em partes menores.` },
        { status: 400 }
      );
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    const catalogoRows = await sql`SELECT nome, tipo FROM catalogo_sistemas_ia`;
    const tipoPorSistemaCatalogo = new Map<string, string>(
      catalogoRows.map((c: any) => [normalizarTexto(c.nome), c.tipo])
    );

    // Sistemas já cadastrados, para detectar suspeita de duplicidade —
    // critério: mesmo nome de sistema (normalizado).
    const existentes = await sql`SELECT sistema FROM sistemas_ia`;
    const nomesExistentes = new Set<string>(existentes.map((r: any) => normalizarTexto(r.sistema)));
    // nomes já usados dentro deste próprio arquivo (linha anterior do mesmo CSV)
    const nomesNoBatch = new Set<string>();

    const erros: { linha: number; motivo: string }[] = [];
    const avisos: { linha: number; motivo: string }[] = [];
    const suspeitas: { linha: number; motivo: string }[] = [];
    const paraInserir: any[] = [];

    linhas.forEach((linha, idx) => {
      const numeroLinha = idx + 2; // +2 = considerando linha de cabeçalho (linha 1)
      const sistemaNome = (linha.sistema || "").trim();

      if (!sistemaNome) {
        erros.push({ linha: numeroLinha, motivo: "Sistema não informado." });
        return;
      }

      let tipo = (linha.tipo || "").trim();
      if (tipo && !TIPOS.includes(tipo)) {
        erros.push({ linha: numeroLinha, motivo: `Tipo "${tipo}" inválido. Use um de: ${TIPOS.join(", ")}.` });
        return;
      }
      if (!tipo) {
        const tipoCatalogo = tipoPorSistemaCatalogo.get(normalizarTexto(sistemaNome));
        if (tipoCatalogo) {
          tipo = tipoCatalogo;
          avisos.push({
            linha: numeroLinha,
            motivo: `Tipo preenchido automaticamente a partir do catálogo ("${tipo}").`,
          });
        }
      }

      const emails = (linha.emails || "").trim();
      if (emails && !emailsValidos(emails)) {
        erros.push({ linha: numeroLinha, motivo: "Um ou mais e-mails parecem inválidos — separe múltiplos com ';'." });
        return;
      }

      const dadosTratadosRaw = (linha.dadosTratados || "").trim();
      let dadosTratados: string[] = [];
      if (dadosTratadosRaw) {
        dadosTratados = dadosTratadosRaw.split(/[,;]/).map((d) => d.trim()).filter(Boolean);
        const invalidos = dadosTratados.filter((d) => !OPCOES_DADOS_TRATADOS.includes(d));
        if (invalidos.length > 0) {
          erros.push({
            linha: numeroLinha,
            motivo: `Dados Tratados inválido(s): ${invalidos.join(", ")}. Use: ${OPCOES_DADOS_TRATADOS.join(", ")}.`,
          });
          return;
        }
      }

      const aprovadoTexto = normalizarTexto(linha.aprovado);
      let aprovado: boolean | null = null;
      if (aprovadoTexto === "sim") aprovado = true;
      else if (aprovadoTexto === "nao") aprovado = false;
      else if (aprovadoTexto) {
        erros.push({ linha: numeroLinha, motivo: `"Aprovado" deve ser "Sim" ou "Não" (recebido: "${linha.aprovado}").` });
        return;
      }

      // Suspeita de duplicidade: mesmo nome de Sistema, seja contra um
      // registro já existente no banco, seja contra outra linha deste
      // mesmo arquivo. Se o usuário já confirmou esta linha numa segunda
      // chamada (confirmarLinhas), a suspeita é ignorada e a linha é inserida.
      const chave = normalizarTexto(sistemaNome);
      const suspeita = nomesExistentes.has(chave) || nomesNoBatch.has(chave);
      if (suspeita && !confirmarLinhas.has(numeroLinha)) {
        suspeitas.push({
          linha: numeroLinha,
          motivo: `Já existe um sistema chamado "${sistemaNome}" no Inventário (ou duplicado neste arquivo). Confirme se quer importar mesmo assim.`,
        });
        return;
      }
      nomesNoBatch.add(chave);

      paraInserir.push({
        sistema: sistemaNome,
        tipo: tipo || null,
        descricao: (linha.descricao || "").trim() || null,
        area: (linha.area || "").trim() || null,
        areaUsuario: (linha.areaUsuario || "").trim() || null,
        usuarios: (linha.usuarios || "").trim() || null,
        emails: emails || null,
        dadosTratados: dadosTratados.length ? dadosTratados.join(", ") : null,
        aprovado,
        numeroChamado: aprovado ? ((linha.numeroChamado || "").trim() || null) : null,
      });
    });

    for (const r of paraInserir) {
      await sql`
        INSERT INTO sistemas_ia (
          sistema, tipo, descricao, area, area_usuario, usuarios, emails, dados_tratados,
          parecer_aprovado, parecer_numero_chamado
        ) VALUES (
          ${r.sistema}, ${r.tipo}, ${r.descricao}, ${r.area}, ${r.areaUsuario},
          ${r.usuarios}, ${r.emails}, ${r.dadosTratados}, ${r.aprovado}, ${r.numeroChamado}
        )
      `;
    }

    return NextResponse.json({
      totalLinhas: linhas.length,
      inseridos: paraInserir.length,
      erros,
      avisos,
      suspeitas,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao processar a importação." }, { status: 500 });
  }
}
