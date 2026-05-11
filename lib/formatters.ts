import type {
  NivelAcesso,
  StatusAgendamento,
  StatusVeiculo,
  CategoriaCNH,
} from "@/lib/mock/types";

export function formatHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDataExtenso(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatDataCurta(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatDataIsoBr(iso: string | undefined): string {
  if (!iso) return "—";
  // Aceita "YYYY-MM-DD" ou "YYYY-MM-DDTHH:..." — descarta a parte de hora.
  const apenasData = iso.split("T")[0];
  const [y, m, d] = apenasData.split("-");
  if (!y || !m || !d || d.length !== 2) return iso;
  return `${d}/${m}/${y}`;
}

export function formatCpf(cpf: string): string {
  const apenas = cpf.replace(/\D/g, "").slice(0, 11);
  if (apenas.length !== 11) return cpf;
  return apenas.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

export function formatTelefone(tel: string): string {
  const d = tel.replace(/\D/g, "").slice(0, 11);
  if (d.length === 11) {
    return d.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }
  if (d.length === 10) {
    return d.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  return tel;
}

export function rotuloStatusAgendamento(s: StatusAgendamento): string {
  const m: Record<StatusAgendamento, string> = {
    pendente: "Pendente",
    confirmado: "Confirmado",
    em_andamento: "Em andamento",
    concluido: "Concluído",
    cancelado: "Cancelado",
    substituido: "Substituído",
  };
  return m[s];
}

export function rotuloStatusVeiculo(s: StatusVeiculo): string {
  const m: Record<StatusVeiculo, string> = {
    disponivel: "Disponível",
    em_uso: "Em uso",
    manutencao: "Em manutenção",
    indisponivel: "Indisponível",
  };
  return m[s];
}

export function corStatusAgendamento(s: StatusAgendamento): string {
  const m: Record<StatusAgendamento, string> = {
    pendente: "bg-amber-100 text-amber-900 border-amber-300",
    confirmado: "bg-sky-100 text-sky-900 border-sky-300",
    em_andamento: "bg-emerald-100 text-emerald-900 border-emerald-400",
    concluido: "bg-zinc-100 text-zinc-700 border-zinc-300",
    cancelado: "bg-rose-50 text-rose-900 border-rose-300 line-through",
    substituido: "bg-violet-100 text-violet-900 border-violet-300",
  };
  return m[s];
}

export function corStatusVeiculo(s: StatusVeiculo): string {
  const m: Record<StatusVeiculo, string> = {
    disponivel: "bg-emerald-500",
    em_uso: "bg-sky-500",
    manutencao: "bg-amber-500",
    indisponivel: "bg-rose-500",
  };
  return m[s];
}

export function rotuloPerfil(
  p: "master" | "gestor" | "servidor" | "motorista",
): string {
  const m = {
    master: "Master",
    gestor: "Gestor",
    servidor: "Servidor",
    motorista: "Motorista",
  } as const;
  return m[p];
}

export function rotuloNivelAcesso(n: NivelAcesso): string {
  const m: Record<NivelAcesso, string> = {
    master: "Master (acesso total)",
    gestor: "Gestor (sua secretaria)",
    servidor: "Servidor (sua superintendência)",
  };
  return m[n];
}

export const CATEGORIAS_CNH: CategoriaCNH[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "AB",
  "AC",
  "AD",
  "AE",
];
