import RiscosShell from "@/components/riscos/RiscosShell";

// Moldura comum de todas as telas do Gestão de Riscos (menu lateral +
// barra superior). Ver components/riscos/RiscosShell.tsx.
export default function GestaoDeRiscosLayout({ children }: { children: React.ReactNode }) {
  return <RiscosShell>{children}</RiscosShell>;
}
