import { Check, Palette } from "lucide-react";
import { useId } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useVisualTheme } from "@/contexts/VisualThemeContext";
import type { VisualTheme } from "@/lib/visualTheme";

const options: { value: VisualTheme; name: string; description: string }[] = [
  {
    value: "cyber",
    name: "Cyber",
    description: "O original. Azul, coral e neon.",
  },
  {
    value: "cartoon",
    name: "Gamer Cartoon",
    description: "Magenta, ciano e traços ilustrados.",
  },
];

export default function AppearanceSwitcher() {
  const { visualTheme, setVisualTheme, isSaved } = useVisualTheme();
  const id = useId();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="appearance-trigger"
          aria-label="Escolher tema visual"
          title="Escolher tema visual"
        >
          <Palette size={16} aria-hidden="true" />
          <span>Tema</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="appearance-menu"
        align="end"
        sideOffset={10}
        collisionPadding={12}
        aria-labelledby={`${id}-title`}
      >
        <h2 id={`${id}-title`}>Do seu jeito</h2>
        <p>Escolha o visual do Nexo.</p>
        <fieldset className="appearance-options">
          <legend className="sr-only">Tema visual</legend>
          {options.map(option => (
            <label className="appearance-option" key={option.value}>
              <input
                type="radio"
                name={`${id}-theme`}
                value={option.value}
                checked={visualTheme === option.value}
                onChange={() => setVisualTheme(option.value)}
              />
              <span
                className={`appearance-preview preview-${option.value}`}
                aria-hidden="true"
              >
                <i />
                <b />
                <em />
              </span>
              <span className="appearance-option-copy">
                <strong>{option.name}</strong>
                <small>{option.description}</small>
              </span>
              <Check
                className="appearance-check"
                size={16}
                aria-hidden="true"
              />
            </label>
          ))}
        </fieldset>
        <p className="appearance-saved" role="status">
          {isSaved
            ? "Preferência salva neste navegador."
            : "Tema aplicado nesta sessão."}
        </p>
      </PopoverContent>
    </Popover>
  );
}
