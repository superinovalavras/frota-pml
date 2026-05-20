"use client";

import { useMemo, useState } from "react";
import {
  IdCard,
  Mail,
  Phone,
  Building2,
  BadgeCheck,
  Briefcase,
  Hash,
  AlertTriangle,
  Calendar,
  Car,
  Pencil,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { usePerfil } from "@/lib/perfil-context";
import { useAgendamentos } from "@/lib/store/agendamentos-context";
import { useVeiculos } from "@/lib/store/veiculos-context";
import { useSuperintendencias } from "@/lib/store/superintendencias-context";
import { EditarPerfilDialog } from "./editar-perfil-dialog";
import {
  formatHora,
  formatDataCurta,
  formatDataIsoBr,
  formatCpf,
  formatTelefone,
} from "@/lib/formatters";
import { temCnhValida } from "@/lib/agendamento-utils";
import { StatusBadge } from "@/components/agenda/status-badge";

export function PerfilScreen() {
  const { usuario, funcao, secretaria, logado } = usePerfil();
  const { agendamentos } = useAgendamentos();
  const { veiculos } = useVeiculos();
  const { buscarPorId: buscarSuperintendencia } = useSuperintendencias();
  const [editando, setEditando] = useState(false);

  const sup = usuario.superintendenciaId
    ? buscarSuperintendencia(usuario.superintendenciaId)
    : null;

  const minhas = useMemo(
    () =>
      agendamentos
        .filter(
          (a) =>
            a.solicitanteId === usuario.id || a.motoristaId === usuario.id,
        )
        .sort(
          (a, b) =>
            new Date(b.inicio).getTime() - new Date(a.inicio).getTime(),
        )
        .slice(0, 8),
    [agendamentos, usuario.id],
  );

  const iniciais = (usuario.nome || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const habilitado = !!usuario.cnhCategoria && temCnhValida(usuario);
  const cnhVencida = !!usuario.cnhCategoria && !temCnhValida(usuario);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Meu perfil</h1>
          <p className="text-sm text-muted-foreground">
            Suas informações de cadastro e habilitação na frota.
          </p>
        </div>
        {logado && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditando(true)}
          >
            <Pencil className="size-4" />
            Editar
          </Button>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/15 via-secondary/40 to-accent/40 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar className="size-20 ring-4 ring-background shadow">
            {usuario.fotoUrl && (
              <AvatarImage src={usuario.fotoUrl} alt={usuario.nome} />
            )}
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
              {iniciais}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold leading-tight">
              {usuario.nome}
            </h2>
            <p className="text-sm text-foreground/70">
              {usuario.cargo || "Cargo não informado"}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {funcao && (
                <Badge variant="secondary" className="gap-1">
                  <Briefcase className="size-3" />
                  {funcao.nome}
                </Badge>
              )}
              {habilitado && (
                <Badge className="gap-1 bg-primary text-primary-foreground hover:bg-primary">
                  <BadgeCheck className="size-3" />
                  Habilitado · CNH {usuario.cnhCategoria}
                </Badge>
              )}
              {cnhVencida && (
                <Badge variant="outline" className="gap-1 border-destructive/40 bg-destructive/5 text-destructive">
                  <AlertTriangle className="size-3" />
                  CNH vencida
                </Badge>
              )}
              {!usuario.cnhCategoria && (
                <Badge variant="outline" className="gap-1">
                  Sem CNH cadastrada
                </Badge>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <Info icon={Mail} label="Email institucional">
            {usuario.email || <Vazio />}
          </Info>
          <Info icon={Phone} label="Telefone">
            {usuario.telefone ? formatTelefone(usuario.telefone) : <Vazio />}
          </Info>
          <Info icon={Hash} label="CPF">
            {usuario.cpf ? formatCpf(usuario.cpf) : <Vazio />}
          </Info>
          <Info icon={Hash} label="MASP">
            {usuario.masp || <Vazio />}
          </Info>
          <Info icon={Building2} label="Órgão da prefeitura">
            {secretaria?.nome ?? <Vazio />}
            {secretaria?.sigla && (
              <span className="text-xs text-muted-foreground ml-1">
                ({secretaria.sigla})
              </span>
            )}
          </Info>
          <Info icon={Building2} label="Superintendência">
            {sup?.nome ?? <Vazio />}
          </Info>
        </CardContent>
      </Card>

      {/* Carteira de motorista */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={
                habilitado
                  ? "size-12 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0"
                  : "size-12 rounded-md bg-muted text-muted-foreground flex items-center justify-center shrink-0"
              }
            >
              <IdCard className="size-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">Carteira de motorista</h3>
                {habilitado && (
                  <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                    Habilitado a conduzir
                  </Badge>
                )}
                {cnhVencida && (
                  <Badge variant="outline" className="border-destructive/40 bg-destructive/5 text-destructive">
                    Vencida
                  </Badge>
                )}
              </div>
              {usuario.cnhCategoria ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <Info icon={IdCard} label="Categoria">
                    <Badge variant="secondary" className="font-mono text-base">
                      {usuario.cnhCategoria}
                    </Badge>
                  </Info>
                  <Info icon={Hash} label="Número">
                    {usuario.cnhNumero || <Vazio />}
                  </Info>
                  <Info icon={Calendar} label="Validade">
                    <span
                      className={
                        cnhVencida
                          ? "text-destructive font-medium"
                          : undefined
                      }
                    >
                      {formatDataIsoBr(usuario.cnhValidade)}
                    </span>
                  </Info>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  Você não tem CNH cadastrada. Sem carteira, é possível ter
                  conta no sistema, mas reservas de veículos exigem que você
                  designe um motorista.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Minhas reservas */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold">Minhas reservas (recentes)</h3>
            <span className="text-xs text-muted-foreground">
              Como solicitante ou motorista
            </span>
          </div>
          <Separator className="mb-4" />
          {minhas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma reserva encontrada.
            </p>
          ) : (
            <ul className="divide-y">
              {minhas.map((a) => {
                const v = veiculos.find((x) => x.id === a.veiculoId);
                return (
                  <li key={a.id} className="flex items-center gap-3 py-3">
                    <div className="flex flex-col items-center justify-center size-12 rounded-md bg-primary/5 text-primary shrink-0">
                      <span className="text-[10px] uppercase font-semibold">
                        {new Date(a.inicio)
                          .toLocaleDateString("pt-BR", { month: "short" })
                          .replace(".", "")}
                      </span>
                      <span className="text-sm font-bold leading-none">
                        {new Date(a.inicio).getDate().toString().padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">
                          {a.destino}
                        </span>
                        <StatusBadge status={a.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>
                          {formatDataCurta(new Date(a.inicio))} ·{" "}
                          {formatHora(a.inicio)}–{formatHora(a.fim)}
                        </span>
                        {v && (
                          <span className="flex items-center gap-1">
                            <Car className="size-3" />
                            {v.placa}
                          </span>
                        )}
                        <span className="text-muted-foreground/70">
                          {a.solicitanteId === usuario.id
                            ? "(solicitante)"
                            : "(motorista)"}
                        </span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <EditarPerfilDialog
        aberto={editando}
        usuario={usuario}
        onClose={() => setEditando(false)}
      />
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm break-words">{children}</div>
      </div>
    </div>
  );
}

function Vazio() {
  return <span className="text-muted-foreground/60 italic">não informado</span>;
}
