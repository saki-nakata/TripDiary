import { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { SearchClient } from "@/components/search/SearchClient";

export const metadata: Metadata = { title: "検索 — TripDiary" };

export default async function SearchPage() {
  const session = await auth();

  return (
    <Suspense>
      <SearchClient viewerId={session?.user?.id} />
    </Suspense>
  );
}
