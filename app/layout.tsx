import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";
import Nav from "@/components/Nav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lab — Rodrigo Tavares",
  description: "Projetos de gestão de condomínio e segurança da informação.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider localization={ptBR}>
      <html lang="pt-BR" className={inter.variable}>
        <body>
          <header className="site-header">
            <div className="container">
              <a href="/" className="wordmark">
                Rodrigo Tavares <span className="tag">/ lab</span>
              </a>
              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <Nav />
                <UserButton afterSignOutUrl="/sign-in" />
              </div>
            </div>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
