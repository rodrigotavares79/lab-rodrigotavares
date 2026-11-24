"use client";

import { useRef, useState } from "react";

// Evidências de um Plano de Ação: lista (com link para abrir cada arquivo) e,
// enquanto o plano estiver aberto, envio e remoção. São elas que a Auditoria
// valida para classificar o encerramento como Conforme ou Não conforme.

export type Evidencia = {
  id: number;
  descricao: string | null;
  nome_arquivo: string;
  tipo_arquivo: string;
  tamanho_bytes: number;
  enviado_por_nome: string | null;
  criado_em: string;
  url: string;
};

export function formatTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

function formatDataHora(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ListaEvidencias({
  evidencias,
  onRemover,
  removendoId,
}: {
  evidencias: Evidencia[];
  onRemover?: (id: number) => void;
  removendoId?: number | null;
}) {
  if (evidencias.length === 0) {
    return <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>Nenhuma evidência anexada.</p>;
  }
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {evidencias.map((e) => (
        <li
          key={e.id}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            padding: "0.6rem 0.75rem",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            background: "var(--surface)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", marginTop: "0.1rem", color: "var(--text-muted)" }}>
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5" />
          </svg>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.15rem" }}>
            <a href={e.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontWeight: 600, fontSize: "0.85rem", wordBreak: "break-word" }}>
              {e.nome_arquivo}
            </a>
            {e.descricao && <span style={{ fontSize: "0.8rem" }}>{e.descricao}</span>}
            <span className="text-muted" style={{ fontSize: "0.72rem" }}>
              {formatTamanho(e.tamanho_bytes)} · {e.enviado_por_nome || "—"} · {formatDataHora(e.criado_em)}
            </span>
          </span>
          {onRemover && (
            <button
              type="button"
              onClick={() => onRemover(e.id)}
              disabled={removendoId === e.id}
              aria-label={`Remover evidência ${e.nome_arquivo}`}
              style={{ flex: "none", background: "none", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.25rem 0.5rem", fontSize: "0.75rem", cursor: "pointer", color: "var(--danger)" }}
            >
              {removendoId === e.id ? "Removendo..." : "Remover"}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function EvidenciasPlano({
  planoId,
  evidencias,
  editavel,
  onAtualizado,
}: {
  planoId: number;
  evidencias: Evidencia[];
  editavel: boolean;
  onAtualizado: () => void;
}) {
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [removendoId, setRemovendoId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    const arquivo = arquivoRef.current?.files?.[0];
    if (!arquivo) {
      setErro("Selecione um arquivo.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const fd = new FormData();
      fd.append("arquivo", arquivo);
      if (descricao.trim()) fd.append("descricao", descricao.trim());
      const res = await fetch(`/api/planos-acao/${planoId}/evidencias`, { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao enviar a evidência.");
      setDescricao("");
      if (arquivoRef.current) arquivoRef.current.value = "";
      onAtualizado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar a evidência.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover(id: number) {
    if (!window.confirm("Remover esta evidência? O arquivo será apagado.")) return;
    setRemovendoId(id);
    setErro(null);
    try {
      const res = await fetch(`/api/planos-acao/${planoId}/evidencias/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao remover a evidência.");
      onAtualizado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao remover a evidência.");
    } finally {
      setRemovendoId(null);
    }
  }

  return (
    <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
      <p style={{ fontSize: "0.8rem", fontWeight: 600, margin: "0 0 0.6rem" }}>
        Evidências · {evidencias.length}
      </p>
      <ListaEvidencias evidencias={evidencias} onRemover={editavel ? handleRemover : undefined} removendoId={removendoId} />

      {editavel && (
        <form onSubmit={handleEnviar} className="form-grid" style={{ maxWidth: "32rem", marginTop: "0.75rem" }}>
          <div className="form-field">
            <label htmlFor={`evid-arquivo-${planoId}`}>Arquivo</label>
            <input
              id={`evid-arquivo-${planoId}`}
              ref={arquivoRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.xlsx,.docx,.eml"
            />
          </div>
          <div className="form-field">
            <label htmlFor={`evid-desc-${planoId}`}>Descrição (opcional)</label>
            <input
              id={`evid-desc-${planoId}`}
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Relatório do scan pós-correção"
              maxLength={300}
            />
          </div>
          <div className="form-field-wide form-actions">
            <button type="submit" className="btn-secondary" disabled={enviando}>
              {enviando ? "Enviando..." : "Anexar evidência"}
            </button>
            <span className="field-helper" style={{ margin: 0 }}>PDF, imagem, TXT, CSV, XLSX, DOCX ou EML · até 10 MB</span>
          </div>
        </form>
      )}

      {erro && (
        <div className="error-banner" style={{ marginTop: "0.75rem" }}>
          <span className="success-icon error-icon">!</span>
          <span className="success-text">{erro}</span>
        </div>
      )}
    </div>
  );
}
