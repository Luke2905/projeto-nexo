import { useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Check, Flame, Gamepad2, ImagePlus, LockKeyhole, LogOut, Medal, Save, Settings2, Sparkles, Target, Trophy, Upload, X, Zap } from "lucide-react";

const achievementData = [
  { icon: Flame, title: "Primeiro fogo", text: "Jogue por 3 dias seguidos", color: "coral", required: 3 },
  { icon: Target, title: "No alvo", text: "Encontre uma palavra em até 5", color: "gold", required: 1 },
  { icon: Zap, title: "Faísca", text: "Faça uma tentativa com 80%+", color: "blue", required: 1 },
  { icon: Trophy, title: "Cartógrafo", text: "Complete 10 desafios", color: "purple", required: 10 },
];

export default function Profile() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const history = trpc.games.history.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const updateProfile = trpc.auth.updateProfile.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); setSettingsOpen(false); setFeedback("Perfil atualizado."); } });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [photoPreview, setPhotoPreview] = useState(user?.avatarUrl ?? "");
  const [photoData, setPhotoData] = useState("");
  const [photoType, setPhotoType] = useState<"image/jpeg" | "image/png" | "image/webp">("image/jpeg");
  const [feedback, setFeedback] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const sessions = history.data ?? [];
  const solvedSessions = sessions.filter((session) => Boolean(session.solved));
  const displayName = user?.name ?? "Seu perfil";
  const initials = displayName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const bestRank = solvedSessions.length ? Math.min(...solvedSessions.map((session) => session.bestRank || 999)) : 0;
  const xp = solvedSessions.length * 100;
  const playedDays = useMemo(() => new Set(sessions.map((session) => session.challengeId)), [sessions]);
  const activity = sessions.slice(0, 4);
  const unlocked = new Set(achievementData.filter((item) => solvedSessions.length >= item.required).map((item) => item.title));

  function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) { setFeedback("Escolha uma imagem JPG, PNG ou WEBP."); return; }
    if (file.size > 2 * 1024 * 1024) { setFeedback("A foto precisa ter no máximo 2 MB."); return; }
    setPhotoType(file.type as "image/jpeg" | "image/png" | "image/webp");
    const reader = new FileReader();
    reader.onload = () => { const result = String(reader.result); setPhotoData(result); setPhotoPreview(result); setFeedback(""); };
    reader.readAsDataURL(file);
  }

  function openSettings() {
    setName(user?.name ?? "");
    setPhotoPreview(user?.avatarUrl ?? "");
    setPhotoData("");
    setFeedback("");
    setSettingsOpen(true);
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setFeedback("");
    updateProfile.mutate({ name: name.trim(), ...(photoData ? { avatarData: photoData, avatarType: photoType } : {}) });
  }

  async function signOut() {
    await logout();
    setLocation("/");
  }

  return <main className="profile-shell"><div className="profile-noise" /><div className="profile-wrap">
    <header className="profile-header"><Link href="/" className="back-link"><ArrowLeft size={16} /> voltar ao jogo</Link><div className="profile-brand">nexo<span>•</span> / perfil</div><button className="profile-settings" aria-label="Editar perfil" onClick={openSettings}><Settings2 size={17} /></button></header>
    <section className="profile-hero"><div className="profile-avatar">{user?.avatarUrl ? <img src={user.avatarUrl} alt={`Foto de ${displayName}`} /> : <span>{initials}</span>}<i /></div><div className="profile-intro"><span className="profile-eyebrow">{isAuthenticated ? "jogador desde setembro de 2026" : "entre para salvar seu progresso"}</span><h1>{displayName}</h1><p>colecionador de pistas <span>·</span> explorador de palavras</p></div><div className="profile-level"><div className="level-top"><span>nível {Math.max(1, Math.floor(xp / 500) + 1).toString().padStart(2, "0")}</span><strong>{xp.toLocaleString("pt-BR")} xp</strong></div><div className="level-track"><span style={{ width: `${xp ? Math.min(100, (xp % 500) / 5) : 0}%` }} /></div><small>{xp ? `mais ${500 - (xp % 500)} xp para o próximo nível` : "jogue seu primeiro desafio para começar"}</small></div></section>
    <div className="profile-grid"><section className="profile-main-column"><div className="stat-grid"><div className="profile-stat"><span><Gamepad2 size={15} /> desafios jogados</span><strong>{sessions.length}</strong><small>{sessions.length ? "histórico salvo" : "nenhum desafio ainda"}</small></div><div className="profile-stat"><span><Flame size={15} /> sequência atual</span><strong>0 <em>dias</em></strong><small>comece hoje</small></div><div className="profile-stat"><span><Target size={15} /> melhor proximidade</span><strong>{bestRank || "—"}{bestRank > 0 && <em>º</em>}</strong><small>{bestRank ? "melhor ranking" : "ainda sem marca"}</small></div><div className="profile-stat"><span><Sparkles size={15} /> palavras descobertas</span><strong>{solvedSessions.length}</strong><small>desafios concluídos</small></div></div>
      <section className="profile-card activity-card"><div className="section-heading"><div><span className="section-kicker">seu caminho</span><h2>Atividade recente</h2></div><Link href="/" className="section-action">jogar agora <ArrowLeft size={13} /></Link></div><div className="activity-list">{activity.length ? activity.map((item, index) => <div className="activity-row" key={item.id}><div className={`activity-dot ${["coral", "gold", "blue", "purple"][index]}`}><span /></div><div className="activity-date">{new Date(item.playedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</div><div className="activity-copy"><strong>{item.challengeId.replace("calendar-", "Dia ")}</strong><small>{item.solved ? `${item.guesses} tentativas · concluído` : item.lost ? `perdido · ${3 - (item.retryCount ?? 0)} tentativas` : "em andamento"}</small></div><div className="activity-score">{item.bestRank || "—"}</div>{Boolean(item.solved) && <Check size={14} className="activity-check" />}</div>) : <div className="profile-empty"><Gamepad2 size={20} /><span>Seu histórico aparecerá aqui depois do primeiro desafio.</span></div>}</div></section>
      <section className="profile-card calendar-card"><div className="section-heading"><div><span className="section-kicker">ritmo de jogo</span><h2>Calendário de atividade</h2></div><span className="month-label">setembro 2026</span></div><div className="weekday-row">{["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((day) => <span key={day}>{day}</span>)}</div><div className="profile-calendar">{Array.from({ length: 30 }, (_, index) => { const day = index + 1; const played = playedDays.has(`calendar-${day}`) || (day === 17 && playedDays.has("daily-2026-09-17")); return <div className={played ? "profile-day played" : day === 17 ? "profile-day today" : "profile-day"} key={day}>{day}{played && <i />}</div>; })}</div></section></section>
      <aside className="profile-side-column"><section className="profile-card achievements-card"><div className="section-heading"><div><span className="section-kicker">coleção</span><h2>Conquistas</h2></div><span className="achievement-count">{unlocked.size}/12</span></div><div className="achievement-list">{achievementData.map(({ icon: Icon, title, text, color }) => { const isUnlocked = unlocked.has(title); return <div className={isUnlocked ? "achievement unlocked" : "achievement locked"} key={title}><div className={`achievement-icon ${color}`}>{isUnlocked ? <Icon size={17} /> : <LockKeyhole size={15} />}</div><div><strong>{title}</strong><small>{text}</small></div></div>; })}</div><button className="all-achievements"><Medal size={14} /> ver todas as conquistas</button></section><section className="profile-card theme-card"><span className="section-kicker">tema favorito</span><div className="theme-highlight"><div className="theme-symbol"><Sparkles size={20} /></div><div><strong>{solvedSessions.length ? "Em descoberta" : "Ainda explorando"}</strong><small>{solvedSessions.length ? `${solvedSessions.length} desafios completados` : "jogue para definir seu tema"}</small></div></div><div className="theme-progress"><span style={{ width: `${Math.min(100, solvedSessions.length * 10)}%` }} /></div><div className="theme-footer"><span>progresso</span><strong>{Math.min(100, solvedSessions.length * 10)}%</strong></div></section><section className="quote-card"><div className="quote-mark">“</div><p>{sessions.length ? "Cada descoberta deixa uma marca no mapa." : "Seu mapa começa vazio. A primeira descoberta é sua."}</p><span>— seu mapa, até aqui</span></section></aside>
    </div><footer className="profile-footer"><span>nexo<span>•</span> beta</span><span>{isAuthenticated ? "seu progresso fica salvo na sua conta" : "crie sua conta para salvar seu progresso"}</span></footer>
  </div>
  {settingsOpen && <div className="profile-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}><section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title"><button className="modal-close" onClick={() => setSettingsOpen(false)} aria-label="Fechar"><X size={16} /></button><span className="section-kicker">nexo • identidade</span><h2 id="profile-edit-title">Editar perfil</h2><p className="modal-copy">Atualize como você aparece no mapa e no ranking.</p><form onSubmit={saveProfile}><div className="photo-picker"><div className="photo-preview">{photoPreview ? <img src={photoPreview} alt="Prévia da foto" /> : <span>{initials}</span>}</div><div><button type="button" className="photo-button" onClick={() => fileRef.current?.click()}><ImagePlus size={15} /> adicionar foto</button><small>JPG, PNG ou WEBP · até 2 MB</small><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} hidden /></div></div><label className="profile-field">nome de exibição<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required /></label>{feedback && <div className="profile-feedback" role="status">{feedback}</div>}<button className="save-profile-button" type="submit" disabled={updateProfile.isPending}><Save size={15} /> {updateProfile.isPending ? "salvando..." : "salvar alterações"}</button></form><div className="modal-divider" /><button className="logout-button" onClick={signOut}><LogOut size={15} /> sair da conta</button></section></div>}
  </main>;
}
