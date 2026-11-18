import { NextRequest, NextResponse } from "next/server";
import { verificarAlertasSla } from "@/lib/condominioAlertaSla";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Dispara a verificação de prazos vencidos (alerta de SLA aos conselheiros).
// Chamado pela tarefa diária da Vercel (vercel.json) e pelo agendamento do
// GitHub a cada 15 min (.github/workflows/alerta-sla.yml).
//
// A rota não exige login porque é chamada por esses agendadores, mas é
// segura de expor: não devolve dados de chamados, só contagens, e é
// idempotente (cada estouro de prazo gera um único alerta, e a verificação
// não roda mais de uma vez a cada 5 minutos). Se a variável CRON_SECRET
// existir no projeto, passa a exigir "Authorization: Bearer <CRON_SECRET>"
// — a Vercel envia esse cabeçalho sozinha nas tarefas agendadas.
async function executar(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (segredo && request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  try {
    const resultado = await verificarAlertasSla({ intervaloMinimoMinutos: 5 });
    return NextResponse.json(resultado);
  } catch (err) {
    console.error("Falha na verificação de alertas de SLA:", err);
    return NextResponse.json({ error: "Falha na verificação." }, { status: 500 });
  }
}

export const GET = executar;
export const POST = executar;
