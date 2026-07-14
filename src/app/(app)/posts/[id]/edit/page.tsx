import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { findPostById } from "@/lib/repositories/post.repository";
import { PostForm } from "@/components/posts/PostForm";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import type { Post } from "@/types/post";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const post = await findPostById(id);
  if (!post) notFound();
  if (post.authorId !== session.user.id) notFound();

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 -mt-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900">
        <TwemojiIcon codepoint="270f" className="h-6 w-6" /> 投稿を編集する
      </h1>
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-8">
        <PostForm initialData={post as Post} />
      </div>
    </div>
  );
}
