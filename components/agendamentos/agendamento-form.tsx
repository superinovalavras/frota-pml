"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Car, MapPin, Mail } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useVeiculos } from "@/lib/store/veiculos-context";
import { useUsuarios } from "@/lib/store/usuarios-context";
import { useAgendamentos } from "@/lib/store/agendamentos-context";
import { usePerfil } from "@/lib/perfil-context";
import { filtrarVeiculosVisiveis } from "@/lib/visibilidade";
import {
  detectarConflito,
  inputLocalParaIso,
  isoParaInputLocal,
  intervaloDiaTodo,
  dataIsoDeIso,
  podeDirigirVeiculo,
} from "@/lib/agendamento-utils";
import { formatHora } from "@/lib/formatters";
import type { Agendamento, Passageiro, Veiculo } from "@/lib/mock/types";
import { PassageirosSection } from "./passageiros-section";

interface Props {
  aberto: boolean;
  agendamento: Agendamento | null;
  inicialVeiculoId?: string;
  inicialInicio?: string;
  inicialFim?: string;
  onClose: () => void;
}

const SEM_VALOR = "_none";
const MOTORISTA_EU = "_eu";

export function AgendamentoForm({
  aberto,
  agendamento,
  inicialVeiculoId,
  inicialInicio,
  inicialFim,
  onClose,
}: Props) {
  const editando = agendamento !== null;
  const { veiculos } = useVeiculos();
  const {
    usuarios,
    motoristasDisponiveis,
    buscarPorId: buscarUsuario,
  } = useUsuarios();
  const { agendamentos, criar, salvar } = useAgendamentos();
  const { usuario: usuarioAtual } = usePerfil();

  const ehGestorOuMaster =
    usuarioAtual.perfil === "master" || usuarioAtual.perfil === "gestor";

  const [solicitanteId, setSolicitanteId] = useState<string>(usuarioAtual.id);
  const [veiculoId, setVeiculoId] = useState<string>("");
  const [diaTodo, setDiaTodo] = useState<boolean>(false);
  const [data, setData] = useState<string>(""); // só usado em diaTodo
  const [inicio, setInicio] = useState<string>("");
  const [fim, setFim] = useState<string>("");
  const [localPartida, setLocalPartida] = useState<string>("");
  const [mesmoLocalDevolucao, setMesmoLocalDevolucao] = useState<boolean>(true);
  const [localDevolucao, setLocalDevolucao] = useState<string>("");
  const [destino, setDestino] = useState<string>("");
  const [finalidade, setFinalidade] = useState<string>("");
  const [motoristaId, setMotoristaId] = useState<string>(MOTORISTA_EU);
  const [passageiros, setPassageiros] = useState<Passageiro[]>([]);
  const [observacoes, setObservacoes] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    if (agendamento) {
      setSolicitanteId(agendamento.solicitanteId);
      setVeiculoId(agendamento.veiculoId);
      setDiaTodo(!!agendamento.diaTodo);
      setData(dataIsoDeIso(agendamento.inicio));
      setInicio(isoParaInputLocal(agendamento.inicio));
      setFim(isoParaInputLocal(agendamento.fim));
      setLocalPartida(agendamento.localPartida ?? "");
      setLocalDevolucao(agendamento.localDevolucao ?? "");
      setMesmoLocalDevolucao(
        !agendamento.localDevolucao ||
          agendamento.localDevolucao === agendamento.localPartida,
      );
      setDestino(agendamento.destino);
      setFinalidade(agendamento.finalidade);
      // Resolver motoristaId inicial:
      // - null → "sem motorista designado": se o solicitante tem CNH, é "eu"; senão "_none"
      // - igual ao solicitante → "eu"
      // - outro id → próprio id
      if (agendamento.motoristaId === null) {
        setMotoristaId(usuarioAtual.cnhCategoria ? MOTORISTA_EU : SEM_VALOR);
      } else if (agendamento.motoristaId === agendamento.solicitanteId) {
        setMotoristaId(MOTORISTA_EU);
      } else {
        setMotoristaId(agendamento.motoristaId);
      }
      setPassageiros(agendamento.passageiros ?? []);
      setObservacoes(agendamento.observacoes ?? "");
    } else {
      setSolicitanteId(usuarioAtual.id);
      setVeiculoId(inicialVeiculoId ?? "");
      setDiaTodo(false);
      setData(inicialInicio ? dataIsoDeIso(inicialInicio) : "");
      setInicio(inicialInicio ?? "");
      setFim(inicialFim ?? "");
      setLocalPartida("");
      setMesmoLocalDevolucao(true);
      setLocalDevolucao("");
      setDestino("");
      setFinalidade("");
      setMotoristaId(usuarioAtual.cnhCategoria ? MOTORISTA_EU : SEM_VALOR);
      setPassageiros([]);
      setObservacoes("");
    }
    setErro(null);
  }, [
    aberto,
    agendamento,
    inicialVeiculoId,
    inicialInicio,
    inicialFim,
    usuarioAtual.id,
    usuarioAtual.cnhCategoria,
  ]);

  const solicitante = buscarUsuario(solicitanteId) ?? usuarioAtual;
  const veiculosVisiveis = useMemo(
    () => filtrarVeiculosVisiveis(veiculos, solicitante),
    [veiculos, solicitante],
  );
  const veiculo = veiculos.find((v) => v.id === veiculoId);

  // Se o veículo selecionado deixou de ser visível (trocou solicitante), limpa.
  useEffect(() => {
    if (!aberto || !veiculoId) return;
    if (!veiculosVisiveis.some((v) => v.id === veiculoId)) {
      setVeiculoId("");
    }
  }, [aberto, veiculoId, veiculosVisiveis]);

  // Calcula intervalo final em função de diaTodo
  const intervalo = useMemo(() => {
    if (diaTodo && data) {
      return intervaloDiaTodo(data);
    }
    return {
      inicio: inputLocalParaIso(inicio),
      fim: inputLocalParaIso(fim),
    };
  }, [diaTodo, data, inicio, fim]);

  const conflito = useMemo(() => {
    if (!veiculoId || !intervalo.inicio || !intervalo.fim) return null;
    return detectarConflito(
      agendamentos,
      veiculoId,
      intervalo.inicio,
      intervalo.fim,
      agendamento?.id,
    );
  }, [agendamentos, veiculoId, intervalo, agendamento]);

  const possoMeMesmoDirigir =
    !!veiculo && podeDirigirVeiculo(solicitante, veiculo);

  // Excluir solicitante e motorista do dropdown de passageiros
  const motoristaIdReal =
    motoristaId === MOTORISTA_EU ? solicitanteId : motoristaId;
  const excluirIdsPassageiros = [solicitanteId, motoristaIdReal].filter(
    (id) => id && id !== SEM_VALOR && id !== MOTORISTA_EU,
  );

  const totalUsuariosNotificar = passageiros.filter(
    (p) => p.tipo === "usuario",
  ).length;

  function aoSalvar() {
    setErro(null);
    if (!veiculoId) {
      setErro("Selecione um veículo.");
      return;
    }
    if (diaTodo) {
      if (!data) {
        setErro("Informe a data.");
        return;
      }
    } else {
      if (!inicio || !fim) {
        setErro("Informe o horário de saída e devolução.");
        return;
      }
      if (new Date(intervalo.inicio) >= new Date(intervalo.fim)) {
        setErro("A devolução deve ser posterior à saída.");
        return;
      }
    }
    if (!localPartida.trim()) {
      setErro("Informe o local de partida.");
      return;
    }
    if (!destino.trim()) {
      setErro("Informe o destino.");
      return;
    }
    if (!finalidade.trim()) {
      setErro("Informe a finalidade.");
      return;
    }
    if (conflito) {
      setErro(
        `Conflito: este veículo já tem reserva "${conflito.destino}" das ${formatHora(conflito.inicio)} às ${formatHora(conflito.fim)}.`,
      );
      return;
    }
    let motoristaResolvido: string | null = null;
    if (motoristaId === MOTORISTA_EU) {
      if (!solicitante.cnhCategoria) {
        setErro(
          "Solicitante sem CNH cadastrada. Selecione um motorista do pool.",
        );
        return;
      }
      motoristaResolvido = solicitante.id;
    } else if (motoristaId === SEM_VALOR) {
      setErro(
        "Selecione um motorista (sem CNH própria, é necessário designar um motorista).",
      );
      return;
    } else {
      motoristaResolvido = motoristaId;
    }

    const localDev = mesmoLocalDevolucao
      ? localPartida.trim()
      : localDevolucao.trim() || localPartida.trim();

    const statusInicial = ehGestorOuMaster ? "confirmado" : "pendente";

    const dadosBase = {
      solicitanteId,
      veiculoId,
      inicio: intervalo.inicio,
      fim: intervalo.fim,
      diaTodo,
      localPartida: localPartida.trim(),
      localDevolucao: localDev,
      destino: destino.trim(),
      finalidade: finalidade.trim(),
      motoristaId: motoristaResolvido,
      passageiros,
      observacoes: observacoes.trim() || undefined,
    };

    if (editando && agendamento) {
      salvar({
        ...agendamento,
        ...dadosBase,
      });
    } else {
      criar({
        ...dadosBase,
        status: statusInicial,
      });
    }
    onClose();
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editando ? "Editar agendamento" : "Novo agendamento"}
          </DialogTitle>
          <DialogDescription>
            {editando
              ? "Edite os detalhes da reserva."
              : ehGestorOuMaster
                ? "A reserva será criada já confirmada."
                : "A reserva ficará pendente até aprovação do gestor."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {ehGestorOuMaster && (
            <div className="space-y-2 md:col-span-2">
              <Label>Solicitante</Label>
              <Select value={solicitanteId} onValueChange={setSolicitanteId}>
                <SelectTrigger className="w-full h-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                      {u.cargo ? ` · ${u.cargo}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Veículo com foto */}
          <div className="space-y-2 md:col-span-2">
            <Label>Veículo</Label>
            <Select value={veiculoId} onValueChange={setVeiculoId}>
              <SelectTrigger className="w-full h-auto py-2">
                <SelectValue placeholder="Selecionar veículo..." />
              </SelectTrigger>
              <SelectContent>
                {veiculosVisiveis.length === 0 ? (
                  <SelectItem value={SEM_VALOR} disabled>
                    Nenhum veículo visível para este solicitante
                  </SelectItem>
                ) : (
                  veiculosVisiveis.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="py-2">
                      <VeiculoOption veiculo={v} />
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Switch dia todo */}
          <div className="md:col-span-2 flex items-center justify-between rounded-md border p-3 bg-muted/20">
            <div>
              <Label htmlFor="af-diatodo" className="cursor-pointer">
                Dia todo
              </Label>
              <p className="text-xs text-muted-foreground">
                A reserva ocupará o dia inteiro (00:00 às 23:59).
              </p>
            </div>
            <Switch
              id="af-diatodo"
              checked={diaTodo}
              onCheckedChange={(v) => {
                setDiaTodo(v);
                if (v && !data) {
                  // ao ligar dia todo, herda data do início se houver
                  if (inicio) setData(dataIsoDeIso(inputLocalParaIso(inicio)));
                }
              }}
            />
          </div>

          {/* Datas/horas */}
          {diaTodo ? (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="af-data">Data</Label>
              <Input
                id="af-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="af-inicio">Saída (retirada do veículo)</Label>
                <Input
                  id="af-inicio"
                  type="datetime-local"
                  value={inicio}
                  onChange={(e) => setInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="af-fim">Devolução do veículo</Label>
                <Input
                  id="af-fim"
                  type="datetime-local"
                  value={fim}
                  onChange={(e) => setFim(e.target.value)}
                />
              </div>
            </>
          )}

          {conflito && (
            <div className="md:col-span-2 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  Conflito de horário
                </p>
                <p className="text-muted-foreground text-xs">
                  Este veículo já tem a reserva &quot;{conflito.destino}&quot;
                  das {formatHora(conflito.inicio)} às{" "}
                  {formatHora(conflito.fim)}.
                </p>
              </div>
            </div>
          )}

          <Separator className="md:col-span-2" />

          {/* Locais de partida e devolução */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="af-partida" className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              Local de partida (onde o veículo será retirado)
            </Label>
            <Input
              id="af-partida"
              value={localPartida}
              onChange={(e) => setLocalPartida(e.target.value)}
              placeholder="Ex.: Pátio da SDES, Rua X 123"
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-between rounded-md border border-dashed p-2.5 bg-muted/10">
            <Label
              htmlFor="af-mesmolocal"
              className="cursor-pointer text-sm font-normal"
            >
              Devolver no mesmo local da partida
            </Label>
            <Switch
              id="af-mesmolocal"
              checked={mesmoLocalDevolucao}
              onCheckedChange={setMesmoLocalDevolucao}
            />
          </div>

          {!mesmoLocalDevolucao && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="af-devolucao" className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                Local de devolução
              </Label>
              <Input
                id="af-devolucao"
                value={localDevolucao}
                onChange={(e) => setLocalDevolucao(e.target.value)}
                placeholder="Ex.: Pátio da Saúde"
              />
            </div>
          )}

          <Separator className="md:col-span-2" />

          {/* Destino e finalidade */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="af-destino">Destino</Label>
            <Input
              id="af-destino"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              placeholder="Ex.: Centro Administrativo"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="af-finalidade">Finalidade</Label>
            <Input
              id="af-finalidade"
              value={finalidade}
              onChange={(e) => setFinalidade(e.target.value)}
              placeholder="Ex.: Reunião com SETUR"
            />
          </div>

          {/* Motorista */}
          <div className="space-y-2 md:col-span-2">
            <Label>Motorista</Label>
            <Select value={motoristaId} onValueChange={setMotoristaId}>
              <SelectTrigger className="w-full h-auto">
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                {solicitante.cnhCategoria ? (
                  <SelectItem value={MOTORISTA_EU}>
                    Próprio solicitante — CNH {solicitante.cnhCategoria}
                  </SelectItem>
                ) : (
                  <SelectItem value={SEM_VALOR} disabled>
                    Sem CNH própria — escolha um motorista
                  </SelectItem>
                )}
                {motoristasDisponiveis.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}
                    {m.cnhCategoria ? ` · CNH ${m.cnhCategoria}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {motoristaId === MOTORISTA_EU &&
              veiculo &&
              !possoMeMesmoDirigir && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  CNH {solicitante.cnhCategoria ?? "ausente"} não habilita o
                  veículo (exige {veiculo.cnhExigida}).
                </p>
              )}
          </div>

          {/* Passageiros */}
          <PassageirosSection
            passageiros={passageiros}
            setPassageiros={setPassageiros}
            excluirIds={excluirIdsPassageiros}
          />

          {/* Email placeholder */}
          {totalUsuariosNotificar > 0 && (
            <div className="md:col-span-2 flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30 p-3 text-sm">
              <Mail className="size-4 text-sky-700 dark:text-sky-300 shrink-0 mt-0.5" />
              <div>
                <p className="text-sky-900 dark:text-sky-100 font-medium">
                  {totalUsuariosNotificar} pessoa
                  {totalUsuariosNotificar === 1 ? " do sistema receberá" : "s do sistema receberão"}{" "}
                  notificação
                </p>
                <p className="text-xs text-sky-800/80 dark:text-sky-200/80">
                  O envio automático de emails será ativado na integração com
                  Supabase. Por enquanto, fica registrado quem foi listado.
                </p>
              </div>
            </div>
          )}

          <Separator className="md:col-span-2" />

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="af-obs">Observações</Label>
            <Textarea
              id="af-obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Detalhes adicionais, contatos, restrições…"
              rows={3}
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
          <Button onClick={aoSalvar} disabled={!!conflito}>
            {editando ? "Salvar alterações" : "Criar reserva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VeiculoOption({ veiculo: v }: { veiculo: Veiculo }) {
  const nome = [v.marca, v.modelo].filter(Boolean).join(" ") || "Sem nome";
  return (
    <span className="flex items-center gap-2.5 w-full">
      {v.fotoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={v.fotoUrl}
          alt=""
          className="size-9 rounded-md object-cover ring-1 ring-border shrink-0"
        />
      ) : (
        <span className="size-9 rounded-md bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          <Car className="size-4" />
        </span>
      )}
      <span className="flex flex-col items-start leading-tight min-w-0">
        <span className="text-sm font-medium truncate">{nome}</span>
        <span className="text-[11px] text-muted-foreground truncate">
          {v.placa} · CNH {v.cnhExigida}
        </span>
      </span>
    </span>
  );
}
