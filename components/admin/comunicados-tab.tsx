"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Megaphone,
  Pencil,
  Trash2,
  Power,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useConfirmacao } from "@/components/confirmacao-provider";
import { useOrgaos } from "@/lib/store/orgaos-context";
import { useUsuarios } from "@/lib/store/usuarios-context";
import { usePerfil } from "@/lib/perfil-context";
import {
  listarComunicados,
  salvarComunicado,
  removerComunicado,
  listarCiencias,
} from "@/lib/data/comunicados";
import { TextoComunicado } from "@/components/comunicados/texto-comunicado";
import type {
  Comunicado,
  NivelComunicado,
  PublicoComunicado,
} from "@/lib/mock/types";

const NIVEIS: { valor: NivelComunicado; rotulo: string; cls: string }[] = [
  { valor: "informativo", rotulo: "Informativo", cls: "border-sky-300 bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-300" },
  { valor: "importante", rotulo: "Importante", cls: "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300" },
  { valor: "urgente", rotulo: "Urgente", cls: "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300" },
];

function inputLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d
    .toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" })
    .replace(" ", "T")
    .slice(0, 16);
}
function fmtData(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export function ComunicadosTab() {
  const { orgaos } = useOrgaos();
  const { buscarPorId: buscarUsuario } = useUsuarios();
  const { usuario } = usePerfil();
  const { confirmar, avisar } = useConfirmacao();

  const [lista, setLista] = useState<Comunicado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<Comunicado | null>(null);
  const [criando, setCriando] = useState(false);
  const [ciencias, setCiencias] = useState<
    Record<string, { profileId: string; cienteEm: string | null }[]>
  >({});

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      setLista(await listarComunicados());
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const agora = Date.now();
  function situacao(c: Comunicado): { rotulo: string; cls: string } {
    if (!c.ativo) return { rotulo: "Encerrado", cls: "bg-muted text-muted-foreground" };
    if (new Date(c.inicioEm).getTime() > agora)
      return { rotulo: "Agendado", cls: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300" };
    if (new Date(c.fimEm).getTime() < agora)
      return { rotulo: "Expirado", cls: "bg-muted text-muted-foreground" };
    return { rotulo: "Ativo", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" };
  }

  async function alternarAtivo(c: Comunicado) {
    try {
      await salvarComunicado({ ...c, ativo: !c.ativo });
      await recarregar();
    } catch (e) {
      await avisar({ titulo: "Falha", mensagem: String(e) });
    }
  }

  async function excluir(c: Comunicado) {
    const ok = await confirmar({
      titulo: `Excluir "${c.titulo}"?`,
      mensagem: "O comunicado e os registros de ciência serão removidos.",
      destrutivo: true,
      rotuloOk: "Excluir",
    });
    if (!ok) return;
    try {
      await removerComunicado(c.id);
      await recarregar();
    } catch (e) {
      await avisar({ titulo: "Falha", mensagem: String(e) });
    }
  }

  async function verCiencias(c: Comunicado) {
    try {
      const cs = await listarCiencias(c.id);
      setCiencias((m) => ({ ...m, [c.id]: cs }));
    } catch (e) {
      await avisar({ titulo: "Falha", mensagem: String(e) });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Comunicados</h2>
          <p className="text-sm text-muted-foreground">
            Avisos que abrem num modal quando a pessoa entra no sistema.
          </p>
        </div>
        <Button onClick={() => setCriando(true)}>
          <Plus className="size-4" />
          Novo comunicado
        </Button>
      </div>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : lista.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nenhum comunicado ainda.
        </Card>
      ) : (
        <ul className="space-y-3">
          {lista.map((c) => {
            const s = situacao(c);
            const nivel = NIVEIS.find((n) => n.valor === c.nivel);
            const alvo =
              c.publicoAlvo === "todos"
                ? "Todos"
                : c.secretarias
                    .map((id) => orgaos.find((o) => o.id === id)?.sigla ?? id)
                    .join(", ") || "Nenhuma secretaria";
            const cs = ciencias[c.id];
            return (
              <Card key={c.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Megaphone className="size-4 text-muted-foreground" />
                    <span className="font-medium">{c.titulo}</span>
                    {nivel && (
                      <span className={cn("rounded border px-1.5 py-0.5 text-[11px] font-medium", nivel.cls)}>
                        {nivel.rotulo}
                      </span>
                    )}
                    <Badge variant="secondary" className={cn("text-[11px]", s.cls)}>
                      {s.rotulo}
                    </Badge>
                    {c.exigeCiencia && (
                      <span className="text-[11px] text-muted-foreground">exige ciência</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditando(c)} aria-label="Editar">
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => alternarAtivo(c)} aria-label={c.ativo ? "Encerrar" : "Reativar"} title={c.ativo ? "Encerrar" : "Reativar"}>
                      <Power className={cn("size-4", c.ativo ? "text-emerald-600" : "text-muted-foreground")} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => excluir(c)} aria-label="Excluir" className="text-destructive hover:text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <TextoComunicado texto={c.mensagem} className="text-sm text-muted-foreground line-clamp-3" />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span>Público: <strong className="text-foreground">{alvo}</strong></span>
                  <span>De {fmtData(c.inicioEm)} até {fmtData(c.fimEm)}</span>
                  {c.exigeCiencia && (
                    <button type="button" onClick={() => verCiencias(c)} className="inline-flex items-center gap-1 text-primary hover:underline">
                      <Eye className="size-3.5" /> {cs ? `${cs.length} confirmaram` : "Ver quem confirmou"}
                    </button>
                  )}
                </div>
                {cs && (
                  <div className="rounded-md bg-muted/40 p-2 text-[11px]">
                    {cs.length === 0 ? (
                      <span className="text-muted-foreground">Ninguém confirmou ainda.</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {cs.map((x) => (
                          <li key={x.profileId}>
                            {buscarUsuario(x.profileId)?.nome ?? x.profileId}
                            {x.cienteEm ? ` · ${fmtData(x.cienteEm)}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </ul>
      )}

      <ComunicadoForm
        aberto={criando || editando !== null}
        comunicado={editando}
        orgaos={orgaos}
        autorId={usuario.id}
        onClose={() => {
          setCriando(false);
          setEditando(null);
        }}
        onSalvo={() => {
          setCriando(false);
          setEditando(null);
          recarregar();
        }}
      />
    </div>
  );
}

function ComunicadoForm({
  aberto,
  comunicado,
  orgaos,
  autorId,
  onClose,
  onSalvo,
}: {
  aberto: boolean;
  comunicado: Comunicado | null;
  orgaos: { id: string; nome: string; sigla: string }[];
  autorId: string;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { avisar } = useConfirmacao();
  const editando = comunicado !== null;

  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [nivel, setNivel] = useState<NivelComunicado>("informativo");
  const [publico, setPublico] = useState<PublicoComunicado>("todos");
  const [secretarias, setSecretarias] = useState<string[]>([]);
  const [exigeCiencia, setExigeCiencia] = useState(false);
  const [inicio, setInicio] = useState("");
  const [dias, setDias] = useState("7");
  const [preview, setPreview] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    if (comunicado) {
      setTitulo(comunicado.titulo);
      setMensagem(comunicado.mensagem);
      setNivel(comunicado.nivel);
      setPublico(comunicado.publicoAlvo);
      setSecretarias(comunicado.secretarias);
      setExigeCiencia(comunicado.exigeCiencia);
      setInicio(inputLocal(comunicado.inicioEm));
      const d = Math.max(
        1,
        Math.round(
          (new Date(comunicado.fimEm).getTime() -
            new Date(comunicado.inicioEm).getTime()) /
            86400000,
        ),
      );
      setDias(String(d));
    } else {
      setTitulo("");
      setMensagem("");
      setNivel("informativo");
      setPublico("todos");
      setSecretarias([]);
      setExigeCiencia(false);
      setInicio(inputLocal(new Date().toISOString()));
      setDias("7");
    }
    setPreview(false);
    setErro(null);
  }, [aberto, comunicado]);

  function toggleSecretaria(id: string) {
    setSecretarias((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function salvar() {
    setErro(null);
    if (!titulo.trim()) return setErro("Informe o título.");
    if (!mensagem.trim()) return setErro("Escreva a mensagem.");
    if (publico === "secretarias" && secretarias.length === 0)
      return setErro("Escolha ao menos uma secretaria (ou marque Todos).");
    const nDias = Math.max(1, Math.round(Number(dias) || 1));
    const inicioDate = inicio ? new Date(inicio) : new Date();
    if (Number.isNaN(inicioDate.getTime())) return setErro("Data de início inválida.");
    const fimDate = new Date(inicioDate.getTime() + nDias * 86400000);

    const base: Comunicado = comunicado
      ? { ...comunicado }
      : {
          id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          titulo: "",
          mensagem: "",
          nivel: "informativo",
          publicoAlvo: "todos",
          secretarias: [],
          exigeCiencia: false,
          inicioEm: "",
          fimEm: "",
          ativo: true,
          criadoPor: autorId,
          criadoEm: new Date().toISOString(),
        };
    base.titulo = titulo.trim();
    base.mensagem = mensagem.trim();
    base.nivel = nivel;
    base.publicoAlvo = publico;
    base.secretarias = publico === "secretarias" ? secretarias : [];
    base.exigeCiencia = exigeCiencia;
    base.inicioEm = inicioDate.toISOString();
    base.fimEm = fimDate.toISOString();

    setProcessando(true);
    try {
      await salvarComunicado(base);
      onSalvo();
    } catch (e) {
      setErro(String(e));
    } finally {
      setProcessando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar comunicado" : "Novo comunicado"}</DialogTitle>
          <DialogDescription>
            Use <code>**negrito**</code> para destacar. Quebras de linha viram parágrafos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cm-titulo">Título</Label>
            <Input id="cm-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="cm-msg">Mensagem</Label>
              <button type="button" className="text-xs text-primary hover:underline" onClick={() => setPreview((p) => !p)}>
                {preview ? "Editar" : "Pré-visualizar"}
              </button>
            </div>
            {preview ? (
              <div className="rounded-md border p-3 text-sm min-h-24">
                <TextoComunicado texto={mensagem || "_(vazio)_"} />
              </div>
            ) : (
              <Textarea id="cm-msg" value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={5} placeholder="Ex.: **Recesso** dias 20 e 21. Retorno normal dia 22." />
            )}
          </div>

          <div className="space-y-2">
            <Label>Nível</Label>
            <div className="flex flex-wrap gap-2">
              {NIVEIS.map((n) => (
                <button key={n.valor} type="button" onClick={() => setNivel(n.valor)}
                  className={cn("rounded-md border px-3 py-1.5 text-sm transition-colors",
                    nivel === n.valor ? n.cls + " font-medium ring-1 ring-current" : "border-input hover:bg-muted")}>
                  {n.rotulo}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Para quem</Label>
            <div className="flex gap-2">
              {(["todos", "secretarias"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPublico(p)}
                  className={cn("flex-1 rounded-md border px-3 py-2 text-sm transition-colors",
                    publico === p ? "border-primary bg-primary/10 font-medium text-primary" : "border-input hover:bg-muted")}>
                  {p === "todos" ? "Todos" : "Secretarias específicas"}
                </button>
              ))}
            </div>
            {publico === "secretarias" && (
              <div className="max-h-44 overflow-y-auto rounded-md border divide-y">
                {orgaos.map((o) => {
                  const sel = secretarias.includes(o.id);
                  return (
                    <button key={o.id} type="button" onClick={() => toggleSecretaria(o.id)}
                      className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors", sel ? "bg-primary/5" : "hover:bg-muted/60")}>
                      <span className={cn("size-4 rounded border flex items-center justify-center shrink-0", sel ? "bg-primary border-primary" : "border-input")}>
                        {sel && <span className="text-primary-foreground text-[10px]">✓</span>}
                      </span>
                      <span className={cn("text-sm truncate", sel && "font-medium")}>{o.nome}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cm-inicio">Começa a aparecer</Label>
              <Input id="cm-inicio" type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cm-dias">Dias que fica</Label>
              <Input id="cm-dias" type="number" min={1} value={dias} onChange={(e) => setDias(e.target.value)} />
            </div>
          </div>

          <label className="flex items-center justify-between rounded-md border p-3 bg-muted/20">
            <span>
              <span className="text-sm font-medium block">Exigir "Li e estou ciente"</span>
              <span className="text-xs text-muted-foreground">A pessoa precisa confirmar; você vê quem confirmou.</span>
            </span>
            <Switch checked={exigeCiencia} onCheckedChange={setExigeCiencia} />
          </label>

          {erro && (
            <p className="text-sm text-destructive">{erro}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={processando}>Cancelar</Button>
          <Button onClick={salvar} disabled={processando}>
            {processando && <Loader2 className="size-4 animate-spin" />}
            {editando ? "Salvar" : "Publicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
