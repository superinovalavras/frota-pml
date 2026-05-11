import {
  AgendaSemanal,
  LegendaStatus,
  ResumoFrota,
} from "@/components/agenda/agenda-semanal";

export default function AgendaPage() {
  return (
    <div>
      <div className="px-4 md:px-6 pt-6 pb-2">
        <h1 className="text-2xl font-semibold">Agenda da frota</h1>
        <p className="text-sm text-muted-foreground">
          Visualização semanal dos agendamentos de veículos.
        </p>
      </div>
      <ResumoFrota />
      <AgendaSemanal />
      <LegendaStatus />
    </div>
  );
}
