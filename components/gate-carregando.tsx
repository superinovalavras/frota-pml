"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { usePerfil } from "@/lib/perfil-context";
import { useUsuarios } from "@/lib/store/usuarios-context";
import { useVeiculos } from "@/lib/store/veiculos-context";
import { useBranding } from "@/lib/store/branding-context";

/**
 * Segura a renderização do painel até a sessão e os dados essenciais
 * estarem prontos. Sem isso, logo após o login a tela aparece "incompleta"
 * por ~1s (menu com o perfil-fallback e contadores zerados) enquanto os
 * fetches resolvem — era o BUG da "agenda vazia que só o F5 resolvia".
 */
export function GateCarregando({ children }: { children: ReactNode }) {
  const { logado } = usePerfil();
  const { carregando: usuariosCarregando } = useUsuarios();
  const { carregando: veiculosCarregando } = useVeiculos();
  const { logoUrl } = useBranding();

  const pronto = logado && !usuariosCarregando && !veiculosCarregando;

  if (!pronto) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4 bg-background">
        {logoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={logoUrl}
            alt="Logo"
            className="size-20 rounded-full object-cover ring-1 ring-border shadow"
          />
        ) : (
          <Image
            src="/marca/escudo-azul.png"
            alt="Prefeitura de Lavras"
            width={72}
            height={72}
            priority
            className="opacity-90"
          />
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Carregando o sistema…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
