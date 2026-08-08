"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HardDrive,
  Database,
  Image as ImageIcon,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  usoArmazenamento,
  type UsoArmazenamento,
} from "@/app/(dashboard)/relatorios/actions";

// Limites do plano GRATUITO do Supabase. Se migrarem para o plano Pro, ajuste
// aqui (Pro = 8192 MB de banco). O medidor é só informativo.
const LIMITE_BANCO_MB = 500;
const LIMITE_FOTOS_MB = 1024; // 1 GB

function paraMb(bytes: number): number {
  return bytes / 1024 / 1024;
}
function formatar(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
}
function corBarra(pct: number): string {
  if (pct >= 85) return "bg-destructive";
  if (pct >= 60) return "bg-amber-500";
  return "bg-primary";
}

function Barra({
  icone: Icone,
  rotulo,
  usadoMb,
  limiteMb,
  detalhe,
}: {
  icone: typeof Database;
  rotulo: string;
  usadoMb: number;
  limiteMb: number;
  detalhe?: string;
}) {
  const pct = Math.min(100, (usadoMb / limiteMb) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <Icone className="size-4 text-muted-foreground" />
          {rotulo}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {formatar(usadoMb)} de {formatar(limiteMb)} ({pct.toFixed(pct < 1 ? 1 : 0)}%)
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", corBarra(pct))}
          style={{ width: `${Math.max(pct, 1.5)}%` }}
        />
      </div>
      {detalhe && (
        <p className="text-[11px] text-muted-foreground">{detalhe}</p>
      )}
    </div>
  );
}

/**
 * Medidor de armazenamento (só Master): mostra quanto do banco e das fotos já
 * foi consumido, para o Master saber quando arquivar/limpar reservas antigas.
 */
export function MedidorArmazenamento() {
  const [dados, setDados] = useState<UsoArmazenamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const r = await usoArmazenamento();
      if (r.ok) {
        setDados(r);
      } else {
        setErro(r.erro);
        setDados(null);
      }
    } catch {
      setErro("Não foi possível medir o armazenamento.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const bancoMb = dados ? paraMb(dados.bancoBytes) : 0;
  const fotosMb = dados ? paraMb(dados.fotosBytes) : 0;
  const pctBanco = (bancoMb / LIMITE_BANCO_MB) * 100;
  const alerta = pctBanco >= 80;

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <HardDrive className="size-5 text-primary" />
            Armazenamento
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={carregar}
            disabled={carregando}
            className="gap-1.5 text-muted-foreground"
          >
            <RefreshCw className={cn("size-4", carregando && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        {carregando && !dados ? (
          <p className="text-sm text-muted-foreground">Medindo…</p>
        ) : erro ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Medição indisponível</p>
              <p className="text-muted-foreground mt-0.5">{erro}</p>
            </div>
          </div>
        ) : dados ? (
          <>
            <Barra
              icone={Database}
              rotulo="Banco de dados"
              usadoMb={bancoMb}
              limiteMb={LIMITE_BANCO_MB}
              detalhe="Onde ficam as reservas, usuários e configurações."
            />
            <Barra
              icone={ImageIcon}
              rotulo="Fotos (Storage)"
              usadoMb={fotosMb}
              limiteMb={LIMITE_FOTOS_MB}
              detalhe={`${dados.fotosArquivos} arquivo${dados.fotosArquivos === 1 ? "" : "s"} (fotos de perfil e de veículos).`}
            />
            <p className="text-[11px] text-muted-foreground">
              Limites do plano gratuito do Supabase (500 MB de banco · 1 GB de
              fotos).
              {alerta
                ? " ⚠️ Banco acima de 80% — use “Exportar e limpar” para arquivar e apagar reservas antigas."
                : " Há bastante folga; limpar reservas antigas raramente é necessário."}
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
