"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, LogIn } from "lucide-react";
import { useBranding } from "@/lib/store/branding-context";
import { RECUPERACAO_SENHA_EMAIL_ATIVA } from "@/lib/flags";
import { entrar, type EstadoLogin } from "./actions";

export default function LoginPage() {
  const { logoUrl } = useBranding();
  const [estado, acao, enviando] = useActionState<EstadoLogin, FormData>(
    entrar,
    null,
  );
  const sucesso = !!(estado && "ok" in estado);
  const erro = estado && "erro" in estado ? estado.erro : null;

  // Login OK → navegação COMPLETA (recarrega a página). Necessário para os
  // providers do layout raiz remontarem e buscarem os dados já com a sessão
  // (antes do login a RLS devolve tudo vazio — era a causa da "primeira
  // visão incompleta" que só se resolvia com F5).
  useEffect(() => {
    if (sucesso) window.location.assign("/agenda");
  }, [sucesso]);

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
                className="mx-auto size-40 object-cover rounded-full bg-white shadow-lg"
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
              <Label htmlFor="identificador">Usuário, CPF, MASP ou e-mail</Label>
              <Input
                id="identificador"
                name="identificador"
                autoComplete="username"
                required
                placeholder="Ex.: joao.silva"
              />
              <p className="text-[11px] text-muted-foreground">
                Você pode usar só o <strong>usuário</strong> — a parte do seu
                e-mail antes do <strong>@</strong>.
              </p>
            </div>
            <div className="space-y-1.5 text-left">
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor="senha">Senha</Label>
                {RECUPERACAO_SENHA_EMAIL_ATIVA && (
                  <Link
                    href="/esqueci-senha"
                    className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                )}
              </div>
              <Input
                id="senha"
                name="senha"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>

            {erro && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-sm text-destructive">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>{erro}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={enviando || sucesso}
            >
              <LogIn className="size-4" />
              {enviando || sucesso ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground/70 mt-6">
          v0.1.0 · Trabalho e amor por Lavras
        </p>
      </div>
    </div>
  );
}
