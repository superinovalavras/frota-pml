"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { usePerfil } from "@/lib/perfil-context";
import { navItems } from "@/lib/navigation";

/**
 * Bloqueia rotas que não são permitidas para o perfil atual.
 * Mostra um card de aviso e redireciona para /agenda após um beat.
 * A sidebar já esconde os links — isto previne acesso por URL direta.
 */
export function GuardaRota({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario } = usePerfil();

  // Acha o nav item que corresponde ao path atual (prefix-match)
  const item = navItems.find(
    (n) => pathname === n.href || pathname.startsWith(`${n.href}/`),
  );

  // Rotas fora do nav (ex.: /perfil) ficam liberadas.
  const permitido = !item || item.perfis.includes(usuario.perfil);

  useEffect(() => {
    if (!permitido) {
      const t = setTimeout(() => router.replace("/agenda"), 1200);
      return () => clearTimeout(t);
    }
  }, [permitido, router]);

  if (!permitido) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center gap-4 py-10">
            <ShieldAlert className="size-8 text-destructive shrink-0" />
            <div>
              <p className="font-medium">Acesso restrito</p>
              <p className="text-sm text-muted-foreground">
                Esta área não está disponível para o perfil{" "}
                <strong>{usuario.perfil}</strong>. Redirecionando para a
                Agenda…
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
