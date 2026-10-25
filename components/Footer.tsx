"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  const noCondominio = pathname?.startsWith("/condominio");

  return (
    <footer className="site-footer">
      <div className="container">
        <span>© {new Date().getFullYear()} Rodrigo Tavares</span>
        {noCondominio && <a href="/condominio/privacidade">Política de Privacidade</a>}
      </div>
    </footer>
  );
}
