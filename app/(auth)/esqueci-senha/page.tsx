"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, MailCheck, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBranding } from "@/lib/store/branding-context";
import { enviarLinkRecuperacao, type EstadoRecuperacao } from "./actions";

/** useSearchParams exige Suspense (Next 16) — daí o wrapper abaixo. */
export default function EsqueciSenhaPage() {
  return (
    <Suspense>
      <Conteudo />
    </Suspense>
  );
}

function Conteudo() {
  const { logoUrl } = useBranding();
  const [estado, acao, enviando] = useActionState<EstadoRecuperacao, FormData>(
    enviarLinkRecuperacao,
    null,
  );
  const enviado = estado && "ok" in estado ? estado : null;
  // /auth/confirm manda "?erro=link" quando o token já era.
  const linkInvalido = useSearchParams().get("erro") === "link" && !estado;
  const erro =
    estado && "erro" in estado
      ? estado.erro
      : linkInvalido
        ? "Seu link expirou ou já tinha sido usado. Peça um novo abaixo."
        : null;

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

          <div className="bg-pml-blue text-white px-6 pt-8 pb-6 text-center">
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt="Logo"
                className="mx-auto size-28 object-cover rounded-full bg-white shadow-lg"
              />
            ) : (
              <Image
                src="/marca/pml-branca.png"
                alt="Governo de Lavras"
                width={280}
                height={340}
                className="mx-auto h-28 w-auto"
                priority
              />
            )}
          </div>

          {enviado ? (
            <CardContent className="px-6 py-8 text-center space-y-3">
              <MailCheck className="size-12 mx-auto text-primary" />
              <h1 className="text-xl font-bold">Link enviado!</h1>
              <p className="text-sm text-muted-foreground">
                Enviamos um link para{" "}
                <strong className="text-foreground">
                  {enviado.emailMascarado}
                </strong>
                . Abra seu e-mail e clique nele para criar a senha nova.
              </p>
              <p className="text-xs text-muted-foreground">
                O link vale por 1 hora e só pode ser usado uma vez. Não achou?
                Veja no spam ou na caixa de lixo eletrônico.
              </p>
              <Button asChild variant="outline" className="w-full mt-2">
                <Link href="/login">
                  <ArrowLeft className="size-4" />
                  Voltar ao login
                </Link>
              </Button>
            </CardContent>
          ) : (
            <>
              <CardContent className="px-6 pt-6 pb-2 text-center">
                <h1 className="text-2xl font-black tracking-tight">
                  Esqueci minha senha
                </h1>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Vamos mandar um link de recuperação para o e-mail do seu
                  cadastro.
                </p>
              </CardContent>

              <form action={acao} className="px-6 pt-4 pb-8 space-y-4">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="identificador">
                    Usuário, CPF, MASP ou e-mail
                  </Label>
                  <Input
                    id="identificador"
                    name="identificador"
                    autoComplete="username"
                    required
                    autoFocus
                    placeholder="Ex.: joao.silva"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Serve só para acharmos seu cadastro — o link vai para o
                    e-mail registrado nele.
                  </p>
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
                  disabled={enviando}
                >
                  <Send className="size-4" />
                  {enviando ? "Enviando…" : "Enviar link de recuperação"}
                </Button>

                <Button asChild variant="ghost" className="w-full">
                  <Link href="/login">
                    <ArrowLeft className="size-4" />
                    Voltar ao login
                  </Link>
                </Button>
              </form>
            </>
          )}
        </Card>

        <p className="text-center text-[11px] text-muted-foreground/70 mt-6">
          Sem acesso ao seu e-mail? Peça a um Master para resetar sua senha.
        </p>
      </div>
    </div>
  );
}
