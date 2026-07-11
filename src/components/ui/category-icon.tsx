import { CATEGORY_TWEMOJI } from "@/lib/constants";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const codepoint = CATEGORY_TWEMOJI[category] ?? CATEGORY_TWEMOJI["その他"];
  return <TwemojiIcon codepoint={codepoint} className={className ?? "inline-block h-[1em] w-[1em] align-[-0.15em]"} />;
}
