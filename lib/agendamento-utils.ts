import type {
  Agendamento,
  CategoriaCNH,
  StatusAgendamento,
  Usuario,
  Veiculo,
} from "@/lib/mock/types";

export const STATUS_AGENDAMENTO_ATIVOS: StatusAgendamento[] = [
  "pendente",
  "confirmado",
  "em_andamento",
];

/**
 * Detecta conflito: se o veículo já tem agendamento ATIVO sobreposto.
 * Retorna o agendamento conflitante ou null.
 */
export function detectarConflito(
  agendamentos: Agendamento[],
  veiculoId: string,
  inicio: string,
  fim: string,
  ignorarId?: string,
): Agendamento | null {
  const a = new Date(inicio).getTime();
  const b = new Date(fim).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || a >= b) return null;
  for (const ag of agendamentos) {
    if (ag.id === ignorarId) continue;
    if (ag.veiculoId !== veiculoId) continue;
    if (!STATUS_AGENDAMENTO_ATIVOS.includes(ag.status)) continue;
    const x = new Date(ag.inicio).getTime();
    const y = new Date(ag.fim).getTime();
    if (a < y && b > x) return ag;
  }
  return null;
}

/** Categorias de CNH compatíveis para conduzir um veículo da exigência informada */
const COMPATIBILIDADE_CNH: Record<CategoriaCNH, CategoriaCNH[]> = {
  A: ["A", "AB", "AC", "AD", "AE"],
  B: ["B", "AB", "C", "D", "E", "AC", "AD", "AE"],
  C: ["C", "AC", "D", "E", "AD", "AE"],
  D: ["D", "AD", "E", "AE"],
  E: ["E", "AE"],
  AB: ["AB", "AC", "AD", "AE"],
  AC: ["AC", "AD", "AE"],
  AD: ["AD", "AE"],
  AE: ["AE"],
};

export function podeDirigirVeiculo(u: Usuario, v: Veiculo): boolean {
  if (!u.cnhCategoria) return false;
  const compativeis = COMPATIBILIDADE_CNH[v.cnhExigida] ?? [];
  return compativeis.includes(u.cnhCategoria);
}

export function temCnhValida(u: Usuario): boolean {
  if (!u.cnhCategoria) return false;
  if (!u.cnhValidade) return false;
  // cnhValidade vem como "YYYY-MM-DD". new Date() parseia como UTC, então
  // comparar com "agora" pode marcar como vencida 3h antes da meia-noite local.
  // Comparamos via componentes de data local.
  const [y, m, d] = u.cnhValidade.split("-").map(Number);
  if (!y || !m || !d) return false;
  const validadeFim = new Date(y, m - 1, d, 23, 59, 59);
  return validadeFim.getTime() >= Date.now();
}

/** Próximos status válidos a partir do atual. */
export function proximosStatus(atual: StatusAgendamento): StatusAgendamento[] {
  switch (atual) {
    case "pendente":
      return ["confirmado", "cancelado"];
    case "confirmado":
      return ["em_andamento", "cancelado"];
    case "em_andamento":
      return ["concluido", "cancelado"];
    case "concluido":
    case "cancelado":
    case "substituido":
      return [];
  }
}

export function rotuloAcaoStatus(status: StatusAgendamento): string {
  const m: Record<StatusAgendamento, string> = {
    pendente: "Marcar como pendente",
    confirmado: "Confirmar",
    em_andamento: "Iniciar viagem",
    concluido: "Concluir viagem",
    cancelado: "Cancelar",
    substituido: "Marcar substituído",
  };
  return m[status];
}

/** Converte ISO → "YYYY-MM-DDTHH:MM" (datetime-local) em horário local */
export function isoParaInputLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "YYYY-MM-DDTHH:MM" → ISO local com segundos zerados */
export function inputLocalParaIso(local: string): string {
  if (!local) return "";
  return local.length === 16 ? `${local}:00` : local;
}

export function formatDuracao(inicio: string, fim: string): string {
  const a = new Date(inicio).getTime();
  const b = new Date(fim).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return "—";
  const totalMin = Math.round((b - a) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

/** Constrói intervalo "dia todo" para uma data YYYY-MM-DD: 00:00 → 23:59 local */
export function intervaloDiaTodo(dataIso: string): { inicio: string; fim: string } {
  const [y, m, d] = dataIso.split("-").map(Number);
  if (!y || !m || !d) return { inicio: "", fim: "" };
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    inicio: `${y}-${pad(m)}-${pad(d)}T00:00:00`,
    fim: `${y}-${pad(m)}-${pad(d)}T23:59:00`,
  };
}

/** Extrai a data YYYY-MM-DD de um ISO local */
export function dataIsoDeIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
