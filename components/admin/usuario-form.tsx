"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, Car, Loader2, X } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFuncoes } from "@/lib/store/funcoes-context";
import { useUsuarios } from "@/lib/store/usuarios-context";
import { useOrgaos } from "@/lib/store/orgaos-context";
import { CATEGORIAS_CNH } from "@/lib/formatters";
import { lerArquivoComoDataUrl } from "@/lib/imagem";
import { RecortadorFoto } from "@/components/recortador-foto";
import { superintendencias } from "@/lib/mock/superintendencias";
import { USUARIO_MASTER_ID } from "@/lib/mock/usuarios";
import type { CategoriaCNH, Usuario } from "@/lib/mock/types";

interface Props {
  aberto: boolean;
  usuario: Usuario | null;
  onClose: () => void;
}

const SEM_VALOR = "_none";

export function UsuarioForm({ aberto, usuario, onClose }: Props) {
  const { funcoesOrdenadas, buscarPorId: buscarFuncao } = useFuncoes();
  const { salvar, usuarios: todosUsuarios } = useUsuarios();
  const { orgaos } = useOrgaos();
  const editando = usuario !== null;
  const ehMaster = usuario?.id === USUARIO_MASTER_ID;
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [masp, setMasp] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cargo, setCargo] = useState("");
  const [funcaoId, setFuncaoId] = useState<string>("");
  const [secretariaId, setSecretariaId] = useState<string>("");
  const [superintendenciaId, setSuperintendenciaId] = useState<string>("");
  const [cnhCategoria, setCnhCategoria] = useState<string>("");
  const [cnhNumero, setCnhNumero] = useState("");
  const [cnhValidade, setCnhValidade] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | undefined>(undefined);
  const [imagemParaRecortar, setImagemParaRecortar] = useState<string | null>(
    null,
  );
  const [carregandoFoto, setCarregandoFoto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    if (usuario) {
      setNome(usuario.nome);
      setCpf(usuario.cpf);
      setMasp(usuario.masp);
      setEmail(usuario.email);
      setTelefone(usuario.telefone);
      setCargo(usuario.cargo);
      setFuncaoId(usuario.funcaoId);
      setSecretariaId(usuario.secretariaId);
      setSuperintendenciaId(usuario.superintendenciaId ?? "");
      setCnhCategoria(usuario.cnhCategoria ?? "");
      setCnhNumero(usuario.cnhNumero ?? "");
      setCnhValidade(usuario.cnhValidade ?? "");
      setFotoUrl(usuario.fotoUrl);
    } else {
      setNome("");
      setCpf("");
      setMasp("");
      setEmail("");
      setTelefone("");
      setCargo("");
      const padrao = funcoesOrdenadas.find(
        (f) => !f.sistema && f.nivelAcesso === "servidor",
      );
      setFuncaoId(padrao?.id ?? funcoesOrdenadas[0]?.id ?? "");
      setSecretariaId(orgaos[0]?.id ?? "");
      setSuperintendenciaId("");
      setCnhCategoria("");
      setCnhNumero("");
      setCnhValidade("");
      setFotoUrl(undefined);
    }
    setImagemParaRecortar(null);
    setErro(null);
  }, [aberto, usuario, funcoesOrdenadas, orgaos]);

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

  const iniciais = (nome || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const funcaoSelecionada = buscarFuncao(funcaoId);
  const supDoOrgao = superintendencias.filter(
    (s) => s.secretariaId === secretariaId,
  );

  // Se trocar de órgão e a superintendência atual não pertencer mais ao órgão,
  // limpa para evitar registro órfão.
  useEffect(() => {
    if (!superintendenciaId) return;
    if (!supDoOrgao.some((s) => s.id === superintendenciaId)) {
      setSuperintendenciaId("");
    }
  }, [secretariaId, supDoOrgao, superintendenciaId]);

  function aoSalvar() {
    setErro(null);
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setErro("Informe o nome completo.");
      return;
    }
    if (!funcaoId) {
      setErro("Selecione uma função.");
      return;
    }
    if (!secretariaId) {
      setErro("Selecione um órgão.");
      return;
    }
    const f = buscarFuncao(funcaoId);
    if (f?.ehMotorista && !cnhCategoria) {
      setErro("Motoristas precisam ter categoria de CNH informada.");
      return;
    }
    // Validações leves de formato (dígitos / quantidade mínima)
    const cpfDigitos = cpf.replace(/\D/g, "");
    if (cpfDigitos && cpfDigitos.length !== 11) {
      setErro("CPF deve ter 11 dígitos (ou ficar em branco).");
      return;
    }
    const maspDigitos = masp.replace(/\D/g, "");
    if (masp.trim() && maspDigitos.length < 3) {
      setErro("MASP inválido.");
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErro("Email inválido.");
      return;
    }
    // Dedup soft: avisa se CPF/MASP/email coincide com outro usuário
    const conflito = todosUsuarios.find(
      (u) =>
        u.id !== usuario?.id &&
        ((cpfDigitos && u.cpf.replace(/\D/g, "") === cpfDigitos) ||
          (maspDigitos && u.masp.replace(/\D/g, "") === maspDigitos) ||
          (email.trim() &&
            u.email.toLowerCase() === email.trim().toLowerCase())),
    );
    if (conflito) {
      setErro(
        `Já existe um usuário (${conflito.nome}) com o mesmo CPF, MASP ou email.`,
      );
      return;
    }

    const base: Usuario = usuario
      ? { ...usuario }
      : {
          id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          nome: "",
          cpf: "",
          masp: "",
          email: "",
          cargo: "",
          funcaoId: "",
          perfil: "servidor",
          hierarquia: 999,
          secretariaId: "",
          superintendenciaId: null,
          telefone: "",
        };

    base.nome = nomeLimpo;
    base.cpf = cpf.trim();
    base.masp = masp.trim();
    base.email = email.trim();
    base.telefone = telefone.trim();
    base.cargo = cargo.trim();
    base.funcaoId = funcaoId;
    base.secretariaId = secretariaId;
    base.superintendenciaId = superintendenciaId || null;
    base.cnhCategoria = cnhCategoria
      ? (cnhCategoria as CategoriaCNH)
      : undefined;
    base.cnhNumero = cnhNumero.trim() || undefined;
    base.cnhValidade = cnhValidade || undefined;
    base.fotoUrl = fotoUrl;

    salvar(base);
    onClose();
  }

  return (
    <>
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editando ? "Editar usuário" : "Novo usuário"}
          </DialogTitle>
          <DialogDescription>
            Cadastro completo do colaborador. Dados de CNH são opcionais — sem
            CNH, o usuário pode ter conta mas precisa designar um motorista
            para reservar veículos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Foto de perfil */}
          <div className="md:col-span-2 flex items-center gap-4">
            <Avatar className="size-20 ring-2 ring-border">
              {fotoUrl && <AvatarImage src={fotoUrl} alt={nome} />}
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
                  disabled={carregandoFoto}
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
                    onClick={() => setFotoUrl(undefined)}
                  >
                    <X className="size-4" />
                    Remover
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Após escolher, você poderá enquadrar (posicionar e dar zoom).
              </p>
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="uf-nome">Nome completo</Label>
            <Input
              id="uf-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="uf-cpf">CPF</Label>
            <Input
              id="uf-cpf"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              inputMode="numeric"
              maxLength={14}
              placeholder="000.000.000-00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="uf-masp">MASP</Label>
            <Input
              id="uf-masp"
              value={masp}
              onChange={(e) => setMasp(e.target.value)}
              inputMode="numeric"
              maxLength={12}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="uf-email">Email institucional</Label>
            <Input
              id="uf-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@lavras.mg.gov.br"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="uf-tel">Telefone</Label>
            <Input
              id="uf-tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(35) 99999-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="uf-cargo">Cargo</Label>
            <Input
              id="uf-cargo"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Ex.: Auditor Fiscal Municipal"
            />
          </div>

          <Separator className="md:col-span-2" />

          <div className="space-y-2">
            <Label>Órgão da prefeitura</Label>
            <Select
              value={secretariaId}
              onValueChange={setSecretariaId}
              disabled={ehMaster}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                {orgaos.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.sigla} — {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Superintendência (opcional)</Label>
            <Select
              value={superintendenciaId || SEM_VALOR}
              onValueChange={(v) =>
                setSuperintendenciaId(v === SEM_VALOR ? "" : v)
              }
              disabled={supDoOrgao.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    supDoOrgao.length === 0
                      ? "Sem superintendências"
                      : "—"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_VALOR}>
                  — Sem superintendência —
                </SelectItem>
                {supDoOrgao.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.sigla} — {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Função</Label>
            <Select
              value={funcaoId}
              onValueChange={setFuncaoId}
              disabled={ehMaster}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                {funcoesOrdenadas.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.hierarquia}. {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {funcaoSelecionada?.ehMotorista && (
              <p className="text-xs text-primary flex items-center gap-1">
                <Car className="size-3" />
                Esta pessoa será listada como motorista disponível para reservas.
              </p>
            )}
          </div>

          <Separator className="md:col-span-2" />

          <div className="md:col-span-2">
            <h3 className="text-sm font-medium mb-1">
              Carteira de motorista (opcional)
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Necessária para motoristas e para servidores que vão dirigir
              veículos da frota.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select
              value={cnhCategoria || SEM_VALOR}
              onValueChange={(v) =>
                setCnhCategoria(v === SEM_VALOR ? "" : v)
              }
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
            <Label htmlFor="uf-cnhnum">Número da CNH</Label>
            <Input
              id="uf-cnhnum"
              value={cnhNumero}
              onChange={(e) => setCnhNumero(e.target.value)}
              disabled={!cnhCategoria}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="uf-cnhval">Validade</Label>
            <Input
              id="uf-cnhval"
              type="date"
              value={cnhValidade}
              onChange={(e) => setCnhValidade(e.target.value)}
              disabled={!cnhCategoria}
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
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={aoSalvar}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <RecortadorFoto
      imagemSrc={imagemParaRecortar}
      aspecto={1}
      maxLado={512}
      formato="round"
      titulo="Enquadrar foto de perfil"
      onConfirmar={(dataUrl) => {
        setFotoUrl(dataUrl);
        setImagemParaRecortar(null);
      }}
      onCancelar={() => setImagemParaRecortar(null)}
    />
    </>
  );
}
