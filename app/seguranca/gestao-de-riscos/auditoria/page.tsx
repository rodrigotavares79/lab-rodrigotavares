"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import { MSG_SEM_EVIDENCIA } from "@/lib/regrasAuditoria";
import { ListaEvidencias, type Evidencia } from "@/components/riscos/EvidenciasPlano";
import s from "./auditoria.module.css";
import { usePerfilRiscos, SemPermissao } from "@/components/riscos/PermissoesRiscos";

// Auditoria dos encerramentos de Planos de Ação. Planos concluídos chegam
// "Pendentes"; gestor, coordenador ou analista sênior de SI classificam como
// Conforme (evidência validada, comentário opcional) ou Não conforme
// (comentário obrigatório; o plano volta a ficar aberto para correção).

const BASE = "/seguranca/gestao-de-riscos";

type Situacao = "Pendente" | "Conforme" | "Não conforme";

type Acao = { id: number; descricao: string; responsavel: string | null; prazo: string | null; status: string };
type Historico = { id: number; resultado: Situacao; comentario: string | null; auditor_nome: string | null; criado_em: string };
type PlanoAuditoria = {
  // B07: motivo que impede o usuário logado de auditar (segregação de funções).
  conflito: string | null;
  criado_por_nome: string | null;
  id: number;
  titulo: string;
  status: string;
  concluido_em: string | null;
  auditoria_status: Situacao;
  auditado_em: string | null;
  auditado_por_nome: string | null;
  auditoria_comentario: string | null;
  risco_id: number;
  gatilho: string | null;
  risco_titulo?: string | null;
  categoria: string | null;
  impacto_qualitativo: string | null;
  projeto: string | null;
  acoes: Acao[];
  evidencias: Evidencia[];
  historico: Historico[];
};
type Resposta = {
  usuario: { nome: string; podeAuditar: boolean; perfil: string | null };
  contagem: { pendentes: number; conformes: number; nao_conformes: number };
  planos: PlanoAuditoria[];
};

const ABAS: { situacao: Situacao; rotulo: string; chave: keyof Resposta["contagem"] }[] = [
  { situacao: "Pendente", rotulo: "Pendentes", chave: "pendentes" },
  { situacao: "Conforme", rotulo: "Conformes", chave: "conformes" },
  { situacao: "Não conforme", rotulo: "Não conformes", chave: "nao_conformes" },
];

const BADGE_POR_NIVEL: Record<string, string> = {
  Baixo: "badge-baixo",
  "Médio": "badge-medio",
  "Alto": "badge-alto",
  "Crítico": "badge-critico",
};

