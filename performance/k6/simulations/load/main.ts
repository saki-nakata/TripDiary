import { Options } from "k6/options";
import exec from "k6/execution";
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
import { loginScenario } from "../../scenarios/loginScenario.ts";
import type { RequestHeaders } from "../../helpers/auth.ts";

interface SetupData {
  headersByUser: RequestHeaders[];
}

const SCENARIO_NAMES = ["ramp", "steady", "rampdown"] as const;

// Load: ramp（0→10VU, 3m）→ steady（10VU, 5m）→ rampdown（2m）。
// 確定事項3の出口：2026-07-21のクリーンな実測値（posts_portal等のLIMIT漏れ修正後）を基に
// 第一級のSSRページ・主要APIをp95でゲートする（helpers/thresholds.ts参照）。
export const options: Options = {
  setupTimeout: "180s",
  summaryTrendStats: SUMMARY_TREND_STATS,
  scenarios: {
    ramp: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [{ duration: "3m", target: 10 }],
      startTime: "0m",
      exec: "mixed",
    },
    steady: {
      executor: "constant-vus",
      vus: 10,
      duration: "5m",
      startTime: "3m",
      exec: "mixed",
    },
    rampdown: {
      executor: "ramping-vus",
      startVUs: 10,
      stages: [{ duration: "2m", target: 0 }],
      startTime: "8m",
      exec: "mixed",
    },
    login: {
      executor: "constant-vus",
      vus: 1,
      duration: "10m",
      startTime: "0m",
      exec: "loginOnly",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    ...gatingEndpointThresholds("steady"),
    ...placeholderThresholds("scenario", SCENARIO_NAMES),
    ...placeholderThresholds("endpoint", UNGATED_ENDPOINT_NAMES),
  },
};

export function setup(): SetupData {
  const headersByUser = users.map((u) => login(u.email, u.password));
  return { headersByUser };
}

function headersForCurrentVu(data: SetupData): RequestHeaders {
  const index = (exec.vu.idInTest - 1) % data.headersByUser.length;
  return data.headersByUser[index];
}

// フィード読み取り45%・投稿詳細SSR20%・いいね/コメント15%・プランCRUD10%・
// フォロー/プロフィール閲覧5%・mypage report5%
export function mixed(data: SetupData): void {
  const headers = headersForCurrentVu(data);
  const r = Math.random();
  if (r < 0.45) feedScenario(headers);
  else if (r < 0.65) postDetailScenario(headers);
  else if (r < 0.8) interactionScenario(headers);
  else if (r < 0.9) planScenario(headers);
  else if (r < 0.95) followScenario(headers);
  else mypageReportScenario(headers);
}

export function loginOnly(): void {
  loginScenario();
}

export const handleSummary = generateSummary("combined", "load", options.scenarios);
