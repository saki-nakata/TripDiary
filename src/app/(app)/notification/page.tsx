import { Metadata } from "next";
import { NotificationList } from "@/components/notification/NotificationList";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

export const metadata: Metadata = { title: "通知 — TripDiary" };

export default function NotificationPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 -mt-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[#1e293b]">
          <TwemojiIcon codepoint="1f514" className="h-6 w-6" /> 通知
        </h1>
        <p className="text-xs text-[#94a3b8]">（1年以上前の未読通知は自動的に既読になります）</p>
      </div>
      <NotificationList />
    </div>
  );
}
