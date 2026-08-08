"use client";

import { useMemo, useState } from "react";
import {
  FileDown,
  Trash2,
  CalendarRange,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirmacao } from "@/components/confirmacao-provider";
import { useAgendamentos } from "@/lib/store/agendamentos-context";
import { useVeiculos } from "@/lib/store/veiculos-context";
import { useUsuarios } from "@/lib/store/usuarios-context";
import { useOrgaos } from "@/lib/store/orgaos-context";
import { usePerfil } from "@/lib/perfil-context";
import { timestamptzParaIsoLocal } from "@/lib/data/mappers";
import { rotuloStatusAgendamento } from "@/lib/formatters";
import { apagarReservasEncerradas } from "@/app/(dashboard)/relatorios/actions";
import type { Agendamento } from "@/lib/mock/types";

// Helpers de data a partir da string LOCAL de Lavras ("YYYY-MM-DDTHH:MM:SS").
// Trabalham direto na string — independem do fuso do navegador.
function dataBr(naive: string): string {
  return `${naive.slice(8, 10)}/${naive.slice(5, 7)}/${naive.slice(0, 4)}`;
}
function horaBr(naive: string): string {
  return naive.slice(11, 16);
}
function hoje(): string {
  return timestamptzParaIsoLocal(new Date().toISOString()).slice(0, 10);
}
function inicioDoAno(): string {
  return `${new Date().getFullYear()}-01-01`;
}

/**
 * Ferramenta (só Master) para arquivar reservas: gera um PDF do período e,
 * depois, permite apagar do banco as reservas JÁ ENCERRADAS daquele período —
 * liberando espaço sem perder o registro (o PDF é o arquivo permanente).
 *
 * O botão de apagar só habilita depois de baixar o PDF ("sem medo").
 */
