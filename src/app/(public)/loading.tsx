import { TwemojiIcon } from "@/components/ui/twemoji-icon";

const DOTS = ["1f534", "1f7e0", "1f7e1", "1f7e2", "1f535", "1f7e3"];

export default function PublicSegmentLoading() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-10">
      <div className="flex items-end gap-5">
        {DOTS.map((codepoint, i) => (
          <TwemojiIcon
            key={codepoint}
            codepoint={codepoint}
            className="animate-bounce-dot h-8 w-8"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="text-xl font-medium text-zinc-400">読み込み中…</p>
    </div>
  );
}
