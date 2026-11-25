"use client";

import { useEffect, useState } from "react";

// B14 · Escolha do dono do risco: usuário do sistema ou contato de negócio
// (sem acesso). Com contato, aparece o ponto focal — sempre um Analista GRC;
// se houver só um, ele já vem escolhido.

export type ValorDono = { donoEmail: string; donoContatoId: number | null; pontoFocalEmail: string };
export const DONO_VAZIO: ValorDono = { donoEmail: "", donoContatoId: null, pontoFocalEmail: "" };

type Opcoes = {
  usuarios: { email: string; nome: string; perfil: string }[];
  contatos: { id: number; nome: string; email: string; area: string; cargo: string | null }[];
  pontosFocais: { email: string; nome: string }[];
};

export function donoPreenchido(v: ValorDono): boolean {
  return v.donoContatoId !== null ? !!v.pontoFocalEmail : !!v.donoEmail;
}

export default function SeletorDono({
  valor,
  onChange,
  idPrefixo = "dono",
}: {
  valor: ValorDono;
  onChange: (v: ValorDono) => void;
  idPrefixo?: string;
}) {
  const [opcoes, setOpcoes] = useState<Opcoes>({ usuarios: [], contatos: [], pontosFocais: [] });

  useEffect(() => {
    fetch("/api/donos-risco")
      .then((r) => r.json())
      .then((d) => setOpcoes({ usuarios: d.usuarios || [], contatos: d.contatos || [], pontosFocais: d.pontosFocais || [] }))
      .catch(() => undefined);
  }, []);

  // Contato escolhido e um único Analista GRC: preenche o ponto focal.
  useEffect(() => {
    if (valor.donoContatoId !== null && !valor.pontoFocalEmail && opcoes.pontosFocais.length === 1) {
      onChange({ ...valor, pontoFocalEmail: opcoes.pontosFocais[0].email });
    }
  }, [valor, opcoes.pontosFocais, onChange]);

  const selecionado =
    valor.donoContatoId !== null ? `c:${valor.donoContatoId}` : valor.donoEmail ? `u:${valor.donoEmail}` : "";

  function escolher(v: string) {
    if (v.startsWith("c:")) onChange({ donoEmail: "", donoContatoId: Number(v.slice(2)), pontoFocalEmail: "" });
    else if (v.startsWith("u:")) onChange({ donoEmail: v.slice(2), donoContatoId: null, pontoFocalEmail: "" });
    else onChange(DONO_VAZIO);
  }

  return (
    <>
      <div className="form-field">
        <label htmlFor={`${idPrefixo}Select`}>Dono do Risco *</label>
        <select id={`${idPrefixo}Select`} value={selecionado} onChange={(e) => escolher(e.target.value)}>
          <option value="">Selecione</option>
          <optgroup label="Usuários do sistema">
            {opcoes.usuarios.map((u) => (
              <option key={u.email} value={`u:${u.email}`}>
                {u.nome} ({u.perfil})
              </option>
            ))}
          </optgroup>
          <optgroup label="Contatos de negócio (sem acesso)">
            {opcoes.contatos.map((c) => (
              <option key={c.id} value={`c:${c.id}`}>
                {c.nome} · {c.area}
              </option>
            ))}
          </optgroup>
        </select>
        <p className="field-helper">
          Quem responde pelo risco e decide o tratamento. Pessoa de fora do sistema?{" "}
          <a href="/seguranca/gestao-de-riscos/contatos-risco" target="_blank" rel="noreferrer">
            Cadastre em Contatos de negócio
          </a>
          .
        </p>
      </div>
      {valor.donoContatoId !== null && (
        <div className="form-field">
          <label htmlFor={`${idPrefixo}PontoFocal`}>Ponto focal (Analista GRC) *</label>
          <select
            id={`${idPrefixo}PontoFocal`}
            value={valor.pontoFocalEmail}
            onChange={(e) => onChange({ ...valor, pontoFocalEmail: e.target.value })}
          >
            <option value="">Selecione</option>
            {opcoes.pontosFocais.map((p) => (
              <option key={p.email} value={p.email}>
                {p.nome}
              </option>
            ))}
          </select>
          <p className="field-helper">
            {opcoes.pontosFocais.length === 0
              ? "Não há usuário com perfil Analista GRC: defina um no Clerk antes de usar dono externo."
              : "Atualiza o risco em nome do dono, que não tem acesso ao sistema, e responde pelas pendências."}
          </p>
        </div>
      )}
    </>
  );
}
