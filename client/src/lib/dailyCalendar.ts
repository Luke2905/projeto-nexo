/** Calendar follows the server's UTC day, independent of the browser timezone. */
export function dailyCalendarMonth(today: string) {
  const month = today.slice(0, 7);
  const first = new Date(`${month}-01T12:00:00Z`);
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  const offset = first.getUTCDay();
  const count = last.getUTCDate();
  return {
    label: new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(first),
    cells: Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
      const day = index - offset + 1;
      return day < 1 || day > count ? null : { day, date: `${month}-${String(day).padStart(2, "0")}` };
    }),
  };
}
