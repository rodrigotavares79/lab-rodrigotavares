import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Rotas que continuam acessíveis sem login (a própria tela de login,
// e os arquivos internos do Next.js/Clerk).
const isPublicRoute = createRouteMatcher(["/sign-in(.*)"]);

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
