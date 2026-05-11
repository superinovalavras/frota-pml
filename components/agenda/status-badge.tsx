import { Badge } from "@/components/ui/badge";
import { rotuloStatusAgendamento } from "@/lib/formatters";
import type { StatusAgendamento } from "@/lib/mock/types";

const variant: Record<StatusAgendamento, string> = {
  pendente: "bg-amber-100 text-amber-900 hover:bg-amber-100",
  confirmado: "bg-sky-100 text-sky-900 hover:bg-sky-100",
  em_andamento: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
  concluido: "bg-zinc-100 text-zinc-700 hover:bg-zinc-100",
  cancelado: "bg-rose-100 text-rose-900 hover:bg-rose-100",
  substituido: "bg-violet-100 text-violet-900 hover:bg-violet-100",
};

export function StatusBadge({ status }: { status: StatusAgendamento }) {
  return (
    <Badge variant="secondary" className={variant[status]}>
      {rotuloStatusAgendamento(status)}
    </Badge>
  );
}
