import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import {
  getUsuarioCondominio,
  podeGerirChamados,
  podeVisualizarAdmin,
  parsePerfilCondominio,
  calcularPrazoConselheiroAdmin,
  adicionarDiasUteis,
  type PerfilCondominio,
} from "@/lib/condominioAuth";

export const dynamic = "force-dynamic";

const PERFIS_VALIDOS: PerfilCondominio[] = ["sindico", "conselheiro", "conselheiro_admin", "condomino"];

// Não existe tabela própria de usuários — a lista vem direto do Clerk
// (mesma fonte que já controla quem pode logar no site). Síndico e
// Conselheiro editam; Conselheiro-Admin só visualiza.
export async function GET() {
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario || !podeVisualizarAdmin(usuario.perfil)) {
      return NextResponse.json({ error: "Só síndico, conselheiro ou conselheiro-admin vê esta lista." }, { status: 403 });
    }

    const client = await clerkClient();
    const { data: clerkUsers } = await client.users.getUserList({ limit: 200 });
    const agora = new Date();

    const usuarios = clerkUsers.map((u) => {
      const metadata = (u.publicMetadata ?? {}) as Record<string, unknown>;
      const perfil = parsePerfilCondominio(metadata);
      const email =
        u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress
        ?? u.emailAddresses[0]?.emailAddress
        ?? "";
      const nome = [u.firstName, u.lastName].filter(Boolean).join(" ") || email;
      const { prazoISO, diasUteisRestantes, prazoValido } = calcularPrazoConselheiroAdmin(metadata, agora);

      return {
        id: u.id,
        nome,
        email,
        perfil,
        unidade: typeof metadata.unidadeCondominio === "string" ? metadata.unidadeCondominio : "",
        conselheiroAdminPrazoAte: prazoISO,
        diasUteisRestantes,
        conselheiroAdminPrazoValido: prazoValido,
      };
    });

    return NextResponse.json({ usuarios, perfil: usuario.perfil, meuId: usuario.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar usuários." }, { status: 500 });
  }
}

// Convida um condômino novo por e-mail — o site é fechado a cadastro
// público, então todo acesso passa por convite. Conselheiro-Admin não pode
// convidar (função exclusiva de síndico/conselheiro).
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario || !podeGerirChamados(usuario.perfil)) {
      return NextResponse.json({ error: "Só o síndico ou conselheiro convida condôminos." }, { status: 403 });
    }

    const { email, perfil, unidade } = await request.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }
    if (!PERFIS_VALIDOS.includes(perfil)) {
      return NextResponse.json({ error: `Perfil inválido. Use um de: ${PERFIS_VALIDOS.join(", ")}.` }, { status: 400 });
    }

    const client = await clerkClient();

    if (perfil === "sindico" || perfil === "conselheiro_admin") {
      const { data: clerkUsers } = await client.users.getUserList({ limit: 200 });
      const jaExiste = clerkUsers.some((u) => parsePerfilCondominio((u.publicMetadata ?? {}) as Record<string, unknown>) === perfil);
      if (jaExiste) {
        const mensagem =
          perfil === "sindico"
            ? "Já existe um síndico cadastrado. Para trocar, cadastre um conselheiro-admin e use a ação \"Cadastrar Síndico\"."
            : "Já existe um conselheiro-admin ativo. Renove o prazo dele em vez de eleger outro.";
        return NextResponse.json({ error: mensagem }, { status: 409 });
      }
    }

    const publicMetadata: Record<string, unknown> = {
      perfilCondominio: perfil,
      unidadeCondominio: unidade || null,
    };
    if (perfil === "conselheiro_admin") {
      publicMetadata.conselheiroAdminPrazoAte = adicionarDiasUteis(new Date(), 30).toISOString();
      publicMetadata.conselheiroAdminAvisado = false;
    }

    const convite = await client.invitations.createInvitation({
      emailAddress: email,
      publicMetadata,
    });

    return NextResponse.json({ ok: true, conviteId: convite.id });
  } catch (err: any) {
    console.error(err);
    const mensagem = err?.errors?.[0]?.longMessage || "Erro ao convidar o usuário.";
    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}
