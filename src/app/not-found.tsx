import Link from "next/link";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

export default function NotFound() {
  return (
    <div className="animate-fade-in flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-sky-100">
        <TwemojiIcon codepoint="1f5fa" className="h-14 w-14" />
      </div>
      <h2 className="text-2xl font-semibold text-zinc-800">迷子になってしまったようです</h2>
      <p className="max-w-sm text-base leading-relaxed text-zinc-500">
        お探しのページは地図の外にあるようです。
        <br />
        存在しないか、移動した可能性があります。
      </p>
      <Link
        href="/"
        className="flex items-center gap-2 rounded-lg bg-green-500 px-6 py-3 text-base font-medium text-white hover:bg-green-600"
      >
        <TwemojiIcon codepoint="1f3e0" alt="🏠" className="h-7 w-7" /> トップページへ戻る
      </Link>
    </div>
  );
}
