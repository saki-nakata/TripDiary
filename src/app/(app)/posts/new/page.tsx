import { PostForm } from "@/components/posts/PostForm";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

type Props = {
  searchParams: Promise<{
    planId?: string;
    presetTitle?: string;
    presetLocation?: string;
    presetCategory?: string;
    presetImageUrl?: string;
  }>;
};

export default async function NewPostPage({ searchParams }: Props) {
  const { planId, presetTitle, presetLocation, presetCategory, presetImageUrl } = await searchParams;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 -mt-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900">
        <TwemojiIcon codepoint="1f4dd" className="h-6 w-6" /> 旅スポットを投稿する
      </h1>
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-8">
        <PostForm
          planId={planId}
          presetTitle={presetTitle}
          presetLocation={presetLocation}
          presetCategory={presetCategory}
          presetImageUrl={presetImageUrl}
        />
      </div>
    </div>
  );
}
