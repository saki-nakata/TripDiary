import { sleep } from "k6";
import { getPlans, createPlan, deletePlan } from "../requests/apiRequests.ts";
import type { RequestHeaders } from "../helpers/auth.ts";

// プランCRUD：一覧取得→作成→削除で自己完結させ、長時間実行でもplansテーブルを肥大化させない。
export function planScenario(headers: RequestHeaders): void {
  getPlans(headers);
  sleep(1);

  const res = createPlan(headers, `パフォーマンステスト用プラン ${Date.now()}`);
  const created = res.json() as { id?: string } | null;
  sleep(1);

  if (created?.id) {
    deletePlan(headers, created.id);
  }
}
