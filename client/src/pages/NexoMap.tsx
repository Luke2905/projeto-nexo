import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Flame,
  LockKeyhole,
  Map,
  Medal,
  Mountain,
  Search,
  Settings2,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Check,
  X,
  UserPlus,
  Shield,
  Eye,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { userFacingError } from "@/lib/userFacingError";
import AppearanceSwitcher from "@/components/AppearanceSwitcher";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TITLES } from "@shared/nexomap";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import "./nexomap.css";
import AdventureMap from "./AdventureMap";

type Outputs = inferRouterOutputs<AppRouter>;
export type MapData = Outputs["nexomap"]["me"];
type Progress = NonNullable<MapData["progress"]>;
type Achievement = Progress["achievements"][number];
type Tab = "map" | "badges";
const badgeIcons = {
  first: Sparkles,
  explorer: Compass,
  cartographer: Map,
  horizon: Mountain,
  spark: Flame,
  week: Star,
  target: Target,
  sharp: Trophy,
};
export function BadgeIcon({ id, size = 24 }: { id: string; size?: number }) {
  const Icon = badgeIcons[id as keyof typeof badgeIcons] ?? Medal;
  return <Icon size={size} aria-hidden="true" />;
}
export function Avatar({
  person,
}: {
  person: { name: string | null; avatarUrl: string | null };
}) {
  return (
    <span className="nm-avatar">
      {person.avatarUrl ? (
        <img src={person.avatarUrl} alt="" />
      ) : (
        (person.name ?? "N").slice(0, 2).toUpperCase()
      )}
    </span>
  );
}
export function Feedback({
  error,
  retry,
}: {
  error: { message: string } | null;
  retry?: () => void;
}) {
  const message = userFacingError(error);
  return error ? (
    <div className="nm-feedback" role="alert">
      {message}
      {retry && (
        <button className="nm-button subtle" onClick={retry}>
          Tentar novamente
        </button>
      )}
    </div>
  ) : null;
}

