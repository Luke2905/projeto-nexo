import { useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Check,
  Download,
  Eye,
  LogOut,
  Save,
  Settings2,
  Shield,
  Trash2,
  Upload,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { TITLES, type Visibility } from "@shared/nexomap";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapShell, Avatar, BadgeIcon, Feedback, type MapData } from "./NexoMap";

export default function ProfileSettings() {
  const auth = useAuth();
  const query = trpc.nexomap.me.useQuery(undefined, {
    enabled: auth.isAuthenticated,
    retry: false,
  });
  return (
    <MapShell>
      <div className="nm-section-head">
        <div>
          <Link href="/perfil" className="nm-back">
            <ArrowLeft size={15} /> Voltar ao meu mapa
          </Link>
          <h1>Do seu jeito.</h1>
          <p className="nm-muted">
            Cuide da sua identidade e escolha o que compartilhar.
          </p>
        </div>
        <Settings2 size={32} />
      </div>
      <Feedback
        error={query.error ?? auth.error}
        retry={() => query.refetch()}
      />
      {auth.loading || (query.isLoading && auth.isAuthenticated) ? (
        <section className="nm-panel" role="status">
          Carregando perfil…
        </section>
      ) : query.data ? (
        <SettingsForm key={query.data.person.id} data={query.data} />
      ) : (
        !auth.isAuthenticated && (
          <section className="nm-panel">
            <p>Entre para gerenciar seu perfil.</p>
            <Link href="/cadastro" className="nm-button primary">
              Entrar ou criar conta
            </Link>
          </section>
        )
      )}
    </MapShell>
  );
}
function SettingsForm({ data }: { data: MapData }) {
  const { user, logout } = useAuth();
  const utils = trpc.useUtils();
  const profile = data.profile!;
  const [name, setName] = useState(data.person.name ?? "");
  const [username, setUsername] = useState(data.person.username ?? "");
  const [bio, setBio] = useState(profile.bio);
  const [title, setTitle] = useState(profile.title);
  const [badges, setBadges] = useState(profile.badges);
  const [accent, setAccent] = useState(profile.accent);
  const [visibility, setVisibility] = useState<Visibility>(profile.visibility);
  const [publishActivity, setPublishActivity] = useState(
    Boolean(profile.publishActivity)
  );
  const [showRanking, setShowRanking] = useState(Boolean(profile.showRanking));
  const [photo, setPhoto] = useState<string | null>(data.person.avatarUrl);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [exporting, setExporting] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const unlocked = data.progress!.achievements.filter(a => a.unlocked);
  const save = trpc.nexomap.save.useMutation({
    onSuccess: async () => {
      setPhotoChanged(false);
      await Promise.all([
        utils.nexomap.invalidate(),
        utils.auth.me.invalidate(),
      ]);
      setMessage("Perfil salvo. Suas preferências já estão valendo.");
    },
    onError: e => setMessage(e.message),
  });
  const password = trpc.nexomap.changePassword.useMutation({
    onSuccess: () => {
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      setMessage("Senha alterada. As outras sessões foram encerradas.");
    },
    onError: e => setMessage(e.message),
  });
  const deletion = trpc.nexomap.deleteAccount.useMutation({
    onSuccess: () => window.location.replace("/"),
    onError: e => setMessage(e.message),
  });
  async function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(selected.type) ||
      selected.size > 2 * 1024 * 1024
    ) {
      setMessage("Escolha JPG, PNG ou WEBP de até 2 MB.");
      return;
    }
    setPhotoLoading(true);
    const url = URL.createObjectURL(selected);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 192;
      canvas.height = 192;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#f4ead7";
      context.fillRect(0, 0, 192, 192);
      const side = Math.min(img.width, img.height);
      context.drawImage(
        img,
        (img.width - side) / 2,
        (img.height - side) / 2,
        side,
        side,
        0,
        0,
        192,
        192
      );
      let result = canvas.toDataURL("image/jpeg", 0.8);
      if (result.length > 40000) result = canvas.toDataURL("image/jpeg", 0.5);
      if (result.length > 40000)
        throw new Error("Escolha uma imagem mais simples.");
      setPhoto(result);
      setPhotoChanged(true);
      setMessage("Prévia pronta. Salve o perfil para aplicar a foto.");
    } catch {
      setMessage("Não foi possível preparar a foto. Tente outra imagem.");
    } finally {
      URL.revokeObjectURL(url);
      setPhotoLoading(false);
      event.target.value = "";
    }
  }
  async function exportData() {
    setExporting(true);
    try {
      const result = await utils.nexomap.export.fetch();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(result, null, 2)], {
          type: "application/json",
        })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "meu-nexomap.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Seu histórico foi exportado.");
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setExporting(false);
    }
  }
  return (
    <>
      <div className="nm-settings-grid">
        <form
          className="nm-panel nm-form"
          onSubmit={e => {
            e.preventDefault();
            setMessage("");
            save.mutate({
              name,
              username,
              bio,
              title,
              badges,
              accent: accent as "coral" | "blue" | "gold" | "mint",
              visibility,
              publishActivity,
              showRanking,
              ...(photoChanged ? { avatarData: photo } : {}),
            });
          }}
        >
          <span className="nm-eyebrow">IDENTIDADE</span>
          <h2>Seu perfil</h2>
          <div className="nm-photo-edit">
            <Avatar person={{ name, avatarUrl: photo }} />
            <div>
              <button
                type="button"
                className="nm-button subtle"
                disabled={photoLoading || save.isPending}
                onClick={() => file.current?.click()}
              >
                <Upload size={15} />
                {photoLoading ? "Preparando…" : "Escolher foto"}
              </button>
              <button
                type="button"
                className="nm-link-button"
                disabled={photoLoading || save.isPending}
                onClick={() => {
                  setPhoto(null);
                  setPhotoChanged(true);
                }}
              >
                Remover foto
              </button>
              <small>JPG, PNG ou WEBP · até 2 MB</small>
            </div>
            <input
              ref={file}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={choosePhoto}
            />
          </div>
          <div className="nm-fields-two">
            <label>
              Nome de exibição
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
              />
            </label>
            <label>
              @usuário
              <input
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase())}
                required
                minLength={3}
                maxLength={32}
                pattern="[a-z0-9_.\-]+"
                autoComplete="username"
              />
            </label>
          </div>
          <label>
            Sobre você
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={240}
              rows={3}
              placeholder="Que caminhos você gosta de explorar?"
            />
            <small>{bio.length}/240</small>
          </label>
          <label>
            Título em destaque
            <select value={title} onChange={e => setTitle(e.target.value)}>
              {TITLES.filter(
                t =>
                  !t.achievement || unlocked.some(a => a.id === t.achievement)
              ).map(t => (
                <option value={t.id} key={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>
              Emblemas em destaque <small>Escolha até 3</small>
            </legend>
            <div className="nm-badge-picker">
              {unlocked.length ? (
                unlocked.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    className={badges.includes(a.id) ? "selected" : ""}
                    aria-pressed={badges.includes(a.id)}
                    title={a.title}
                    disabled={!badges.includes(a.id) && badges.length >= 3}
                    onClick={() =>
                      setBadges(
                        badges.includes(a.id)
                          ? badges.filter(id => id !== a.id)
                          : [...badges, a.id]
                      )
                    }
                  >
                    <BadgeIcon id={a.id} size={20} />
                    {a.badge}
                    {badges.includes(a.id) && <Check size={13} />}
                  </button>
                ))
              ) : (
                <p>Seu primeiro emblema chega com a primeira descoberta.</p>
              )}
            </div>
          </fieldset>
          <fieldset>
            <legend>Cor do seu mapa</legend>
            <div className="nm-colors">
              {[
                { id: "coral", label: "Coral" },
                { id: "blue", label: "Azul" },
                { id: "gold", label: "Dourado" },
                { id: "mint", label: "Menta" },
              ].map(c => (
                <button
                  type="button"
                  key={c.id}
                  aria-label={c.label}
                  aria-pressed={accent === c.id}
                  className={
                    "accent-" + c.id + (accent === c.id ? " selected" : "")
                  }
                  onClick={() => setAccent(c.id)}
                >
                  {accent === c.id && <Check size={15} />}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="nm-divider" />
          <span className="nm-eyebrow">PRIVACIDADE</span>
          <h2>Você escolhe quem acompanha.</h2>
          <label>
            Quem pode ver seu NexoMap?
            <select
              value={visibility}
              onChange={e => setVisibility(e.target.value as Visibility)}
            >
              <option value="public">Todos — mapa público</option>
              <option value="friends">Somente amigos aceitos</option>
              <option value="private">Somente eu</option>
            </select>
          </label>
          <p className="nm-muted">
            Nome, @usuário e foto permitem encontrar você. Sua trilha, bio,
            emblemas e estatísticas seguem a visibilidade escolhida.
          </p>
          <label className="nm-checkbox">
            <input
              type="checkbox"
              checked={publishActivity}
              onChange={e => setPublishActivity(e.target.checked)}
            />
            Compartilhar minhas conquistas no feed dos amigos
          </label>
          <label className="nm-checkbox">
            <input
              type="checkbox"
              checked={showRanking}
              onChange={e => setShowRanking(e.target.checked)}
            />
            Participar dos rankings permitidos pela visibilidade do meu mapa
          </label>
          <div className="nm-form-actions">
            <Link href="/perfil" className="nm-button subtle">
              Cancelar
            </Link>
            <button
              className="nm-button primary"
              disabled={save.isPending || photoLoading}
            >
              <Save size={15} />
              {save.isPending ? "Salvando…" : "Salvar perfil"}
            </button>
          </div>
        </form>
        <aside>
          <section className={"nm-panel nm-preview accent-" + accent}>
            <span className="nm-eyebrow">PRÉVIA DA IDENTIDADE</span>
            <Avatar person={{ name, avatarUrl: photo }} />
            <h2>{name || "Seu nome"}</h2>
            <span className="nm-muted">@{username || "usuario"}</span>
            <p>{bio || "Cada descoberta deixa uma marca no mapa."}</p>
            <span className="nm-title">
              {TITLES.find(t => t.id === title)?.label}
            </span>
            <div className="nm-featured">
              {badges.map(id => (
                <span key={id}>
                  <BadgeIcon id={id} />
                </span>
              ))}
            </div>
            <Link
              className="nm-button subtle"
              href={"/nexomap/" + data.person.id + "?visitante=1"}
            >
              <Eye size={15} />
              Ver perfil salvo como visitante
            </Link>
          </section>
          <section className="nm-panel nm-account">
            <span className="nm-eyebrow">SUA CONTA</span>
            <h2>Dados e acesso</h2>
            {user?.loginMethod === "password" && (
              <form
                className="nm-form"
                onSubmit={e => {
                  e.preventDefault();
                  if (nextPassword !== confirmPassword) {
                    setMessage("A confirmação da senha não confere.");
                    return;
                  }
                  password.mutate({
                    current: currentPassword,
                    next: nextPassword,
                  });
                }}
              >
                <label>
                  Senha atual
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    maxLength={128}
                  />
                </label>
                <label>
                  Nova senha
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={nextPassword}
                    onChange={e => setNextPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                  />
                </label>
                <label>
                  Confirme a nova senha
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                  />
                </label>
                <button
                  className="nm-button subtle"
                  disabled={password.isPending}
                >
                  <Shield size={15} />
                  {password.isPending ? "Alterando…" : "Alterar senha"}
                </button>
              </form>
            )}
            <div className="nm-divider" />
            <button
              className="nm-button subtle"
              disabled={exporting}
              onClick={exportData}
            >
              <Download size={15} />
              {exporting ? "Exportando…" : "Exportar meu histórico"}
            </button>
            <button
              className="nm-button subtle"
              onClick={() => logout().catch(e => setMessage(e.message))}
            >
              <LogOut size={15} />
              Sair da conta
            </button>
            {user?.loginMethod === "password" && (
              <button
                className="nm-button danger"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 size={15} />
                Excluir minha conta
              </button>
            )}
          </section>
        </aside>
      </div>
      {message && (
        <div className="nm-save-message" role="status">
          {message}
          <button aria-label="Fechar mensagem" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
      <Dialog
        open={deleteOpen}
        onOpenChange={open => {
          if (!deletion.isPending) setDeleteOpen(open);
        }}
      >
        <DialogContent className="nm-dialog">
          <DialogTitle>Excluir sua conta?</DialogTitle>
          <DialogDescription>
            Seu perfil, histórico, emblemas e amizades serão apagados
            definitivamente. Você pode exportar o histórico antes de continuar.
          </DialogDescription>
          <form
            className="nm-form"
            onSubmit={e => {
              e.preventDefault();
              if (confirmation === "EXCLUIR")
                deletion.mutate({
                  password: deletePassword,
                  confirmation: "EXCLUIR",
                });
            }}
          >
            <label>
              Senha atual
              <input
                type="password"
                autoComplete="current-password"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                required
              />
            </label>
            <label>
              Digite EXCLUIR
              <input
                value={confirmation}
                onChange={e => setConfirmation(e.target.value)}
                required
              />
            </label>
            <Feedback error={deletion.error} />
            <button
              className="nm-button danger"
              disabled={deletion.isPending || confirmation !== "EXCLUIR"}
            >
              {deletion.isPending ? "Excluindo…" : "Excluir definitivamente"}
            </button>
            <button
              type="button"
              className="nm-button subtle"
              disabled={deletion.isPending}
              onClick={() => setDeleteOpen(false)}
            >
              Manter minha conta
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
