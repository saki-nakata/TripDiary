// @ts-expect-error — k6 CDN import（型定義なし）
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";
import { peakWorkloadVUs } from "./peak-vus.ts";

const RESULTS_DIR = __ENV.K6_RESULTS_DIR || "performance/k6/results";

export function generateSummary(scenarioName: string, testType: string, scenarios?: Record<string, unknown>) {
  const peakVUs = scenarios ? peakWorkloadVUs(scenarios) : undefined;
  return function (data: Record<string, unknown>) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const htmlFile = `${RESULTS_DIR}/${scenarioName}-${testType}-${timestamp}.html`;
    const jsonFile = `${RESULTS_DIR}/${scenarioName}-${testType}-${timestamp}.json`;
    return {
      stdout: textSummary(data, { indent: " ", enableColors: true }) as string,
      [htmlFile]: htmlReport(data, scenarioName, testType, peakVUs),
      [jsonFile]: jsonSummary(data, scenarioName, testType, timestamp, peakVUs),
    };
  };
}

type MetricValues = Record<string, number>;

interface Metric {
  values?: MetricValues;
  thresholds?: Record<string, { ok: boolean }>;
}

type Metrics = Record<string, Metric>;

function val(metric: Metric | undefined, key: string): number | null {
  return metric?.values?.[key] ?? null;
}

// k6のsubmetric記法（例: "http_req_duration{scenario:vu5}"）は、そのタグの組み合わせに対する
// 閾値をthresholdsに1つでも定義すると、集計結果がdata.metricsに独立したキーとして現れる
// （実際にゲートする閾値でなくても良く、"p(95)>=0"のような常に真の閾値をプレースホルダとして使う）。
// この仕組みを利用してscenario別・endpoint別の内訳を抽出する。
function extractTagBreakdown(
  m: Metrics,
  tagKey: "scenario" | "endpoint"
): { name: string; p95: number; p99: number; errorRate: number; requests: number }[] {
  const names = Object.keys(m)
    .map((key) => key.match(new RegExp(`^http_req_duration\\{${tagKey}:([^,}]+)\\}$`))?.[1])
    .filter((name): name is string => name !== undefined);

  return names.map((name) => {
    const durationKey = `http_req_duration{${tagKey}:${name}}`;
    const failedKey = `http_req_failed{${tagKey}:${name}}`;
    const reqsKey = `http_reqs{${tagKey}:${name}}`;
    return {
      name,
      p95: val(m[durationKey], "p(95)") ?? 0,
      p99: val(m[durationKey], "p(99)") ?? 0,
      errorRate: val(m[failedKey], "rate") ?? 0,
      requests: val(m[reqsKey], "count") ?? 0,
    };
  });
}

function jsonSummary(
  data: Record<string, unknown>,
  scenarioName: string,
  testType: string,
  timestamp: string,
  peakWorkloadVUs?: number
): string {
  const m = data.metrics as Metrics;

  // byScenario/byEndpoint集計のためのプレースホルダ閾値（常に真になる条件）は、
  // 実際の合否判定には使わない。合否は「プレースホルダでない」実閾値だけで決める。
  const isPlaceholder = (metric: Metric) =>
    !!metric.thresholds && Object.keys(metric.thresholds).every((cond) => /^(p\(\d+\)|rate|count)>=0$/.test(cond));

  const gatingEntries = Object.entries(m).filter(([, metric]) => metric.thresholds && !isPlaceholder(metric));
  const gatingResults = gatingEntries.flatMap(([, metric]) => Object.values(metric.thresholds!).map((r) => r.ok));

  // TimeLineの`thresholdRows.length === 0 || ...`はStress（閾値なし）が常にPASS表示になるバグだった。
  // ゲート対象の閾値が1つも無い場合はtrue/falseではなくnull（=N/A）にし、集約ダッシュボード側で判別できるようにする。
  const passed: boolean | null = gatingEntries.length === 0 ? null : gatingResults.every(Boolean);

  return JSON.stringify(
    {
      scenario: scenarioName,
      type: testType,
      timestamp,
      passed,
      metrics: {
        requests: val(m["http_reqs"], "count") ?? 0,
        rps: val(m["http_reqs"], "rate") ?? 0,
        avg: val(m["http_req_duration"], "avg") ?? 0,
        p95: val(m["http_req_duration"], "p(95)") ?? 0,
        p99: val(m["http_req_duration"], "p(99)") ?? 0,
        errorRate: val(m["http_req_failed"], "rate") ?? 0,
        // login用の補助VUやexecutorが確保する予約枠を含めず、業務シナリオのピークVUを表示する。
        maxVUs: peakWorkloadVUs ?? val(m["vus"], "max") ?? 0,
      },
      byScenario: extractTagBreakdown(m, "scenario"),
      byEndpoint: extractTagBreakdown(m, "endpoint"),
    },
    null,
    2
  );
}

