"use client";

import { useRouter } from "next/navigation";
import { BadgeCheck, LogOut, Menu, User as UserIcon } from "lucide-react";
import { usePerfil } from "@/lib/perfil-context";
import { SeletorPerfil } from "@/components/seletor-perfil";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { temCnhValida } from "@/lib/agendamento-utils";
import { useSidebarMobile } from "@/components/sidebar";

export function Topbar() {
  const { usuario, funcao, secretaria, superintendencia, sair } = usePerfil();
  const router = useRouter();
  const { abrir: abrirSidebar } = useSidebarMobile();
  const iniciais = (usuario.nome || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("");
  const habilitado = !!usuario.cnhCategoria && temCnhValida(usuario);

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 md:px-6">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={abrirSidebar}
          aria-label="Abrir menu de navegação"
        >
          <Menu className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <SeletorPerfil />
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-3 rounded-md px-2 py-1 -mx-2 hover:bg-muted/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Menu do usuário"
          >
            <div className="hidden sm:flex flex-col items-end gap-0.5">
              {secretaria.sigla && (
                <Badge variant="secondary" className="text-[10px]">
                  {secretaria.sigla}
                </Badge>
              )}
              {superintendencia && (
                <span className="text-[10px] text-muted-foreground">
                  {superintendencia.sigla}
                </span>
              )}
            </div>
            <div className="hidden md:flex flex-col items-end leading-tight max-w-[200px]">
              <span className="text-sm font-medium flex items-center gap-1 truncate w-full justify-end">
                <span className="truncate">{usuario.nome}</span>
                {habilitado && (
                  <BadgeCheck
                    className="size-4 text-primary shrink-0"
                    aria-label={`Habilitado · CNH ${usuario.cnhCategoria}`}
                  />
                )}
              </span>
              <span className="text-xs text-muted-foreground truncate w-full text-right">
                {funcao?.nome ?? "—"}
                {usuario.cargo ? ` · ${usuario.cargo}` : ""}
              </span>
            </div>
            <Avatar className="size-9">
              {usuario.fotoUrl && (
                <AvatarImage src={usuario.fotoUrl} alt={usuario.nome} />
              )}
              <AvatarFallback className="bg-primary text-primary-foreground">
                {iniciais.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate">
                {usuario.nome}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {funcao?.nome ?? "—"}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/perfil")}>
            <UserIcon className="size-4" />
            Meu perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void sair()}>
            <LogOut className="size-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
