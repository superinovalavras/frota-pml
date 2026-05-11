"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import { ZoomIn, ZoomOut, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { recortarImagem } from "@/lib/imagem";

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  /** Data URL ou URL da imagem original. null/undefined = diálogo fechado. */
  imagemSrc: string | null;
  /** Proporção largura/altura do recorte (ex.: 16/9 para carros, 1 para avatar). */
  aspecto: number;
  /** Limite do lado maior da imagem resultante (px). */
  maxLado?: number;
  titulo?: string;
  /** Forma da máscara de recorte. */
  formato?: "rect" | "round";
  onConfirmar: (dataUrl: string) => void;
  onCancelar: () => void;
}

export function RecortadorFoto({
  imagemSrc,
  aspecto,
  maxLado = 1000,
  titulo = "Enquadrar foto",
  formato = "rect",
  onConfirmar,
  onCancelar,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [processando, setProcessando] = useState(false);

  // Reset quando uma imagem nova entra
  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAreaPixels(null);
  }, [imagemSrc]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setAreaPixels(pixels);
  }, []);

  async function confirmar() {
    if (!imagemSrc || !areaPixels) return;
    setProcessando(true);
    try {
      const dataUrl = await recortarImagem(imagemSrc, areaPixels, maxLado);
      onConfirmar(dataUrl);
    } catch (e) {
      console.error("Falha ao recortar imagem", e);
      onCancelar();
    } finally {
      setProcessando(false);
    }
  }

  return (
    <Dialog open={!!imagemSrc} onOpenChange={(o) => !o && onCancelar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            Arraste a imagem para posicionar e use o controle de zoom. A área
            dentro da moldura é o que será salvo.
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full h-80 bg-zinc-900 rounded-md overflow-hidden">
          {imagemSrc && (
            <Cropper
              image={imagemSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspecto}
              cropShape={formato === "round" ? "round" : "rect"}
              objectFit="cover"
              showGrid={false}
              restrictPosition
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="flex items-center gap-3 px-1">
          <ZoomOut className="size-4 text-muted-foreground shrink-0" />
          <input
            type="range"
            min={1}
            max={4}
            step={0.02}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-primary"
            aria-label="Zoom"
          />
          <ZoomIn className="size-4 text-muted-foreground shrink-0" />
        </div>

        <DialogFooter className="flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancelar}
            disabled={processando}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={confirmar}
            disabled={processando || !areaPixels}
          >
            {processando && <Loader2 className="size-4 animate-spin" />}
            Usar este enquadramento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