function htmlReport(data: Record<string, unknown>, scenarioName: string, testType: string, peakWorkloadVUs?: number): string {
  const m = data.metrics as Metrics;

  const duration = val(m["http_req_duration"], "avg");
  const p95 = val(m["http_req_duration"], "p(95)");
  const p99 = val(m["http_req_duration"], "p(99)");
  const errorRate = val(m["http_req_failed"], "rate");
  const totalReqs = val(m["http_reqs"], "count");
  const rps = val(m["http_reqs"], "rate");
  const maxVUs = peakWorkloadVUs ?? val(m["vus"], "max");

  // byScenario/byEndpoint集計専用のプレースホルダ閾値（常に真）は、人間向けのThresholds表には出さない
  const isPlaceholder = (metric: Metric) =>
    !!metric.thresholds && Object.keys(metric.thresholds).every((cond) => /^(p\(\d+\)|rate|count)>=0$/.test(cond));

  const thresholdRows = Object.entries(m)
    .filter(([, metric]) => metric.thresholds && !isPlaceholder(metric))
    .flatMap(([name, metric]) =>
      Object.entries(metric.thresholds!).map(([condition, result]) => ({
        name,
        condition,
        ok: result.ok,
      }))
    );

  const allPass = thresholdRows.every((r) => r.ok);
  const overallBadge =
    thresholdRows.length === 0
      ? `<span class="badge badge-info">N/A（閾値なし）</span>`
      : allPass
        ? `<span class="badge badge-pass">PASS</span>`
        : `<span class="badge badge-fail">FAIL</span>`;

  const chartLabels = ["avg", "p(50)", "p(90)", "p(95)", "p(99)", "max"];
  const chartKeys = ["avg", "med", "p(90)", "p(95)", "p(99)", "max"];
  const chartData = chartKeys.map((k) => (val(m["http_req_duration"], k) ?? 0).toFixed(1));

  const metricRows = Object.entries(m)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, metric]) => {
      const avg = val(metric, "avg");
      const p95v = val(metric, "p(95)");
      const p99v = val(metric, "p(99)");
      const cnt = val(metric, "count");
      const rate = val(metric, "rate");
      return `<tr>
        <td class="metric-name">${name}</td>
        <td>${avg !== null ? avg.toFixed(2) : cnt !== null ? cnt.toFixed(0) : "-"}</td>
        <td>${p95v !== null ? p95v.toFixed(2) : "-"}</td>
        <td>${p99v !== null ? p99v.toFixed(2) : "-"}</td>
        <td>${rate !== null ? rate.toFixed(4) : "-"}</td>
      </tr>`;
    })
    .join("");

// 段階別（byScenario）・エンドポイント別（byEndpoint）を1つの表に無差別に混ぜていた旧実装は、
// 「今どちらの行を見ているか」が読み手に判別できず、ボトルネックのエンドポイントが
// 22行の中に埋もれて見つけにくいという指摘（レビュー）を受けて2つの表に分離した。
function latencyClass(ms: number): "good" | "warn" | "bad" {
  return ms < 500 ? "good" : ms < 1000 ? "warn" : "bad";
}