export function MapShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="nm-shell">
      <div className="nm-wrap">
        <header className="nm-header">
          <Link href="/" className="nm-brand">
            <img src="/nexo-logo.png" alt="Nexo" className="nm-brand-logo" />
            <span>NEXO</span>
            <small>NexoMap</small>
          </Link>
          <div className="nm-header-actions">
            <Link href="/" className="nm-button subtle">
              <ArrowLeft size={15} /> jogar
            </Link>
            <AppearanceSwitcher />
          </div>
        </header>
        {children}
        <footer className="nm-footer">
          <span>
            <b>NEXO</b> · cada palavra, um novo caminho.
          </span>
          <span>Seu mapa cresce com você.</span>
        </footer>
      </div>
    </main>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="nm-empty">
      <Compass size={28} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export default function NexoMap({
  userId,
  initialTab = "map",
}: {
  userId?: number;
  initialTab?: Tab;
}) {
  const auth = useAuth();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [selected, setSelected] = useState<Achievement | null>(null);
  const preview = Boolean(
    userId && new URLSearchParams(window.location.search).has("visitante")
  );
  const mine = trpc.nexomap.me.useQuery(undefined, {
    enabled: auth.isAuthenticated,
    retry: false,
  });
  const other = trpc.nexomap.profile.useQuery(
    { userId: userId ?? 1, preview },
    {
      enabled: Boolean(userId && Number.isInteger(userId) && userId > 0),
      retry: false,
    }
  );
  const query = userId ? other : mine;
  const data = query.data;
  const progress = data?.progress;
  const owner = Boolean(data?.owner);
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, userId]);
  const tabs = [
    { id: "map", label: "Meu mapa", Icon: Map },
    { id: "badges", label: "Emblemas", Icon: Medal },
  ] as const;
  return (
    <MapShell>
      <div className="nm-intro">
        <div>
          <span className="nm-eyebrow">
            <Compass size={13} /> SEU MAPA DE CONEXÕES
          </span>
          <h1>
            {userId ? (
              "Cada pessoa, um caminho."
            ) : (
              <>
                Seu mapa.
                <br />
                <em>Novas conexões.</em>
              </>
            )}
          </h1>
          <p>
            Explore conquistas, acompanhe seus amigos e descubra até onde suas
            palavras podem levar.
          </p>
        </div>
        <div className="nm-orbit" aria-hidden="true">
          <Compass />
          <span>EXPLORE · CONECTE · DESCUBRA</span>
        </div>
      </div>
      {!userId && !auth.isAuthenticated ? (
        <section className="nm-panel">
          <Feedback error={auth.error} retry={() => auth.refresh()} />
          {auth.loading ? (
            <p role="status">Carregando sua conta…</p>
          ) : (
            <Empty title="Seu primeiro nexo começa aqui.">
              Entre para construir sua trilha, colecionar emblemas e acompanhar
              amigos.
              <br />
              <Link className="nm-button primary" href="/cadastro">
                Entrar ou criar conta <ArrowRight size={16} />
              </Link>
            </Empty>
          )}
        </section>
      ) : (
        <>
          <Feedback error={query.error} retry={() => query.refetch()} />
          {query.isLoading && (
            <div className="nm-panel nm-loading" role="status">
              Desenhando seu mapa…
            </div>
          )}
          {preview && (
            <div className="nm-feedback">
              <Eye size={18} /> Esta é a visão de alguém que não está conectado
              à sua conta. <Link href="/perfil/editar">Voltar à edição</Link>
            </div>
          )}
          {data && (
            <section
              className={
                "nm-identity accent-" + (data.profile?.accent ?? "coral")
              }
            >
              <Avatar person={data.person} />
              <div className="nm-identity-copy">
                <span className="nm-eyebrow">
                  {data.person.username
                    ? "@" + data.person.username
                    : "EXPLORADOR"}
                </span>
                <h2>{data.person.name ?? "Jogador"}</h2>
                {data.profile && (
                  <>
                    <p>
                      {data.profile.bio ||
                        "Cada descoberta deixa uma marca no mapa."}
                    </p>
                    <span className="nm-title">
                      <Sparkles size={13} />
                      {TITLES.find(t => t.id === data.profile?.title)?.label ??
                        "Mente curiosa"}
                    </span>
                    <div className="nm-featured">
                      {data.profile.badges.map(id => (
                        <span
                          key={id}
                          title={
                            progress?.achievements.find(a => a.id === id)?.title
                          }
                        >
                          <BadgeIcon id={id} size={17} />
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {progress && (
                <div className="nm-level">
                  <span>
                    NÍVEL{" "}
                    <strong>{String(progress.level).padStart(2, "0")}</strong>
                  </span>
                  <small>{progress.xp.toLocaleString("pt-BR")} XP</small>
                  <progress
                    max={500}
                    value={progress.xp % 500}
                    aria-label="Progresso para o próximo nível"
                  />
                  <small>
                    {500 - (progress.xp % 500)} XP para o próximo nível
                  </small>
                </div>
              )}
              {owner && (
                <Link href="/perfil/editar" className="nm-button subtle">
                  <Settings2 size={16} /> Editar perfil
                </Link>
              )}
            </section>
          )}
          {data?.restricted ? (
            <section className="nm-panel">
              <Empty title="Este mapa é reservado.">
                O jogador controla quem pode acompanhar sua jornada.{" "}
                {auth.isAuthenticated ? (
                  <Link href="/amigos">Gerenciar amizades</Link>
                ) : (
                  <Link href="/cadastro">
                    Entre para ver se vocês já são amigos.
                  </Link>
                )}
              </Empty>
            </section>
          ) : (
            data && (
              <>
                <nav className="nm-tabs segmented" aria-label="Seções do NexoMap">
                  {tabs
                    .filter(t => !userId || t.id === "map" || t.id === "badges")
                    .map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        className={tab === id ? "active" : ""}
                        aria-current={tab === id ? "page" : undefined}
                        onClick={() => setTab(id as Tab)}
                      >
                        <Icon size={17} />
                        {userId && id === "map" ? "Jornada" : label}
                      </button>
                    ))}
                </nav>
                {progress && (
                  <>
                    <div className="nm-stats">
                      {[
                        {
                          Icon: Compass,
                          label: "desafios resolvidos",
                          value: progress.solved,
                        },
                        {
                          Icon: Flame,
                          label: "dias de sequência",
                          value: progress.streak,
                        },
                        {
                          Icon: Medal,
                          label: "emblemas conquistados",
                          value: progress.achievements.filter(a => a.unlocked)
                            .length,
                        },
                        {
                          Icon: Target,
                          label: "resolvidos nesta semana",
                          value: progress.weekly,
                        },
                      ].map(({ Icon, label, value }) => (
                        <div key={label}>
                          <Icon size={19} />
                          <strong>{value.toString().padStart(2, "0")}</strong>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                    {tab === "map" ? (
                      <>
                        {owner && (
                          <div className="nm-next">
                            <Sparkles size={22} />
                            <div>
                              <strong>
                                {progress.achievements.find(a => !a.unlocked)
                                  ?.title ?? "Todos os caminhos explorados!"}
                              </strong>
                              <p>
                                {(() => {
                                  const next = progress.achievements.find(
                                    a => !a.unlocked
                                  );
                                  return next
                                    ? next.description +
                                        " Progresso: " +
                                        next.progress +
                                        "/" +
                                        next.goal +
                                        "."
                                    : "Continue jogando e acompanhando sua turma.";
                                })()}
                              </p>
                            </div>
                            <Link href="/" className="nm-button primary">
                              Jogar agora <ArrowRight size={15} />
                            </Link>
                          </div>
                        )}
                        <AdventureMap
                          progress={progress}
                          owner={owner}
                          name={data.person.name ?? "Jogador"}
                          onSelect={setSelected}
                        />
                        <section className="nm-panel nm-activity">
                          <div>
                            <span className="nm-eyebrow">SEU RITMO</span>
                            <h2>Seu rastro de descobertas</h2>
                            <p>
                              Os últimos 28 dias da sua aventura, um pontinho
                              por dia.
                            </p>
                          </div>
                          <div className="nm-heatmap">
                            {progress.activity.map(day => (
                              <span
                                key={day.date}
                                className={day.count ? "played" : ""}
                                title={
                                  day.date + ": " + day.count + " desafios"
                                }
                                aria-label={
                                  day.date + ": " + day.count + " desafios"
                                }
                              >
                                {day.count || ""}
                              </span>
                            ))}
                          </div>
                          <small>
                            Calendário UTC · o diário vira às 21h em São Paulo.
                            Melhor sequência: {progress.longestStreak} dias.
                          </small>
                          {progress.legacy > 0 && (
                            <small>
                              {progress.legacy} conclusões anteriores
                              preservadas. Datas e marcas de precisão antigas
                              não são reconstruídas.
                            </small>
                          )}
                        </section>
                        {userId &&
                          !owner &&
                          data.friend &&
                          mine.data?.progress && (
                            <section className="nm-panel">
                              <span className="nm-eyebrow">
                                CAMINHOS QUE SE ENCONTRAM
                              </span>
                              <h2>Vocês no mapa</h2>
                              <div className="nm-compare">
                                <span>Indicador</span>
                                <strong>Você</strong>
                                <strong>{data.person.name}</strong>
                                <span>Resolvidos na semana</span>
                                <b>{mine.data.progress.weekly}</b>
                                <b>{progress.weekly}</b>
                                <span>Melhor sequência</span>
                                <b>{mine.data.progress.longestStreak} dias</b>
                                <b>{progress.longestStreak} dias</b>
                                <span>Conquistas em comum</span>
                                <b className="nm-common">
                                  {
                                    progress.achievements.filter(
                                      a =>
                                        a.unlocked &&
                                        mine.data?.progress?.achievements.some(
                                          m => m.id === a.id && m.unlocked
                                        )
                                    ).length
                                  }{" "}
                                  emblemas
                                </b>
                              </div>
                            </section>
                          )}
                      </>
                    ) : (
                      <section>
                        <div className="nm-section-head">
                          <div>
                            <span className="nm-eyebrow">
                              MARCAS DA SUA JORNADA
                            </span>
                            <h2>Coleção de emblemas</h2>
                          </div>
                          {owner && (
                            <Link href="/perfil/editar">
                              Escolher destaques <ArrowRight size={14} />
                            </Link>
                          )}
                        </div>
                        <div className="nm-badge-grid">
                          {progress.achievements.map(a => (
                            <button
                              className={
                                "nm-badge-card " +
                                (a.unlocked ? "unlocked" : "")
                              }
                              key={a.id}
                              onClick={() => setSelected(a)}
                            >
                              <span className="nm-medallion">
                                {a.unlocked ? (
                                  <BadgeIcon id={a.id} size={32} />
                                ) : (
                                  <LockKeyhole size={25} />
                                )}
                              </span>
                              <small>{a.path}</small>
                              <h3>{a.badge}</h3>
                              <p>{a.description}</p>
                              <span>
                                {a.unlocked
                                  ? "Conquistado"
                                  : a.progress + "/" + a.goal}
                              </span>
                            </button>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </>
            )
          )}
        </>
      )}
      <Dialog
        open={Boolean(selected)}
        onOpenChange={open => !open && setSelected(null)}
      >
        <DialogContent className="nm-dialog">
          {selected && (
            <>
              <span className="nm-medallion">
                <BadgeIcon id={selected.id} size={38} />
              </span>
              <DialogTitle>{selected.title}</DialogTitle>
              <DialogDescription>{selected.description}</DialogDescription>
              <progress
                max={selected.goal}
                value={selected.progress}
                aria-label="Progresso da conquista"
              />
              <p>
                {selected.progress} / {selected.goal} · {selected.xp} XP de
                recompensa
              </p>
              <p>
                {selected.unlocked
                  ? selected.unlockedAt
                    ? "Conquistado em " +
                      new Date(selected.unlockedAt).toLocaleDateString("pt-BR")
                    : "Conquista reconhecida do seu histórico."
                  : "Continue jogando para desbloquear este emblema e título."}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MapShell>
  );
}
