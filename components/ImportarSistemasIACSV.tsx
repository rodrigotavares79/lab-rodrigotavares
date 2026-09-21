"use client";

import { useState } from "react";
import Papa from "papaparse";

type LinhaMapeada = {
  sistema: string;
  tipo: string;
  descricao: string;
  area: string;
  areaUsuario: string;
  usuarios: string;
  emails: string;
  dadosTratados: string;
  aprovado: string;
  numeroChamado: string;
};

// mapeia o cabeçalho esperado do CSV (modelo) -> chave interna
const MAPA_CABECALHOS: [string, keyof LinhaMapeada][] = [
  ["sistema", "sistema"],
  ["tipo", "tipo"],
  ["descricao", "descricao"],
  ["area", "area"],
  ["area do usuario", "areaUsuario"],
  ["usuarios", "usuarios"],
  ["e-mails", "emails"],
  ["dados tratados", "dadosTratados"],
  ["aprovado", "aprovado"],
  ["numero do chamado", "numeroChamado"],
];

function normalizarTexto(t: string) {
  return t
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

type Suspeita = { linha: number; motivo: string };

type ResultadoImportacao = {
  totalLinhas: number;
  inseridos: number;
  erros: { linha: number; motivo: string }[];
  avisos: { linha: number; motivo: string }[];
  suspeitas: Suspeita[];
};

export default function ImportarSistemasIACSV() {
  const [linhas, setLinhas] = useState<LinhaMapeada[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [erroParse, setErroParse] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [selecionadasParaConfirmar, setSelecionadasParaConfirmar] = useState<Set<number>>(new Set());

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErroParse(null);
    setResultado(null);
    setSelecionadasParaConfirmar(new Set());
    setNomeArquivo(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: "",
      complete: (results) => {
        const camposDetectados = results.meta.fields || [];
        const mapaColunaChave = new Map<string, keyof LinhaMapeada>();

        for (const coluna of camposDetectados) {
          const norm = normalizarTexto(coluna);
          const match = MAPA_CABECALHOS.find(([cab]) => normalizarTexto(cab) === norm);
          if (match) mapaColunaChave.set(coluna, match[1]);
        }

        if (!Array.from(mapaColunaChave.values()).includes("sistema")) {
          setErroParse(
            "Não encontrei a coluna \"Sistema\" no arquivo. Baixe o modelo e confira os nomes das colunas."
          );
          setLinhas([]);
          return;
        }

        const mapeadas: LinhaMapeada[] = results.data.map((row) => {
          const linha: Partial<LinhaMapeada> = {};
          mapaColunaChave.forEach((chave, coluna) => {
            linha[chave] = (row[coluna] || "").trim();
          });
          return {
            sistema: linha.sistema || "",
            tipo: linha.tipo || "",
            descricao: linha.descricao || "",
            area: linha.area || "",
            areaUsuario: linha.areaUsuario || "",
            usuarios: linha.usuarios || "",
            emails: linha.emails || "",
            dadosTratados: linha.dadosTratados || "",
            aprovado: linha.aprovado || "",
            numeroChamado: linha.numeroChamado || "",
          };
        });

        setLinhas(mapeadas);
      },
      error: (err) => {
        setErroParse(err.message || "Erro ao ler o arquivo.");
      },
    });
  }

  async function handleImportar(confirmarLinhas: number[] = []) {
    setImportando(true);
    setResultado(null);
    try {
      const res = await fetch("/api/importar-sistemas-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linhas, confirmarLinhas }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Falha na importação.");
      }
      setResultado(body);
      setSelecionadasParaConfirmar(new Set());
      if (body.erros?.length === 0 && (body.suspeitas?.length ?? 0) === 0) {
        setLinhas([]);
        setNomeArquivo("");
      }
    } catch (err) {
      setErroParse(err instanceof Error ? err.message : "Erro ao importar.");
    } finally {
      setImportando(false);
    }
  }

  function toggleSuspeita(linha: number) {
    setSelecionadasParaConfirmar((prev) => {
      const nova = new Set(prev);
      if (nova.has(linha)) nova.delete(linha);
      else nova.add(linha);
      return nova;
    });
  }

  function limpar() {
    setLinhas([]);
    setNomeArquivo("");
    setErroParse(null);
    setResultado(null);
  }

  return (
    <div className="csv-import">
      <p className="text-muted" style={{ fontSize: "0.88rem", maxWidth: "38rem" }}>
        Cadastre vários sistemas de IA de uma vez a partir de uma planilha.
        Baixe o modelo, preencha no Excel (ou Google Sheets) e envie o
        arquivo aqui. As colunas Usuários e E-mails aceitam mais de um
        valor separado por &quot;;&quot; dentro da própria célula.
      </p>

      <a
        href="/templates/modelo-cadastro-sistemas-ia.csv"
        download
        className="btn-primary"
        style={{ display: "inline-block", textDecoration: "none", marginTop: "0.75rem" }}
      >
        Baixar modelo CSV
      </a>

      <div className="csv-upload-box">
        <label htmlFor="csvFileIA" className="field-label">Selecionar arquivo (.csv)</label>
        <input id="csvFileIA" type="file" accept=".csv" onChange={handleFile} />
        {nomeArquivo && <p className="field-helper">Arquivo: {nomeArquivo}</p>}
      </div>

      {erroParse && (
        <div className="error-banner">
          <span className="success-icon error-icon">!</span>
          <span className="success-text">
            <strong>Não foi possível ler o arquivo.</strong>
            <span>{erroParse}</span>
          </span>
        </div>
      )}

      {linhas.length > 0 && !resultado && (
        <>
          <p style={{ fontSize: "0.85rem", marginTop: "1.25rem", fontWeight: 600 }}>
            Prévia — {linhas.length} linha{linhas.length > 1 ? "s" : ""} encontrada{linhas.length > 1 ? "s" : ""}
          </p>
          <div className="csv-preview-scroll">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Sistema</th>
                  <th>Tipo</th>
                  <th>Área</th>
                  <th>Área do Usuário</th>
                  <th>Aprovado</th>
                </tr>
              </thead>
              <tbody>
                {linhas.slice(0, 10).map((l, i) => (
                  <tr key={i}>
                    <td>{i + 2}</td>
                    <td>{l.sistema || "—"}</td>
                    <td>{l.tipo || "—"}</td>
                    <td>{l.area || "—"}</td>
                    <td>{l.areaUsuario || "—"}</td>
                    <td>{l.aprovado || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {linhas.length > 10 && (
            <p className="field-helper">Mostrando as primeiras 10 de {linhas.length} linhas.</p>
          )}

          <div className="form-actions" style={{ marginTop: "1rem" }}>
            <button type="button" className="btn-primary" onClick={() => handleImportar()} disabled={importando}>
              {importando ? "Importando..." : `Importar ${linhas.length} registro${linhas.length > 1 ? "s" : ""}`}
            </button>
            <button
              type="button"
              onClick={limpar}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem" }}
            >
              Cancelar
            </button>
          </div>
        </>
      )}

      {resultado && (
        <div className="csv-result">
          <div className={resultado.erros.length > 0 ? "error-banner" : "success-banner"}>
            <span className={resultado.erros.length > 0 ? "success-icon error-icon" : "success-icon"}>
              {resultado.erros.length > 0 ? "!" : "✓"}
            </span>
            <span className="success-text">
              <strong>
                {resultado.inseridos} de {resultado.totalLinhas} sistema{resultado.totalLinhas > 1 ? "s" : ""} importado{resultado.inseridos !== 1 ? "s" : ""} com sucesso.
              </strong>
              {resultado.erros.length > 0 && (
                <span>{resultado.erros.length} linha{resultado.erros.length > 1 ? "s" : ""} com erro, não importada{resultado.erros.length > 1 ? "s" : ""}.</span>
              )}
              {resultado.suspeitas.length > 0 && (
                <span>{resultado.suspeitas.length} linha{resultado.suspeitas.length > 1 ? "s" : ""} com suspeita de duplicidade — aguardando sua confirmação abaixo.</span>
              )}
            </span>
          </div>

          {resultado.erros.length > 0 && (
            <ul className="csv-issue-list">
              {resultado.erros.map((e, i) => (
                <li key={i}><strong>Linha {e.linha}:</strong> {e.motivo}</li>
              ))}
            </ul>
          )}

          {resultado.avisos.length > 0 && (
            <ul className="csv-issue-list csv-issue-list-warning">
              {resultado.avisos.map((a, i) => (
                <li key={i}><strong>Linha {a.linha}:</strong> {a.motivo}</li>
              ))}
            </ul>
          )}

          {resultado.suspeitas.length > 0 && (
            <>
              <p style={{ fontSize: "0.85rem", marginTop: "1.25rem", fontWeight: 600 }}>
                Suspeita de duplicidade — confirme quais quer importar mesmo assim
              </p>
              <ul className="csv-issue-list csv-issue-list-warning">
                {resultado.suspeitas.map((s) => (
                  <li key={s.linha}>
                    <label style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={selecionadasParaConfirmar.has(s.linha)}
                        onChange={() => toggleSuspeita(s.linha)}
                        style={{ marginTop: "0.2rem" }}
                      />
                      <span><strong>Linha {s.linha}:</strong> {s.motivo}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="form-actions" style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={importando || selecionadasParaConfirmar.size === 0}
                  onClick={() => handleImportar(Array.from(selecionadasParaConfirmar))}
                >
                  {importando ? "Importando..." : `Importar mesmo assim (${selecionadasParaConfirmar.size} selecionada${selecionadasParaConfirmar.size !== 1 ? "s" : ""})`}
                </button>
                <button
                  type="button"
                  onClick={limpar}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem" }}
                >
                  Descartar as suspeitas e não importar essas linhas
                </button>
              </div>
            </>
          )}

          {resultado.suspeitas.length === 0 && (
            <button type="button" className="btn-primary" onClick={limpar} style={{ marginTop: "1rem" }}>
              Importar outro arquivo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
