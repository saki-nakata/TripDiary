#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results"
WEBVITALS_DIR="${SCRIPT_DIR}/../../e2e/performance/results"
mkdir -p "$RESULTS_DIR"

TEST_TYPE="${1:-load}"
PERF_BASE_URL="${BASE_URL:-http://localhost:3000}"

require_jq() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "エラー: jq 1.6以上が必要です。READMEの前提条件を確認してインストールしてください。" >&2
    exit 1
  fi
}

preflight() {
  require_jq

  if ! curl --fail --silent --show-error --max-time 5 "${PERF_BASE_URL}/api/health" >/dev/null; then
    echo "エラー: ${PERF_BASE_URL}/api/health に接続できません。perf専用サーバーを起動してください。" >&2
    exit 1
  fi

  local node_count=""
  if command -v powershell.exe >/dev/null 2>&1; then
    node_count=$(powershell.exe -NoProfile -Command "@(Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | Where-Object { \$_.CommandLine -like '*TripDiary*' }).Count" | tr -d '\r')
  elif command -v pgrep >/dev/null 2>&1; then
    node_count=$(pgrep -xc node || true)
  fi

  if [ -n "$node_count" ] && [ "$node_count" -gt "${PERF_MAX_NODE_PROCESSES:-4}" ] && [ "${PERF_ALLOW_EXTRA_NODE_PROCESSES:-0}" != "1" ]; then
    echo "エラー: TripDiary由来のNode.jsプロセスが${node_count}個あります（上限: ${PERF_MAX_NODE_PROCESSES:-4}）。" >&2
    echo "負荷試験の再現性を守るため、不要なプロセスを終了してから実行してください。" >&2
    echo "意図的に継続する場合のみ PERF_ALLOW_EXTRA_NODE_PROCESSES=1 を指定してください。" >&2
    exit 1
  fi
}

