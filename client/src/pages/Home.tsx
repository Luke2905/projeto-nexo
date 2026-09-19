import { normalizeWord } from "@shared/words";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Flame,
  History,
  Lightbulb,
  LoaderCircle,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import AppearanceSwitcher from "@/components/AppearanceSwitcher";
import DailyCalendar, { type DailyCalendarStatus } from "@/components/DailyCalendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import WelcomeModal from "@/components/WelcomeModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useVisualTheme } from "@/contexts/VisualThemeContext";

type Mode = "daily" | "themes";

type Guess = {
  word: string;
  rank: number;
  proximity: number;
  tag?: string;
};

function colorForRank(rank: number) {
  if (rank === 1) return "hot";
  if (rank <= 5) return "warm";
  if (rank <= 15) return "near";
  return "cool";
}

function accentClass(accent: string) {
  return `accent-${accent}`;
}

export default function Home() {
  const { visualTheme } = useVisualTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const utils = trpc.useUtils();

  // ── Server queries ──────────────────────────────────────────────────────────
  const daily = trpc.challenges.getDaily.useQuery(undefined, { refetchInterval: 60_000 });
  const archive = trpc.challenges.getDailyArchive.useQuery(undefined, { refetchInterval: 60_000 });
  const themes = trpc.challenges.getThemes.useQuery();
  const gameHistory = trpc.games.history.useQuery(undefined, { enabled: isAuthenticated, retry: false });

  // ── Mutations ───────────────────────────────────────────────────────────────
  const submitGuessMutation = trpc.challenges.submitGuess.useMutation();
  const savedGuess = trpc.games.guess.useMutation();
  const closeHintMutation = trpc.games.useCloseHint.useMutation();
  const giveUp = trpc.games.giveUp.useMutation({
    onError: cause => setNotice(cause.message),
    onSuccess: () => {
      utils.games.history.invalidate();
      if (activeId) drafts.current.delete(`${user?.id ?? "guest"}:${activeId}`);
      setGuesses([]);
      setNotice("Dia marcado como perdido. Você ainda pode tentar novamente.");
    },
  });
  const retryGame = trpc.games.retry.useMutation({
    onSuccess: () => {
      utils.games.history.invalidate();
      if (activeId) drafts.current.delete(`${user?.id ?? "guest"}:${activeId}`);
      setGuesses([]);
      setNotice("Nova tentativa liberada. O mapa foi reiniciado.");
    },
    onError: (cause) => setNotice(cause.message),
  });

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("daily");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [notice, setNotice] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [latestWord, setLatestWord] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [hintDialogOpen, setHintDialogOpen] = useState(false);
  const pendingRequest = useRef<{ challengeId: string; word: string; requestId: string } | null>(null);
  const drafts = useRef(new Map<string, Guess[]>());
  const draftKey = `${user?.id ?? "guest"}:${activeId}`;
  const archiveDays = archive.data?.challenges ?? [];
  // A selected day can move outside this month's archive at midnight/month end.
  const selectedDaily = trpc.challenges.getDaily.useQuery(
    { date: activeId?.slice(6) ?? "" },
    { enabled: Boolean(activeId?.startsWith("daily-") && activeId !== daily.data?.challengeId && !archiveDays.some(day => day.challengeId === activeId)), staleTime: Infinity },
  );
  const submitting = submitGuessMutation.isPending || savedGuess.isPending;
  const switchingDisabled = submitting || hintLoading || giveUp.isPending || retryGame.isPending;

  useEffect(() => {
    if (!celebrating) return;
    const timeout = window.setTimeout(() => setCelebrating(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [celebrating]);

  useEffect(() => {
    setLatestWord(null);
    setCelebrating(false);
  }, [activeId]);

  // Set activeId to today's daily once it loads
  useEffect(() => {
    if (daily.data && !activeId) {
      setActiveId(daily.data.challengeId);
    }
  }, [daily.data, activeId]);

  // ── Derived state ───────────────────────────────────────────────────────────
  const allThemes = themes.data ?? [];
  const activeChallenge = useMemo(() => {
    if (!activeId) return null;
    if (activeId === daily.data?.challengeId) return daily.data ? { ...daily.data, kind: "Diário" as const } : null;
    if (activeId.startsWith("daily-")) {
      const day = archiveDays.find(day => day.challengeId === activeId) ?? selectedDaily.data;
      return day ? { ...day, kind: "Diário" as const } : null;
    }
    const theme = allThemes.find((t) => t.id === activeId);
    return theme ? { ...theme, challengeId: theme.id, kind: "Tema" as const } : null;
  }, [activeId, daily.data, allThemes, archive.data, selectedDaily.data]);

  // Disabled queries retain cached results; only expose history for a session.
  const history = useMemo(
    () => isAuthenticated ? gameHistory.data ?? [] : [],
    [isAuthenticated, gameHistory.data],
  );
  const historyMap = useMemo(
    () => new Map(history.map((entry) => [entry.challengeId, entry])),
    [history],
  );
  const activeRecord = activeId ? historyMap.get(activeId) : undefined;
  const solved = guesses.some((g) => g.rank === 1);
  const lost = Boolean(activeRecord?.lost);
  const orderedGuesses = useMemo(() => [...guesses].sort((a, b) => a.rank - b.rank), [guesses]);
  const bestGuess = orderedGuesses[0];
  const calendarDays = archiveDays.map(day => {
    const record = historyMap.get(day.challengeId);
    const local = drafts.current.get(`${user?.id ?? "guest"}:${day.challengeId}`);
    const status: DailyCalendarStatus = record?.solved || local?.some(guess => guess.rank === 1) ? "solved"
      : record?.lost ? "lost" : (record?.guesses ?? 0) > 0 || local?.length ? "progress" : "available";
    return { challengeId: day.challengeId, status };
  });

  // Restore progress when switching challenges
  useEffect(() => {
    if (!activeId) return;
    setInput("");
    setNotice("");
    const record = historyMap.get(activeId);
    if (record?.solved) {
      // Show a placeholder solved state (we don't store the answer)
      setGuesses([{ word: "✓", rank: 1, proximity: 100, tag: "solução" }]);
      setNotice(`Você já concluiu este desafio em ${record.guesses} tentativas.`);
    } else if (record?.lost) {
      setGuesses([]);
      setNotice(`Dia perdido. Tentativa ${record.retryCount} de 3 disponível.`);
    } else if (drafts.current.has(draftKey)) {
      setGuesses(drafts.current.get(draftKey)!);
    } else if (record?.progressJson) {
      try {
        const saved = JSON.parse(record.progressJson) as Guess[];
        setGuesses(Array.isArray(saved) ? saved : []);
        if (saved.length) setNotice("Partida retomada de onde você parou.");
      } catch {
        setGuesses([]);
      }
    } else {
      setGuesses([]);
    }
  }, [activeId, historyMap, draftKey]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  function selectChallenge(id: string, kind: "Diário" | "Tema") {
    if (switchingDisabled) return;
    setActiveId(id);
    setMode(kind === "Diário" ? "daily" : "themes");
  }

  async function submitGuess(event?: React.FormEvent) {
    event?.preventDefault();
    const word = input.trim();
    if (!word || !activeId || solved || lost || submitting) return;
    if (guesses.some((g) => normalizeWord(g.word) === normalizeWord(word))) {
      setNotice("Essa palavra já está no seu mapa de pistas.");
      return;
    }

    try {
      if (pendingRequest.current?.challengeId !== activeId || pendingRequest.current.word !== word) {
        pendingRequest.current = { challengeId: activeId, word, requestId: crypto.randomUUID() };
      }
      const result = isAuthenticated
        ? await savedGuess.mutateAsync(pendingRequest.current)
        : await submitGuessMutation.mutateAsync({ challengeId: activeId, word }).then(result => ({ ...result, guesses: [result, ...guesses], awards: [] as string[] }));
      pendingRequest.current = null;
      const nextGuesses = result.guesses;
      drafts.current.set(draftKey, nextGuesses);
      setGuesses(nextGuesses);
      setLatestWord(result.word);
      setCelebrating(result.solved);
      setInput("");
      setNotice(result.solved ? "Você encontrou a palavra secreta." : "Pista registrada. Continue aproximando.");

      if (isAuthenticated) {
        await Promise.all([utils.games.history.invalidate(), utils.nexomap.invalidate()]);
        if (result.awards.length) setNotice("Nova conquista: " + result.awards.join(", ") + "! Veja seu NexoMap.");
      }
    } catch (err: any) {
      setNotice(err?.message ?? "Algo deu errado. Tente novamente.");
    }
  }

  async function showHint() {
    if (!activeId) return;
    setHintLoading(true);
    try {
      const res = await utils.challenges.getHint.fetch({ challengeId: activeId });
      setNotice(`Dica sutil: ${res.hint}`);
    } catch {
      setNotice("Não foi possível carregar a dica agora.");
    } finally {
      setHintLoading(false);
    }
  }

  async function handleCloseHint() {
    if (!activeId) return;
    setHintDialogOpen(false);
    try {
      const result = await closeHintMutation.mutateAsync({ challengeId: activeId, requestId: crypto.randomUUID() });
      if (!result.duplicate && result.word) {
        setNotice(`Palavra próxima revelada: ${result.word.toUpperCase()} (-10 XP no mapa)`);
        const nextGuesses = result.guesses as Guess[];
        drafts.current.set(draftKey, nextGuesses);
        setGuesses(nextGuesses);
      }
    } catch (err: any) {
      setNotice(err?.message ?? "Algo deu errado ao revelar a palavra.");
    }
  }

  function handleGiveUp() {
    if (!isAuthenticated) { setNotice("Entre ou crie uma conta para salvar a desistência."); return; }
    if (activeId) giveUp.mutate({ challengeId: activeId });
  }

  function handleRetry() {
    if (!isAuthenticated) { setNotice("Entre ou crie uma conta para tentar novamente."); return; }
    if (activeId) retryGame.mutate({ challengeId: activeId });
  }

  function resetGame() {
    drafts.current.set(draftKey, []);
    setLatestWord(null);
    setCelebrating(false);
    setGuesses([]);
    setInput("");
    setNotice("Novo mapa aberto. Boa investigação.");
  }

  // ── Render helpers ──────────────────────────────────────────────────────────
  const displayDate = activeChallenge?.kind === "Diário"
    ? new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(
      new Date(`${activeChallenge.challengeId.replace("daily-", "")}T12:00:00Z`),
    )
    : "…";

  const dailyLabel = daily.data?.label ?? "hoje";
  const challengeAccent = activeChallenge?.accent ?? "coral";
  const challengePrompt = activeChallenge?.prompt ?? "";

  function renderCalendar() {
    if (archive.isError) return <button className="text-button" onClick={() => archive.refetch()}>Recarregar calendário</button>;
    if (!archive.data) return <p className="archive-note" role="status">Carregando calendário…</p>;
    return <DailyCalendar today={archive.data.today} days={calendarDays} activeId={activeId}
      disabled={switchingDisabled} onSelect={id => {
        selectChallenge(id, "Diário");
        setCalendarOpen(false);
      }} />;
  }

  return (
    <main className="app-shell min-h-screen overflow-hidden">
      <WelcomeModal isAuthenticated={isAuthenticated} />
      <div className="ambient-orb orb-one" />
      <div className="ambient-orb orb-two" />
      <div className="app-frame">
        <header className="topbar">
          <Link href="/" className="brand-lockup hover:opacity-95 transition-opacity cursor-pointer" aria-label="Nexo Início">
            <img src="/nexo-logo.png" alt="Nexo" className="brand-logo-img" />
            <div>
              <div className="brand-name">NEXO</div>
              <div className="brand-subtitle">mapeando palavras</div>
            </div>
          </Link>
          <div className="topbar-actions">
            <AppearanceSwitcher />
            <div className="streak-chip"><Flame size={15} fill="currentColor" /> <strong>{history.filter((g) => g.solved).length}</strong><span>resolvidos</span></div>
            {isAuthenticated && (
              <>
                <Link href="/nexomap" className="friends-top-link"><User size={14} /> NexoMap</Link>
                <Link href="/comunidade" className="friends-top-link"><Users size={14} /> Comunidade</Link>
              </>
            )}
            <Link href={isAuthenticated ? "/perfil" : "/cadastro"} className="avatar-button" aria-label={isAuthenticated ? "Abrir perfil" : "Criar cadastro"}>{user?.avatarUrl ? <img src={user.avatarUrl} alt="Seu perfil" /> : user?.name?.slice(0, 2).toUpperCase() ?? "ID"}</Link>
          </div>
        </header>

        <div className="mobile-nav" aria-label="Navegação mobile">
          <div className="mobile-mode-tabs">
            <button className={mode === "daily" ? "mobile-tab active" : "mobile-tab"} onClick={() => setMode("daily")}>
              <CalendarDays size={14} /> diário
            </button>
            <button className={mode === "themes" ? "mobile-tab active" : "mobile-tab"} onClick={() => setMode("themes")}>
              <Sparkles size={14} /> temas
            </button>
          </div>
          {mode === "themes" ? (
            <div className="mobile-theme-scroll">
              {allThemes.map((theme) => (
                <button
                  className={activeId === theme.id ? `mobile-theme-chip active ${theme.accent}` : `mobile-theme-chip ${theme.accent}`}
                  key={theme.id}
                  onClick={() => selectChallenge(theme.id, "Tema")}
                >
                  <span />{theme.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="mobile-daily-picker">
              {daily.data && (
                <button
                  className={activeId === daily.data.challengeId ? "mobile-theme-chip active coral" : "mobile-theme-chip coral"}
                  onClick={() => selectChallenge(daily.data!.challengeId, "Diário")}
                  disabled={switchingDisabled}
                >
                  <span />Hoje
                </button>
              )}
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button className="daily-calendar-trigger" type="button" aria-label="Abrir calendário de desafios">
                    <CalendarDays size={17} />
                    <span>{activeChallenge?.kind === "Diário" && activeId !== daily.data?.challengeId ? activeChallenge.label.split(" · ")[0] : "Calendário"}</span>
                    <ChevronRight size={15} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="daily-calendar-popover" align="end" sideOffset={8} collisionPadding={12} aria-label="Calendário de desafios">
                  {renderCalendar()}
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <div className="content-grid">
          <aside className="side-rail">
            <div className="rail-heading">
              <span>jogar</span>
              <span className="rail-count">{(archiveDays.length || 1) + allThemes.length} mapas</span>
            </div>
            <nav className="mode-switcher" aria-label="Modos de jogo">
              <button className={mode === "daily" ? "mode-button active" : "mode-button"} onClick={() => setMode("daily")}>
                <CalendarDays size={17} />
                <span><b>Desafio diário</b><small>uma palavra por dia</small></span>
                {mode === "daily" && <ChevronRight size={16} className="mode-chevron" />}
              </button>
              <button className={mode === "themes" ? "mode-button active" : "mode-button"} onClick={() => setMode("themes")}>
                <Sparkles size={17} />
                <span><b>Temas</b><small>jogue do seu jeito</small></span>
                {mode === "themes" && <ChevronRight size={16} className="mode-chevron" />}
              </button>
            </nav>

            <div className="rail-section-label">{mode === "daily" ? "arquivo diário" : "explore por tema"}</div>
            <div className="challenge-list">
              {mode === "daily" ? (
                <>
                  {daily.data ? (
                    <button
                      className={activeId === daily.data.challengeId ? "challenge-row selected" : "challenge-row"}
                      onClick={() => selectChallenge(daily.data!.challengeId, "Diário")}
                    >
                      <span className="challenge-icon coral"><Target size={15} /></span>
                      <span className="challenge-copy"><b>Hoje</b><small>{dailyLabel}</small></span>
                      <span className="live-dot" />
                    </button>
                  ) : (
                    <div className="challenge-row muted-row"><span className="challenge-icon ghost"><History size={14} /></span><span className="challenge-copy"><b>Carregando…</b></span></div>
                  )}
                  {renderCalendar()}
                </>
              ) : (
                allThemes.map((theme) => (
                  <button
                    className={activeId === theme.id ? "challenge-row selected" : "challenge-row"}
                    key={theme.id}
                    onClick={() => selectChallenge(theme.id, "Tema")}
                  >
                    <span className={`challenge-icon ${theme.accent}`}><Sparkles size={14} /></span>
                    <span className="challenge-copy"><b>{theme.label}</b><small>{theme.description}</small></span>
                    {activeId === theme.id && <ChevronRight size={15} className="row-check" />}
                  </button>
                ))
              )}
            </div>

            <div className="rail-footer">
              <div className="mini-stat"><span>palavras descobertas</span><strong>{history.filter((g) => g.solved).length}</strong></div>
              <div className="mini-stat"><span>total de tentativas</span><strong>{history.reduce((acc, g) => acc + g.guesses, 0)}</strong></div>
            </div>
          </aside>

          <section className="game-stage">
            <div className="stage-meta">
              <span className={`eyebrow-pill ${accentClass(challengeAccent)}`}>
                <span className="eyebrow-dot" />
                {activeChallenge?.kind === "Diário" ? "desafio diário" : activeChallenge?.label?.toLocaleLowerCase("pt-BR") ?? "…"}
              </span>
              <span className="date-label">
                {activeChallenge?.kind === "Diário" ? displayDate : "mapa temático"}
              </span>
            </div>

            <div className={`game-card${celebrating ? " is-celebrating" : ""}`}>
              {celebrating && visualTheme === "cartoon" && <div className="cartoon-confetti" aria-hidden="true">
                {Array.from({ length: 12 }, (_, index) => <i key={index} style={{ "--piece": index } as React.CSSProperties} />)}
              </div>}
              <div className="game-card-head">
                <div>
                  <p className="card-kicker">{visualTheme === "cartoon" && <Target size={13} />}encontre a palavra</p>
                  <h1>{activeChallenge?.kind === "Diário" ? activeId === daily.data?.challengeId ? "Qual é a palavra de hoje?" : `Qual é a palavra de ${activeChallenge.label.split(" · ")[0]}?` : `Qual é a palavra de ${activeChallenge?.label?.toLocaleLowerCase("pt-BR") ?? "…"}?`}</h1>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="attempt-badge"><span>tentativas</span><strong key={guesses.length}>{guesses.length.toString().padStart(2, "0")}</strong></div>
                  <div className="flex items-center gap-2">
                    <button onClick={showHint} disabled={hintLoading || lost} className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#ff9fad] to-[#ffc5cc] text-[#300a12] text-[13px] font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow-md disabled:opacity-50"><Lightbulb size={15} fill="currentColor" /> {hintLoading ? "buscando..." : "Dica"}</button>
                    {isAuthenticated && (
                      <button onClick={() => setHintDialogOpen(true)} disabled={closeHintMutation.isPending || lost || solved} className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#e0e0e0] to-[#f5f5f5] text-[#333] border border-[#d0d0d0] text-[13px] font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow-md disabled:opacity-50">
                        <Search size={15} /> Revelar Próxima
                      </button>
                    )}
                  </div>
                </div>
              </div>



              <form className="guess-form" onSubmit={submitGuess} aria-busy={submitting}>
                <Search size={19} className="search-icon" />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Digite uma palavra..."
                  aria-label="Digite uma palavra"
                  autoComplete="off"
                  disabled={!activeChallenge || solved || lost || submitting}
                />
                <button type="submit" aria-label={submitting ? "Enviando palpite" : "Enviar palpite"} disabled={!activeChallenge || solved || lost || submitting}>
                  {submitGuessMutation.isPending ? <LoaderCircle size={19} className="guess-loader" /> : <ArrowRight size={19} />}
                </button>
              </form>
              <div className="form-hint"><span>enter</span> para enviar <i /> <span>ex.</span> história, objeto, lugar...</div>
              {notice && <div key={notice} className={solved ? "notice success" : "notice"} role="status" aria-live="polite">{solved ? <Check size={14} /> : <Lightbulb size={14} />}{notice}</div>}

              <div className="result-area">
                {solved ? (
                  <div className="solved-panel">
                    <div className="solved-icon"><Trophy size={25} /></div>
                    <div>{visualTheme === "cartoon" && <strong>É isso. Nexo feito!</strong>}<span>palavra encontrada em {activeRecord?.solved ? activeRecord.guesses : guesses.length} tentativas</span></div>
                    <button onClick={resetGame} className="text-button">jogar de novo <RotateCcw size={14} /></button>
                  </div>
                ) : lost ? (
                  <div className="lost-panel">
                    <div className="lost-icon"><RotateCcw size={23} /></div>
                    <div>
                      <span>este dia foi marcado como perdido</span>
                      <strong>Você pode tentar novamente</strong>
                      <small>{activeRecord?.retryCount ?? 0} de 3 recomeços usados</small>
                    </div>
                    <button onClick={handleRetry} className="text-button" disabled={retryGame.isPending || (activeRecord?.retryCount ?? 0) >= 3}>
                      {(activeRecord?.retryCount ?? 0) >= 3 ? "limite atingido" : retryGame.isPending ? "abrindo..." : "tentar novamente"} <RotateCcw size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="result-header"><span>suas palavras</span><span className="result-sort">mais próximas primeiro <ChevronRight size={13} /></span></div>
                    {orderedGuesses.length > 0 ? (
                      <div className="guess-list">
                        {orderedGuesses.map((guess) => (
                          <div className={`guess-item${guess.word === latestWord ? " is-latest" : ""}`} key={guess.word}>
                            <div className="guess-rank">{guess.rank.toString().padStart(2, "0")}</div>
                            <div className="guess-word"><strong>{guess.word}</strong><small>{guess.tag}</small></div>
                            <div className="heat-track"><span className={`heat-fill ${colorForRank(guess.rank)}`} style={{ width: `${guess.proximity}%` }} /></div>
                            <div className="guess-score">{guess.proximity}<small>%</small></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        {visualTheme === "cartoon" ? <div className="map-mascot" aria-hidden="true">
                          <svg viewBox="0 0 88 88" fill="none">
                            <path d="m14 27 20-7 22 8 20-7-5 47-20 8-23-9-19 8Z" fill="#142b37" stroke="#6bbfb9" strokeWidth="2" strokeLinejoin="round" />
                            <path d="m34 20-6 47-19 8 5-48Z" fill="#342039" stroke="#aa648f" strokeWidth="1.5" strokeLinejoin="round" />
                            <path d="m56 28 20-7-5 47-20 8Z" fill="#15333d" stroke="#6bbfb9" strokeWidth="1.5" strokeLinejoin="round" />
                            <path d="m17 60 8-8m30 10 8-9" stroke="#a5e7dd" strokeWidth="2" strokeDasharray="3 4" strokeLinecap="round" />
                            <path d="m31 36 23 3-2 12-22-3Z" fill="#0a1420" stroke="#7ccdc4" strokeWidth="2" strokeLinejoin="round" />
                            <path d="m36 41-.5 3m11-2-.5 3" stroke="#c1f0e5" strokeWidth="2.5" strokeLinecap="round" />
                            <path d="m36 54 5 3 5-2" stroke="#d59cbd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="62" cy="37" r="6" fill="#281b34" stroke="#e582b4" strokeWidth="2" />
                            <circle cx="62" cy="37" r="2" fill="#efb4d1" />
                            <path d="M18 33v8m-4-4h8" stroke="#c38ba9" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M43 11h9m-5-4v9" stroke="#69c9c0" strokeWidth="1.5" strokeLinecap="round" opacity=".6" />
                          </svg>
                        </div> : <div className="empty-ring" aria-hidden="true"><Target size={20} /></div>}
                        <p>Seu mapa está em branco.<br /><strong>A primeira pista é sua.</strong></p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <AlertDialog open={hintDialogOpen} onOpenChange={setHintDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revelar uma palavra próxima?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso revelará uma palavra próxima da palavra secreta, mas custará <strong>-10 XP</strong> no final deste desafio.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCloseHint}>Confirmar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="card-footer items-center">
                <span><span className="legend-dot hot" /> quente = perto da resposta</span>
                <span className="card-actions">
                  <button onClick={showHint} disabled={hintLoading || lost}><Lightbulb size={14} /> {hintLoading ? "buscando dica..." : "ver dica"}</button>
                  {!solved && !lost && <button onClick={handleGiveUp} className="give-up-button" disabled={giveUp.isPending}>desistir</button>}
                </span>
              </div>
            </div>

            <div className="stage-bottom-note"><span className="small-spark">✦</span><span>cada palavra revela um pouco mais do mapa</span><span className="small-spark">✦</span></div>
          </section>

          <aside className="insight-panel">
            <div className="insight-topline"><span>seu mapa</span><span className="live-label"><i /> ao vivo</span></div>
            <div className="progress-orbit">
              <div className="orbit-glow" />
              <div className="orbit-content">
                <span>proximidade</span>
                <strong key={bestGuess?.proximity ?? "empty"}>{bestGuess ? `${bestGuess.proximity}%` : "—"}</strong>
                <small>{bestGuess ? (bestGuess.rank === 1 ? "encontrou!" : "melhor pista") : "aguardando sua primeira palavra"}</small>
              </div>
            </div>
            <div className="insight-divider" />
            <div className="insight-block"><div className="insight-label"><span className="insight-number">01</span><span>como jogar</span></div><p>Digite qualquer palavra. O número mostra o quanto ela está perto da resposta — quanto menor o ranking, melhor.</p></div>
            <div className="insight-block"><div className="insight-label"><span className="insight-number">02</span><span>uma pista</span></div><div className="tip-card"><Lightbulb size={16} /><p>Palavras com contexto parecido costumam aparecer perto umas das outras.</p></div></div>
            <div className="insight-bottom">
              <div className="score-line"><span>neste desafio você jogou</span><strong>{guesses.length} <small>palavras</small></strong></div>
              <div className="score-line"><span>modo atual</span><strong className="mode-value">{activeChallenge?.kind ?? "—"}</strong></div>
            </div>
          </aside>
        </div>

        <footer className="app-footer"><span>feito para mentes curiosas</span><span className="footer-center"><span className="brand-name" style={{ fontSize: "13px", textShadow: "none" }}>NEXO</span> <small>beta</small></span><span>sem pressa · sem limite de tentativas</span></footer>
      </div>
    </main>
  );
}
