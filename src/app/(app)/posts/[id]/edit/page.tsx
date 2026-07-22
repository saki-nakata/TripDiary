import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { findPostForEditService } from "@/lib/services/post.service";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
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

  let post;
  try {
    post = await findPostForEditService(session.user.id, id);
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof ForbiddenError) notFound();
    throw e;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 -mt-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900">
        <TwemojiIcon codepoint="270f" className="h-6 w-6" /> 旅の記録を編集する
      </h1>
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-4 md:p-8">
        <PostForm initialData={post as Post} />
      </div>
    </div>
  );
}
