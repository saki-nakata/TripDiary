import { Metadata } from "next";
import { NotificationList } from "@/components/notification/NotificationList";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

export const metadata: Metadata = { title: "通知 — TripDiary" };

export default function NotificationPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-[#1e293b] mb-6">
        <TwemojiIcon codepoint="1f514" className="h-6 w-6" /> 通知
      </h1>
      <NotificationList />
    </div>
  );
}
