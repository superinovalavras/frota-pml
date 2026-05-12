"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ArrowRight, LogIn } from "lucide-react";
import { useBranding } from "@/lib/store/branding-context";
import { entrar, type EstadoLogin } from "./actions";

export default function LoginPage() {
  const { logoUrl } = useBranding();
  const [estado, acao, enviando] = useActionState<EstadoLogin, FormData>(
    entrar,
    null,
  );

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 pml-gradient-soft" />
      <div
        aria-hidden
        className="absolute -top-40 -left-32 size-96 rounded-full bg-pml-blue opacity-15 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -right-20 size-80 rounded-full bg-pml-yellow opacity-25 blur-3xl"
      />

      <div className="relative w-full max-w-md">
        <Card className="overflow-hidden p-0 shadow-2xl ring-1 ring-foreground/5">
          <div className="h-1.5 pml-faixa" />

          <div className="bg-pml-blue text-white px-6 pt-8 pb-6 text-center relative">
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt="Logo"
                className="mx-auto h-40 w-auto object-contain rounded-md bg-white/95 p-2"
              />
            ) : (
              <Image
                src="/marca/pml-branca.png"
                alt="Governo de Lavras — Trabalho e amor por Lavras"
                width={280}
                height={340}
                className="mx-auto h-40 w-auto"
                priority
              />
            )}
          </div>

          <CardContent className="px-6 pt-6 pb-2 text-center">
            <h1 className="text-3xl font-black tracking-tight">FROTA PML</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Sistema de Gestão da Frota Municipal
            </p>
          </CardContent>

          <form action={acao} className="px-6 pt-4 pb-8 space-y-4">
            <div className="space-y-1.5 text-left">
              <Label htmlFor="identificador">CPF, MASP ou e-mail</Label>
              <Input
                id="identificador"
                name="identificador"
                autoComplete="username"
                required
                placeholder="seu.email@lavras.mg.gov.br"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                name="senha"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>

            {estado?.erro && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-sm text-destructive">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>{estado.erro}</span>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={enviando}>
              <LogIn className="size-4" />
              {enviando ? "Entrando…" : "Entrar"}
            </Button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <span className="relative mx-auto block w-fit bg-card px-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                ou
              </span>
            </div>

            <Button asChild variant="outline" className="w-full" size="lg">
              <Link href="/agenda">
                Entrar em modo demonstração
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              No modo demonstração não há login: use o seletor no topo para
              alternar entre os perfis.
            </p>
          </form>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground/70 mt-6">
          v0.1.0 · Trabalho e amor por Lavras
        </p>
      </div>
    </div>
  );
}
