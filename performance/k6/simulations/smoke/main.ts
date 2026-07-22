import { Options } from "k6/options";
import { login } from "../../helpers/auth.ts";
import { generateSummary } from "../../helpers/summary.ts";
import { SUMMARY_TREND_STATS } from "../../config/config.ts";
import { placeholderThresholds, gatingEndpointThresholds, UNGATED_ENDPOINT_NAMES } from "../../helpers/thresholds.ts";
import { users } from "../../helpers/csv.ts";
import { feedScenario } from "../../scenarios/feedScenario.ts";
import { postDetailScenario } from "../../scenarios/postDetailScenario.ts";
import { interactionScenario } from "../../scenarios/interactionScenario.ts";
import { mypageReportScenario } from "../../scenarios/mypageReportScenario.ts";
import { planScenario } from "../../scenarios/planScenario.ts";
import { followScenario } from "../../scenarios/followScenario.ts";

// Smoke: シード後に必ず最初に実行するゲート。VU=1で全シナリオ種別を1周し、
// 失敗率0%と（確定事項3の出口として）主要エンドポイントのp95を確認する。
// VU=1なのでLoad（10VU）向けに確定した閾値は通常余裕を持ってクリアするはず。
export const options: Options = {
  setupTimeout: "180s",
  summaryTrendStats: SUMMARY_TREND_STATS,
  scenarios: {
    smoke: {
      executor: "per-vu-iterations",
      vus: 1,
      iterations: 1,
      maxDuration: "90s",
      exec: "smokeSequence",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    ...gatingEndpointThresholds("smoke"),
    ...placeholderThresholds("endpoint", UNGATED_ENDPOINT_NAMES),
  },
};

export function setup() {
  const user = users[0];
  const headers = login(user.email, user.password);
  return { headers };
}

export function smokeSequence(data: { headers: ReturnType<typeof login> }): void {
  feedScenario(data.headers);
  postDetailScenario(data.headers);
  interactionScenario(data.headers);
  mypageReportScenario(data.headers);
  planScenario(data.headers);
  followScenario(data.headers);
}

export const handleSummary = generateSummary("combined", "smoke", options.scenarios);
