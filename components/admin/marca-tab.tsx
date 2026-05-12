"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, Upload, RotateCcw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBranding } from "@/lib/store/branding-context";
import { useConfirmacao } from "@/components/confirmacao-provider";
import { lerArquivoComoDataUrl } from "@/lib/imagem";
import { RecortadorFoto } from "@/components/recortador-foto";

export function MarcaTab() {
  const { logoUrl, setLogo } = useBranding();
  const { confirmar } = useConfirmacao();
  const inputRef = useRef<HTMLInputElement>(null);
  const [carregando, setCarregando] = useState(false);
  const [imagemParaRecortar, setImagemParaRecortar] = useState<string | null>(
    null,
  );
  const [erro, setErro] = useState<string | null>(null);

  async function aoSelecionar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCarregando(true);
    setErro(null);
    try {
      const dataUrl = await lerArquivoComoDataUrl(file);
      setImagemParaRecortar(dataUrl);
    } catch (err) {
      console.error(err);
      setErro("Não foi possível ler a imagem. Tente um arquivo PNG ou JPG.");
    } finally {
      setCarregando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function aoRestaurar() {
    const ok = await confirmar({
      titulo: "Restaurar a logo padrão?",
      mensagem: "A logo personalizada será removida e o sistema voltará a usar o escudo da Prefeitura de Lavras.",
      rotuloOk: "Restaurar",
    });
    if (ok) setLogo(null);
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Identidade visual</h2>
        <p className="text-sm text-muted-foreground">
          Substitua a logo exibida no sistema. Aparece no cabeçalho do menu
          lateral e na tela de login. Apenas o perfil Master pode alterar.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          {/* Preview */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Logo atual
            </p>
            <div className="flex items-center gap-4">
              <div className="size-24 rounded-xl bg-white ring-1 ring-border flex items-center justify-center p-2 shrink-0">
                {logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={logoUrl}
                    alt="Logo personalizada"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src="/marca/escudo-azul.png"
                    alt="Escudo da Prefeitura de Lavras (padrão)"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
              <div className="text-sm">
                {logoUrl ? (
                  <span className="text-foreground font-medium">
                    Logo personalizada ativa
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Usando a logo padrão (escudo da Prefeitura)
                  </span>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Recomendado: imagem quadrada, fundo transparente (PNG),
                  com boa nitidez. Será redimensionada automaticamente.
                </p>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={aoSelecionar}
            />
            <Button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={carregando}
            >
              {carregando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {logoUrl ? "Trocar logo" : "Enviar logo"}
            </Button>
            {logoUrl && (
              <Button
                type="button"
                variant="outline"
                onClick={aoRestaurar}
                disabled={carregando}
              >
                <RotateCcw className="size-4" />
                Restaurar padrão
              </Button>
            )}
          </div>

          {erro && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <ImageIcon className="size-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-destructive">{erro}</p>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Info className="size-4 shrink-0 mt-0.5" />
            <p>
              A logo é salva no servidor e compartilhada para todos os
              dispositivos. O arquivo enviado é recortado e otimizado
              automaticamente antes de subir.
            </p>
          </div>
        </CardContent>
      </Card>

      <RecortadorFoto
        imagemSrc={imagemParaRecortar}
        aspecto={1}
        maxLado={512}
        titulo="Enquadrar a logo"
        enviarPara="marca"
        onConfirmar={(url) => {
          setLogo(url);
          setImagemParaRecortar(null);
        }}
        onCancelar={() => setImagemParaRecortar(null)}
      />
    </div>
  );
}
