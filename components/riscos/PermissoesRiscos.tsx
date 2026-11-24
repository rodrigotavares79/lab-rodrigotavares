"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Perfil do usuário no Gestão de Riscos para a interface. Enquanto carrega,
// tudo fica bloqueado (carregado = false) — as rotas de API validam de novo.

export type PermissoesRiscos = {
  editarRiscos: boolean;
  editarPlanos: boolean;
  verAuditoria: boolean;
  auditar: boolean;
};

export type PerfilRiscosCliente = {
  carregado: boolean;
  nome: string;
  perfil: string;
  rotulo: string;
  permissoes: PermissoesRiscos;
};

const NADA: PermissoesRiscos = { editarRiscos: false, editarPlanos: false, verAuditoria: false, auditar: false };
const INICIAL: PerfilRiscosCliente = { carregado: false, nome: "", perfil: "usuario", rotulo: "", permissoes: NADA };

const Contexto = createContext<PerfilRiscosCliente>(INICIAL);

export function ProvedorPermissoesRiscos({ children }: { children: React.ReactNode }) {
  const [perfil, setPerfil] = useState<PerfilRiscosCliente>(INICIAL);
  useEffect(() => {
    fetch("/api/perfil-riscos")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setPerfil({ carregado: true, nome: d.nome, perfil: d.perfil, rotulo: d.rotulo, permissoes: d.permissoes });
      })
      .catch(() => setPerfil({ ...INICIAL, carregado: true }));
  }, []);
  return <Contexto.Provider value={perfil}>{children}</Contexto.Provider>;
}

export function usePerfilRiscos(): PerfilRiscosCliente {
  return useContext(Contexto);
}

/** Aviso padrão para telas que o perfil não pode acessar. */
export function SemPermissao({ mensagem }: { mensagem: string }) {
  return (
    <section className="content-block">
      <div className="container">
        <span className="eyebrow">Gestão de Riscos</span>
        <h1>Acesso restrito</h1>
        <p className="lede">{mensagem}</p>
      </div>
    </section>
  );
}
