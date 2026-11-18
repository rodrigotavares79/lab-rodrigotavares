import { redirect } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio, podeGerirChamados } from "@/lib/condominioAuth";
import { fonteMono, fonteSans, fonteSerif } from "@/lib/condominioFonts";
import CondominioSidebar from "@/components/condominio/CondominioSidebar";
import s from "./condominio.module.css";

export const dynamic = "force-dynamic";

// Moldura comum de todas as telas do Gestão de Condomínio: menu lateral
// fixo + área de conteúdo com o tema do condomínio. O cabeçalho e o
// rodapé globais do lab são escondidos via `.condominio-shell` (globals.css).
export default async function CondominioLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioCondominio();
  if (!usuario) redirect("/sign-in");

  const gerente = podeGerirChamados(usuario.perfil);

  let chamadosAbertos = 0;
  let naoLidas = 0;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const [abertos, mensagens] = await Promise.all([
      sql`
        SELECT count(*)::int AS n FROM chamados
        WHERE aberto_por_email = ${usuario.email} AND status NOT IN ('Resolvido','Cancelado')
      `,
      sql`
        SELECT count(*)::int AS n FROM comunicados c
        WHERE NOT EXISTS (
          SELECT 1 FROM comunicados_leituras l
          WHERE l.comunicado_id = c.id AND l.usuario_email = ${usuario.email}
        )
      `.catch(() => [{ n: 0 }]),
    ]);
    chamadosAbertos = Number(abertos[0]?.n ?? 0);
    naoLidas = Number(mensagens[0]?.n ?? 0);
  } catch (err) {
    console.error("Contadores do menu do condomínio indisponíveis:", err);
  }

  return (
    <div className={`condominio-shell ${s.shell} ${fonteSerif.variable} ${fonteMono.variable} ${fonteSans.variable}`}>
      <CondominioSidebar nome={usuario.nome} unidade={usuario.unidade} gerente={gerente}
        chamadosAbertos={chamadosAbertos} naoLidas={naoLidas} />
      <div className={s.conteudo}>{children}</div>
    </div>
  );
}
