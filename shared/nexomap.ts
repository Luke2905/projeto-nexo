export const ACHIEVEMENTS = [
  {
    id: "first",
    title: "Primeiro nexo",
    badge: "Faísca",
    path: "descoberta",
    goal: 1,
    metric: "solved",
    description: "Resolva seu primeiro desafio.",
    xp: 100,
  },
  {
    id: "explorer",
    title: "Explorador",
    badge: "Bússola",
    path: "descoberta",
    goal: 5,
    metric: "solved",
    description: "Resolva 5 desafios diferentes.",
    xp: 150,
  },
  {
    id: "cartographer",
    title: "Cartógrafo",
    badge: "Mapa",
    path: "descoberta",
    goal: 10,
    metric: "solved",
    description: "Resolva 10 desafios diferentes.",
    xp: 250,
  },
  {
    id: "horizon",
    title: "Novos horizontes",
    badge: "Horizonte",
    path: "descoberta",
    goal: 30,
    metric: "solved",
    description: "Resolva 30 desafios diferentes.",
    xp: 400,
  },
  {
    id: "spark",
    title: "Primeiro fogo",
    badge: "Chama",
    path: "constância",
    goal: 3,
    metric: "longestStreak",
    description: "Resolva o diário do dia por 3 dias seguidos (UTC).",
    xp: 150,
  },
  {
    id: "week",
    title: "Uma semana de nexos",
    badge: "Sol",
    path: "constância",
    goal: 7,
    metric: "longestStreak",
    description: "Resolva o diário do dia por 7 dias seguidos (UTC).",
    xp: 300,
  },
  {
    id: "target",
    title: "No alvo",
    badge: "Mira",
    path: "precisão",
    goal: 1,
    metric: "precise",
    description: "Resolva em até 5 palpites, sem recomeçar.",
    xp: 200,
  },
  {
    id: "sharp",
    title: "Olhar afiado",
    badge: "Estrela",
    path: "precisão",
    goal: 5,
    metric: "precise",
    description: "Resolva 5 desafios em até 5 palpites, sem recomeçar.",
    xp: 350,
  },
] as const;
export const TITLES = [
  { id: "iniciante", label: "Mente curiosa", achievement: null },
  ...ACHIEVEMENTS.map(a => ({ id: a.id, label: a.title, achievement: a.id })),
];
export type Visibility = "public" | "friends" | "private";
export function canViewMap(
  visibility: Visibility,
  owner: boolean,
  friend: boolean,
  blocked: boolean
) {
  return (
    owner ||
    (!blocked &&
      (visibility === "public" || (visibility === "friends" && friend)))
  );
}
export type ProgressSession = {
  challengeId: string;
  solved: number;
  guesses: number;
  retryCount: number;
  hintPenalty: number;
  verified: number;
  completedAt: Date | string | null;
};
const utcDay = (date: Date | string) =>
  new Date(date).toISOString().slice(0, 10);
export function calculateProgress(
  sessions: ProgressSession[],
  now = new Date()
) {
  const solved = Array.from(
    new Map(
      sessions.filter(s => s.solved).map(s => [s.challengeId, s])
    ).values()
  );
  const totalHintPenalty = solved.reduce((sum, s) => sum + (s.hintPenalty || 0), 0);
  const precise = solved.filter(
    s => s.verified && s.guesses > 0 && s.guesses <= 5 && s.retryCount === 0
  ).length;
  const dailyDays = Array.from(
    new Set(
      solved
        .filter(
          s =>
            s.verified &&
            s.completedAt &&
            s.challengeId === `daily-${utcDay(s.completedAt)}`
        )
        .map(s => utcDay(s.completedAt!))
    )
  ).sort();
  let longestStreak = 0,
    run = 0,
    previous = -Infinity;
  for (const date of dailyDays) {
    const day = Date.parse(date) / 86400000;
    run = day === previous + 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = day;
  }
  const today = Date.parse(utcDay(now)) / 86400000;
  const streak = previous >= today - 1 && previous <= today ? run : 0;
  const metrics = { solved: solved.length, precise, longestStreak };
  const achievements = ACHIEVEMENTS.map(a => ({
    ...a,
    progress: Math.min(a.goal, metrics[a.metric]),
    unlocked: metrics[a.metric] >= a.goal,
  }));
  const xp = Math.max(0, 
    solved.length * 100 +
    achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.xp, 0) -
    totalHintPenalty
  );
  const weekStart = new Date(`${utcDay(now)}T00:00:00Z`);
  weekStart.setUTCDate(
    weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7)
  );
  const weekly = solved.filter(
    s =>
      s.verified &&
      s.completedAt &&
      new Date(s.completedAt) >= weekStart &&
      new Date(s.completedAt) <= now
  ).length;
  const activity = Array.from({ length: 28 }, (_, i) => {
    const day = new Date(`${utcDay(now)}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() - 27 + i);
    const date = utcDay(day);
    return {
      date,
      count: solved.filter(
        s => s.verified && s.completedAt && utcDay(s.completedAt) === date
      ).length,
    };
  });
  return {
    solved: solved.length,
    precise,
    streak,
    longestStreak,
    weekly,
    xp,
    level: Math.floor(xp / 500) + 1,
    achievements,
    activity,
    legacy: solved.filter(s => !s.verified).length,
  };
}