# JSON抽出は当初TimeLineに倣いgrep/sed/awkのみで組んでいたが、byScenario/byEndpointの分離・
# p95降順ソート・p99列追加といった要件が増えたことで、非構造化テキスト処理では
# 誤読（区間タグとエンドポイントタグが同じ列に混在する等）のリスクが無視できなくなった。
# jqが利用可能な環境のため、JSON抽出部分のみjqに置き換える（bash側の全体構造は維持）。
#
# このWindows環境のjqは出力にCRLFを使うため、複数行/複数フィールドの出力（@tsv等）の
# 最終フィールドに\rが紛れ込み、printfが「invalid number」で落ちる不具合があった
# （実測で確認）。全jq呼び出しをこのラッパー経由にして\rを一律で除去する。
jqr() {
  jq -r "$@" | tr -d '\r'
}
generate_panel() {
  local TYPE="$1"
  local ACTIVE="${2:-}"
  local ACTIVE_CLASS=""
  [ -n "$ACTIVE" ] && ACTIVE_CLASS=" active"

  echo "<div id=\"panel-${TYPE}\" class=\"panel${ACTIVE_CLASS}\">"

  local LATEST_JSON
  LATEST_JSON=$(ls "${RESULTS_DIR}"/*-${TYPE}-*.json 2>/dev/null | sort -r | head -1 || true)
  if [ -z "$LATEST_JSON" ]; then
    echo "<p style='color:#999;padding:24px'>データがありません。テストを実行してください。</p>"
    echo "</div>"
    return
  fi

  local SCENARIO PASSED REQUESTS RPS AVG P95 P99 ERR MAXVUS TIMESTAMP
  SCENARIO=$(jqr '.scenario' "$LATEST_JSON")
  PASSED=$(jqr '.passed' "$LATEST_JSON")
  REQUESTS=$(jqr '.metrics.requests' "$LATEST_JSON")
  RPS=$(jqr '.metrics.rps' "$LATEST_JSON")
  AVG=$(jqr '.metrics.avg' "$LATEST_JSON")
  P95=$(jqr '.metrics.p95' "$LATEST_JSON")
  P99=$(jqr '.metrics.p99' "$LATEST_JSON")
  ERR=$(jqr '.metrics.errorRate' "$LATEST_JSON")
  MAXVUS=$(jqr '.metrics.maxVUs' "$LATEST_JSON")
  TIMESTAMP=$(jqr '.timestamp' "$LATEST_JSON")

  # passedはtrue/false/nullの3値。nullは「閾値なし＝合否判定の対象外」を意味し、PASSでもFAILでもなくN/Aと表示する
  # （Stressは限界点の記録が目的で合否判定をしない。閾値未定義をPASS扱いするTimeLineの不具合は引き継がない）
  local BADGE="badge-info" BADGE_TEXT="N/A"
  [ "$PASSED" = "true" ]  && BADGE="badge-pass" && BADGE_TEXT="PASS"
  [ "$PASSED" = "false" ] && BADGE="badge-fail" && BADGE_TEXT="FAIL"

  local ERR_PCT P95_COLOR ERR_COLOR
  ERR_PCT=$(awk "BEGIN{printf \"%.2f\", ${ERR:-0}*100}")
  P95_COLOR=$(awk "BEGIN{ v=${P95:-0}; if(v<500) print \"good\"; else if(v<1000) print \"warn\"; else print \"bad\" }")
  ERR_COLOR=$(awk "BEGIN{ v=${ERR:-0}; if(v<0.01) print \"good\"; else if(v<0.05) print \"warn\"; else print \"bad\" }")

  echo "  <div style='display:flex;align-items:center;justify-content:space-between;margin-bottom:16px'>"
  echo "    <div><div class='section-label'>${TYPE} テスト — 最新結果</div>"
  echo "    <div style='font-size:1.1rem;font-weight:700;color:#2d3748'>${SCENARIO} &nbsp;<span class='badge ${BADGE}'>${BADGE_TEXT}</span></div>"
  echo "    <div style='font-size:.78rem;color:#999;margin-top:4px'>${TIMESTAMP}</div></div>"
  echo "  </div>"

  echo "  <div class='summary-cards'>"
  echo "    <div class='scard'><div class='label'>Total Requests</div><div class='value'>${REQUESTS}</div></div>"
  echo "    <div class='scard'><div class='label'>Throughput</div><div class='value'>$(printf '%.1f' "${RPS:-0}")</div><div class='unit'>req/s</div></div>"
  echo "    <div class='scard'><div class='label'>Avg</div><div class='value'>$(printf '%.0f' "${AVG:-0}")</div><div class='unit'>ms</div></div>"
  echo "    <div class='scard ${P95_COLOR}'><div class='label'>p95</div><div class='value'>$(printf '%.0f' "${P95:-0}")</div><div class='unit'>ms</div></div>"
  echo "    <div class='scard'><div class='label'>p99</div><div class='value'>$(printf '%.0f' "${P99:-0}")</div><div class='unit'>ms</div></div>"
  echo "    <div class='scard ${ERR_COLOR}'><div class='label'>Error Rate</div><div class='value'>${ERR_PCT}</div><div class='unit'>%</div></div>"
  echo "    <div class='scard'><div class='label'>Max VUs</div><div class='value'>${MAXVUS}</div></div>"
  echo "  </div>"

  # エンドポイント別はp95降順（重い順）に並べ、ボトルネックが表の先頭に来るようにする。
  # 段階別（byScenario）とは別の表にし、「今どちらを見ているか」を見出しで明示する
  # （以前は1つの表に無差別に混在させており、区間タグとエンドポイントタグの区別が付かなかった）
  local ENDPOINT_ROWS
  ENDPOINT_ROWS=$(jqr '.byEndpoint | sort_by(-(.p95 // 0)) | .[] | [.name, ((.p95 // 0)|tostring), ((.p99 // 0)|tostring), ((.errorRate // 0)|tostring), ((.requests // 0)|tostring)] | @tsv' "$LATEST_JSON" 2>/dev/null || true)
  if [ -n "$ENDPOINT_ROWS" ]; then
    echo "  <div class='section-label' style='margin-bottom:8px'>エンドポイント別（p95が重い順）</div>"
    echo "  <table class='results-table'>"
    echo "    <thead><tr><th>Endpoint</th><th>p95 (ms)</th><th>p99 (ms)</th><th>Error %</th><th>Requests</th></tr></thead>"
    echo "    <tbody>"
    while IFS=$'\t' read -r N P95E P99E ERE REQE; do
      [ -z "$N" ] && continue
      local EPCT P95CLS P99CLS
      EPCT=$(awk "BEGIN{printf \"%.2f\", ${ERE:-0}*100}")
      P95CLS=$(awk "BEGIN{ v=${P95E:-0}; if(v<500) print \"good\"; else if(v<1000) print \"warn\"; else print \"bad\" }")
      P99CLS=$(awk "BEGIN{ v=${P99E:-0}; if(v<500) print \"good\"; else if(v<1000) print \"warn\"; else print \"bad\" }")
      echo "      <tr><td class='metric-name'>${N}</td><td class='${P95CLS}'>$(printf '%.0f' "${P95E:-0}")</td><td class='${P99CLS}'>$(printf '%.0f' "${P99E:-0}")</td><td>${EPCT}%</td><td>$(printf '%.0f' "${REQE:-0}")</td></tr>"
    done <<< "$ENDPOINT_ROWS"
    echo "    </tbody></table>"
  fi

  local SCENARIO_ROWS
  SCENARIO_ROWS=$(jqr '.byScenario | .[] | [.name, ((.p95 // 0)|tostring), ((.p99 // 0)|tostring), ((.errorRate // 0)|tostring), ((.requests // 0)|tostring)] | @tsv' "$LATEST_JSON" 2>/dev/null || true)
  if [ -n "$SCENARIO_ROWS" ]; then
    echo "  <div class='section-label' style='margin-bottom:8px'>段階別（Scenario）</div>"
    echo "  <table class='results-table'>"
    echo "    <thead><tr><th>Scenario</th><th>p95 (ms)</th><th>p99 (ms)</th><th>Error %</th><th>Requests</th></tr></thead>"
    echo "    <tbody>"
    while IFS=$'\t' read -r N P95E P99E ERE REQE; do
      [ -z "$N" ] && continue
      local EPCT2 P95CLS2 P99CLS2
      EPCT2=$(awk "BEGIN{printf \"%.2f\", ${ERE:-0}*100}")
      P95CLS2=$(awk "BEGIN{ v=${P95E:-0}; if(v<500) print \"good\"; else if(v<1000) print \"warn\"; else print \"bad\" }")
      P99CLS2=$(awk "BEGIN{ v=${P99E:-0}; if(v<500) print \"good\"; else if(v<1000) print \"warn\"; else print \"bad\" }")
      echo "      <tr><td class='metric-name'>${N}</td><td class='${P95CLS2}'>$(printf '%.0f' "${P95E:-0}")</td><td class='${P99CLS2}'>$(printf '%.0f' "${P99E:-0}")</td><td>${EPCT2}%</td><td>$(printf '%.0f' "${REQE:-0}")</td></tr>"
    done <<< "$SCENARIO_ROWS"
    echo "    </tbody></table>"
  fi

  local ALL_JSONS
  ALL_JSONS=$(ls "${RESULTS_DIR}"/*-${TYPE}-*.json 2>/dev/null | sort -r | head -20 || true)
  if [ -n "$ALL_JSONS" ]; then
    echo "  <div class='section-label' style='margin-bottom:8px'>全実行結果一覧（最新20件）</div>"
    echo "  <table class='results-table'>"
    echo "    <thead><tr><th>シナリオ</th><th>結果</th><th>Requests</th><th>p95 (ms)</th><th>p99 (ms)</th><th>Error %</th><th>Max VUs</th><th>詳細</th></tr></thead>"
    echo "    <tbody>"
    while IFS= read -r jf; do
      local S P R P9 P99V E MV EPCT3 BDG BT HTML_FILE
      S=$(jqr '.scenario' "$jf")
      P=$(jqr '.passed' "$jf")
      R=$(jqr '.metrics.requests' "$jf")
      P9=$(jqr '.metrics.p95' "$jf")
      P99V=$(jqr '.metrics.p99' "$jf")
      E=$(jqr '.metrics.errorRate' "$jf")
      MV=$(jqr '.metrics.maxVUs' "$jf")
      EPCT3=$(awk "BEGIN{printf \"%.2f\", ${E:-0}*100}")
      BDG="badge-info"; BT="N/A"
      [ "$P" = "true" ]  && BDG="badge-pass" && BT="PASS"
      [ "$P" = "false" ] && BDG="badge-fail" && BT="FAIL"
      HTML_FILE="$(basename "$jf" .json).html"
      echo "      <tr><td>${S}</td><td><span class='badge ${BDG}'>${BT}</span></td><td>${R}</td><td>$(printf '%.0f' "${P9:-0}")</td><td>$(printf '%.0f' "${P99V:-0}")</td><td>${EPCT3}%</td><td>${MV}</td><td><a class='link-btn' href='${HTML_FILE}'>詳細</a></td></tr>"
    done <<< "$ALL_JSONS"
    echo "    </tbody></table>"
  fi
  echo "</div>"
}

# Web Vitals・操作応答時間（e2e/performance/results/）をk6の集約ダッシュボードにタブとして統合する
# （確定事項1「Web VitalsをK6の集約ダッシュボードに統合する」がDoDにチェックされていたにも
# かかわらずタブ自体が存在しないという指摘を受けて追加）
generate_webvitals_panel() {
  local ACTIVE="${1:-}"
  local ACTIVE_CLASS=""
  [ -n "$ACTIVE" ] && ACTIVE_CLASS=" active"

  echo "<div id=\"panel-webvitals\" class=\"panel${ACTIVE_CLASS}\">"

  if [ ! -d "$WEBVITALS_DIR" ]; then
    echo "<p style='color:#999;padding:24px'>データがありません。pnpm perf:vitals を実行してください。</p>"
    echo "</div>"
    return
  fi

  local VITALS_FILES
  VITALS_FILES=$(ls "${WEBVITALS_DIR}"/perf-*.json 2>/dev/null | sort -r || true)
  if [ -n "$VITALS_FILES" ]; then
    echo "  <div class='section-label' style='margin-bottom:8px'>Web Vitals（最新1件ずつ、ページ単位）</div>"
    echo "  <table class='results-table'>"
    echo "    <thead><tr><th>ページ</th><th>TTFB (ms)</th><th>FCP (ms)</th><th>LCP (ms)</th><th>CLS</th><th>計測日時</th></tr></thead>"
    echo "    <tbody>"
    local SEEN_LABELS=""
    while IFS= read -r jf; do
      local LABEL
      LABEL=$(jqr '.label' "$jf")
      # 同じlabelは最新1件のみ表示（ファイル名は降順で読んでいるため最初に出た方が最新）
      case " $SEEN_LABELS " in *" $LABEL "*) continue ;; esac
      SEEN_LABELS="$SEEN_LABELS $LABEL"
      local TTFB FCP LCP CLS TS
      TTFB=$(jqr '.vitals.ttfb // "-"' "$jf")
      FCP=$(jqr '.vitals.fcp // "-"' "$jf")
      LCP=$(jqr '.vitals.lcp // "-"' "$jf")
      CLS=$(jqr '.vitals.cls // "-"' "$jf")
      TS=$(jqr '.timestamp' "$jf")
      echo "      <tr><td class='metric-name'>${LABEL}</td><td>${TTFB}</td><td>${FCP}</td><td>${LCP}</td><td>${CLS}</td><td>${TS}</td></tr>"
    done <<< "$VITALS_FILES"
    echo "    </tbody></table>"
  fi

  local TIMING_FILES
  TIMING_FILES=$(ls "${WEBVITALS_DIR}"/timing-*.json 2>/dev/null | sort -r || true)
  if [ -n "$TIMING_FILES" ]; then
    echo "  <div class='section-label' style='margin-bottom:8px'>操作応答時間（最新1件ずつ、操作単位）</div>"
    echo "  <table class='results-table'>"
    echo "    <thead><tr><th>操作</th><th>結果</th><th>実測 (ms)</th><th>閾値 (ms)</th><th>計測日時</th></tr></thead>"
    echo "    <tbody>"
    local SEEN_LABELS2=""
    while IFS= read -r jf; do
      local LABEL2
      LABEL2=$(jqr '.label' "$jf")
      case " $SEEN_LABELS2 " in *" $LABEL2 "*) continue ;; esac
      SEEN_LABELS2="$SEEN_LABELS2 $LABEL2"
      local ELAPSED THRESHOLD PASSED2 TS2 BDG2 BT2
      ELAPSED=$(jqr '.elapsedMs' "$jf")
      THRESHOLD=$(jqr '.thresholdMs' "$jf")
      PASSED2=$(jqr '.passed' "$jf")
      TS2=$(jqr '.timestamp' "$jf")
      BDG2="badge-fail"; BT2="FAIL"
      [ "$PASSED2" = "true" ] && BDG2="badge-pass" && BT2="PASS"
      echo "      <tr><td class='metric-name'>${LABEL2}</td><td><span class='badge ${BDG2}'>${BT2}</span></td><td>${ELAPSED}</td><td>${THRESHOLD}</td><td>${TS2}</td></tr>"
    done <<< "$TIMING_FILES"
    echo "    </tbody></table>"
  fi

  if [ -z "$VITALS_FILES" ] && [ -z "$TIMING_FILES" ]; then
    echo "<p style='color:#999;padding:24px'>データがありません。pnpm perf:vitals を実行してください。</p>"
  fi
  echo "</div>"
}

generate_index() {
  echo "=== 集約レポートHTML生成 ==="
  local INDEX_FILE="${RESULTS_DIR}/index.html"
  local GENERATED_AT
  GENERATED_AT="$(date '+%Y-%m-%d %H:%M:%S')"

  {
    echo '<!DOCTYPE html>'
    echo '<html lang="ja">'
    echo '<head>'
    echo '  <meta charset="UTF-8">'
    echo '  <meta name="viewport" content="width=device-width, initial-scale=1.0">'
    echo '  <title>k6 パフォーマンステスト 集約レポート</title>'
    cat << 'CSS'
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;color:#333}
    header{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);color:#fff;padding:32px 40px}
    header h1{font-size:1.8rem;font-weight:700;margin-bottom:6px}
    header p{opacity:.7;font-size:.9rem}
    main{max-width:1200px;margin:32px auto;padding:0 24px}
    .tabs{display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap}
    .tab{padding:8px 20px;border-radius:20px;border:none;cursor:pointer;font-size:.85rem;font-weight:600;background:#fff;color:#666;box-shadow:0 1px 3px rgba(0,0,0,.1);transition:.2s}
    .tab.active{color:#fff}
    .tab-smoke.active{background:#2e7d32}.tab-load.active{background:#1565c0}
    .tab-stress.active{background:#e65100}.tab-spike.active{background:#880e4f}
    .tab-webvitals.active{background:#5e35b1}
    .panel{display:none}.panel.active{display:block}
    .summary-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:24px}
    .scard{background:#fff;border-radius:10px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.08);border-top:3px solid #e2e8f0}
    .scard.good{border-top-color:#48bb78}.scard.warn{border-top-color:#ed8936}.scard.bad{border-top-color:#fc8181}
    .scard .label{font-size:.7rem;color:#718096;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
    .scard .value{font-size:1.6rem;font-weight:700;color:#2d3748;line-height:1}
    .scard.good .value{color:#276749}.scard.warn .value{color:#c05621}.scard.bad .value{color:#c53030}
    .scard .unit{font-size:.75rem;color:#a0aec0;margin-top:2px}
    .results-table{width:100%;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);border-collapse:collapse;margin-bottom:24px}
    .results-table th{background:#edf2f7;padding:10px 14px;text-align:left;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:#718096}
    .results-table td{padding:10px 14px;font-size:.85rem;border-top:1px solid #edf2f7}
    .results-table tr:hover td{background:#f7fafc}
    .results-table td.good{color:#276749;font-weight:600}
    .results-table td.warn{color:#c05621;font-weight:600}
    .results-table td.bad{color:#c53030;font-weight:700}
    .metric-name{font-family:'Menlo','Consolas',monospace;font-size:.8rem;color:#553c9a}
    .badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:.72rem;font-weight:700}
    .badge-pass{background:#c6f6d5;color:#22543d}.badge-fail{background:#fed7d7;color:#742a2a}.badge-info{background:#bee3f8;color:#2a4365}
    .section-label{font-size:.8rem;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
    .link-btn{font-size:.75rem;padding:4px 12px;border-radius:8px;background:#edf2f7;color:#4a5568;text-decoration:none}
    .link-btn:hover{background:#e2e8f0}
    footer{text-align:center;padding:24px;color:#aaa;font-size:.8rem}
  </style>
CSS
    echo '</head>'
    echo '<body>'
    echo '<header>'
    echo '  <h1>k6 パフォーマンステスト 集約レポート</h1>'
    echo "  <p>生成日時: ${GENERATED_AT}</p>"
    echo '</header>'
    echo '<main>'
    echo '<div class="tabs">'
    local FIRST=1
    for TYPE in smoke load stress spike webvitals; do
      local LABEL="" ACTIVE_CLS=""
      case "$TYPE" in smoke) LABEL="Smoke";; load) LABEL="Load";; stress) LABEL="Stress";; spike) LABEL="Spike";; webvitals) LABEL="Web Vitals";; esac
      [ $FIRST -eq 1 ] && ACTIVE_CLS=" active" && FIRST=0
      echo "  <button class=\"tab tab-${TYPE}${ACTIVE_CLS}\" onclick=\"switchTab('${TYPE}')\">${LABEL}</button>"
    done
    echo '</div>'

    generate_panel smoke active
    generate_panel load
    generate_panel stress
    generate_panel spike
    generate_webvitals_panel

    echo '</main>'
    echo '<footer>TripDiary — k6 Performance Test Reports</footer>'
    echo '<script>'
    echo 'function switchTab(type) {'
    echo '  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));'
    echo '  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));'
    echo '  document.getElementById("panel-" + type).classList.add("active");'
    echo '  document.querySelector(".tab-" + type).classList.add("active");'
    echo '}'
    echo '</script>'
    echo '</body>'
    echo '</html>'
  } > "$INDEX_FILE"

  echo "集約レポート生成完了: ${INDEX_FILE}"

  # K6_NO_OPEN=1で抑止できる（smoke→load→stress→spikeを連続実行する際にタブが増えすぎないように）
  if [ "${K6_NO_OPEN:-0}" != "1" ]; then
    if command -v cygpath >/dev/null 2>&1; then
      # Git Bashのbuiltin/aliasの`start`はcmd.exeの`start`と違い前面プロセスを待ち続け
      # スクリプトがハングすることがあるため、即座にデタッチされるexplorer.exeを使う
      # （終了コードが不定なので`|| true`で無視し、バックグラウンド化もしておく）
      (explorer.exe "$(cygpath -w "$INDEX_FILE")" >/dev/null 2>&1 &) || true
    elif command -v open >/dev/null 2>&1; then
      open "$INDEX_FILE" 2>/dev/null || true
    elif command -v xdg-open >/dev/null 2>&1; then
      xdg-open "$INDEX_FILE" 2>/dev/null || true
    fi
  fi
}

case "$TEST_TYPE" in
  smoke)  SIMULATIONS=("${SCRIPT_DIR}/simulations/smoke/main.ts") ;;
  load)   SIMULATIONS=("${SCRIPT_DIR}/simulations/load/main.ts") ;;
  stress) SIMULATIONS=("${SCRIPT_DIR}/simulations/stress/main.ts") ;;
  spike)  SIMULATIONS=("${SCRIPT_DIR}/simulations/spike/main.ts") ;;
  index)
    require_jq
    generate_index
    exit 0
    ;;
  *)
    echo "Usage: $0 [smoke|load|stress|spike|index]"
    exit 1
    ;;
esac

echo "=== k6 パフォーマンステスト開始: ${TEST_TYPE} ==="
echo "レポート出力先: ${RESULTS_DIR}"
echo ""

preflight

# TimeLineの`k6 run ... || true`は終了コードを握り潰し、閾値違反でもスクリプトが成功扱いになる
# 不具合だった。ここでは終了コードを退避し、集約レポート生成を必ず行った上で最後に伝播する
# （pnpm perf:smokeが本当のゲートとして機能するために必須）。
EXIT_CODE=0
for sim in "${SIMULATIONS[@]}"; do
  echo "実行中: ${TEST_TYPE}"
  K6_RESULTS_DIR="$RESULTS_DIR" k6 run "$sim" || EXIT_CODE=$?
  echo ""
done

echo "=== 完了 ==="
echo "レポートは ${RESULTS_DIR} に保存されました"
echo ""

generate_index

exit $EXIT_CODE
