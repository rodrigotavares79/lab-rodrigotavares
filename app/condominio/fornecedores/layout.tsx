import { redirect } from "next/navigation";
import { getUsuarioCondominio, podeVisualizarAdmin } from "@/lib/condominioAuth";

export const dynamic = "force-dynamic";

// Tela administrativa: a checagem é feita no servidor, antes de a página
// carregar. Esconder o item do menu não basta — um condômino comum que
// digitasse o endereço direto conseguiria abrir a tela. Quem não é síndico,
// conselheiro ou conselheiro-admin volta para o Início.
export default async function LayoutAdministrativo({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioCondominio();
  if (!usuario) redirect("/sign-in");
  if (!podeVisualizarAdmin(usuario.perfil)) redirect("/condominio");
  return <>{children}</>;
}
