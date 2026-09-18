import { useRef, useState, type CSSProperties } from "react";
import { Link } from "wouter";
import {
  Compass,
  Flag,
  Check,
  LockKeyhole,
  MapPin,
  Sparkles,
  Users,
  ArrowRight,
  Mountain,
  Flame,
  Target,
  Star,
  Map,
  Medal,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { MapData } from "./NexoMap";
import "./adventure-map.css";

type Progress = NonNullable<MapData["progress"]>;
type Achievement = Progress["achievements"][number];
const positions: Record<
  string,
  { x: number; y: number; mx: number; my: number }
> = {
  first: { x: 12, y: 65, mx: 24, my: 18 },
  explorer: { x: 27, y: 43, mx: 73, my: 25 },
  cartographer: { x: 12, y: 23, mx: 67, my: 42 },
  horizon: { x: 34, y: 17, mx: 23, my: 43 },
  spark: { x: 47, y: 68, mx: 24, my: 65 },
  week: { x: 59, y: 38, mx: 74, my: 62 },
  target: { x: 79, y: 63, mx: 70, my: 84 },
  sharp: { x: 86, y: 26, mx: 24, my: 87 },
};
const icons = {
  first: Sparkles,
  explorer: Compass,
  cartographer: Map,
  horizon: Mountain,
  spark: Flame,
  week: Star,
  target: Target,
  sharp: Medal,
};
function Scenery({ mobile = false }: { mobile?: boolean }) {
  const regions = mobile
    ? [
        { x: 228, y: 292, scale: 1.05 },
        { x: 230, y: 610, scale: 0.8 },
        { x: 235, y: 859, scale: 0.85 },
      ]
    : [
        { x: 221, y: 281, scale: 1.08 },
        { x: 525, y: 365, scale: 0.87 },
        { x: 830, y: 351, scale: 0.85 },
      ];
  const contour =
    "M-140-20C-181-111-74-153 26-125S174-46 146 51S42 160-41 126S-161 72-140-20Z";
  return (
    <svg
      className={mobile ? "am-scenery mobile" : "am-scenery desktop"}
      viewBox={mobile ? "0 0 460 1000" : "0 0 1000 680"}
      fill="none"
      aria-hidden="true"
    >
      {regions.map((region, index) => (
        <g
          className={"am-contour contour-" + index}
          key={index}
          transform={
            "translate(" +
            region.x +
            " " +
            region.y +
            ") scale(" +
            region.scale +
            ")"
          }
        >
          {[0.65, 0.88, 1.12, 1.36, 1.6].map((scale, ring) => (
            <path
              key={ring}
              d={contour}
              transform={"scale(" + scale + ") rotate(" + ring * 9 + ")"}
              stroke="currentColor"
              strokeWidth={ring === 2 ? 1.1 : 0.6}
            />
          ))}
        </g>
      ))}
      {(mobile
        ? [
            [38, 122],
            [419, 326],
            [38, 493],
            [401, 753],
            [55, 939],
          ]
        : [
            [66, 320],
            [310, 600],
            [709, 145],
            [923, 440],
            [440, 72],
          ]
      ).map(([x, y], i) => (
        <g
          key={i}
          transform={"translate(" + x + " " + y + ")"}
          className="am-coordinate"
        >
          <path d="M-4 0H4M0-4V4" stroke="currentColor" />
          <circle r="10" stroke="currentColor" strokeWidth=".5" />
        </g>
      ))}
      <path
        className="am-survey-line"
        d={
          mobile
            ? "M0 505C135 560 306 500 460 528M0 751C150 710 310 774 460 726"
            : "M415 0C345 215 518 376 389 680M714 0C659 254 724 458 670 680"
        }
        stroke="currentColor"
        strokeWidth=".7"
        strokeDasharray="2 7"
      />
    </svg>
  );
}
export default function AdventureMap({
  progress,
  owner,
  name,
  onSelect,
}: {
  progress: Progress;
  owner: boolean;
  name: string;
  onSelect: (achievement: Achievement) => void;
}) {
  const [region, setRegion] = useState("all");
  const mapRef = useRef<HTMLDivElement>(null);
  const companions = trpc.nexomap.companions.useQuery(undefined, {
    enabled: owner,
    retry: false,
  });
  const next = progress.achievements.find(a => !a.unlocked);
  const last = progress.achievements
    .filter(a => a.path === "descoberta" && a.unlocked)
    .at(-1);
  const current = last?.id ?? "first";
  function findNext() {
    if (!next) return;
    setRegion("all");
    const node = mapRef.current?.querySelector<HTMLButtonElement>(
      '[data-milestone="' + next.id + '"]'
    );
    node?.focus({ preventScroll: true });
    node?.scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  return (
    <section className="am-section" aria-label="Mapa de aventuras">
      <div className="am-toolbar">
        <div>
          <span className="nm-eyebrow">CADA DESCOBERTA ABRE UM CAMINHO</span>
          <h2>{owner ? "Explore seu NexoMap" : "Os caminhos de " + name}</h2>
        </div>
        {next && (
          <button className="nm-button subtle" onClick={findNext}>
            <MapPin size={16} />
            Próxima parada
          </button>
        )}
      </div>
      <div className="am-region-picker" aria-label="Explorar regiões">
        {[
          { id: "all", label: "Mapa completo", Icon: Compass },
          { id: "descoberta", label: "Descobertas", Icon: Map },
          { id: "constância", label: "Constância", Icon: Flame },
          { id: "precisão", label: "Precisão", Icon: Target },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            aria-pressed={region === id}
            onClick={() => setRegion(id)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>
      <div className="am-world" ref={mapRef}>
        <div className="am-map-caption">
          <Compass size={17} />
          <span>
            NEXOMAP<small>8 marcos · conexões em expansão</small>
          </span>
        </div>
        <Scenery />
        <Scenery mobile />
        <svg
          className="am-roads desktop"
          viewBox="0 0 1000 680"
          aria-hidden="true"
        >
          <path
            className="am-road base"
            d="M120 442C60 357 239 356 270 292S35 207 120 156S185 75 340 116M270 292C412 228 351 528 470 462S488 271 590 258M590 258C699 237 644 479 790 428S761 207 860 177"
          />
          <path
            className="am-road dotted"
            d="M120 442C60 357 239 356 270 292S35 207 120 156S185 75 340 116M270 292C412 228 351 528 470 462S488 271 590 258M590 258C699 237 644 479 790 428S761 207 860 177"
          />
        </svg>
        <svg
          className="am-roads mobile"
          viewBox="0 0 460 1000"
          aria-hidden="true"
        >
          <path
            className="am-road base"
            d="M110 180C80 285 312 136 336 250S391 360 308 420S79 526 106 430M308 420C367 551 41 519 110 650S259 528 340 620M340 620C436 744 257 737 322 840S160 961 110 870"
          />
          <path
            className="am-road dotted"
            d="M110 180C80 285 312 136 336 250S391 360 308 420S79 526 106 430M308 420C367 551 41 519 110 650S259 528 340 620M340 620C436 744 257 737 322 840S160 961 110 870"
          />
        </svg>
        <span className="am-region-label discovery">
          Descoberta<small>01 / explore novas palavras</small>
        </span>
        <span className="am-region-label constancy">
          Constância<small>02 / encontre seu ritmo</small>
        </span>
        <span className="am-region-label precision">
          Precisão<small>03 / aproxime suas ideias</small>
        </span>
        <span className="am-north" aria-hidden="true">
          N<Compass size={45} />
          <small>S</small>
        </span>
        {progress.achievements.map(a => {
          const pos = positions[a.id];
          const Icon = icons[a.id];
          const isNext = next?.id === a.id;
          const friends =
            companions.data?.filter(p => p.milestone === a.id).slice(0, 3) ??
            [];
          return (
            <div
              className={
                "am-stop " +
                (a.unlocked ? "visited " : "") +
                (isNext ? "next " : "") +
                (region !== "all" && region !== a.path ? "dimmed" : "")
              }
              key={a.id}
              style={
                {
                  "--x": pos.x + "%",
                  "--y": pos.y + "%",
                  "--mx": pos.mx + "%",
                  "--my": pos.my + "%",
                } as CSSProperties
              }
            >
              {current === a.id && (
                <span className="am-you">
                  <Flag size={11} />
                  {owner ? "você está aqui" : "última descoberta"}
                </span>
              )}
              <button
                className="am-stop-button"
                data-milestone={a.id}
                onClick={() => onSelect(a)}
                aria-label={
                  a.title +
                  (a.unlocked
                    ? ", conquistado"
                    : ", " + a.progress + " de " + a.goal)
                }
              >
                <span className="am-stop-medal">
                  <Icon size={27} />
                  {a.unlocked ? (
                    <Check size={13} className="am-status" />
                  ) : (
                    !isNext && <LockKeyhole size={11} className="am-status" />
                  )}
                </span>
                <strong>{a.title}</strong>
                <small>
                  {a.unlocked
                    ? "Nexo feito!"
                    : isNext
                      ? a.progress + "/" + a.goal + " · sua próxima parada"
                      : a.progress + "/" + a.goal + " para descobrir"}
                </small>
              </button>
              {!!friends.length && (
                <div className="am-companions">
                  {friends.map(friend => (
                    <Link
                      key={friend.id}
                      href={"/nexomap/" + friend.id}
                      title={friend.name + " passou por aqui"}
                      aria-label={"Visitar o mapa de " + friend.name}
                    >
                      {friend.avatarUrl ? (
                        <img src={friend.avatarUrl} alt="" />
                      ) : (
                        (friend.name ?? "N").slice(0, 1)
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <span className="am-map-note">
          Seu próximo nexo
          <br />
          ainda está por descobrir.
        </span>
      </div>
      <div className="am-bottom">
        <span>
          <i className="visited" /> conquistado
        </span>
        <span>
          <i className="next" /> próxima parada
        </span>
        <span>
          <i /> por explorar
        </span>
        {owner && (
          <Link href="/amigos">
            <Users size={14} />
            {companions.data?.length
              ? "Sua turma também está por aqui"
              : "Chame sua turma para o mapa"}{" "}
            <ArrowRight size={13} />
          </Link>
        )}
      </div>
      {companions.isError && (
        <p className="nm-muted">
          Não foi possível mostrar os amigos no mapa.{" "}
          <button
            className="nm-link-button"
            onClick={() => companions.refetch()}
          >
            Tentar novamente
          </button>
        </p>
      )}
    </section>
  );
}
