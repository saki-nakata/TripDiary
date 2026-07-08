"use client";

import { useRouter } from "next/navigation";

type Props = {
  postId: string;
  count: number;
};

export function CommentIconLink({ postId, count }: Props) {
  const router = useRouter();

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/posts/${postId}#comments`);
      }}
      data-testid="comment-icon-link"
      className="hover:text-zinc-600 transition-colors"
    >
      💬 {count}
    </button>
  );
}
