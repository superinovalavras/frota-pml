"use client";

import { useCallback, useEffect, useState } from "react";
import { Wrench, Loader2, Check, RotateCcw, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePerfil } from "@/lib/perfil-context";
import { useUsuarios } from "@/lib/store/usuarios-context";
import { useConfirmacao } from "@/components/confirmacao-provider";
import {
  listarRelatos,
  criarRelato,
  resolverRelato,
  removerRelato,
} from "@/lib/data/relatos";
import { avisarDefeito } from "@/app/(dashboard)/veiculos/actions";
import type { RelatoVeiculo } from "@/lib/mock/types";

function fmt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export function DefeitosVeiculo({
  veiculoId,
}: {
  veiculoId: string;
}) {
  const { usuario } = usePerfil();
  const { buscarPorId: buscarUsuario } = useUsuarios();
  const { confirmar, avisar } = useConfirmacao();

  const [relatos, setRelatos] = useState<RelatoVeiculo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const podeResolver =
    usuario.perfil === "master" || usuario.perfil === "gestor";
  const podeExcluir = usuario.perfil === "master";

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      setRelatos(await listarRelatos(veiculoId));
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }, [veiculoId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function relatar() {
    const d = texto.trim();
    if (!d) return;
    setEnviando(true);
    try {
      await criarRelato(veiculoId, usuario.id, d);
      // Aviso no sino (fire-and-forget; nunca quebra o relato).
      avisarDefeito(veiculoId, d).catch(() => {});
      setTexto("");
      await recarregar();
    } catch (e) {
      await avisar({
        titulo: "Não foi possível relatar",
        mensagem: "Verifique a conexão e tente de novo.",
      });
      console.error(e);
    } finally {
      setEnviando(false);
    }
  }

  async function alternarResolvido(r: RelatoVeiculo) {
    try {
      await resolverRelato(r.id, !r.resolvido, usuario.id);
      await recarregar();
    } catch (e) {
      await avisar({ titulo: "Falha", mensagem: String(e) });
    }
  }

  async function excluir(r: RelatoVeiculo) {
    const ok = await confirmar({
      titulo: "Excluir este relato?",
      mensagem: "Some do histórico do veículo. Ação irreversível.",
      destrutivo: true,
      rotuloOk: "Excluir",
    });
    if (!ok) return;
    try {
      await removerRelato(r.id);
      await recarregar();
    } catch (e) {
      await avisar({ titulo: "Falha", mensagem: String(e) });
    }
  }

  const abertos = relatos.filter((r) => !r.resolvido).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Wrench className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Ocorrências / Defeitos</span>
        {abertos > 0 && (
          <Badge
            variant="secondary"
            className="text-[11px] bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
          >
            {abertos} em aberto
          </Badge>
        )}
      </div>

      {/* Relatar (qualquer usuário) */}
      <div className="space-y-1.5">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={2}
          placeholder="Relatar um defeito (ex.: freio fazendo barulho, ar não gela)…"
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={relatar}
            disabled={enviando || !texto.trim()}
          >
            {enviando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Relatar defeito
          </Button>
        </div>
      </div>

      {/* Histórico */}
      {carregando ? (
        <p className="text-xs text-muted-foreground">Carregando…</p>
      ) : relatos.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">
          Nenhum defeito relatado.
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-56 overflow-y-auto">
          {relatos.map((r) => {
            const autor = r.autorId ? buscarUsuario(r.autorId) : null;
            return (
              <li
                key={r.id}
                className={cn(
                  "rounded-md border p-2.5 text-sm",
                  r.resolvido ? "bg-muted/30" : "bg-amber-50/60 dark:bg-amber-500/5",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={cn(
                      "flex-1 whitespace-pre-wrap break-words",
                      r.resolvido && "text-muted-foreground line-through",
                    )}
                  >
                    {r.descricao}
                  </p>
                  {r.resolvido ? (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      Resolvido
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-[10px] shrink-0 bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                    >
                      Aberto
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {autor?.nome ?? "—"} · {fmt(r.criadoEm)}
                    {r.resolvido && r.resolvidoEm
                      ? ` · resolvido ${fmt(r.resolvidoEm)}`
                      : ""}
                  </span>
                  {(podeResolver || podeExcluir) && (
                    <span className="flex items-center gap-1 shrink-0">
                      {podeResolver && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => alternarResolvido(r)}
                        >
                          {r.resolvido ? (
                            <>
                              <RotateCcw className="size-3.5" /> Reabrir
                            </>
                          ) : (
                            <>
                              <Check className="size-3.5" /> Resolver
                            </>
                          )}
                        </Button>
                      )}
                      {podeExcluir && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={() => excluir(r)}
                          aria-label="Excluir"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
