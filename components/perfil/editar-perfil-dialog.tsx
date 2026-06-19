"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, Camera, Loader2, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { RecortadorFoto } from "@/components/recortador-foto";
import { CATEGORIAS_CNH } from "@/lib/formatters";
import { lerArquivoComoDataUrl } from "@/lib/imagem";
import { useUsuarios } from "@/lib/store/usuarios-context";
import type { Usuario } from "@/lib/mock/types";
import { atualizarMeuPerfil } from "@/app/(dashboard)/perfil/actions";

interface Props {
  aberto: boolean;
  usuario: Usuario;
  onClose: () => void;
}

const SEM_VALOR = "_none";

/**
 * Dialog de auto-edição do próprio perfil. Restrito às colunas seguras
 * (telefone, foto, CNH). Nome/cargo/função/secretaria seguem só editáveis
 * pelo Master via /admin.
 */
export function EditarPerfilDialog({ aberto, usuario, onClose }: Props) {
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const { recarregar: recarregarUsuarios } = useUsuarios();

  const [nome, setNome] = useState(usuario.nome ?? "");
  const [cpf, setCpf] = useState(usuario.cpf ?? "");
  const [masp, setMasp] = useState(usuario.masp ?? "");
  const [email, setEmail] = useState(usuario.email ?? "");
  const [cargo, setCargo] = useState(usuario.cargo ?? "");
  const [telefone, setTelefone] = useState(usuario.telefone ?? "");
  const [fotoUrl, setFotoUrl] = useState<string | null>(
    usuario.fotoUrl ?? null,
  );
  const [cnhCategoria, setCnhCategoria] = useState<string>(
    usuario.cnhCategoria ?? "",
  );
  const [cnhNumero, setCnhNumero] = useState(usuario.cnhNumero ?? "");
  const [cnhValidade, setCnhValidade] = useState(usuario.cnhValidade ?? "");
  const [imagemParaRecortar, setImagemParaRecortar] = useState<string | null>(
    null,
  );
  const [carregandoFoto, setCarregandoFoto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!aberto) return;
    setNome(usuario.nome ?? "");
    setCpf(usuario.cpf ?? "");
    setMasp(usuario.masp ?? "");
    setEmail(usuario.email ?? "");
    setCargo(usuario.cargo ?? "");
    setTelefone(usuario.telefone ?? "");
    setFotoUrl(usuario.fotoUrl ?? null);
    setCnhCategoria(usuario.cnhCategoria ?? "");
    setCnhNumero(usuario.cnhNumero ?? "");
    setCnhValidade(usuario.cnhValidade ?? "");
    setImagemParaRecortar(null);
    setErro(null);
  }, [aberto, usuario]);

  const iniciais = (usuario.nome || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

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
    if (!nome.trim()) {
      setErro("Informe o nome.");
      return;
    }
    startTransition(async () => {
      const resultado = await atualizarMeuPerfil({
        nome,
        cpf,
        masp,
        email,
        cargo,
        telefone,
        fotoUrl,
        cnhCategoria,
        cnhNumero,
        cnhValidade,
      });
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      await recarregarUsuarios();
      onClose();
    });
  }

  return (
    <>
      <Dialog open={aberto} onOpenChange={(o) => !o && !pending && onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar meu perfil</DialogTitle>
            <DialogDescription>
              Atualize seus dados pessoais, foto e CNH. Função, órgão e
              superintendência (que definem seu acesso) só o Master altera.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Foto */}
            <div className="flex items-center gap-4">
              <Avatar className="size-20 ring-2 ring-border">
                {fotoUrl && <AvatarImage src={fotoUrl} alt={usuario.nome} />}
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {iniciais}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                <input
                  ref={inputFotoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={aoSelecionarFoto}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => inputFotoRef.current?.click()}
                    disabled={carregandoFoto || pending}
                  >
                    {carregandoFoto ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Camera className="size-4" />
                    )}
                    {fotoUrl ? "Trocar foto" : "Adicionar foto"}
                  </Button>
                  {fotoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFotoUrl(null)}
                      disabled={pending}
                    >
                      <X className="size-4" />
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ep-nome">Nome completo</Label>
              <Input
                id="ep-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={pending}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ep-cpf">CPF</Label>
                <Input
                  id="ep-cpf"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  inputMode="numeric"
                  maxLength={14}
                  placeholder="000.000.000-00"
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ep-masp">MASP</Label>
                <Input
                  id="ep-masp"
                  value={masp}
                  onChange={(e) => setMasp(e.target.value)}
                  inputMode="numeric"
                  disabled={pending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ep-email">E-mail (usado no login)</Label>
              <Input
                id="ep-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@lavras.mg.gov.br"
                disabled={pending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ep-cargo">Cargo</Label>
              <Input
                id="ep-cargo"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                placeholder="Ex.: Auditor Fiscal Municipal"
                disabled={pending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ep-tel">Telefone</Label>
              <Input
                id="ep-tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(35) 99999-0000"
                disabled={pending}
              />
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-1">Carteira de motorista</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Necessária para dirigir veículos da frota. Se você não
                dirige, pode deixar em branco.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={cnhCategoria || SEM_VALOR}
                  onValueChange={(v) =>
                    setCnhCategoria(v === SEM_VALOR ? "" : v)
                  }
                  disabled={pending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SEM_VALOR}>— Sem CNH —</SelectItem>
                    {CATEGORIAS_CNH.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ep-cnhnum">Número da CNH</Label>
                <Input
                  id="ep-cnhnum"
                  value={cnhNumero}
                  onChange={(e) => setCnhNumero(e.target.value)}
                  disabled={!cnhCategoria || pending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ep-cnhval">Validade</Label>
              <Input
                id="ep-cnhval"
                type="date"
                value={cnhValidade}
                onChange={(e) => setCnhValidade(e.target.value)}
                disabled={!cnhCategoria || pending}
              />
            </div>
          </div>

          {erro && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-destructive">{erro}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={aoSalvar} disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecortadorFoto
        imagemSrc={imagemParaRecortar}
        aspecto={1}
        maxLado={512}
        formato="round"
        titulo="Enquadrar foto de perfil"
        enviarPara="perfis"
        onConfirmar={(url) => {
          setFotoUrl(url);
          setImagemParaRecortar(null);
        }}
        onCancelar={() => setImagemParaRecortar(null)}
      />
    </>
  );
}
