import { toggleVisited } from "@/lib/repositories/visited.repository";

export async function toggleVisitedService(userId: string, postId: string) {
  return toggleVisited(userId, postId);
}
