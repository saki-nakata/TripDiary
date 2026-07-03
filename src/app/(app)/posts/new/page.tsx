import { PostForm } from "@/components/posts/PostForm";

type Props = {
  searchParams: Promise<{ planId?: string }>;
};

export default async function NewPostPage({ searchParams }: Props) {
  const { planId } = await searchParams;

  return (
    <div className="max-w-4xl mx-auto bg-white border border-zinc-200 rounded-2xl shadow-sm p-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">✏️ 旅スポットを投稿する</h1>
      <PostForm planId={planId} />
    </div>
  );
}
