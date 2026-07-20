import { pingDatabase } from "@/lib/repositories/health.repository";

export async function checkHealthService(): Promise<void> {
  await pingDatabase();
}
