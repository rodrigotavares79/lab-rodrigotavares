"use client";

import { useMemo, useState } from "react";
import s from "@/app/condominio/condominio.module.css";

export type Comunicado = {
  id: number;
  titulo: string;
  corpo: string;
  categoria: string;
  fixado: boolean;
  autor_nome: string | null;
  criado_em: string;
  lido: boolean;
};

const FILTROS = ["Todos", "Administração", "Manutenção", "Comunidade"];

function formatarData(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
  const mesmoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (mesmoDia(d, hoje)) return "Hoje, " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (mesmoDia(d, ontem)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

export default function QuadroMensagens({ comunicados }: { comunicados: Comunicado[] }) {
  const [filtro, setFiltro] = useState("Todos");
  const [lidos, setLidos] = useState<Record<number, boolean>>({});
  const [aberto, setAberto] = useState<number | null>(null);

  const fixado = comunicados.find((c) => c.fixado);
  const lista = useMemo(
    () => comunicados.filter((c) => c !== fixado && (filtro === "Todos" || c.categoria === filtro)),
    [comunicados, fixado, filtro]
  );
  const ehNovo = (c: Comunicado) => !c.lido && !lidos[c.id];
  const naoLidas = comunicados.filter(ehNovo).length;

  function abrir(c: Comunicado) {
    setAberto((v) => (v === c.id ? null : c.id));
    if (ehNovo(c)) {
      setLidos((l) => ({ ...l, [c.id]: true }));
      fetch(`/api/comunicados/${c.id}/lido`, { method: "POST" }).catch(() => {});
    }
  }

  return (
    <section className={`${s.cartao} ${s.quadro}`}>
      <div className={s.quadroTopo}>
        <h2 className={s.titulo}>
          Quadro de mensagens
          {naoLidas > 0 && <span className={s.naoLidas}>{naoLidas} não lida{naoLidas > 1 ? "s" : ""}</span>}
        </h2>
        <div className={s.filtros}>
          {FILTROS.map((f) => (
            <button key={f} type="button" onClick={() => setFiltro(f)}
              className={`${s.filtro} ${f === filtro ? s.filtroAtivo : ""}`}>{f}</button>
          ))}
        </div>
      </div>

      {fixado && (
        <div className={s.fixado}>
          <div className={s.fixadoRotulo}><span className={s.losango} />Fixado pela administração</div>
          <div className={s.fixadoTitulo}>{fixado.titulo}</div>
          <div className={s.fixadoCorpo}>{fixado.corpo}</div>
          <div className={s.meta}>{fixado.autor_nome || "Administração"} · {formatarData(fixado.criado_em)}</div>
        </div>
      )}

      <div className={s.lista}>
        {lista.length === 0 && <div className={s.vazio}>Nenhuma mensagem por aqui.</div>}
        {lista.map((c) => (
          <button key={c.id} type="button" onClick={() => abrir(c)} aria-expanded={aberto === c.id}
            className={`${s.mensagem} ${ehNovo(c) ? s.mensagemNova : ""} ${aberto === c.id ? s.mensagemAberta : ""}`}>
            <span className={`${s.ponto} ${ehNovo(c) ? s.pontoNovo : ""}`} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span className={s.categoria}>{c.categoria}</span>
                <span className={s.meta}>{c.autor_nome || "Administração"}</span>
              </span>
              <div className={s.mensagemTitulo}>{c.titulo}</div>
              <div className={s.previa}>{c.corpo}</div>
            </span>
            <span className={s.meta} style={{ whiteSpace: "nowrap", paddingTop: 2 }}>{formatarData(c.criado_em)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
