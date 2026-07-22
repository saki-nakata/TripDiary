import { Options } from "k6/options";
import exec from "k6/execution";
import { login } from "../../helpers/auth.ts";
import { generateSummary } from "../../helpers/summary.ts";
import { SUMMARY_TREND_STATS } from "../../config/config.ts";
import { placeholderThresholds, gatingScenarioAuxThresholds, ENDPOINT_NAMES } from "../../helpers/thresholds.ts";
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

const SCENARIO_NAMES = ["spike1", "rampdown1", "cooldown1", "spike2", "rampdown2", "cooldown2"] as const;

// Spike: 急増→ランプダウン→5VU定常を2セット。p99ゲートは、負荷が落ち着いた後だけを見る。
export const options: Options = {
  setupTimeout: "180s",
  summaryTrendStats: SUMMARY_TREND_STATS,
  scenarios: {
    spike1: { executor: "ramping-vus", startVUs: 5, stages: [{ duration: "1m", target: 40 }], startTime: "0m", exec: "mixed" },
    rampdown1: { executor: "ramping-vus", startVUs: 40, stages: [{ duration: "2m", target: 5 }], startTime: "1m", exec: "mixed" },
    cooldown1: { executor: "constant-vus", vus: 5, duration: "1m", startTime: "3m", exec: "mixed" },
    spike2: { executor: "ramping-vus", startVUs: 5, stages: [{ duration: "1m", target: 60 }], startTime: "4m", exec: "mixed" },
    rampdown2: { executor: "ramping-vus", startVUs: 60, stages: [{ duration: "2m", target: 5 }], startTime: "5m", exec: "mixed" },
    cooldown2: { executor: "constant-vus", vus: 5, duration: "1m", startTime: "7m", exec: "mixed" },
    login: {
      executor: "constant-vus",
      vus: 1,
      duration: "8m",
      startTime: "0m",
      exec: "loginOnly",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    // rampdown中の高負荷リクエストを混ぜず、5VUで1分維持したcooldown区間だけで回復を判定する。
    // 既存の閾値を維持し、修正後のクリーン実測で妥当性を再確認する。
    "http_req_duration{scenario:cooldown1}": ["p(99)<2000"],
    "http_req_duration{scenario:cooldown2}": ["p(99)<5000"],
    ...gatingScenarioAuxThresholds(["cooldown1", "cooldown2"]),
    ...placeholderThresholds(
      "scenario",
      SCENARIO_NAMES.filter((s) => s !== "cooldown1" && s !== "cooldown2")
    ),
    ...placeholderThresholds("endpoint", ENDPOINT_NAMES),
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

export const handleSummary = generateSummary("combined", "spike", options.scenarios);
