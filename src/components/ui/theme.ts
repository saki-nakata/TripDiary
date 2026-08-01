export type ThemeChoice = "light" | "dark" | "system";

export const THEME_OPTIONS: { value: ThemeChoice; emoji: string; label: string }[] = [
  { value: "light", emoji: "☀️", label: "ライト" },
  { value: "dark", emoji: "🌙", label: "ダーク" },
  { value: "system", emoji: "🌗", label: "自動" },
];

export function applyTheme(choice: ThemeChoice) {
  if (choice === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", choice);
  }
}
