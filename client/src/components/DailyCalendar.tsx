import { CalendarDays, Check, X } from "lucide-react";
import { dailyCalendarMonth } from "@/lib/dailyCalendar";
import "./daily-calendar.css";

export type DailyCalendarStatus = "available" | "progress" | "solved" | "lost";
type Props = {
  today: string;
  days: { challengeId: string; status: DailyCalendarStatus }[];
  activeId: string | null;
  disabled: boolean;
  onSelect: (id: string) => void;
};
const weekdays = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const statusLabels = { available: "disponível", progress: "em andamento", solved: "concluído", lost: "perdido" };

export default function DailyCalendar({ today, days, activeId, disabled, onSelect }: Props) {
  const { label, cells } = dailyCalendarMonth(today);
  const statuses = new Map(days.map(day => [day.challengeId, day.status]));
  const completed = days.filter(day => day.status === "solved").length;

  return (
    <section className="daily-calendar" aria-label={`Calendário de desafios: ${label}`}>
      <header className="daily-calendar-heading">
        <div><span>seu mês de palavras</span><h2>{label}</h2></div>
        <CalendarDays size={18} aria-hidden="true" />
      </header>
      <div className="daily-calendar-weekdays" aria-hidden="true">
        {weekdays.map(day => <abbr key={day} title={day}>{day.slice(0, 1).toUpperCase()}</abbr>)}
      </div>
      <div className="daily-calendar-grid" role="group" aria-label="Escolha um dia">
        {cells.map((cell, index) => {
          if (!cell) return <span key={`empty-${index}`} aria-hidden="true" />;
          const id = `daily-${cell.date}`;
          const status = statuses.get(id);
          const available = Boolean(status) && cell.date <= today;
          const isToday = cell.date === today;
          const selected = activeId === id;
          const dateLabel = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${cell.date}T12:00:00Z`));
          const description = `${dateLabel}${isToday ? ", hoje" : ""}: ${available && status ? statusLabels[status] : "ainda não disponível"}`;
          return (
            <button key={id} type="button"
              className={`daily-calendar-day${isToday ? " is-today" : ""}${selected ? " is-selected" : ""}${status ? ` is-${status}` : ""}`}
              disabled={!available || disabled} aria-label={description} title={description}
              aria-pressed={selected} aria-current={isToday ? "date" : undefined}
              onClick={() => onSelect(id)}>
              <span>{cell.day}</span>
              {status === "solved" ? <Check className="day-status" size={10} aria-hidden="true" />
                : status === "lost" ? <X className="day-status" size={10} aria-hidden="true" />
                : status === "progress" ? <i className="day-status progress-dot" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
      <div className="daily-calendar-legend">
        <span><i className="legend-today" />hoje</span>
        <span><Check size={11} />concluído</span>
        <span><i className="progress-dot" />em jogo</span>
        {days.some(day => day.status === "lost") && <span><X size={11} />perdido</span>}
      </div>
      <p className="daily-calendar-note">{completed} de {days.length} concluídos<span>Um novo desafio a cada dia.</span></p>
    </section>
  );
}
