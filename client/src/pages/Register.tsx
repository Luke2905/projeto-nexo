import AppearanceSwitcher from "@/components/AppearanceSwitcher";
import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, Check, Gamepad2, LockKeyhole, Sparkles, Trophy, Users, Zap } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const benefits = [
  { icon: Trophy, title: "Seu progresso", text: "Salve jogos, sequências e conquistas." },
  { icon: Users, title: "Jogue com amigos", text: "Apareça no ranking e acompanhe sua turma." },
  { icon: Zap, title: "Continue de onde parou", text: "Seu mapa fica com você em qualquer tela." },
];

export default function Register() {
  const { user, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<"register" | "login">("register");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [slowRequest, setSlowRequest] = useState(false);
  const register = trpc.auth.register.useMutation({
    onSuccess: () => { window.location.href = "/perfil"; },
    onError: (cause) => setError(cause.message),
    retry: false,
  });
  const login = trpc.auth.login.useMutation({
    onSuccess: () => { window.location.href = "/perfil"; },
    onError: (cause) => setError(cause.message),
    retry: false,
  });
  const pending = register.isPending || login.isPending;

  useEffect(() => {
    if (!pending) {
      setSlowRequest(false);
      return;
    }
    const timer = window.setTimeout(() => setSlowRequest(true), 5_000);
    return () => window.clearTimeout(timer);
  }, [pending]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError("");
    if (tab === "register") {
      if (!termsAccepted) {
        setError("Você precisa aceitar os Termos de Uso e Política de Privacidade para criar uma conta.");
        return;
      }
      register.mutate({ name, username, password });
    } else {
      login.mutate({ username, password });
    }
  }

  return (
    <main className="register-shell">
      <div className="register-aurora aurora-one" />
      <div className="register-aurora aurora-two" />
      <div className="register-wrap">
        <header className="register-header">
          <Link href="/" className="back-link"><ArrowLeft size={16} /> voltar ao jogo</Link>
          <Link href="/" className="flex items-center gap-2.5 no-underline hover:opacity-95 transition-opacity">
            <img src="/nexo-logo.png" alt="Nexo" className="w-8 h-8 rounded-lg shadow-[0_0_14px_rgba(0,240,255,0.35)] object-cover border border-[#00f0ff]/30" />
            <div className="register-brand">NEXO</div>
          </Link>
          <div className="appearance-header-actions">
            <AppearanceSwitcher />
            <span className="register-status"><span /> protegido</span>
          </div>
        </header>
        <section className="register-grid">
          <div className="register-copy">
            <span className="register-kicker"><Sparkles size={13} /> sua jornada, salva</span>
            <h1>Um mapa só seu.<br /><em>Mais perto de tudo.</em></h1>
            <p>Crie uma conta simples para guardar suas partidas, acompanhar sua evolução e disputar espaço no ranking com quem joga com você.</p>
            <div className="register-benefits">
              {benefits.map(({ icon: Icon, title, text }) => (
                <div className="register-benefit" key={title}>
                  <div><Icon size={16} /></div>
                  <span><strong>{title}</strong><small>{text}</small></span>
                </div>
              ))}
            </div>
          </div>
          <div className="register-card">
            <div className="register-card-top">
              <div className="register-symbol"><Gamepad2 size={21} /></div>
              <span>nexo<span>•</span> id</span>
            </div>
            {isAuthenticated ? (
              <div className="already-in">
                <div className="already-check"><Check size={23} /></div>
                <h2>Você já está dentro.</h2>
                <p>Seu progresso está sendo guardado para <strong>{user?.name ?? "você"}</strong>.</p>
                <Link href="/perfil" className="register-primary">ver meu perfil <ArrowLeft size={15} /></Link>
              </div>
            ) : (
              <>
                <div className="auth-tabs">
                  <button type="button" disabled={pending} className={tab === "register" ? "auth-tab active" : "auth-tab"} onClick={() => { setTab("register"); setError(""); }}>criar conta</button>
                  <button type="button" disabled={pending} className={tab === "login" ? "auth-tab active" : "auth-tab"} onClick={() => { setTab("login"); setError(""); }}>entrar</button>
                </div>
                <h2>{tab === "register" ? "Comece seu cadastro" : "Bom te ver de novo"}</h2>
                <p className="register-card-desc">{tab === "register" ? "Uma conta para salvar cada descoberta." : "Entre para continuar seu mapa."}</p>
                <form className="auth-form" onSubmit={submit} aria-busy={pending}>
                  {tab === "register" && (
                    <label>
                      nome de exibição
                      <input disabled={pending} value={name} onChange={(event) => setName(event.target.value)} placeholder="Como quer ser chamado?" required minLength={2} maxLength={80} />
                    </label>
                  )}
                  <label>
                    usuário
                    <input disabled={pending} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="ex.: jogador_nexo" pattern="[A-Za-z0-9_.-]{3,32}" required />
                  </label>
                  <label>
                    senha
                    <input disabled={pending} value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="mínimo de 8 caracteres" required minLength={tab === "register" ? 8 : 1} maxLength={128} />
                  </label>

                  {tab === "register" && (
                    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginTop: "12px", marginBottom: "4px" }}>
                      <input 
                        type="checkbox" 
                        id="terms" 
                        required
                        checked={termsAccepted} 
                        onChange={(e) => setTermsAccepted(e.target.checked)} 
                        disabled={pending} 
                        style={{ marginTop: "2px", width: "16px", height: "16px", cursor: "pointer" }} 
                      />
                      <div style={{ fontSize: "12px", color: "var(--foreground-muted)", lineHeight: "1.4" }}>
                        <label htmlFor="terms" style={{ cursor: "pointer", display: "inline", textTransform: "none", fontWeight: "normal", fontSize: "inherit", margin: 0 }}>
                          Eu li e concordo com os{" "}
                        </label>
                        <Dialog>
                          <DialogTrigger asChild>
                            <button type="button" style={{ background: "none", border: "none", padding: 0, margin: 0, color: "var(--foreground)", cursor: "pointer", textDecoration: "underline", fontSize: "inherit", display: "inline", fontWeight: 500 }}>
                              Termos de Uso e Política de Privacidade (LGPD)
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Termos de Uso e Política de Privacidade</DialogTitle>
                              <DialogDescription>De acordo com a Lei Geral de Proteção de Dados Pessoais (LGPD)</DialogDescription>
                            </DialogHeader>
                            <div className="text-sm space-y-4 pt-4 leading-relaxed text-muted-foreground">
                              <p>
                                <strong className="text-foreground">1. Coleta e Finalidade dos Dados:</strong> Coletamos o seu nome de exibição e nome de usuário exclusivamente para a criação e personalização da sua conta no jogo Nexo. O seu endereço de e-mail (se fornecido) será utilizado apenas para recuperação de acesso à conta ou comunicações de segurança, não sendo compartilhado com terceiros para fins de marketing em hipótese alguma.
                              </p>
                              <p>
                                <strong className="text-foreground">2. Uso de Dados de Jogo:</strong> Seus dados de interação dentro do jogo (palpites submetidos, tempo de resolução, sequências de vitórias e conquistas alcançadas) são processados e associados à sua conta com o fim de gerar estatísticas pessoais, alimentar o Ranking Global e permitir que você compare seu progresso com seus amigos.
                              </p>
                              <p>
                                <strong className="text-foreground">3. Armazenamento e Segurança da Informação:</strong> Empregamos protocolos rígidos de segurança. Sua senha é protegida utilizando algoritmos avançados de hash (scrypt com salt aleatório), garantindo que ela nunca seja armazenada em texto puro. Os dados ficam armazenados em serviços seguros de infraestrutura em nuvem, seguindo as melhores práticas do setor.
                              </p>
                              <p>
                                <strong className="text-foreground">4. Seus Direitos (LGPD):</strong> No Nexo, você mantém o controle total sobre seus dados. A qualquer momento, através da seção de Configurações do Perfil, você pode:
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                  <li>Alterar a visibilidade do seu perfil no jogo (Privado, Público, ou Apenas Amigos). Ao definir como Privado, você não aparecerá em Rankings Globais.</li>
                                  <li>Solicitar a exclusão completa e irreversível da sua conta, bem como de todos os dados de progresso e informações pessoais associadas a ela.</li>
                                  <li>Exportar todos os seus dados em um formato legível (JSON) diretamente pelo painel do seu perfil.</li>
                                </ul>
                              </p>
                              <p>
                                <strong className="text-foreground">5. Tecnologias de Rastreamento (Cookies):</strong> O jogo utiliza cookies que são estritamente necessários para manter a sua sessão conectada com segurança (autenticação). Não utilizamos rastreadores invasivos para a venda de anúncios de terceiros baseados em perfilamento comportamental.
                              </p>
                              <p>
                                Ao criar a sua conta e marcar a caixa de concordância, você declara que compreendeu e aceita os termos e condições descritos acima para a utilização do Nexo.
                              </p>
                            </div>
                          </DialogContent>
                        </Dialog>
                        .
                      </div>
                    </div>
                  )}

                  {pending && slowRequest && <p className="register-card-desc" role="status">Está levando um pouco mais de tempo. Estamos preparando sua conexão; mantenha esta página aberta.</p>}
                  {error && <div className="auth-error" role="alert">{error}</div>}
                  <button className="oauth-button" disabled={pending}>{pending ? "aguarde..." : tab === "register" ? "criar minha conta" : "entrar no NEXO"}</button>
                </form>
                <div className="register-divider"><span>seguro por padrão</span></div>
                <div className="register-trust">
                  <LockKeyhole size={13} />
                  <span>Sua senha é protegida com scrypt + salt aleatório e nunca é armazenada em texto puro.</span>
                </div>
              </>
            )}
            <Link href="/" className="register-secondary">continuar sem cadastro <ArrowLeft size={13} /></Link>
          </div>
        </section>
        <footer className="register-footer">
          <span>nexo<span>•</span> id</span>
          <span>palavras são melhores quando compartilhadas</span>
        </footer>
      </div>
    </main>
  );
}
