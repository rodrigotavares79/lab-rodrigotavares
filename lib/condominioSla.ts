// Cálculo do prazo de atendimento (SLA) dos chamados do condomínio.
//
// - Serviços com urgência "Urgente": horas corridas (24x7).
// - Demais serviços: horas úteis, contadas só dentro do expediente da
//   administração (segunda a sexta, das 8h às 18h, horário de Brasília).
//   Ex.: SLA de 8h úteis aberto na sexta às 16h vence na segunda às 14h.
//
// Feriados ainda não são considerados. O Brasil não tem horário de verão
// desde 2019, então o fuso de Brasília é fixo em UTC-3.

export const EXPEDIENTE_INICIO_HORA = 8;
export const EXPEDIENTE_FIM_HORA = 18;
export const EXPEDIENTE_DESCRICAO = "segunda a sexta, das 8h às 18h";

const FUSO_BRASILIA_MIN = -180;
const MS_MINUTO = 60_000;

function paraHorarioLocal(d: Date): Date {
  return new Date(d.getTime() + FUSO_BRASILIA_MIN * MS_MINUTO);
}

function deHorarioLocal(d: Date): Date {
  return new Date(d.getTime() - FUSO_BRASILIA_MIN * MS_MINUTO);
}

// Avança para o início do expediente do próximo dia (no "relógio local",
// representado com os campos UTC de um Date deslocado).
function proximoDiaInicioExpediente(local: Date): Date {
  const d = new Date(local);
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(EXPEDIENTE_INICIO_HORA, 0, 0, 0);
  return d;
}

export function adicionarHorasUteis(inicio: Date, horas: number): Date {
  let restanteMs = Math.max(0, horas) * 60 * MS_MINUTO;
  let local = paraHorarioLocal(inicio);
  const inicioMin = EXPEDIENTE_INICIO_HORA * 60;
  const fimMin = EXPEDIENTE_FIM_HORA * 60;

  // Limite de segurança contra laço infinito (≈ 10 anos de dias).
  for (let i = 0; i < 4000; i++) {
    const diaSemana = local.getUTCDay();
    if (diaSemana === 0 || diaSemana === 6) {
      local = proximoDiaInicioExpediente(local);
      continue;
    }
    const minutosDoDia = local.getUTCHours() * 60 + local.getUTCMinutes() + local.getUTCSeconds() / 60;
    if (minutosDoDia < inicioMin) {
      local.setUTCHours(EXPEDIENTE_INICIO_HORA, 0, 0, 0);
      continue;
    }
    if (minutosDoDia >= fimMin) {
      local = proximoDiaInicioExpediente(local);
      continue;
    }
    const disponivelMs = (fimMin - minutosDoDia) * MS_MINUTO;
    if (restanteMs <= disponivelMs) {
      return deHorarioLocal(new Date(local.getTime() + restanteMs));
    }
    restanteMs -= disponivelMs;
    local = proximoDiaInicioExpediente(local);
  }
  return deHorarioLocal(local);
}

export function horasCorridasDoSla(urgencia: string | null | undefined): boolean {
  return urgencia === "Urgente";
}

export function calcularPrazoSla(inicio: Date, slaHoras: number, urgencia: string | null | undefined): Date {
  if (horasCorridasDoSla(urgencia)) {
    return new Date(inicio.getTime() + slaHoras * 60 * MS_MINUTO);
  }
  return adicionarHorasUteis(inicio, slaHoras);
}

// Texto curto para exibir o SLA de um serviço: "4h" ou "8h úteis".
export function rotuloSla(slaHoras: number, urgencia: string | null | undefined): string {
  return horasCorridasDoSla(urgencia) ? `${slaHoras}h` : `${slaHoras}h úteis`;
}
