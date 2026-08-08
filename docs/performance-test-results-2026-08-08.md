# パフォーマンステスト再測定結果（2026-08-08）

## 目的と位置づけ

`@node-rs/bcrypt`移行後、GATE-22のcursorページングシナリオとGATE-24の`checks`閾値を含む現行実装について、ローカルの隔離されたperf環境でk6とPlaywrightを再測定した。本書は測定条件と生成物を追跡可能にするためのsummaryであり、本番EC2/RDSの容量保証ではない。

## 測定対象

| 項目 | 値 |
|---|---|
| 日時 | 2026-08-08 18:57〜19:47 JST |
| ブランチ | `docs/pre-submission-audit-fixes` |
| ベースHEAD | `003d52d6f7e8d5bb20dc4bc01fbc01962dece9ea` |
| working tree | dirty。測定開始前から`README.md`・`docs/画面設計書.md`・`docs/要件定義書.md`・`pnpm-lock.yaml`・`pnpm-workspace.yaml`に未コミット変更あり。アプリケーションソースとk6シナリオには未コミット変更なし |
| 確定SHA | `bd72e6b`（計測時のworking treeをそのままコミット。計測後、依存関係の変更なし） |
| 注意（解消済み） | 計測時点では上記working treeが未コミットだったためSHA単独では再現できなかったが、依存関係を変更せずに`bd72e6b`としてコミットしたため、このSHAでの再現が可能になった |

## 実行環境

| 項目 | 値 |
|---|---|
| OS | Windows NT 10.0.26200.0 x64 |
| CPU | AMD64 Family 25 Model 68 Stepping 1、16 logical processors |
| Node.js / pnpm | 24.11.0 / 11.9.0 |
| k6 | 2.0.0（commit `8c3be52cc1`、Go 1.26.3、windows/amd64） |
| Next.js / Prisma | 16.2.11 / 6.19.3 |
| password hash | `@node-rs/bcrypt` 1.10.7 |
| DB | Docker `mysql:8.0`、`mysql-perf`、ホスト`127.0.0.1:3308`、DB`tripdiary_perf`、tmpfs |
| アプリ | `pnpm perf:build`後のproduction server、`http://127.0.0.1:3000` |
| 環境スイッチ | seedのみ`CONFIRM_PERF_TRUNCATE=true`。Load/Stress/Spikeは`PERF_ALLOW_EXTRA_NODE_PROCESSES=1`。k6全試験は`K6_NO_OPEN=1` |

`perf:migrate`時にPrismaが`127.0.0.1:3308/tripdiary_perf`を表示し、DB自身への問い合わせでも`DATABASE()=tripdiary_perf`、mysql-perfコンテナ内port 3306であることを確認してから全TRUNCATEを実行した。本番・開発・test DBは使用していない。

## seed

| データ | 件数 |
|---|---:|
| ユーザー | 60 |
| 投稿 | 3,544 |
| いいね | 10,000 |
| コメント | 10,000 |
| フォロー | 300 |
| 通知 | 3,000 |

整合性確認は`SUM(likeCount)=COUNT(likes)=10,000`、`SUM(commentCount)=COUNT(comments)=10,000`。ページング固定ユーザーは投稿コメント229、受信コメント572、フォロワー56、フォロー中56で、4条件とも最低56件を満たした。

## k6結果

| 種別 | 判定 | リクエスト | エラー率 | 採用区間 | p95 | p99 | 結果JSON |
|---|---|---:|---:|---|---:|---:|---|
| Smoke | PASS | 29 | 0% | 全体 | 235.6ms | 266.3ms | `combined-smoke-2026-08-08T09-57-14-619Z.json` |
| Load | PASS | 8,460 | 0% | `steady` | 85.0ms | 99.3ms | `combined-load-2026-08-08T10-09-16-443Z.json` |
| Stress | 判定なし | 30,713 | 0% | `vu50` | 110.9ms | 162.4ms | `combined-stress-2026-08-08T10-29-34-672Z.json` |
| Spike | PASS | 18,198 | 0% | `cooldown1` / `cooldown2` | 84.0ms / 101.3ms | 91.9ms / 115.9ms | `combined-spike-2026-08-08T10-45-25-679Z.json` |

- Smoke: checks 47/47。ページング4経路の`hasMore`・`nextCursor`・2ページ目非空を含めすべて成功。
- Load: `passed: true`。全体p95/p99は208.0/221.7msだが、閾値と採用値はログインを分離した定常10VUの`steady`区間。
- Stress: checks 42,560/42,560。合否判定を置かない限界点記録。
- Spike: `passed: true`。cooldown1/2 p99は閾値2,000/5,000msを通過。
- サーバーログ: HTTP 5xx、Prisma `P2034`、level 50ログはいずれも0件。

`performance/k6/results/`はgitignore対象のため、上記JSON/HTML自体は追跡しない。確定値と生成物名は本書、可視化結果は`docs/images/performance-{smoke,load,stress,spike}.png`へ転記・追跡する。

## Playwright性能計測

8件すべて成功（実行時間22.3秒）。

| 対象 | TTFB | FCP | LCP | CLS |
|---|---:|---:|---:|---:|
| トップ | 34ms | 316ms | 900ms | 0 |
| マイページ集計 | 16ms | 156ms | 676ms | 0 |
| 投稿詳細 | 20ms | 248ms | 248ms | 0 |

| 操作 | 実測 | 閾値 | 判定 |
|---|---:|---:|---|
| いいね | 101ms | 300ms | PASS |
| コメント投稿 | 98ms | 3,000ms | PASS |
| 検索 | 291ms | 1,000ms | PASS |
| 追加読込 | 200ms | 2,000ms | PASS |

## 実行コマンド

```powershell
pnpm perf:up
pnpm perf:migrate
$env:CONFIRM_PERF_TRUNCATE='true'; pnpm perf:seed
pnpm perf:build
pnpm perf:start
$env:K6_NO_OPEN='1'; & 'C:\Program Files\Git\bin\bash.exe' performance/k6/run.sh smoke
$env:PERF_ALLOW_EXTRA_NODE_PROCESSES='1'; $env:K6_NO_OPEN='1'; & 'C:\Program Files\Git\bin\bash.exe' performance/k6/run.sh load
$env:PERF_ALLOW_EXTRA_NODE_PROCESSES='1'; $env:K6_NO_OPEN='1'; & 'C:\Program Files\Git\bin\bash.exe' performance/k6/run.sh stress
$env:PERF_ALLOW_EXTRA_NODE_PROCESSES='1'; $env:K6_NO_OPEN='1'; & 'C:\Program Files\Git\bin\bash.exe' performance/k6/run.sh spike
pnpm perf:vitals
$env:K6_NO_OPEN='1'; & 'C:\Program Files\Git\bin\bash.exe' performance/k6/run.sh index
pnpm perf:capture
```
