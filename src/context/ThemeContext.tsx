import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Light/dark theme.
 *
 * Tailwind is configured with darkMode:'class', and the components already carry
 * `dark:` variants — but nothing ever put the class on <html>, so the dark styles
 * were dead and the app was stuck in light. This provider owns that class.
 *
 * Order of preference: saved choice -> OS setting -> light.
 */
export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const STORAGE_KEY = "theme";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const readInitialTheme = (): Theme => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* localStorage unavailable (private mode) — fall back to the default */
  }
  // Default to light rather than following the OS: dark is newly enabled and
  // wants a visual pass first, so nobody gets it without opting in. Switch this
  // to the OS preference once dark has been reviewed.
  return "light";
};

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  // Keeps native controls (scrollbars, form widgets) in step with the theme.
  root.style.colorScheme = theme;
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (t: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore — the class still applies for this session */
    }
    setThemeState(t);
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
