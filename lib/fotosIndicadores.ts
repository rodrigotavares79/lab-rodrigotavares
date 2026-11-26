// B22 · Fotos mensais dos indicadores (montagem e séries para os gráficos).
//
// Sem imports: o módulo roda direto no `node --test`.

export const NIVEIS_FOTO = ["Crítico", "Alto", "Médio", "Baixo"] as const;

export type Contagem = Record<string, number>;

export type FotoIndicadores = {
  total: number;
  ativos: number;
  mitigados: number;
  // Riscos ativos (não mitigados) por nível atual.
  ativosPorNivel: Contagem;
  // Todos os riscos por nível inerente, atual e projetado.
  inerente: Contagem;
  atual: Contagem;
  projetado: Contagem;
  semTratamento: number;
  altoCriticoTotal: number;
  altoCriticoComTratamento: number;
  acoesAtrasadas: number;
  revisoesVencidas: number;
  auditoriaPendentes: number;
  planosAbertos: number;
};

export function contagemPorNivel(linhas: { nivel: string | null; total: number }[]): Contagem {
  const c: Contagem = { Crítico: 0, Alto: 0, Médio: 0, Baixo: 0 };
  for (const l of linhas) if (l.nivel && l.nivel in c) c[l.nivel] += Number(l.total) || 0;
  return c;
}

export const altosOuCriticos = (c: Contagem | undefined) => (c?.["Crítico"] ?? 0) + (c?.["Alto"] ?? 0);

// Mês da foto a gravar agora, no fuso de São Paulo: no dia 1, o fechamento do
// mês anterior; nos outros dias, o mês corrente. Devolve "AAAA-MM-01".
export function referenciaDaFoto(hojeSaoPaulo: string): string {
  const [a, m, d] = hojeSaoPaulo.split("-").map(Number);
  if (d === 1) {
    const ano = m === 1 ? a - 1 : a;
    const mes = m === 1 ? 12 : m - 1;
    return `${ano}-${String(mes).padStart(2, "0")}-01`;
  }
  return `${a}-${String(m).padStart(2, "0")}-01`;
}

// Os últimos `n` meses terminando no mês de `ateReferencia` (inclusive).
export function mesesAte(ateReferencia: string, n: number): string[] {
  const [a, m] = ateReferencia.split("-").map(Number);
  const saida: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const total = a * 12 + (m - 1) - i;
    const ano = Math.floor(total / 12);
    const mes = (total % 12) + 1;
    saida.push(`${ano}-${String(mes).padStart(2, "0")}-01`);
  }
  return saida;
}

const ROTULO_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export function rotuloMes(referencia: string): string {
  const [a, m] = referencia.split("-").map(Number);
  return `${ROTULO_MES[m - 1]}/${String(a).slice(2)}`;
}

// Série alinhada aos meses pedidos; mês sem foto fica null (lacuna no gráfico).
export function serie(
  meses: string[],
  fotos: { referencia: string; dados: FotoIndicadores }[],
  valor: (f: FotoIndicadores) => number
): (number | null)[] {
  const porMes = new Map(fotos.map((f) => [f.referencia.slice(0, 10), f.dados]));
  return meses.map((m) => {
    const f = porMes.get(m);
    return f ? valor(f) : null;
  });
}

// % de riscos Alto/Crítico ativos com tratamento (mesma conta do B02).
export function conformidadeTratamento(f: FotoIndicadores): number | null {
  if (!f.altoCriticoTotal) return null;
  return Math.round((f.altoCriticoComTratamento / f.altoCriticoTotal) * 100);
}
