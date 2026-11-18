import Link from "next/link";
import { redirect } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio, podeGerirChamados } from "@/lib/condominioAuth";
import { fonteMono, fonteSans, fonteSerif } from "@/lib/condominioFonts";
import CondominioSidebar from "@/components/condominio/CondominioSidebar";
import QuadroMensagens, { type Comunicado } from "@/components/condominio/QuadroMensagens";
import s from "./condominio.module.css";

export const dynamic = "force-dynamic";

type ChamadoResumo = { id: number; titulo: string; status: string; criado_em: string };

const ENCERRADOS = ["Resolvido", "Cancelado"];

function corStatus(status: string) {
  if (status === "Novo" || status === "Reaberto") return "#C8102E";
  if (ENCERRADOS.includes(status)) return "#6B7080";
  return "#1B2F6B";
}

export default async function Condominio() {
  const usuario = await getUsuarioCondominio();
  if (!usuario) redirect("/sign-in");

  const gerente = podeGerirChamados(usuario.perfil);
  const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

  const [comunicados, chamados] = await Promise.all([
    // Se a migração 0009 ainda não tiver rodado, a página continua funcionando
    // com o quadro de mensagens vazio em vez de quebrar.
    (sql`
      SELECT c.id, c.titulo, c.corpo, c.categoria, c.fixado, c.autor_nome, c.criado_em,
             (l.comunicado_id IS NOT NULL) AS lido
      FROM comunicados c
      LEFT JOIN comunicados_leituras l ON l.comunicado_id = c.id AND l.usuario_email = ${usuario.email}
      ORDER BY c.fixado DESC, c.criado_em DESC
      LIMIT 30
    ` as unknown as Promise<Comunicado[]>).catch((err) => {
      console.error("Quadro de mensagens indisponível:", err);
      return [] as Comunicado[];
    }),
    sql`
      SELECT id, titulo, status, criado_em
      FROM chamados
      WHERE aberto_por_email = ${usuario.email}
      ORDER BY (status IN ('Resolvido','Cancelado')), criado_em DESC
      LIMIT 4
    ` as unknown as Promise<ChamadoResumo[]>,
  ]);

  const abertos = chamados.filter((c) => !ENCERRADOS.includes(c.status)).length;
  const naoLidas = comunicados.filter((c) => !c.lido).length;
  const primeiroNome = usuario.nome.split(" ")[0];
  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });

  return (
    <div className={`${s.shell} ${fonteSerif.variable} ${fonteMono.variable} ${fonteSans.variable}`}>
      <CondominioSidebar nome={usuario.nome} unidade={usuario.unidade} gerente={gerente}
        chamadosAbertos={abertos} naoLidas={naoLidas} />

      <main className={s.main}>
        <header className={s.cabecalho}>
          <div>
            <div className={s.data}>{hoje}</div>
            <h1 className={s.saudacao}>Olá, {primeiroNome}.</h1>
          </div>
          <Link href="/condominio/novo-chamado" className={s.botaoPrimario}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>Abrir chamado
          </Link>
        </header>

        <div className={s.grade}>
          <QuadroMensagens comunicados={comunicados} />

          <section className={`${s.cartao} ${s.lateral}`}>
            <div className={s.lateralTopo}>
              <h2 className={s.titulo} style={{ fontSize: 22 }}>Meus chamados</h2>
              <Link href="/condominio/chamados" style={{ fontSize: 12, fontWeight: 500 }}>Ver todos</Link>
            </div>
            <div>
              {chamados.length === 0 && (
                <p className={s.meta}>Você ainda não abriu chamados.</p>
              )}
              {chamados.map((c) => (
                <Link key={c.id} href={`/condominio/chamados/${c.id}`} className={s.chamado}>
                  <span className={s.chamadoLinha}>
                    <span className={s.chamadoId}>#{c.id}</span>
                    <span className={s.status} style={{ color: corStatus(c.status) }}>
                      <span className={s.statusPonto} />{c.status}
                    </span>
                  </span>
                  <span className={s.chamadoTitulo}>{c.titulo}</span>
                  <span className={s.meta}>
                    Aberto em {new Date(c.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "")}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
