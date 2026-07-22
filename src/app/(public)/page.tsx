import { auth } from "@/lib/auth";
import { ExploreFeed } from "@/components/explore/ExploreFeed";
import { getPortalDataService } from "@/lib/services/post.service";

export default async function PortalPage() {
  const session = await auth();
  const initialData = await getPortalDataService();

  return <ExploreFeed initialData={initialData} viewerId={session?.user?.id} />;
}
