import { useState } from "react";
import { Link } from "wouter";
import { Medal, Search, Users, Eye, Sparkles, Heart } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { userFacingError } from "@/lib/userFacingError";
import { Avatar, Empty, Feedback, MapShell } from "./NexoMap";
import "./nexomap.css";

export default function Community() {
  const [tab, setTab] = useState<"ranking" | "amigos" | "feed">("feed");

  return (
    <MapShell>
      <div className="nm-profile">
        <div>
          <h1>Nexo Comunidade</h1>
          <p>Acompanhe amigos, descubra novas pessoas e veja o ranking geral.</p>
        </div>
      </div>
      <nav className="nm-tabs segmented" aria-label="Seções da Comunidade">
        <button
          className={tab === "feed" ? "active" : ""}
          onClick={() => setTab("feed")}
        >
          Feed
        </button>
        <button
          className={tab === "amigos" ? "active" : ""}
          onClick={() => setTab("amigos")}
        >
          Amigos
        </button>
        <button
          className={tab === "ranking" ? "active" : ""}
          onClick={() => setTab("ranking")}
        >
          Ranking
        </button>
      </nav>

      <div className="nm-community-content mt-4">
        {tab === "feed" && <CommunityFeed />}
        {tab === "amigos" && <FriendsPanel />}
        {tab === "ranking" && <RankingPanel />}
      </div>
    </MapShell>
  );
}

