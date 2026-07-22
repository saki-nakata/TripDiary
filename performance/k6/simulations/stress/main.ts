import { Options } from "k6/options";
import exec from "k6/execution";
import { login } from "../../helpers/auth.ts";
import { generateSummary } from "../../helpers/summary.ts";
import { SUMMARY_TREND_STATS } from "../../config/config.ts";
import { placeholderThresholds, ENDPOINT_NAMES } from "../../helpers/thresholds.ts";
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

const SCENARIO_NAMES = ["vu5", "vu15", "vu30", "vu50"] as const;

// Stress: 段階的にVUを増やして限界点を記録するのが目的（合否判定はしない＝passed: null）。
// 経過時間からのphase推定はランピング中に誤タグ付けになるため使わず、k6のscenarios分割による
// 自動scenarioタグに委ねる（scenario:vu5〜vu50が自動的に全リクエストへ付与される）。
export const options: Options = {
  setupTimeout: "180s",
  summaryTrendStats: SUMMARY_TREND_STATS,
  scenarios: {
    vu5: { executor: "constant-vus", vus: 5, duration: "3m", startTime: "0m", exec: "mixed" },
    vu15: { executor: "constant-vus", vus: 15, duration: "3m", startTime: "3m", exec: "mixed" },
    vu30: { executor: "constant-vus", vus: 30, duration: "3m", startTime: "6m", exec: "mixed" },
    vu50: { executor: "constant-vus", vus: 50, duration: "3m", startTime: "9m", exec: "mixed" },
    login: {
      executor: "constant-vus",
      vus: 1,
      duration: "12m",
      startTime: "0m",
      exec: "loginOnly",
    },
  },
  thresholds: {
    // 意図的に合否ゲートを置かない（限界点の記録が目的）。プレースホルダのみで内訳を集計する。
    ...placeholderThresholds("scenario", SCENARIO_NAMES),
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

export const handleSummary = generateSummary("combined", "stress", options.scenarios);
