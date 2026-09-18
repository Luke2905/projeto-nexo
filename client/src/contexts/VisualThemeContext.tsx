import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import {
  applyVisualTheme,
  readVisualTheme,
  saveVisualTheme,
  VISUAL_THEME_KEY,
  type VisualTheme,
} from "@/lib/visualTheme";

type VisualThemeContextValue = {
  visualTheme: VisualTheme;
  setVisualTheme: (theme: VisualTheme) => void;
  isSaved: boolean;
};

const VisualThemeContext = createContext<VisualThemeContextValue | null>(null);

export function VisualThemeProvider({ children }: { children: ReactNode }) {
  const [visualTheme, setVisualTheme] = useState(readVisualTheme);
  const [isSaved, setIsSaved] = useState(false);

  useLayoutEffect(() => {
    applyVisualTheme(visualTheme);
    setIsSaved(saveVisualTheme(visualTheme));
  }, [visualTheme]);

  useEffect(() => {
    function syncPreference(event: StorageEvent) {
      if (event.key === VISUAL_THEME_KEY || event.key === null) {
        setVisualTheme(readVisualTheme());
      }
    }
    window.addEventListener("storage", syncPreference);
    return () => window.removeEventListener("storage", syncPreference);
  }, []);

  return (
    <VisualThemeContext.Provider
      value={{ visualTheme, setVisualTheme, isSaved }}
    >
      {children}
    </VisualThemeContext.Provider>
  );
}

export function useVisualTheme() {
  const context = useContext(VisualThemeContext);
  if (!context)
    throw new Error("useVisualTheme must be used within VisualThemeProvider");
  return context;
}