function CommunityFeed() {
  const feed = trpc.nexomap.feed.useQuery();
  const utils = trpc.useUtils();

  const like = trpc.nexomap.likeEvent.useMutation({
    onSuccess: () => utils.nexomap.feed.invalidate()
  });

  const unlike = trpc.nexomap.unlikeEvent.useMutation({
    onSuccess: () => utils.nexomap.feed.invalidate()
  });

  const toggleLike = (e: React.MouseEvent, event: any) => {
    e.preventDefault();
    if (event.likedByMe) {
      unlike.mutate({ eventId: event.id });
    } else {
      like.mutate({ eventId: event.id });
    }
  };

  return (
    <section className="nm-panel">
      <div className="nm-section-head">
        <div>
          <span className="nm-eyebrow">PASSOS RECENTES</span>
          <h2>Novidades dos amigos</h2>
        </div>
      </div>
      <p className="nm-muted">Conquistas compartilhadas, sem spoilers.</p>
      <Feedback error={feed.error} retry={() => feed.refetch()} />
      {feed.isLoading && <p role="status">Carregando novidades…</p>}
      {feed.data?.length === 0 && (
        <Empty title="Novos caminhos virão">
          As próximas conquistas dos seus amigos aparecerão aqui, conforme a privacidade de cada um.
        </Empty>
      )}
      <div className="nm-feed-list" style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
        {feed.data?.map((event: any) => (
          <Link
            className="nm-feed-item"
            key={event.id}
            href={"/nexomap/" + event.userId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              background: "var(--nm-panel)",
              border: "1px solid var(--nm-line)",
              borderRadius: "8px",
              textDecoration: "none",
              color: "inherit",
              transition: "border-color 0.2s"
            }}
          >
            <span style={{ color: "var(--nm-accent)" }}><Medal size={24} /></span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0 }}><strong>{event.name}</strong> {event.message}</p>
              <small style={{ color: "var(--nm-muted)" }}>{new Date(event.at).toLocaleDateString("pt-BR")}</small>
            </div>
            <button 
              onClick={(e) => toggleLike(e, event)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "6px 10px",
                borderRadius: "20px",
                color: event.likedByMe ? "#ff9fad" : "var(--nm-muted)",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--nm-line)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Heart size={18} fill={event.likedByMe ? "#ff9fad" : "none"} stroke={event.likedByMe ? "#ff9fad" : "currentColor"} />
              {event.likes > 0 && <span style={{ fontSize: "14px", fontWeight: "600" }}>{event.likes}</span>}
            </button>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FriendsPanel() {
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const utils = trpc.useUtils();
  const graph = trpc.nexomap.connections.useQuery();
  const found = trpc.nexomap.search.useQuery(
    { query },
    { enabled: query.length >= 2 }
  );
  const action = trpc.nexomap.connect.useMutation({
    onMutate: () => setNotice(null),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        utils.nexomap.connections.invalidate(),
        utils.nexomap.feed.invalidate(),
        utils.nexomap.profile.invalidate(),
        utils.nexomap.ranking.invalidate(),
        utils.nexomap.search.invalidate(),
      ]);
      const messages = {
        request: "Solicitação de amizade enviada.",
        accept: "Solicitação de amizade aceita.",
        remove: "Conexão removida.",
        block: "Jogador bloqueado.",
        unblock: "Jogador desbloqueado.",
      } as const;
      setNotice({ tone: "success", message: messages[variables.action] });
    },
    onError: (error) => setNotice({
      tone: "error",
      message: userFacingError(error, "Não foi possível atualizar sua lista de amigos. Tente novamente."),
    }),
  });

  const people = graph.data;
  const change = (
    id: number,
    connectionAction: "request" | "accept" | "remove" | "block" | "unblock",
  ) => {
    action.mutate({ userId: id, action: connectionAction });
  };

  return (
    <section className="nm-panel">
      <div className="nm-section-head">
        <div>
          <span className="nm-eyebrow">SUA TURMA</span>
          <h2>Amigos</h2>
        </div>
      </div>
      <p className="nm-muted">Compartilhe sua jornada e veja as novidades de quem você adiciona.</p>

      <div className="nm-search-box" style={{ marginTop: "16px", position: "relative" }}>
        <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--nm-muted)" }} />
        <input
          type="text"
          placeholder="Buscar por @usuario ou nome..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: "8px", border: "1px solid var(--nm-line)", background: "var(--nm-bg)", color: "var(--nm-ink)" }}
        />
      </div>

      <Feedback error={graph.error || found.error} retry={() => graph.refetch()} />
      {notice && (
        <div className={`nm-feedback ${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>
          {notice.message}
        </div>
      )}
      {(graph.isLoading || found.isFetching) && <p role="status">Carregando...</p>}

      {query.length >= 2 && found.data && (
        <section className="nm-search-results" style={{ marginTop: "24px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>Resultados da busca</h3>
          {found.data.length === 0 ? (
            <p className="nm-muted">Ninguém encontrado.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {found.data.map((p) => {
                const isFriend = people?.friends.some((f) => f.id === p.id);
                const isBlocked = people?.blocked.some((b) => b.id === p.id);
                return (
                  <div className="nm-person" key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "var(--nm-panel)", border: "1px solid var(--nm-line)", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <Avatar person={p} />
                      <div>
                        <strong style={{ display: "block" }}>{p.name}</strong>
                        <small className="nm-muted">@{p.username}</small>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Link href={"/nexomap/" + p.id} className="nm-button subtle" style={{ padding: "6px 12px", fontSize: "12px" }}>Visitar</Link>
                      {isBlocked ? (
                        <button className="nm-button outline" disabled={action.isPending} onClick={() => change(p.id, "unblock")} style={{ padding: "6px 12px", fontSize: "12px" }}>Desbloquear</button>
                      ) : isFriend ? (
                        <button className="nm-button outline" disabled={action.isPending} onClick={() => change(p.id, "remove")} style={{ padding: "6px 12px", fontSize: "12px" }}>Remover</button>
                      ) : (
                        <button className="nm-button primary" disabled={action.isPending} onClick={() => change(p.id, "request")} style={{ padding: "6px 12px", fontSize: "12px" }}>Adicionar</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {people && query.length < 2 && (
        <>
          <section style={{ marginTop: "24px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>Seus amigos ({people.friends.length})</h3>
            {people.friends.length === 0 && <p className="nm-muted">Você ainda não adicionou ninguém.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {people.friends.map((p) => (
                <div className="nm-person" key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "var(--nm-panel)", border: "1px solid var(--nm-line)", borderRadius: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Avatar person={p} />
                    <div>
                      <strong style={{ display: "block" }}>{p.name}</strong>
                      <small className="nm-muted">@{p.username}</small>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Link href={"/nexomap/" + p.id} className="nm-button subtle" style={{ padding: "6px 12px", fontSize: "12px" }}>NexoMap</Link>
                    <button className="nm-button outline" disabled={action.isPending} onClick={() => change(p.id, "remove")} style={{ padding: "6px 12px", fontSize: "12px" }}>Remover</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {people.blocked.length > 0 && (
            <section style={{ marginTop: "24px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>Bloqueados</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {people.blocked.map((p) => (
                  <div className="nm-person" key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "var(--nm-panel)", border: "1px solid var(--nm-line)", borderRadius: "8px" }}>
                    <strong>{p.name}</strong>
                    <button className="nm-button outline" disabled={action.isPending} onClick={() => change(p.id, "unblock")} style={{ padding: "6px 12px", fontSize: "12px" }}>Desbloquear</button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}

function RankingPanel() {
  const [scope, setScope] = useState<"global" | "friends">("friends");
  const ranking = trpc.nexomap.ranking.useQuery({ scope });

  return (
    <section className="nm-panel">
      <div className="nm-section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <span className="nm-eyebrow">DESCUBRA JUNTO</span>
          <h2>Ranking de descobertas</h2>
        </div>
        <div className="nm-toggle segmented" style={{ display: "flex", background: "var(--nm-panel-2)", padding: "4px", borderRadius: "8px", gap: "4px" }}>
          <button
            className={scope === "friends" ? "active" : ""}
            onClick={() => setScope("friends")}
            style={{ padding: "6px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: "500", border: "none", background: scope === "friends" ? "var(--nm-panel)" : "transparent", boxShadow: scope === "friends" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", color: scope === "friends" ? "var(--nm-ink)" : "var(--nm-muted)", cursor: "pointer", transition: "all 0.2s" }}
          >
            Amigos
          </button>
          <button
            className={scope === "global" ? "active" : ""}
            onClick={() => setScope("global")}
            style={{ padding: "6px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: "500", border: "none", background: scope === "global" ? "var(--nm-panel)" : "transparent", boxShadow: scope === "global" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", color: scope === "global" ? "var(--nm-ink)" : "var(--nm-muted)", cursor: "pointer", transition: "all 0.2s" }}
          >
            Geral
          </button>
        </div>
      </div>
      <p className="nm-muted" style={{ marginTop: "12px", marginBottom: "24px" }}>
        Total de desafios diferentes resolvidos. O ranking geral inclui mapas públicos com participação ativada.
      </p>

      <Feedback error={ranking.error} retry={() => ranking.refetch()} />
      {ranking.isLoading && <p role="status">Carregando classificação…</p>}

      {ranking.data && (
        <>
          <div className="nm-ranking-mine" style={{ padding: "16px", background: "rgba(241, 144, 120, 0.1)", borderRadius: "8px", marginBottom: "24px", color: "var(--nm-ink)", fontWeight: "500" }}>
            {ranking.data.mine
              ? `Sua posição: #${ranking.data.mine.position} · ${ranking.data.mine.solved} desafios resolvidos`
              : "Você ainda não aparece nesta classificação. Resolva um desafio ou confira a visibilidade do perfil."}
          </div>

          {!ranking.data.rows.length && (
            <Empty title="Um lugar para sua primeira descoberta">
              A classificação aparece quando há jogadores elegíveis com desafios resolvidos.
            </Empty>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {ranking.data.rows.map((p) => (
              <div className="nm-person" key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "var(--nm-panel)", border: "1px solid var(--nm-line)", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ fontSize: "16px", fontWeight: "700", color: p.position <= 3 ? "var(--nm-accent)" : "var(--nm-muted)", width: "24px", textAlign: "center" }}>
                    #{p.position}
                  </div>
                  <Avatar person={p} />
                  <div>
                    <strong style={{ display: "block" }}>{p.name}</strong>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span className="nm-badge-small" style={{ fontSize: "11px", padding: "2px 6px", background: "var(--nm-panel-2)", borderRadius: "4px" }}>{p.title}</span>
                      <small className="nm-muted">Nível {p.level}</small>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong style={{ display: "block", fontSize: "16px" }}>{p.solved}</strong>
                  <small className="nm-muted">resolvidos</small>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
