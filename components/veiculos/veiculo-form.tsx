"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, Loader2, Trash2, Wrench, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useVeiculos } from "@/lib/store/veiculos-context";
import { lerArquivoComoDataUrl } from "@/lib/imagem";
import { usePerfil } from "@/lib/perfil-context";
import { RecortadorFoto } from "@/components/recortador-foto";
import { ManutencaoForm } from "./manutencao-form";
import { buscarManutencaoAtiva } from "@/lib/data/manutencoes";
import type { Manutencao, Veiculo } from "@/lib/mock/types";

interface Props {
  veiculo: Veiculo | null;
  modo: "criar" | "editar" | null;
  onClose: () => void;
}

export function VeiculoForm({ veiculo, modo, onClose }: Props) {
  const aberto = modo !== null;
  const { salvar, remover, veiculos } = useVeiculos();
  const { secretaria, usuario } = usePerfil();
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const podeGerenciarManutencao =
    modo === "editar" &&
    !!veiculo &&
    (usuario.perfil === "master" ||
      (usuario.perfil === "gestor" && veiculo.secretariaId === usuario.secretariaId));

  const [nome, setNome] = useState("");
  const [placa, setPlaca] = useState("");
  const [lugares, setLugares] = useState("5");
  const [observacoes, setObservacoes] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | undefined>(undefined);
  const [carregandoFoto, setCarregandoFoto] = useState(false);
  const [imagemParaRecortar, setImagemParaRecortar] = useState<string | null>(
    null,
  );
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [manutAberta, setManutAberta] = useState(false);
  const [manutAtiva, setManutAtiva] = useState<Manutencao | null>(null);

  // Resetar campos ao abrir
  useEffect(() => {
    if (!aberto) return;
    if (modo === "editar" && veiculo) {
      const nomeCompleto = [veiculo.marca, veiculo.modelo]
        .filter(Boolean)
        .join(" ");
      setNome(nomeCompleto || veiculo.modelo);
      setPlaca(veiculo.placa);
      setLugares(String(veiculo.lugares ?? 5));
      setObservacoes(veiculo.observacoes ?? "");
      setFotoUrl(veiculo.fotoUrl);
    } else {
      setNome("");
      setPlaca("");
      setLugares("5");
      setObservacoes("");
      setFotoUrl(undefined);
    }
    setImagemParaRecortar(null);
    setConfirmarExclusao(false);
    setErro(null);
    setManutAberta(false);
    setManutAtiva(null);
  }, [aberto, modo, veiculo]);

  // Busca a manutenção ativa quando o veículo está marcado como "manutencao"
  useEffect(() => {
    if (!aberto || modo !== "editar" || !veiculo) return;
    if (veiculo.status !== "manutencao") {
      setManutAtiva(null);
      return;
    }
    let vivo = true;
    buscarManutencaoAtiva(veiculo.id)
      .then((m) => {
        if (vivo) setManutAtiva(m);
      })
      .catch((e) => console.error("Falha ao buscar manutenção ativa", e));
    return () => {
      vivo = false;
    };
  }, [aberto, modo, veiculo]);

  async function aoSelecionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCarregandoFoto(true);
    setErro(null);
    try {
      const dataUrl = await lerArquivoComoDataUrl(file);
      setImagemParaRecortar(dataUrl);
    } catch (err) {
      console.error(err);
      setErro("Não foi possível ler a imagem.");
    } finally {
      setCarregandoFoto(false);
      if (inputFotoRef.current) inputFotoRef.current.value = "";
    }
  }

  function aoSalvar() {
    setErro(null);
    const nomeLimpo = nome.trim();
    const placaLimpa = placa.trim().toUpperCase();
    if (!nomeLimpo) {
      setErro("Informe o nome do veículo.");
      return;
    }
    if (!placaLimpa) {
      setErro("Informe a placa.");
      return;
    }
    // Aceita Mercosul (ABC1D23) ou antigo (ABC1234) — só validação leve.
    if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placaLimpa.replace(/[\s-]/g, ""))) {
      setErro(`Placa "${placaLimpa}" não parece estar em formato válido.`);
      return;
    }
    const placaDuplicada = veiculos.find(
      (v) => v.id !== veiculo?.id && v.placa.toUpperCase() === placaLimpa,
    );
    if (placaDuplicada) {
      setErro(`Já existe um veículo com a placa "${placaLimpa}".`);
      return;
    }

    const base: Veiculo =
      modo === "editar" && veiculo
        ? { ...veiculo }
        : {
            id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            placa: "",
            modelo: "",
            marca: "",
            ano: new Date().getFullYear(),
            cor: "—",
            cnhExigida: "B",
            secretariaId: secretaria.id,
            superintendenciaId: null,
            status: "disponivel",
            kmAtual: 0,
          };

    // Form usa "nome" como campo único (marca+modelo combinados). Para evitar
    // duplicação no display ("Fiat Fiat Mobi") zeramos marca e gravamos tudo em modelo.
    base.modelo = nomeLimpo;
    base.marca = "";
    base.placa = placaLimpa;
    base.lugares = Math.min(60, Math.max(1, Math.round(Number(lugares) || 5)));
    base.observacoes = observacoes.trim() || undefined;
    base.fotoUrl = fotoUrl;

    salvar(base);
    onClose();
  }

  function aoExcluir() {
    if (modo !== "editar" || !veiculo) return;
    remover(veiculo.id);
    onClose();
  }

  return (
    <>
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {modo === "criar" ? "Novo veículo" : "Editar veículo"}
          </DialogTitle>
          <DialogDescription>
            Cadastro simplificado da Fase 1 — outros campos serão adicionados
            adiante.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Foto */}
          <div className="space-y-2">
            <Label>Foto</Label>
            <div className="relative aspect-video w-full rounded-md border bg-muted/30 overflow-hidden flex items-center justify-center">
              {fotoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={fotoUrl}
                  alt="Foto do veículo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Camera className="size-8" />
                  <span className="text-xs">Nenhuma foto</span>
                </div>
              )}
              {carregandoFoto && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              )}
              {fotoUrl && !carregandoFoto && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 size-7"
                  onClick={() => setFotoUrl(undefined)}
                  aria-label="Remover foto"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
            <input
              ref={inputFotoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={aoSelecionarFoto}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => inputFotoRef.current?.click()}
              disabled={carregandoFoto}
            >
              <Camera className="size-4" />
              {fotoUrl ? "Trocar foto" : "Adicionar foto"}
            </Button>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="vf-nome">Nome do veículo</Label>
            <Input
              id="vf-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Fiat Mobi"
              autoFocus
            />
          </div>

          {/* Placa + lugares */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="vf-placa">Placa</Label>
              <Input
                id="vf-placa"
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                placeholder="Ex.: PYT-6155"
                maxLength={10}
                className="uppercase tracking-wide"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vf-lugares">Lugares</Label>
              <Input
                id="vf-lugares"
                type="number"
                inputMode="numeric"
                min={1}
                max={60}
                value={lugares}
                onChange={(e) => setLugares(e.target.value)}
                placeholder="5"
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="vf-obs">Observações</Label>
            <Textarea
              id="vf-obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Particularidades, restrições, lembretes…"
              rows={3}
            />
          </div>

          {erro && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-destructive">{erro}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row sm:justify-between gap-2">
          {modo === "editar" ? (
            confirmarExclusao ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={aoExcluir}
                >
                  Confirmar exclusão
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmarExclusao(false)}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmarExclusao(true)}
                >
                  <Trash2 className="size-4" />
                  Excluir
                </Button>
                {podeGerenciarManutencao && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setManutAberta(true)}
                  >
                    <Wrench className="size-4" />
                    {veiculo?.status === "manutencao"
                      ? "Encerrar manutenção"
                      : "Manutenção"}
                  </Button>
                )}
              </div>
            )
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={aoSalvar}>
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <RecortadorFoto
      imagemSrc={imagemParaRecortar}
      aspecto={16 / 9}
      maxLado={1280}
      titulo="Enquadrar foto do veículo"
      enviarPara="veiculos"
      onConfirmar={(url) => {
        setFotoUrl(url);
        setImagemParaRecortar(null);
      }}
      onCancelar={() => setImagemParaRecortar(null)}
    />

    {modo === "editar" && veiculo && (
      <ManutencaoForm
        veiculo={veiculo}
        aberto={manutAberta}
        manutencaoAtiva={manutAtiva}
        onClose={() => setManutAberta(false)}
        onSucesso={() => {
          setManutAberta(false);
          setManutAtiva(null);
          onClose();
        }}
      />
    )}
    </>
  );
}
