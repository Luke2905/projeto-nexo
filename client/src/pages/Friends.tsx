import AppearanceSwitcher from "@/components/AppearanceSwitcher";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Crown, Flame, Gamepad2, Plus, Search, Shield, Sparkles, Users, Zap } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

export default function Friends() {
  const { user, isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const leaderboard = trpc.leaderboard.list.useQuery();
  const friends = trpc.leaderboard.friends.useQuery(undefined, { enabled: isAuthenticated });
  const players = useMemo(() => {
    return leaderboard.data?.map((player, index) => ({ ...player, tag: `#${(index + 1).toString().padStart(2, "0")}`, accent: index === 0 ? "pink" : index === 1 ? "blue" : index === 2 ? "gold" : "green" })) ?? [];
  }, [leaderboard.data]);
  const filtered = players.filter((player) => (player.name ?? "Jogador").toLocaleLowerCase().includes(search.toLocaleLowerCase()));

  return <main className="friends-shell"><div className="friends-wrap">
    <header className="friends-header"><Link href="/" className="back-link"><ArrowLeft size={16} /> voltar ao jogo</Link><div className="friends-brand">nexo<span>•</span> social</div><div className="appearance-header-actions"><AppearanceSwitcher /><Link href="/perfil" className="friends-avatar">{user?.name?.slice(0, 2).toUpperCase() ?? "AM"}</Link></div></header>
    <section className="friends-hero"><div><span className="friends-eyebrow"><Users size={13} /> comunidade</span><h1>Quem está mais perto<br /><em>da palavra?</em></h1><p>Compare suas descobertas, acompanhe seus amigos e veja quem está dominando o mapa.</p></div><div className="hero-radar"><div className="radar-ring ring-a" /><div className="radar-ring ring-b" /><div className="radar-ping"><Crown size={21} /></div></div></section>
    <div className="friends-toolbar"><div className="social-tabs"><button className="social-tab active"><Sparkles size={14} /> ranking global</button><button className="social-tab"><Users size={14} /> meus amigos <span>{friends.data?.length ?? 0}</span></button></div><label className="friend-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="buscar jogador" /></label></div>
    <section className="ranking-card"><div className="ranking-head"><div><span className="section-kicker">temporada atual</span><h2>Ranking de proximidade</h2></div><span className="season-chip"><Flame size={13} /> semana 38</span></div><div className="ranking-list">{filtered.map((player, index) => <div className={player.name === "Você" || player.name === user?.name ? "ranking-row you" : "ranking-row"} key={`${player.id}-${player.name}`}><span className="ranking-position">{player.tag ?? `#${index + 1}`}</span><div className={`ranking-avatar ${player.accent}`}>{(player.name ?? "J").split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div className="ranking-name"><strong>{player.name ?? "Jogador"}</strong><small><Gamepad2 size={11} /> {player.games} mapas jogados</small></div><div className="ranking-score"><strong>{player.solved}</strong><small>resolvidos</small></div><div className="ranking-streak"><Zap size={13} /> {Math.max(2, 10 - index)}<small>dias</small></div></div>)}</div>{!isAuthenticated && <div className="signup-banner"><div><Shield size={17} /><div><strong>Entre para aparecer no ranking</strong><small>Crie seu cadastro e salve todos os seus jogos.</small></div></div><button onClick={startLogin}>criar cadastro <Plus size={14} /></button></div>}</section>
    <section className="friend-invite"><div className="invite-icon"><Users size={18} /></div><div><strong>Convide sua turma</strong><p>Compartilhe seu código e transforme cada desafio em uma disputa.</p></div><button onClick={() => navigator.clipboard?.writeText("NEXO-842")}>copiar código <span>NEXO-842</span></button></section>
    <footer className="friends-footer"><span>nexo<span>•</span> social</span><span>jogue perto. fique perto.</span></footer>
  </div></main>;
}
