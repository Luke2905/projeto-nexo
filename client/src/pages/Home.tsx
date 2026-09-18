import { normalizeWord } from "@shared/words";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Flame,
  History,
  Lightbulb,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { Link } from "wouter";

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
  const { user, isAuthenticated, logout } = useAuth();
  const utils = trpc.useUtils();

  // ── Server queries ──────────────────────────────────────────────────────────
  const daily = trpc.challenges.getDaily.useQuery();
  const themes = trpc.challenges.getThemes.useQuery();
  const gameHistory = trpc.games.history.useQuery(undefined, { enabled: isAuthenticated, retry: false });

  // ── Mutations ───────────────────────────────────────────────────────────────
  const submitGuessMutation = trpc.challenges.submitGuess.useMutation();
  const saveProgress = trpc.games.saveProgress.useMutation({
    onSuccess: () => utils.games.history.invalidate(),
  });
  const giveUp = trpc.games.giveUp.useMutation({
    onSuccess: () => {
      utils.games.history.invalidate();
      setGuesses([]);
      setNotice("Dia marcado como perdido. Você ainda pode tentar novamente.");
    },
  });
  const retryGame = trpc.games.retry.useMutation({
    onSuccess: () => {
      utils.games.history.invalidate();
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
    const theme = allThemes.find((t) => t.id === activeId);
    return theme ? { ...theme, challengeId: theme.id, kind: "Tema" as const } : null;
  }, [activeId, daily.data, allThemes]);

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
  }, [activeId, historyMap]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  function selectChallenge(id: string, kind: "Diário" | "Tema") {
    setActiveId(id);
    setMode(kind === "Diário" ? "daily" : "themes");
  }

  async function submitGuess(event?: React.FormEvent) {
    event?.preventDefault();
    const word = input.trim();
    if (!word || !activeId || solved || lost || submitGuessMutation.isPending) return;
    if (guesses.some((g) => normalizeWord(g.word) === normalizeWord(word))) {
      setNotice("Essa palavra já está no seu mapa de pistas.");
      return;
    }

    try {
      const result = await submitGuessMutation.mutateAsync({ challengeId: activeId, word });
      const nextGuesses = [result, ...guesses];
      setGuesses(nextGuesses);
      setInput("");
      setNotice(result.solved ? "Você encontrou a palavra secreta." : "Pista registrada. Continue aproximando.");

      if (isAuthenticated) {
        saveProgress.mutate({
          challengeId: activeId,
          guesses: nextGuesses.length,
          bestRank: Math.min(...nextGuesses.map((g) => g.rank)),
          solved: result.solved,
          progressJson: result.solved ? undefined : JSON.stringify(nextGuesses),
        });
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

  function handleGiveUp() {
    if (!isAuthenticated) { setNotice("Entre ou crie uma conta para salvar a desistência."); return; }
    if (activeId) giveUp.mutate({ challengeId: activeId });
  }

  function handleRetry() {
    if (!isAuthenticated) { setNotice("Entre ou crie uma conta para tentar novamente."); return; }
    if (activeId) retryGame.mutate({ challengeId: activeId });
  }

  function resetGame() {
    setGuesses([]);
    setInput("");
    setNotice("Novo mapa aberto. Boa investigação.");
  }

  // ── Render helpers ──────────────────────────────────────────────────────────
  const displayDate = daily.data
    ? new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(
        new Date(`${daily.data.challengeId.replace("daily-", "")}T12:00:00Z`),
      )
    : "…";

  const dailyLabel = daily.data?.label ?? "hoje";
  const challengeAccent = activeChallenge?.accent ?? "coral";
  const challengePrompt = activeChallenge?.prompt ?? "";

  return (
    <main className="app-shell min-h-screen overflow-hidden">
      <div className="ambient-orb orb-one" />
      <div className="ambient-orb orb-two" />
      <div className="app-frame">
        <header className="topbar">
          <div className="brand-lockup" aria-label="Nexo Temas">
            <div className="brand-mark nexo-mark"><span>N</span><i /></div>
            <div>
              <div className="brand-name">nexo<span>•</span></div>
              <div className="brand-subtitle">mapas & palavras</div>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="streak-chip"><Flame size={15} fill="currentColor" /> <strong>{history.filter((g) => g.solved).length}</strong><span>resolvidos</span></div>
            <Link href="/amigos" className="friends-top-link">amigos</Link>
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
            <div className="mobile-theme-scroll">
              {daily.data && (
                <button
                  className={activeId === daily.data.challengeId ? "mobile-theme-chip active coral" : "mobile-theme-chip coral"}
                  onClick={() => selectChallenge(daily.data!.challengeId, "Diário")}
                >
                  <span />Hoje
                </button>
              )}
              {history.slice(0, 7).map((record) => {
                if (daily.data?.challengeId === record.challengeId) return null;
                const completed = Boolean(record.solved);
                return (
                  <button
                    key={record.id}
                    className={activeId === record.challengeId ? "mobile-theme-chip active" : "mobile-theme-chip"}
                    onClick={() => selectChallenge(record.challengeId, "Diário")}
                  >
                    <span />{record.challengeId.replace("daily-", "")} {completed && <Check size={12} style={{marginLeft: 4}} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="content-grid">
          <aside className="side-rail">
            <div className="rail-heading">
              <span>jogar</span>
              <span className="rail-count">{1 + allThemes.length} mapas</span>
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
                  <div className="calendar-heading"><CalendarDays size={13} /> histórico de partidas</div>
                  <div className="challenge-list">
                    {history.slice(0, 7).map((record) => {
                      const completed = Boolean(record.solved);
                      return (
                        <div className="challenge-row muted-row" key={record.id}>
                          <span className={completed ? "challenge-icon done" : "challenge-icon ghost"}>{completed ? <Check size={14} /> : <History size={14} />}</span>
                          <span className="challenge-copy">
                            <b>{record.challengeId.replace("daily-", "")}</b>
                            <small>{completed ? `resolvido em ${record.guesses}` : record.lost ? `perdido · ${3 - (record.retryCount ?? 0)} tentativas` : "em andamento"}</small>
                          </span>
                          {completed && <Check size={15} className="row-check" />}
                        </div>
                      );
                    })}
                  </div>
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

            <div className="game-card">
              <div className="game-card-head">
                <div>
                  <p className="card-kicker">encontre a palavra</p>
                  <h1>{activeChallenge?.kind === "Diário" ? "Qual é a palavra de hoje?" : `Qual é a palavra de ${activeChallenge?.label?.toLocaleLowerCase("pt-BR") ?? "…"}?`}</h1>
                </div>
                <div className="attempt-badge"><span>tentativas</span><strong>{guesses.length.toString().padStart(2, "0")}</strong></div>
              </div>



              <form className="guess-form" onSubmit={submitGuess}>
                <Search size={19} className="search-icon" />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Digite uma palavra..."
                  aria-label="Digite uma palavra"
                  autoComplete="off"
                  disabled={solved || lost || submitGuessMutation.isPending}
                />
                <button type="submit" aria-label="Enviar palpite" disabled={submitGuessMutation.isPending}>
                  <ArrowRight size={19} />
                </button>
              </form>
              <div className="form-hint"><span>enter</span> para enviar <i /> <span>ex.</span> história, objeto, lugar...</div>
              {notice && <div className={solved ? "notice success" : "notice"} role="status" aria-live="polite">{solved ? <Check size={14} /> : <Lightbulb size={14} />}{notice}</div>}

              <div className="result-area">
                {solved ? (
                  <div className="solved-panel">
                    <div className="solved-icon"><Trophy size={25} /></div>
                    <div><span>palavra encontrada em {guesses.length} tentativas</span></div>
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
                        {orderedGuesses.map((guess, index) => (
                          <div className="guess-item" key={`${guess.word}-${index}`}>
                            <div className="guess-rank">{guess.rank.toString().padStart(2, "0")}</div>
                            <div className="guess-word"><strong>{guess.word}</strong><small>{guess.tag}</small></div>
                            <div className="heat-track"><span className={`heat-fill ${colorForRank(guess.rank)}`} style={{ width: `${guess.proximity}%` }} /></div>
                            <div className="guess-score">{guess.proximity}<small>%</small></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state"><div className="empty-ring"><Target size={20} /></div><p>Seu mapa está em branco.<br /><strong>A primeira pista é sua.</strong></p></div>
                    )}
                  </>
                )}
              </div>

              <div className="card-footer">
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
                <strong>{bestGuess ? `${bestGuess.proximity}%` : "—"}</strong>
                <small>{bestGuess ? (bestGuess.rank === 1 ? "encontrou!" : "melhor pista") : "aguardando sua primeira palavra"}</small>
              </div>
            </div>
            <div className="insight-divider" />
            <div className="insight-block"><div className="insight-label"><span className="insight-number">01</span><span>como jogar</span></div><p>Digite qualquer palavra. O número mostra o quanto ela está perto da resposta — quanto menor o ranking, melhor.</p></div>
            <div className="insight-block"><div className="insight-label"><span className="insight-number">02</span><span>uma pista</span></div><div className="tip-card"><Lightbulb size={16} /><p>Palavras com contexto parecido costumam aparecer perto umas das outras.</p></div></div>
            <div className="insight-bottom">
              <div className="score-line"><span>hoje você já jogou</span><strong>{guesses.length} <small>palavras</small></strong></div>
              <div className="score-line"><span>modo atual</span><strong className="mode-value">{activeChallenge?.kind ?? "—"}</strong></div>
            </div>
          </aside>
        </div>

        <footer className="app-footer"><span>feito para mentes curiosas</span><span className="footer-center">nexo<span>•</span> <small>beta</small></span><span>sem pressa · sem limite de tentativas</span></footer>
      </div>
    </main>
  );
}
