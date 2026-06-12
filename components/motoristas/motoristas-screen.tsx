"use client";

import { useMemo, useState } from "react";
import { Car, IdCard, Phone, Mail, Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUsuarios } from "@/lib/store/usuarios-context";
import { useOrgaos } from "@/lib/store/orgaos-context";
import { usePerfil } from "@/lib/perfil-context";
import { formatDataIsoBr, formatTelefone } from "@/lib/formatters";
import { temCnhValida } from "@/lib/agendamento-utils";
import { UsuarioForm } from "@/components/admin/usuario-form";
import { FUNCAO_MOTORISTA_ID } from "@/lib/mock/funcoes";

export function MotoristasScreen() {
  const { motoristasDisponiveis } = useUsuarios();
  const { buscarPorId: buscarOrgao } = useOrgaos();
  const { usuario: usuarioAtual } = usePerfil();
  const [criando, setCriando] = useState(false);
  const ehMaster = usuarioAtual.perfil === "master";

  const ordenados = useMemo(
    () =>
      motoristasDisponiveis
        .slice()
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [motoristasDisponiveis],
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Motoristas</h1>
          <p className="text-sm text-muted-foreground">
            Quem pode dirigir: usuários com a função Motorista ou qualquer
            servidor com CNH válida cadastrada.
          </p>
        </div>
        {ehMaster && (
          <Button onClick={() => setCriando(true)}>
            <Plus className="size-4" />
            Novo motorista
          </Button>
        )}
      </div>

      {ordenados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <IdCard className="size-12 text-muted-foreground" />
            <div>
              <p className="font-medium">Nenhum motorista cadastrado</p>
              <p className="text-sm text-muted-foreground">
                Cadastre usuários com a função “Motorista” na área de
                Administração.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ordenados.map((m) => {
            const orgao = buscarOrgao(m.secretariaId);
            const iniciais = m.nome
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((n) => n[0])
              .join("")
              .toUpperCase();
            const cnhVencida = !!m.cnhCategoria && !temCnhValida(m);
            return (
              <Card key={m.id} className="p-0 overflow-hidden">
                <div className="bg-gradient-to-br from-primary/10 via-accent/40 to-secondary/40 p-4 flex items-center gap-3">
                  <Avatar className="size-12 ring-2 ring-background">
                    {m.fotoUrl && (
                      <AvatarImage src={m.fotoUrl} alt={m.nome} />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {iniciais || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-tight truncate">
                      {m.nome}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {m.cargo || "Motorista"}
                    </p>
                  </div>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  {m.cnhCategoria ? (
                    <div className="flex items-center gap-2">
                      <Car className="size-4 text-muted-foreground" />
                      <Badge variant="secondary" className="font-mono">
                        CNH {m.cnhCategoria}
                      </Badge>
                      {m.cnhValidade && (
                        <span
                          className={
                            cnhVencida
                              ? "text-xs text-destructive font-medium"
                              : "text-xs text-muted-foreground"
                          }
                        >
                          {cnhVencida ? "vencida " : "vence "}
                          {formatDataIsoBr(m.cnhValidade)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-destructive">Sem CNH cadastrada</p>
                  )}
                  {orgao && (
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Building2 className="size-3.5" />
                      {orgao.sigla}
                    </p>
                  )}
                  {m.telefone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Phone className="size-3.5" />
                      {formatTelefone(m.telefone)}
                    </p>
                  )}
                  {m.email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-2 truncate">
                      <Mail className="size-3.5 shrink-0" />
                      <span className="truncate">{m.email}</span>
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cadastro de motorista = cadastro de usuário (mesma base) com a
          função Motorista pré-selecionada. */}
      <UsuarioForm
        aberto={criando}
        usuario={null}
        funcaoInicialId={FUNCAO_MOTORISTA_ID}
        onClose={() => setCriando(false)}
      />
    </div>
  );
}
