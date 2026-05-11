"use client";

import { useState } from "react";
import { Plus, X, User, UserPlus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsuarios } from "@/lib/store/usuarios-context";
import { useOrgaos } from "@/lib/store/orgaos-context";
import type { Passageiro } from "@/lib/mock/types";

interface Props {
  passageiros: Passageiro[];
  setPassageiros: (p: Passageiro[]) => void;
  /** IDs de usuários a esconder do dropdown (ex.: solicitante, motorista) */
  excluirIds: string[];
}

const PLACEHOLDER = "_placeholder";

export function PassageirosSection({
  passageiros,
  setPassageiros,
  excluirIds,
}: Props) {
  const { usuarios, buscarPorId: buscarUsuario } = useUsuarios();
  const { buscarPorId: buscarOrgao } = useOrgaos();

  const [convidadoAberto, setConvidadoAberto] = useState(false);
  const [convidadoNome, setConvidadoNome] = useState("");
  const [convidadoMotivo, setConvidadoMotivo] = useState("");

  const idsAdicionados = new Set(
    passageiros
      .filter((p) => p.tipo === "usuario")
      .map((p) => (p.tipo === "usuario" ? p.usuarioId : "")),
  );
  const disponiveis = usuarios
    .filter((u) => !idsAdicionados.has(u.id) && !excluirIds.includes(u.id))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  function adicionarUsuario(id: string) {
    if (id === PLACEHOLDER) return;
    setPassageiros([...passageiros, { tipo: "usuario", usuarioId: id }]);
  }

  function adicionarConvidado() {
    const nome = convidadoNome.trim();
    if (!nome) return;
    setPassageiros([
      ...passageiros,
      {
        tipo: "convidado",
        nome,
        motivo: convidadoMotivo.trim() || undefined,
      },
    ]);
    setConvidadoNome("");
    setConvidadoMotivo("");
    setConvidadoAberto(false);
  }

  function remover(idx: number) {
    setPassageiros(passageiros.filter((_, i) => i !== idx));
  }

  const totalUsuarios = passageiros.filter((p) => p.tipo === "usuario").length;
  const totalConvidados = passageiros.filter(
    (p) => p.tipo === "convidado",
  ).length;

  return (
    <div className="md:col-span-2 space-y-3 rounded-md border p-3 bg-muted/20">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <Label className="text-sm">Passageiros da viagem</Label>
          <p className="text-xs text-muted-foreground">
            {passageiros.length === 0
              ? "Ninguém adicionado ainda."
              : `${passageiros.length} passageiro${passageiros.length === 1 ? "" : "s"}` +
                (totalConvidados > 0
                  ? ` (${totalUsuarios} do sistema, ${totalConvidados} convidado${totalConvidados === 1 ? "" : "s"})`
                  : "")}
          </p>
        </div>
        {totalUsuarios > 0 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Mail className="size-3" />
            Notificação por email após integração
          </p>
        )}
      </div>

      {passageiros.length > 0 && (
        <ul className="space-y-1.5">
          {passageiros.map((p, idx) => {
            if (p.tipo === "usuario") {
              const u = buscarUsuario(p.usuarioId);
              const orgao = u ? buscarOrgao(u.secretariaId) : null;
              const iniciais = (u?.nome || "?")
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0])
                .join("")
                .toUpperCase();
              return (
                <li
                  key={`u-${idx}`}
                  className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5 border"
                >
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">
                      {iniciais}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {u?.nome ?? "Usuário removido"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {u?.cargo || u?.email || "—"}
                      {orgao ? ` · ${orgao.sigla}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => remover(idx)}
                    aria-label="Remover"
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              );
            }
            return (
              <li
                key={`c-${idx}`}
                className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5 border border-dashed"
              >
                <div className="size-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
                  <UserPlus className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate flex items-center gap-2">
                    {p.nome}
                    <Badge variant="outline" className="text-[10px]">
                      Convidado
                    </Badge>
                  </p>
                  {p.motivo && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {p.motivo}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => remover(idx)}
                  aria-label="Remover"
                >
                  <X className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs text-muted-foreground">
            Adicionar do sistema
          </Label>
          <Select
            value={PLACEHOLDER}
            onValueChange={adicionarUsuario}
            disabled={disponiveis.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  disponiveis.length === 0
                    ? "Todos já adicionados"
                    : "Buscar pessoa..."
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PLACEHOLDER} disabled>
                Selecionar para adicionar
              </SelectItem>
              {disponiveis.map((u) => {
                const orgao = buscarOrgao(u.secretariaId);
                return (
                  <SelectItem key={u.id} value={u.id}>
                    <span className="flex items-center gap-2">
                      <User className="size-3.5 text-muted-foreground" />
                      <span className="flex flex-col items-start">
                        <span className="text-sm">{u.nome}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {u.cargo || "—"}
                          {orgao ? ` · ${orgao.sigla}` : ""}
                        </span>
                      </span>
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setConvidadoAberto((v) => !v)}
        >
          <Plus className="size-4" />
          Convidado externo
        </Button>
      </div>

      {convidadoAberto && (
        <div className="rounded-md border bg-background p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Pessoa de fora do sistema (visitante, fornecedor, etc.). Não receberá
            email.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label htmlFor="conv-nome" className="text-xs">
                Nome
              </Label>
              <Input
                id="conv-nome"
                value={convidadoNome}
                onChange={(e) => setConvidadoNome(e.target.value)}
                placeholder="Nome completo"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    adicionarConvidado();
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="conv-motivo" className="text-xs">
                Motivo / vínculo (opcional)
              </Label>
              <Input
                id="conv-motivo"
                value={convidadoMotivo}
                onChange={(e) => setConvidadoMotivo(e.target.value)}
                placeholder="Ex.: visita técnica, fiscalização externa"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConvidadoAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={adicionarConvidado}
              disabled={!convidadoNome.trim()}
            >
              Adicionar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
