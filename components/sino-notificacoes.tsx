"use client";

import {
  Bell,
  Car,
  CalendarCheck2,
  CalendarX2,
  IdCard,
  Users,
  Wrench,
  CheckCheck,
  ArrowUpFromDot,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useNotificacoes } from "@/lib/store/notificacoes-context";
import type { NotificacaoTipo } from "@/lib/data/notificacoes";

const ICONES: Record<NotificacaoTipo, LucideIcon> = {
  motorista_designado: IdCard,
  reserva_confirmada: CalendarCheck2,
  reserva_cancelada: CalendarX2,
  reserva_substituida: ArrowUpFromDot,
  veiculo_manutencao: Wrench,
  veiculo_liberado: Car,
  passageiro_adicionado: Users,
  passageiro_removido: Users,
};

function tempoRelativo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function SinoNotificacoes() {
  const { notificacoes, naoLidas, marcarLida, marcarTodasLidas, recarregar } =
    useNotificacoes();

  return (
    <DropdownMenu onOpenChange={(aberto) => aberto && void recarregar()}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative shrink-0"
          aria-label={`Notificações${naoLidas ? ` (${naoLidas} não lidas)` : ""}`}
        >
          <Bell className="size-5" />
          {naoLidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {naoLidas > 99 ? "99+" : naoLidas}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(92vw,380px)] p-0 max-h-[70vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b sticky top-0 bg-popover z-10">
          <span className="text-sm font-semibold">Notificações</span>
          {naoLidas > 0 && (
            <button
              type="button"
              onClick={marcarTodasLidas}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <CheckCheck className="size-3.5" />
              Marcar todas como lidas
            </button>
          )}
        </div>

        {notificacoes.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            <Bell className="size-8 mx-auto mb-2 opacity-40" />
            Nenhuma notificação por aqui.
          </div>
        ) : (
          <ul className="divide-y">
            {notificacoes.map((n) => {
              const Icone = ICONES[n.tipo] ?? Bell;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => !n.lida && marcarLida(n.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-muted/50 transition-colors",
                      !n.lida && "bg-primary/5",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 size-7 rounded-full flex items-center justify-center shrink-0",
                        n.lida
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/15 text-primary",
                      )}
                    >
                      <Icone className="size-3.5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span
                        className={cn(
                          "block text-sm leading-tight",
                          !n.lida && "font-semibold",
                        )}
                      >
                        {n.titulo}
                      </span>
                      {n.mensagem && (
                        <span className="block text-xs text-muted-foreground mt-0.5 whitespace-pre-line break-words">
                          {n.mensagem}
                        </span>
                      )}
                      <span className="block text-[10px] text-muted-foreground/70 mt-1">
                        {tempoRelativo(n.criadoEm)}
                      </span>
                    </span>
                    {!n.lida && (
                      <span className="mt-1.5 size-2 rounded-full bg-primary shrink-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
