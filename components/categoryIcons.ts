export const CAT_ICON: Record<string, string> = {
  smartphones: "📱",
  laptops: "💻",
  "pc-components": "🖥️",
  desktops: "🖥️",
  tablets: "📟",
  smartwatches: "⌚",
  "gaming-consoles": "🎮",
  tvs: "📺",
  cameras: "📷",
  headphones: "🎧",
};

export function catIcon(cat: string): string {
  return CAT_ICON[cat] ?? "🏷️";
}
