import { createContext, useContext, useEffect, type ReactNode } from "react";

/**
 * Theme is locked to a single premium dark experience.
 *
 * The dashboard UI is designed around the deep-navy (#0B0B13) / gradient
 * aesthetic, so light mode has been retired. This provider simply keeps the
 * `dark` class pinned on <html> and exposes a no-op toggle for any legacy
 * callers of `useTheme`.
 */
export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const applyDark = () => {
  const root = document.documentElement;
  root.classList.add("dark");
  // Keeps native controls (scrollbars, form widgets) in step with the theme.
  root.style.colorScheme = "dark";
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    applyDark();
  }, []);

  const noop = () => {};

  return (
    <ThemeContext.Provider value={{ theme: "dark", toggleTheme: noop, setTheme: noop }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
