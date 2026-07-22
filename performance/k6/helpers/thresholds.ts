// 全シナリオファイルで実際に使われているendpointタグの一覧（requests/*.ts のtags.endpointと一致させる）
export const ENDPOINT_NAMES = [
  "home_ssr",
  "post_detail_ssr",
  "mypage_report_ssr",
  "posts_explore",
  "posts_portal",
  "notifications_unread_count",
  "posts_like_toggle",
  "posts_comments_list",
  "posts_comments_create",
  "stats",
  "stats_years",
  "plans_list",
  "plans_create",
  "plans_delete",
  "login",
  "auth_csrf",
  "users_follow_toggle",
  "user_profile_ssr",
] as const;

// k6は「metric×タグの組み合わせ」に閾値を1つでも定義すると、そのsubmetricが
// summaryのdata.metricsに独立したキー（例: "http_req_duration{endpoint:home_ssr}"）として現れる。
// 実際にゲートしたいわけではないため、常に真になる条件をプレースホルダとして使う
// （helpers/summary.tsのisPlaceholderが正規表現でこれを判別し、合否判定からは除外する）。
export function placeholderThresholds(
  tagKey: "scenario" | "endpoint",
  values: readonly string[]
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const v of values) {
    result[`http_req_duration{${tagKey}:${v}}`] = ["p(95)>=0"];
    result[`http_req_failed{${tagKey}:${v}}`] = ["rate>=0"];
    result[`http_reqs{${tagKey}:${v}}`] = ["count>=0"];
  }
  return result;
}

// 確定事項3「初回は失敗率のみゲート、実測後に数値閾値を確定する」の出口。
// 2026-07-21のLoad実測値（posts_portal/findLocationCounts等のLIMIT漏れ修正後、10VU、
// 全エンドポイントエラー率0%の状態）にマージン（概ね1.7倍、切りの良い値に丸め）を持たせた値。
// 「測定対象」に明記した第一級のSSRページ・主要APIのみゲート対象とし、統計系・CRUD系の
// 補助エンドポイントは引き続きplaceholderThresholds（計測のみ・非ゲート）のままとする。
export const CONFIRMED_ENDPOINT_P95_THRESHOLDS_MS: Record<string, number> = {
  home_ssr: 1500,
  post_detail_ssr: 1200,
  mypage_report_ssr: 1300,
  user_profile_ssr: 1200,
  posts_portal: 600,
  posts_explore: 700,
  posts_like_toggle: 1000,
  posts_comments_create: 1000,
  users_follow_toggle: 900,
};

// Load定常10VUのクリーン再シード後最終実測（2026-07-22）のp99にマージンを加えた値。
// p95だけではテールレイテンシの劣化を見逃すため、同じ第一級エンドポイントをp99でもゲートする。
export const CONFIRMED_ENDPOINT_P99_THRESHOLDS_MS: Record<string, number> = {
  home_ssr: 1800,
  post_detail_ssr: 1500,
  mypage_report_ssr: 1500,
  user_profile_ssr: 1500,
  posts_portal: 700,
  posts_explore: 900,
  posts_like_toggle: 1300,
  posts_comments_create: 1300,
  users_follow_toggle: 1200,
};

// 重要: http_req_duration に実閾値を置いても、http_reqs・http_req_failed の
// プレースホルダは別途置かないとそのsubmetricが一切materializeされず、
// 集約レポートのbyEndpoint/byScenarioでrequests・errorRateが0のまま欠落する
// （実際にLoad/Spikeの初回実行でrequests:0という形で発覚した不具合）。
// そのため実閾値のduration専用エントリと、reqs/failed用のプレースホルダは常にペアで返す。
export function gatingEndpointThresholds(scenario: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [endpoint, ms] of Object.entries(CONFIRMED_ENDPOINT_P95_THRESHOLDS_MS)) {
    // Loadはramp/steady/rampdownを別scenarioとして実行する。負荷条件が一定の区間だけを
    // ベースラインにするため、p95/p99ゲートはendpointとscenarioの組み合わせへ限定する。
    result[`http_req_duration{endpoint:${endpoint},scenario:${scenario}}`] = [
      `p(95)<${ms}`,
      `p(99)<${CONFIRMED_ENDPOINT_P99_THRESHOLDS_MS[endpoint]}`,
    ];
    // 集約レポートのendpoint別内訳を維持するため、endpoint単独のsubmetricもmaterializeする。
    result[`http_req_duration{endpoint:${endpoint}}`] = ["p(95)>=0"];
    result[`http_req_failed{endpoint:${endpoint}}`] = ["rate>=0"];
    result[`http_reqs{endpoint:${endpoint}}`] = ["count>=0"];
  }
  return result;
}

// ゲート対象エンドポイントを除いた残り（duration含む全プレースホルダ）にだけ
// placeholderThresholdsを使う（同じmetric×タグにduration実閾値とプレースホルダを
// 両方定義すると重複キーになるため、durationだけは除外する）
export const UNGATED_ENDPOINT_NAMES = ENDPOINT_NAMES.filter(
  (name) => !(name in CONFIRMED_ENDPOINT_P95_THRESHOLDS_MS)
);

// scenarioタグ版。duration に実閾値を置くscenario名を渡すと、reqs/failedの
// プレースホルダだけ返す（durationは呼び出し側で実閾値を別途定義する前提）
export function gatingScenarioAuxThresholds(
  scenarioNames: readonly string[]
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const name of scenarioNames) {
    result[`http_req_failed{scenario:${name}}`] = ["rate>=0"];
    result[`http_reqs{scenario:${name}}`] = ["count>=0"];
  }
  return result;
}