export function ExportarLimpar() {
  const { agendamentos, recarregar } = useAgendamentos();
  const { veiculos } = useVeiculos();
  const { buscarPorId: buscarUsuario } = useUsuarios();
  const { orgaos } = useOrgaos();
  const { usuario } = usePerfil();
  const { confirmar, avisar } = useConfirmacao();

  const [dataInicio, setDataInicio] = useState(inicioDoAno());
  const [dataFim, setDataFim] = useState(hoje());
  const [pdfGerado, setPdfGerado] = useState(false);
  const [processando, setProcessando] = useState(false);

  const periodoValido =
    !!dataInicio && !!dataFim && dataInicio <= dataFim;

  const agoraLavras = useMemo(
    () => timestamptzParaIsoLocal(new Date().toISOString()),
    [],
  );

  // Reservas cujo INÍCIO cai no período (comparação por data local de Lavras).
  const reservasPeriodo = useMemo(() => {
    if (!periodoValido) return [];
    return agendamentos
      .filter((a) => {
        const d = a.inicio.slice(0, 10);
        return d >= dataInicio && d <= dataFim;
      })
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
  }, [agendamentos, dataInicio, dataFim, periodoValido]);

  // Dessas, as já ENCERRADAS (fim já passou) — as únicas que podem ser apagadas.
  const encerradas = useMemo(
    () => reservasPeriodo.filter((a) => a.fim < agoraLavras),
    [reservasPeriodo, agoraLavras],
  );

  function aoMudarPeriodo(set: (v: string) => void, v: string) {
    set(v);
    setPdfGerado(false); // mudou o período → precisa gerar o PDF de novo
  }

  function nomeVeiculo(a: Agendamento): string {
    const v = veiculos.find((x) => x.id === a.veiculoId);
    return v ? `${v.placa} · ${v.modelo}` : "Veículo removido";
  }
  function siglaOrgao(a: Agendamento): string {
    const v = veiculos.find((x) => x.id === a.veiculoId);
    const o = v ? orgaos.find((x) => x.id === v.secretariaId) : undefined;
    return o?.sigla ?? "—";
  }

  async function baixarPdf() {
    if (!periodoValido) return;
    setProcessando(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const margem = 40;

      doc.setFontSize(14);
      doc.text("Relatório de Reservas — FROTA PML", margem, 40);
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(
        `Período: ${dataBr(`${dataInicio}T00:00:00`)} a ${dataBr(`${dataFim}T00:00:00`)}`,
        margem,
        58,
      );
      const geradoEm = timestamptzParaIsoLocal(new Date().toISOString());
      doc.text(
        `Gerado por ${usuario.nome} em ${dataBr(geradoEm)} ${horaBr(geradoEm)}`,
        margem,
        72,
      );
      doc.text(
        `Total no período: ${reservasPeriodo.length}  ·  Já encerradas: ${encerradas.length}`,
        margem,
        86,
      );
      doc.setTextColor(0);

      autoTable(doc, {
        startY: 100,
        head: [
          [
            "Data",
            "Horário",
            "Veículo",
            "Motorista",
            "Solicitante",
            "Órgão",
            "Destino",
            "Status",
          ],
        ],
        body: reservasPeriodo.map((a) => [
          dataBr(a.inicio),
          a.diaTodo ? "Dia todo" : `${horaBr(a.inicio)}–${horaBr(a.fim)}`,
          nomeVeiculo(a),
          a.motoristaId ? buscarUsuario(a.motoristaId)?.nome ?? "—" : "—",
          buscarUsuario(a.solicitanteId)?.nome ?? "—",
          siglaOrgao(a),
          a.destino || "—",
          rotuloStatusAgendamento(a.status),
        ]),
        styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
        headStyles: { fillColor: [37, 47, 129], textColor: 255 },
        alternateRowStyles: { fillColor: [244, 246, 252] },
        margin: { left: margem, right: margem },
        didDrawPage: () => {
          doc.setFontSize(8);
          doc.setTextColor(120);
          doc.text(
            `Página ${doc.getNumberOfPages()}`,
            doc.internal.pageSize.getWidth() - margem,
            doc.internal.pageSize.getHeight() - 12,
            { align: "right" },
          );
          doc.setTextColor(0);
        },
      });

      if (reservasPeriodo.length === 0) {
        doc.setFontSize(11);
        doc.text("Nenhuma reserva neste período.", margem, 120);
      }

      doc.save(`relatorio-frota_${dataInicio}_a_${dataFim}.pdf`);
      setPdfGerado(true);
    } catch (e) {
      console.error(e);
      await avisar({
        titulo: "Falha ao gerar o PDF",
        mensagem: "Tente novamente. Se persistir, recarregue a página.",
      });
    } finally {
      setProcessando(false);
    }
  }

  async function apagar() {
    if (!periodoValido || encerradas.length === 0) return;
    const ok = await confirmar({
      titulo: `Apagar ${encerradas.length} reserva${encerradas.length === 1 ? "" : "s"} encerrada${encerradas.length === 1 ? "" : "s"}?`,
      mensagem:
        `Serão removidas do sistema as reservas já encerradas de ${dataBr(`${dataInicio}T00:00:00`)} a ${dataBr(`${dataFim}T00:00:00`)}. ` +
        "Viagens futuras ou em andamento NÃO serão tocadas. Esta ação é irreversível — guarde o PDF que você baixou.",
      destrutivo: true,
      rotuloOk: "Apagar definitivamente",
    });
    if (!ok) return;

    setProcessando(true);
    try {
      const r = await apagarReservasEncerradas(dataInicio, dataFim);
      if (!r.ok) {
        await avisar({ titulo: "Não foi possível apagar", mensagem: r.erro });
        return;
      }
      await recarregar();
      setPdfGerado(false);
      await avisar({
        titulo: "Reservas apagadas",
        mensagem: `${r.apagadas} reserva${r.apagadas === 1 ? "" : "s"} encerrada${r.apagadas === 1 ? "" : "s"} removida${r.apagadas === 1 ? "" : "s"}. O espaço foi liberado.`,
      });
    } catch {
      await avisar({
        titulo: "Falha",
        mensagem: "Não foi possível apagar. Verifique a conexão e tente de novo.",
      });
    } finally {
      setProcessando(false);
    }
  }

  return (
    <Card className="border-primary/30">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 text-primary p-2">
            <CalendarRange className="size-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Exportar e limpar
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 rounded px-1.5 py-0.5">
                <ShieldCheck className="size-3" /> Só Master
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Gere o PDF de um período e, depois, apague do sistema as reservas
              já encerradas desse período — sem perder o registro e liberando
              espaço.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rel-inicio">Data inicial</Label>
            <Input
              id="rel-inicio"
              type="date"
              value={dataInicio}
              max={dataFim || undefined}
              onChange={(e) => aoMudarPeriodo(setDataInicio, e.target.value)}
              className="w-[170px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rel-fim">Data final</Label>
            <Input
              id="rel-fim"
              type="date"
              value={dataFim}
              min={dataInicio || undefined}
              onChange={(e) => aoMudarPeriodo(setDataFim, e.target.value)}
              className="w-[170px]"
            />
          </div>
        </div>

        {periodoValido ? (
          <p className="text-sm">
            <strong>{reservasPeriodo.length}</strong> reserva
            {reservasPeriodo.length === 1 ? "" : "s"} no período —{" "}
            <strong>{encerradas.length}</strong> já encerrada
            {encerradas.length === 1 ? "" : "s"} (apagáveis).
          </p>
        ) : (
          <p className="text-sm text-destructive">
            A data inicial precisa ser igual ou anterior à final.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            onClick={baixarPdf}
            disabled={!periodoValido || processando}
            className="gap-2"
          >
            {processando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileDown className="size-4" />
            )}
            Baixar PDF do período
          </Button>

          <Button
            variant="destructive"
            onClick={apagar}
            disabled={!pdfGerado || encerradas.length === 0 || processando}
            className="gap-2"
            title={
              !pdfGerado
                ? "Baixe o PDF primeiro"
                : encerradas.length === 0
                  ? "Nenhuma reserva encerrada no período"
                  : undefined
            }
          >
            <Trash2 className="size-4" />
            Apagar encerradas do período
          </Button>

          {!pdfGerado && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="size-3.5" />
              Baixe o PDF para liberar o botão de apagar.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
