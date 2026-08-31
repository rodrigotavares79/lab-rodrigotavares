"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const SEGURANCA_ITEMS = [
  { label: "Gestão de Riscos", href: "/seguranca/gestao-de-riscos" },
  { label: "Penteste", href: "/seguranca/penteste" },
  { label: "Programa de Conscientização", href: "/seguranca/conscientizacao" },
];

export default function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <button
        className="nav-toggle"
        onClick={() => setMobileOpen((v) => !v)}
        aria-expanded={mobileOpen}
        aria-label="Abrir menu"
      >
        Menu
      </button>

      <nav className={`main-nav ${mobileOpen ? "open" : ""}`} aria-label="Navegação principal">
        <div className="nav-item">
          <Link href="/condominio" className="nav-link" onClick={() => setMobileOpen(false)}>
            Gestão de Condomínio
          </Link>
        </div>

        <div className="nav-item" ref={dropdownRef}>
          <button
            className="nav-link"
            aria-expanded={dropdownOpen}
            onClick={() => setDropdownOpen((v) => !v)}
          >
            Segurança da Informação
            <span className="nav-caret">▾</span>
          </button>
          {dropdownOpen && (
            <div className="dropdown">
              {SEGURANCA_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setDropdownOpen(false);
                    setMobileOpen(false);
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
