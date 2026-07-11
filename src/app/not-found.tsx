import Link from "next/link";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <TwemojiIcon codepoint="1f5fa" className="h-12 w-12" />
      <h2 className="text-xl font-semibold text-zinc-800">ページが見つかりません</h2>
      <p className="text-sm text-zinc-500">お探しのページは存在しないか、移動した可能性があります。</p>
      <Link
        href="/"
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        トップページへ
      </Link>
    </div>
  );
}
