import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Rotas que continuam acessíveis sem login (a própria tela de login,
// e os arquivos internos do Next.js/Clerk).
// /api/condominio-sla/verificar é chamada pelos agendadores (Vercel e
// GitHub), sem sessão — a própria rota explica por que isso é seguro.
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/api/condominio-sla/verificar"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Roda em tudo, exceto arquivos internos do Next.js e estáticos.
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