function formatData(d: string | null) {
  if (!d) return "—";
  return new Date(String(d).slice(0, 10) + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatDataHora(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function SeloSituacao({ situacao }: { situacao: Situacao }) {
  const classe = situacao === "Conforme" ? s.seloConforme : situacao === "Não conforme" ? s.seloNaoConforme : s.seloPendente;
  return <span className={`${s.selo} ${classe}`}>{situacao === "Pendente" ? "Aguardando auditoria" : situacao}</span>;
}

function Decisao({ plano, onDecidido }: { plano: PlanoAuditoria; onDecidido: () => void }) {
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState<Situacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // B08: sem evidência anexada não há o que validar como Conforme.
  const semEvidencia = plano.evidencias.length === 0;

  async function decidir(resultado: "Conforme" | "Não conforme") {
    if (resultado === "Não conforme" && !comentario.trim()) {
      setErro("Para Não conforme, descreva no comentário o que precisa ser corrigido.");
      return;
    }
    setEnviando(resultado);
    setErro(null);
    try {
      const res = await fetch(`/api/auditoria/${plano.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultado, comentario }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao registrar a auditoria.");
      onDecidido();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao registrar a auditoria.");
    } finally {
      setEnviando(null);
    }
  }

  return (
    <div className={s.decisao}>
      <label htmlFor={`coment-${plano.id}`} className={s.rotuloCampo}>
        Comentário <span className="text-muted">(opcional para Conforme, obrigatório para Não conforme)</span>
      </label>
      <textarea
        id={`coment-${plano.id}`}
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Ex.: Evidência do reteste confirma a correção da vulnerabilidade."
      />
      <div className={s.botoes}>
        <button
          type="button"
          className={s.botaoConforme}
          onClick={() => decidir("Conforme")}
          disabled={enviando !== null || semEvidencia}
          title={semEvidencia ? MSG_SEM_EVIDENCIA : undefined}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12l5 5 9-10" />
          </svg>
          {enviando === "Conforme" ? "Registrando..." : "Conforme"}
        </button>
        <button type="button" className={s.botaoNaoConforme} onClick={() => decidir("Não conforme")} disabled={enviando !== null}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
          {enviando === "Não conforme" ? "Registrando..." : "Não conforme"}
        </button>
      </div>
      {semEvidencia && (
        <p className="text-muted" style={{ fontSize: "0.8rem", margin: 0 }}>
          {MSG_SEM_EVIDENCIA}
        </p>
      )}
      {erro && (
        <div className="error-banner" style={{ marginTop: 0 }}>
          <span className="success-icon error-icon">!</span>
          <span className="success-text">{erro}</span>
        </div>
      )}
    </div>
  );
}

function CardPlano({ plano, podeAuditar, onDecidido }: { plano: PlanoAuditoria; podeAuditar: boolean; onDecidido: () => void }) {
  return (
    <article className={s.card}>
      <header className={s.cardTopo}>
        <div className={s.cardTitulos}>
          <Link href={`${BASE}/riscos/${plano.risco_id}#planos-de-acao`} className={s.risco}>
            Risco #{plano.risco_id} · {plano.risco_titulo || plano.gatilho || plano.categoria || "sem descrição"}
          </Link>
          <h2 className={s.planoTitulo}>{plano.titulo}</h2>
          <span className={s.meta}>
            {plano.projeto ? `${plano.projeto} · ` : ""}
            {plano.auditoria_status === "Pendente"
              ? `Concluído em ${formatDataHora(plano.concluido_em)}`
              : `Auditado em ${formatDataHora(plano.auditado_em)}${plano.auditado_por_nome ? ` por ${plano.auditado_por_nome}` : ""}`}
          </span>
        </div>
        <div className={s.selos}>
          {plano.impacto_qualitativo && (
            <span className={`badge ${BADGE_POR_NIVEL[plano.impacto_qualitativo] || ""}`}>{plano.impacto_qualitativo}</span>
          )}
          <SeloSituacao situacao={plano.auditoria_status} />
        </div>
      </header>

      {plano.auditoria_status !== "Pendente" && plano.auditoria_comentario && (
        <p className={s.comentario}>“{plano.auditoria_comentario}”</p>
      )}

      <div className={s.colunas}>
        <section>
          <h3 className={s.subtitulo}>Ações · {plano.acoes.length}</h3>
          <ul className={s.acoes}>
            {plano.acoes.map((a) => (
              <li key={a.id}>
                <span className={s.acaoDesc}>{a.descricao}</span>
                <span className="text-muted">
                  {a.responsavel || "—"} · prazo {formatData(a.prazo)} · {a.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className={s.subtitulo}>Evidências · {plano.evidencias.length}</h3>
          <ListaEvidencias evidencias={plano.evidencias} />
        </section>
      </div>

      {plano.historico.length > 0 && (
        <details className={s.historico}>
          <summary>Histórico de auditoria · {plano.historico.length}</summary>
          <ul>
            {plano.historico.map((h) => (
              <li key={h.id}>
                <SeloSituacao situacao={h.resultado} />
                <span>
                  {formatDataHora(h.criado_em)} · {h.auditor_nome || "—"}
                  {h.comentario ? ` — “${h.comentario}”` : ""}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {plano.auditoria_status === "Pendente" && podeAuditar && !plano.conflito && (
        <Decisao plano={plano} onDecidido={onDecidido} />
      )}
      {plano.auditoria_status === "Pendente" && podeAuditar && plano.conflito && (
        <div className="error-banner" role="note" style={{ marginTop: "1rem" }}>
          <span className="success-icon error-icon">!</span>
          <span className="success-text">
            <strong>Você não pode auditar este plano.</strong>
            <span>{plano.conflito}</span>
          </span>
        </div>
      )}
    </article>
  );
}

export default function AuditoriaDePlanos() {
  const perfil = usePerfilRiscos();
  const [aba, setAba] = useState<Situacao>("Pendente");
  const [dados, setDados] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  function carregar(situacao: Situacao) {
    setCarregando(true);
    setErro(null);
    fetch(`/api/auditoria?status=${encodeURIComponent(situacao)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setDados(d);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar a auditoria."))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar(aba);
  }, [aba]);

  const podeAuditar = !!dados?.usuario.podeAuditar;

  if (perfil.carregado && !perfil.permissoes.verAuditoria) {
    return (
      <>
        <SemPermissao mensagem="Seu perfil não tem acesso às informações de auditoria." />
        <Footer />
      </>
    );
  }

  return (
    <>
      <section className="content-block">
        <div className={`container ${s.pagina}`}>
          <div>
            <span className="eyebrow">Gestão de Riscos</span>
            <h1>Fila de auditoria</h1>
            <p className={s.subtituloPagina}>
              Classifique o encerramento de cada plano de ação como <strong>Conforme</strong> (evidências validadas de que o
              plano mitigou o risco) ou <strong>Não conforme</strong>.
            </p>
          </div>

          {dados && !podeAuditar && (
            <div className={s.aviso}>
              Você pode consultar a auditoria, mas só coordenador, gerente ou administrador aplicam as validações de
              conformidade.
            </div>
          )}
          {dados && podeAuditar && dados.usuario.perfil && (
            <p className={s.perfil}>
              Auditando como <strong>{dados.usuario.nome}</strong> · {dados.usuario.perfil}
            </p>
          )}

          <div className={s.abas} role="tablist" aria-label="Situação da auditoria">
            {ABAS.map((a) => (
              <button
                key={a.situacao}
                type="button"
                role="tab"
                aria-selected={aba === a.situacao}
                className={`${s.aba} ${aba === a.situacao ? s.abaAtiva : ""}`}
                onClick={() => setAba(a.situacao)}
              >
                {a.rotulo}
                <span className={s.contador}>{dados ? dados.contagem[a.chave] : "—"}</span>
              </button>
            ))}
          </div>

          {erro && (
            <div className="error-banner">
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar a auditoria.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}

          {carregando && !dados && <p className="text-muted">Carregando...</p>}

          {dados && !erro && dados.planos.length === 0 && (
            <div className={s.vazio}>
              {aba === "Pendente"
                ? "Nenhum plano aguardando auditoria. Planos concluídos aparecem aqui automaticamente."
                : aba === "Conforme"
                  ? "Nenhum plano auditado como Conforme ainda."
                  : "Nenhum plano auditado como Não conforme."}
            </div>
          )}

          <div className={s.lista} aria-busy={carregando}>
            {dados?.planos.map((p) => (
              <CardPlano key={p.id} plano={p} podeAuditar={podeAuditar} onDecidido={() => carregar(aba)} />
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