function breakdownTable(
  title: string,
  rows: { name: string; p95: number; p99: number; errorRate: number; requests: number }[],
  options: { sortByP95Desc?: boolean } = {}
): string {
  if (rows.length === 0) return "";
  const sorted = options.sortByP95Desc ? [...rows].sort((a, b) => b.p95 - a.p95) : rows;
  return `<h2>${title}</h2>
     <table>
       <thead><tr><th>名前</th><th>p95 (ms)</th><th>p99 (ms)</th><th>Error Rate</th><th>Requests</th></tr></thead>
       <tbody>${sorted
         .map(
           (r) =>
             `<tr><td class="metric-name">${r.name}</td><td class="${latencyClass(r.p95)}">${r.p95.toFixed(0)}</td><td class="${latencyClass(r.p99)}">${r.p99.toFixed(0)}</td><td>${(r.errorRate * 100).toFixed(2)}%</td><td>${r.requests.toFixed(0)}</td></tr>`
         )
         .join("")}</tbody>
     </table>`;
}

const byScenario = extractTagBreakdown(m, "scenario");
const byEndpoint = extractTagBreakdown(m, "endpoint");
const byScenarioSection = breakdownTable("段階別（Scenario）", byScenario);
// エンドポイント別はp95降順（重い順）に並べ、ボトルネックが表の先頭に来るようにする
const byEndpointSection = breakdownTable("エンドポイント別（Endpoint、p95が重い順）", byEndpoint, {
  sortByP95Desc: true,
});

  const thresholdSection =
    thresholdRows.length > 0
      ? `<h2>Thresholds</h2>
         <table>
           <thead><tr><th>Metric</th><th>Condition</th><th>Result</th></tr></thead>
           <tbody>
             ${thresholdRows
               .map(
                 (r) => `
               <tr>
                 <td class="metric-name">${r.name}</td>
                 <td><code>${r.condition}</code></td>
                 <td><span class="badge ${r.ok ? "badge-pass" : "badge-fail"}">${r.ok ? "PASS" : "FAIL"}</span></td>
               </tr>`
               )
               .join("")}
           </tbody>
         </table>`
      : `<h2>Thresholds</h2><p class="muted">このテスト種別には閾値が定義されていません（Stressは限界点の記録が目的のためN/A）。</p>`;

  const p95Color = p95 !== null ? (p95 < 500 ? "good" : p95 < 1000 ? "warn" : "bad") : "";
  const p99Color = p99 !== null ? (p99 < 1000 ? "good" : p99 < 2000 ? "warn" : "bad") : "";
  const errColor = errorRate !== null ? (errorRate < 0.01 ? "good" : errorRate < 0.05 ? "warn" : "bad") : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>k6 Report — ${scenarioName} / ${testType}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f7fa; color: #1a202c; padding: 2rem; }
    header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 2rem 2.5rem; border-radius: 12px; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: flex-start; }
    header h1 { font-size: 1.6rem; font-weight: 700; margin-bottom: 0.3rem; }
    header .meta { font-size: 0.85rem; opacity: 0.85; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(155px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { background: #fff; border-radius: 10px; padding: 1.2rem 1.4rem; box-shadow: 0 1px 4px rgba(0,0,0,.08); border-top: 3px solid #e2e8f0; }
    .card.good { border-top-color: #48bb78; }
    .card.warn { border-top-color: #ed8936; }
    .card.bad  { border-top-color: #fc8181; }
    .card .label { font-size: 0.72rem; color: #718096; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 0.5rem; }
    .card .value { font-size: 1.9rem; font-weight: 700; color: #2d3748; line-height: 1; }
    .card.good .value { color: #276749; }
    .card.warn .value { color: #c05621; }
    .card.bad  .value { color: #c53030; }
    .card .unit { font-size: 0.8rem; color: #a0aec0; margin-top: 0.2rem; }
    .chart-wrap { background: #fff; border-radius: 10px; padding: 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,.08); margin-bottom: 2rem; }
    .chart-wrap h2 { font-size: 1rem; font-weight: 600; margin-bottom: 1rem; color: #4a5568; }
    canvas { max-height: 260px; }
    h2 { font-size: 1rem; font-weight: 600; color: #4a5568; margin: 2rem 0 0.8rem; }
    table { width: 100%; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); border-collapse: collapse; margin-bottom: 2rem; }
    th { background: #edf2f7; padding: 10px 14px; text-align: left; font-size: 0.75rem; text-transform: uppercase; letter-spacing: .05em; color: #718096; }
    td { padding: 9px 14px; font-size: 0.875rem; border-top: 1px solid #edf2f7; }
    tr:hover td { background: #f7fafc; }
    td.good { color: #276749; font-weight: 600; }
    td.warn { color: #c05621; font-weight: 600; }
    td.bad  { color: #c53030; font-weight: 700; }
    .metric-name { font-family: 'Menlo', 'Consolas', monospace; font-size: 0.8rem; color: #553c9a; }
    code { background: #edf2f7; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; font-family: 'Menlo', monospace; }
    .badge { display: inline-block; padding: 3px 12px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; letter-spacing: .04em; }
    .badge-pass { background: #c6f6d5; color: #22543d; }
    .badge-fail { background: #fed7d7; color: #742a2a; }
    .badge-info { background: #bee3f8; color: #2a4365; }
    .muted { color: #718096; font-size: 0.875rem; }
  </style>
</head>
<body>
<header>
  <div>
    <h1>k6 Performance Report</h1>
    <div class="meta">Scenario: <strong>${scenarioName}</strong> &nbsp;·&nbsp; Type: <strong>${testType}</strong><br>Generated: ${new Date().toISOString()}</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:.7rem;opacity:.7;margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.05em">Overall</div>
    ${overallBadge}
  </div>
</header>
<div class="cards">
  <div class="card"><div class="label">Total Requests</div><div class="value">${totalReqs !== null ? Number(totalReqs.toFixed(0)).toLocaleString() : "-"}</div></div>
  <div class="card"><div class="label">Throughput</div><div class="value">${rps !== null ? rps.toFixed(1) : "-"}</div><div class="unit">req / s</div></div>
  <div class="card"><div class="label">Avg Response</div><div class="value">${duration !== null ? duration.toFixed(0) : "-"}</div><div class="unit">ms</div></div>
  <div class="card ${p95Color}"><div class="label">p95 Response</div><div class="value">${p95 !== null ? p95.toFixed(0) : "-"}</div><div class="unit">ms</div></div>
  <div class="card ${p99Color}"><div class="label">p99 Response</div><div class="value">${p99 !== null ? p99.toFixed(0) : "-"}</div><div class="unit">ms</div></div>
  <div class="card ${errColor}"><div class="label">Error Rate</div><div class="value">${errorRate !== null ? (errorRate * 100).toFixed(2) : "-"}</div><div class="unit">%</div></div>
  <div class="card"><div class="label">Peak Workload VUs</div><div class="value">${maxVUs !== null ? maxVUs.toFixed(0) : "-"}</div></div>
</div>
<div class="chart-wrap">
  <h2>Response Time Distribution</h2>
  <canvas id="rtChart"></canvas>
</div>
${byEndpointSection}
${byScenarioSection}
${thresholdSection}
<h2>All Metrics</h2>
<table>
  <thead><tr><th>Metric</th><th>Avg / Count</th><th>p95</th><th>p99</th><th>Rate</th></tr></thead>
  <tbody>${metricRows}</tbody>
</table>
<script>
  new Chart(document.getElementById('rtChart'), {
    type: 'bar',
    data: {
      labels: ${JSON.stringify(chartLabels)},
      datasets: [{
        label: 'ms',
        data: ${JSON.stringify(chartData)},
        backgroundColor: ['rgba(102,126,234,.55)','rgba(102,126,234,.55)','rgba(237,137,54,.55)','rgba(237,137,54,.55)','rgba(229,62,62,.55)','rgba(229,62,62,.55)'],
        borderColor: ['#667eea','#667eea','#ed8936','#ed8936','#e53e3e','#e53e3e'],
        borderWidth: 1.5,
        borderRadius: 5,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.parsed.y + ' ms' } } },
      scales: { y: { beginAtZero: true, title: { display: true, text: 'ms', color: '#718096' }, grid: { color: '#edf2f7' } }, x: { grid: { display: false } } },
    },
  });
</script>
</body>
</html>`;
}
