# TripDiary

旅行スポットを記録・共有できる SNS 型旅行記録アプリ。スポット投稿・写真共有・いいね・コメント・フォロー・エリアタグ絞り込み・訪問済み/行きたいリスト・簡易地図などのソーシャル機能を備える。

## 目次

1. [公開URL・確認用アカウント](#公開url確認用アカウント)
2. [デモ動画](#デモ動画)
3. [主な機能](#主な機能)
4. [技術スタック](#技術スタック)
5. [開発期間・体制](#開発期間体制)
6. [ドキュメント](#ドキュメント)
7. [ローカル開発環境のセットアップ](#ローカル開発環境のセットアップ)
8. [環境変数](#環境変数)
9. [主なコマンド](#主なコマンド)
10. [CI（GitHub Actions）](#cigithub-actions)
11. [パフォーマンステスト](#パフォーマンステスト)
12. [ディレクトリ構成](#ディレクトリ構成)
13. [本番環境へのデプロイ](#本番環境へのデプロイ)
14. [画像素材の出所](#画像素材の出所)
15. [セキュリティ](#セキュリティ)

---

## 公開URL・確認用アカウント

本番URL: **http://54.248.13.248**

以下の確認用アカウントでログインして操作できる。`isProtected: true`のためパスワード・メールアドレスの変更はできない。

| 項目 | 値 |
|------|-----|
| メールアドレス | `confirm@tripdiary.example` |
| パスワード | `TripDiary-Confirm-2026-Seed` |

⚠️ 本番はHTTP運用のため認証情報が平文で流れ得る。**このアカウントは確認専用の使い捨てとして扱い、他サービスと共用しているパスワードを入力しないこと。**

自分の投稿9件（画像付き）・旅行プラン2件（完了済み1件＋進行中1件）・行きたい登録済みで、ログイン後すぐに「旅行レポート」「行きたい」「旅行プラン」「訪問済み」の各画面を空でない状態で確認できる。

> ⚠️ **`isProtected` が守るのはパスワード・メールアドレスの変更のみ**（`user.service.ts`の`changePasswordService`/`changeEmailService`）。認証情報を公開している以上、**誰でもログインして確認用アカウントの投稿・旅行プラン・行きたい等を編集・削除できる**。デモとしての完成状態が壊された場合は、[本番環境へのデプロイ](#本番環境へのデプロイ)の「確認用アカウントのデータ復旧」の手順で戻す。

API仕様書（Swagger UI）は[本番URL/api-docs](http://54.248.13.248/api-docs)で常時閲覧可能。

---

## デモ動画

本番環境（http://54.248.13.248 ）に対して、常設デモアカウントで実際に操作しながら撮影した動画。いずれも無音・カット無しの通し撮りで、ブラウザのアドレスバーは映らない（Playwrightの録画仕様のため）。代表的な主要機能をカバーしているが、投稿の編集・削除やアンフォロー等の操作は含まない。

<details open>
<summary>① 閲覧・いいね・行きたい・コメント</summary>

https://github.com/user-attachments/assets/871462c5-5680-4b8e-bbdd-27bc3cf723dd

未ログインでのトップページ閲覧→ログイン→探索ポータル→投稿詳細（画像ライトボックス）→いいね→「行きたい」登録→コメント投稿。

</details>

<details>
<summary>② 投稿する（地図・複数枚画像）</summary>

https://github.com/user-attachments/assets/c4b5b76e-5b5d-4fe0-9e31-107b103af689

新規投稿フォームの入力（タイトル・本文・カテゴリ・エリア・評価・訪問日）→Leaflet地図でのスポット位置指定→画像2枚のアップロード→投稿完了後、ホームでのハイライト表示と投稿詳細での画像・地図の反映確認。

画像アップロードは`@aws-sdk/client-s3`でS3へ保存し、表示は`next/image`経由でS3から配信される。動画では扱っていないが、投稿には費用内訳（自分のみ表示）を記録する機能もある。

</details>

<details>
<summary>③ つながる（検索・フォロー・TabiScore）</summary>

https://github.com/user-attachments/assets/39458019-2960-4888-bf8f-dc7132014ba9

通知一覧の閲覧（他ユーザーからの反応が視界に入ると自動的に既読化される）→ユーザー検索→プロフィール（TabiScore表示）→フォロー。

</details>

<details>
<summary>④ 記録と振り返り（旅行プラン・旅行レポート・地図・テーマ）</summary>

https://github.com/user-attachments/assets/c1275338-fa41-471e-860b-37323d66405f

マイページ→旅行プラン新規作成（スポット追加、地図に反映）→旅行レポート（統計カード・エリア別バブルチャート・カテゴリ別グラフ・月別ヒートマップ・年別推移・年フィルタ）→表示テーマのダーク/ライト切り替え→訪問済み（都道府県塗り分け地図）→ログアウト。

APIドキュメント（Swagger UI）は動画に含めていないが、[本番URL/api-docs](http://54.248.13.248/api-docs)で常時閲覧可能。

</details>

<details>
<summary>⑤ モバイル表示</summary>

https://github.com/user-attachments/assets/a0e49ecc-eff0-4749-9e21-e63d0a29e3c3

未ログイン時のモバイル表示（検索→投稿詳細）→ログイン後のモバイル下部ナビ（新規投稿アイコンの長押しでラベルがポップアップ表示される）。

</details>

---

## 主な機能

| カテゴリ | 機能 |
|---------|------|
| 認証 | ユーザー登録 / ログイン / ログアウト |
| 投稿 | 旅行スポットの記録（場所名・感想・写真複数枚）/ 投稿編集 / 投稿削除 |
| いいね | 「行ってみたい」登録 / 取り消し / いいね数表示 |
| コメント | コメント投稿 / コメント一覧表示 / コメント削除 |
| フォロー | フォロー / アンフォロー / フォロワー・フォロー中数表示 |
| エリアタグ | エリアタグ付け / タグ別絞り込み表示 / 都道府県ドロップダウン選択（47都道府県＋海外）/ 検索のエリアタブで都道府県別絞り込み |
| リスト | 訪問済みリスト / 行きたいリスト の登録・管理 |
| 旅行プラン | 旅行計画の作成・管理 / スポット・予算内訳の記録 / 「この旅を記録する」投稿リンク / 完了管理 |
| 旅行レポート | 年別の旅まとめカード（Spotify Wrapped 風）/ カテゴリ・費用グラフ / 訪問都道府県一覧 / 年別タイムライン |
| 費用管理 | 投稿への費用内訳記録（自分のみ表示）/ プランへの予算内訳記録 |
| 地図 | 投稿スポットの位置情報表示（Leaflet + OpenStreetMap） |
| ユーザー | プロフィール表示 / TabiScore / コメント履歴 / プロフィール編集 / プロフィール画像アップロード |
| 通知 | いいね・コメント・フォローの通知一覧 / 既読管理 / 未読件数バッジ |
| 表示テーマ | ライト / ダーク / 自動（OS設定に追従）の切り替え、ログイン中はDBに保存し端末間で同期 |
| UI | スマートフォン・タブレット・PC に対応したレスポンシブレイアウト |

---

## 技術スタック

| 役割 | 技術・バージョン |
|------|----------------|
| フロントエンド | Next.js 16.2.11 + TypeScript |
| スタイリング | Tailwind CSS 4.3.2 |
| バックエンド | Next.js Route Handlers |
| ORM | Prisma 6.19.3 |
| 認証 | Auth.js（next-auth v5 beta.32） |
| データベース | MySQL（開発: Docker / 本番: AWS RDS） |
| 画像ストレージ | AWS S3（実装計画書 Phase 6-A 対応済み。アップロードには`AWS_REGION`/`AWS_S3_BUCKET_NAME`の設定と実際のバケットが必要） |
| 地図 | Leaflet + OpenStreetMap |
| ホスティング | AWS EC2 + RDS + S3（Terraform構築済み、2026-08-06デプロイ・実機能検証完了。2026-08-07 一般公開済み: http://54.248.13.248 ）。詳細は [インフラ構成書](docs/インフラ構成書.md) |

---

## 開発期間・体制

2026-06-27〜2026-08-08（約6週間）、個人開発。要件定義・設計・実装・テスト・パフォーマンス計測・AWS本番デプロイ・デモ動画撮影までを一人で担当した。設計・実装の各段階でOpus・Sol（AIレビュアー）による指摘を継続的に取り込み、レビュー→修正→再検証のサイクルを回した（`実装計画書/reviews/`に主要な指摘・対応の記録があるが、当該ディレクトリは`.gitignore`対象のためリポジトリには含まれない）。

**設計・実装で工夫した点:**

- **並行更新の競合対策**: いいね・コメント等の非正規化カウンタ更新に加え、投稿・旅行プランの編集には楽観ロック用の`version`列を導入し、同時編集による上書き事故を検知できるようにした
- **S3オブジェクトの所有権・参照整合性**: アップロードキーに所有者IDを含めて誤削除を防止し、削除前に`findStillReferencedUrls`で他レコードからの参照有無を確認してから削除する設計にした（旅行プランへの画像引き継ぎ機能で同一オブジェクトを複数投稿から参照できるため）
- **構造化ログとダークテーマの全画面対応**: pinoによる構造化ログを整備し、表示テーマはローカルストレージからCookie＋DB方式へ移行して全画面をダークテーマ対応させた（対応漏れを`docs/画面設計書.md`に更新履歴として都度記録）
- **IaCによる本番構築**: AWSインフラをTerraformでコード管理し、実環境への`apply`を検証済み。`destroy`・復旧手順も[Runbook](infra/terraform/README.md)として整備した（destroy自体の実機検証はまだ実施していない）
- **テスト・パフォーマンス計測**: Vitest 740件・カバレッジ92%超、Playwright E2E、k6による負荷試験（Smoke/Load/Stress/Spike）とWeb Vitals計測をCI・ローカルの両方で運用

---

## ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [要件定義書](docs/要件定義書.md) | 機能要件・非機能要件・技術スタック |
| [DB 設計書](docs/DB設計書.md) | ER 図・テーブル定義 |
| [API 仕様書（Swagger UI）](http://localhost:3000/api-docs) | エンドポイント一覧・リクエスト/レスポンス仕様（開発サーバー起動中に閲覧。手書きの`docs/API仕様書.md`は廃止しSwagger自動生成に一本化済み。[本番URL](http://54.248.13.248/api-docs)でも常時閲覧可能） |
| [画面設計書](docs/画面設計書.md) | ワイヤーフレーム（全画面） |
| [画面遷移図](docs/画面遷移図.md) | 画面間の遷移フロー |
| [シーケンス図](docs/シーケンス図.md) | 認証・投稿・ソーシャル機能のシーケンス |
| [インフラ構成書](docs/インフラ構成書.md) | AWS（EC2 + RDS + S3）構成・デプロイフロー |
| [テスト設計書](docs/テスト設計書.md) | テスト方針・層別戦略・テストケース一覧（Phase 2.5-B） |
| [ログ運用設計書](docs/ログ運用設計書.md) | 構造化ログ方針・監視項目・障害対応フロー・エラー監視連携（Phase 2.5-C/D） |
| [認証機能定義書](docs/機能定義書/認証機能定義書.md) | 認証機能の詳細仕様 |
| [投稿機能定義書](docs/機能定義書/投稿機能定義書.md) | 投稿機能の詳細仕様 |
| [いいね機能定義書](docs/機能定義書/いいね機能定義書.md) | いいね機能の詳細仕様 |
| [コメント機能定義書](docs/機能定義書/コメント機能定義書.md) | コメント機能の詳細仕様 |
| [フォロー機能定義書](docs/機能定義書/フォロー機能定義書.md) | フォロー機能の詳細仕様 |
| [エリアタグ機能定義書](docs/機能定義書/エリアタグ機能定義書.md) | エリアタグ機能の詳細仕様 |
| [リスト機能定義書](docs/機能定義書/リスト機能定義書.md) | 訪問済み/行きたいリスト機能の詳細仕様 |
| [地図機能定義書](docs/機能定義書/地図機能定義書.md) | 地図表示機能の詳細仕様 |
| [プロフィール機能定義書](docs/機能定義書/プロフィール機能定義書.md) | プロフィール機能の詳細仕様 |
| [旅行プラン機能定義書](docs/機能定義書/旅行プラン機能定義書.md) | 旅行プラン機能の詳細仕様 |
| [旅行レポート機能定義書](docs/機能定義書/旅行レポート機能定義書.md) | 旅行レポート機能の詳細仕様 |
| [通知機能定義書](docs/機能定義書/通知機能定義書.md) | 通知機能の詳細仕様 |

---

## ローカル開発環境のセットアップ

### 前提条件

- Node.js 24 / pnpm（本番EC2・CIともにNode.js 24で統一。`@node-rs/bcrypt`のネイティブアドオンがビルド時のNodeバージョンに依存するため）
- Docker（開発用MySQLコンテナの起動に使用）
- ※ 画像アップロード機能（投稿画像・アバター）を使うには `AWS_REGION` / `AWS_S3_BUCKET_NAME` の設定と実際のS3バケットが必要（バケット自体の構築は実装計画書 Phase 6-B）。それ以外の画面・機能はS3設定なしでも動作する

### 手順

```bash
# 1. リポジトリをクローン
git clone <repository-url>
cd TripDiary

# 2. 依存関係をインストール
pnpm install

# 3. 環境変数を設定
cp .env.sample .env.local
# .env.local を編集して各値を設定

# 4. 開発用DBを起動
docker compose up -d db

# 5. DB マイグレーション（.env.localを読み込む。素の`pnpm prisma migrate dev`はPrisma CLIの
#    既定である.envしか読まないため、.env.localのみの環境では失敗する）
pnpm prisma:migrate

# 6. 開発サーバー起動
pnpm dev
```

| サービス | URL |
|---------|-----|
| アプリ | http://localhost:3000 |

※ 上記の手順で起動した直後のローカルDBは空の状態。開発用シードスクリプトは用意していないため、実データを伴う動作確認は[本番URL・確認用アカウント](#公開url確認用アカウント)を利用するのが早い。

---

## 環境変数

`.env.sample` を参照して `.env.local` を作成する。

| 変数名 | 説明 |
|--------|------|
| `DATABASE_URL` | MySQL 接続 URL（開発時は `docker compose up -d db` のコンテナ、本番は AWS RDS） |
| `AUTH_SECRET` | Auth.js のシークレットキー |
| `AUTH_URL` | アプリの URL（開発時は http://localhost:3000） |
| `AWS_REGION` | S3 バケットのリージョン（例: ap-northeast-1）。画像アップロード機能に必須 |
| `AWS_S3_BUCKET_NAME` | S3 バケット名。画像アップロード機能に必須 |
| `AWS_ACCESS_KEY_ID` | IAM ユーザーのアクセスキー（任意。ローカル開発で一時的な認証情報を使う場合のみ設定。本番は EC2 の IAM ロールを使うため設定不要） |
| `AWS_SECRET_ACCESS_KEY` | IAM ユーザーのシークレットキー（任意。用途は上記と同じ） |

---

## 主なコマンド

```bash
pnpm dev             # 開発サーバー起動
pnpm build           # 本番ビルド
pnpm lint            # ESLint 実行
pnpm typecheck       # 型チェック（tsc --noEmit）
pnpm prisma:studio       # Prisma Studio（DB GUI、.env.localを読み込む）
pnpm prisma:migrate      # マイグレーション実行（.env.localを読み込む）

# テスト（詳細は docs/テスト設計書.md 参照）
pnpm test                    # Vitest（単体・統合テスト）を実行
pnpm test:coverage           # カバレッジ計測付きで実行
```

テスト用DB（`docker compose up -d mysql-test`）へのスキーマ適用は`pnpm prisma:migrate:test`（`.env.test`を読み込む）でも行えるが、`.env.test`はGit管理外で新規cloneには存在しないため、以下のように`DATABASE_URL`を直接指定する方法を推奨する（CIも同じ理由でこちらの方式を使っている）。

```bash
docker compose up -d mysql-test
DATABASE_URL="mysql://tripdiary:tripdiary@127.0.0.1:3307/tripdiary_test" pnpm prisma migrate deploy
```

E2E（Playwright）は各specが`/api/test/cleanup`を叩くため、素の`pnpm playwright test --project=e2e`だけでは`beforeEach`が403で失敗する。事前に以下の環境変数が必要（詳細レシピは[docs/テスト設計書.md](docs/テスト設計書.md)10章参照）。

```bash
DATABASE_URL="mysql://tripdiary:tripdiary@127.0.0.1:3307/tripdiary_test" \
AUTH_URL="http://localhost:3000" AUTH_SECRET="<任意の値>" \
ENABLE_TEST_ENDPOINTS=true TEST_CLEANUP_SECRET="<任意の値>" DISABLE_RATE_LIMIT_FOR_TESTS=true \
AWS_REGION=ap-northeast-1 AWS_S3_BUCKET_NAME=tripdiary-e2e-dummy-bucket \
pnpm playwright test --project=e2e
```

### API仕様書（Swagger）

実装済みAPIの最新仕様は、開発サーバー起動中に以下で確認できる（Phase 2.5-Aで自動生成を導入。手書きの`docs/API仕様書.md`は廃止しこちらに一本化した）。

- Swagger UI: http://localhost:3000/api-docs
- OpenAPI JSON: http://localhost:3000/api/openapi.json

本番環境（http://54.248.13.248/api-docs ）でも一般公開後の実機確認済み。

---

## CI（GitHub Actions）

`.github/workflows/ci.yml` で以下5ジョブを実行する（プッシュ・PR時に自動起動）。

| ジョブ | 内容 |
|--------|------|
| `lint` | ESLint |
| `typecheck` | `tsc --noEmit` |
| `build` | `pnpm install --frozen-lockfile` → `pnpm build`（Next.jsのビルド可否を検証。6-A2で`@node-rs/bcrypt`〔ネイティブアドオン〕を導入したため新設） |
| `test` | Vitest（`mysql-test` コンテナで実DB検証、カバレッジ閾値 Statements 85% / Branches 75% / Functions 78% / Lines 86% を下回るとジョブが失敗する） |
| `e2e` | Playwright E2E（`continue-on-error` は設定していないため失敗時はCI上に赤く表示されるが、ブランチ保護の必須ステータスチェックには含めていない。運用実績を見て今後必須化を判断する方針） |

ブランチ保護の必須ステータスチェックは `lint` / `typecheck` / `build` / `test` の4つ。

---

## パフォーマンステスト

perf専用MySQLへ再シードした環境で、k6による負荷試験とPlaywrightによるWeb Vitals計測を実施しています。詳細な実行手順・シナリオ・閾値は[performance/k6/README.md](performance/k6/README.md)を参照してください。

> ✅ 2026-08-08、`@node-rs/bcrypt`移行・GATE-22ページングシナリオ・GATE-24 checks閾値を含む現行実装を、perf専用MySQLのクリーン再シード後に再測定しました。測定対象・環境・生成物は[再測定summary](docs/performance-test-results-2026-08-08.md)を参照してください。以下はローカル隔離環境の値であり、本番EC2/RDSの容量保証ではありません。

| 種別 | ピーク業務VU | 結果 | 主な実測値 |
|---|---:|---|---|
| Smoke | 1 | PASS | 29件、p95 235.6ms / p99 266.3ms / エラー率 0% / checks 47/47 |
| Load | 10 | PASS | 8,460件、steady p95 85.0ms / p99 99.3ms / エラー率 0% |
| Stress | 50 | N/A | 30,713件、vu50 p95 110.9ms / p99 162.4ms / エラー率 0% |
| Spike | 60 | PASS | 18,198件、cooldown p99 91.9ms / 115.9ms / エラー率 0% |

<details>
<summary>集約レポートのスクリーンショット</summary>

![Smokeレポート](docs/images/performance-smoke.png)

![Loadレポート](docs/images/performance-load.png)

![Stressレポート](docs/images/performance-stress.png)

![Spikeレポート](docs/images/performance-spike.png)

![Web Vitalsレポート](docs/images/performance-webvitals.png)
</details>

---

## ディレクトリ構成

```
TripDiary/
├── docs/                          # ドキュメント類
│   ├── 要件定義書.md
│   ├── DB設計書.md
│   ├── テスト設計書.md
│   ├── ログ運用設計書.md
│   ├── 画面設計書.md
│   ├── 画面遷移図.md
│   ├── シーケンス図.md
│   ├── インフラ構成書.md
│   ├── demo/                       # デモ動画本編（mp4）と埋め込み時のトラブル対応記録
│   ├── images/                     # パフォーマンステスト等のスクリーンショット
│   └── 機能定義書/
│       ├── 認証機能定義書.md
│       ├── 投稿機能定義書.md
│       ├── いいね機能定義書.md
│       ├── コメント機能定義書.md
│       ├── フォロー機能定義書.md
│       ├── エリアタグ機能定義書.md
│       ├── リスト機能定義書.md
│       ├── 地図機能定義書.md
│       ├── プロフィール機能定義書.md
│       ├── 旅行プラン機能定義書.md
│       ├── 旅行レポート機能定義書.md
│       └── 通知機能定義書.md
├── src/
│   ├── app/
│   │   ├── (auth)/                # 認証・サインアップ画面
│   │   ├── (app)/                 # 認証済み画面（サイドバーレイアウト）
│   │   ├── (public)/              # 未認証でも閲覧可能な画面（探索フィード・投稿詳細等）
│   │   ├── api/                   # Route Handlers
│   │   └── api-docs/              # Swagger UI（Phase 2.5-A）
│   ├── components/                # 共通コンポーネント
│   ├── lib/                       # ユーティリティ（prisma / auth / logger / openapi 等）
│   └── types/                     # 型定義
├── prisma/
│   ├── schema.prisma
│   └── seed-production.ts         # 本番シード投入スクリプト（Phase 6-B2）
├── scripts/
│   └── fetch-seed-images.ts       # 本番シード用画像収集（Pexels API、Phase 6-B2）
├── infra/terraform/               # 本番インフラのコード管理（EC2 + RDS + S3、Phase 6-B）
├── performance/                   # k6負荷試験・Web Vitals計測
├── e2e/                           # Playwright E2Eテスト
├── prototype/                     # 実装着手前の静的HTMLプロトタイプ（16画面、UI検討用の参考資料）
├── public/
├── .env.local
├── .env.sample
└── package.json
```

---

## 本番環境へのデプロイ

本番環境は AWS EC2（アプリ）+ AWS RDS（MySQL）+ AWS S3（画像ストレージ）、Terraform（`infra/terraform/`）でコード管理して構築している（Phase 6-B、2026-08-06 構築・デプロイ・実機能検証まで完了）。「公開阻止DoD」（実S3/IAM実機検証・監視実証等）・本番シード投入（6-B2）を経て、**2026-08-07 一般公開済み**: http://54.248.13.248 。インフラの詳細・デプロイ手順は [docs/インフラ構成書.md](docs/インフラ構成書.md)・[infra/terraform/README.md](infra/terraform/README.md) を参照。

確認用アカウントの認証情報は[公開URL・確認用アカウント](#公開url確認用アカウント)を参照。

### 確認用アカウントのデータ復旧

`prisma/seed-production.ts`は決定的ID（`seed-`プレフィックス）の存在確認→なければ作成、という冪等な作りのため、**再実行するだけで削除されたシードデータは復元される**。

```bash
# EC2上で実行（DATABASE_URLは本番RDSを指す）
CONFIRM_PRODUCTION_SEED=true DRY_RUN=true pnpm dlx tsx prisma/seed-production.ts  # 接続先と件数を確認
CONFIRM_PRODUCTION_SEED=true pnpm dlx tsx prisma/seed-production.ts               # 復元
```

ただし**編集された（削除ではなく内容を書き換えられた）レコードは復元されない**。決定的IDの行が存在する限り作成がスキップされるため。この場合は次のいずれかを行う。

1. 対象レコードを決定的ID指定で削除してから再実行する（`Post`削除時は`Comment`・`Like`がcascadeで消えるため、それらも再実行で復元される）
2. 実行前に取得したRDSスナップショットからリストアする（本番シード実行時のスナップショットIDは[docs/インフラ構成書.md](docs/インフラ構成書.md)「9.5 運用ログ」に記録）

公開期間中は、確認者による変更を前提に**定期的に本番URLの表示を確認し、崩れていれば上記で復旧する**運用とする。

常設デモアカウント（6-Cデモ動画用）のパスワードはリポジトリに含めず、`prisma/seed-production.ts`実行時にランダム生成・標準出力にのみ表示する。

---

## 画像素材の出所

本番シード投入（`scripts/fetch-seed-images.ts`）で使用している投稿画像は、[Pexels](https://www.pexels.com/) API（[Pexels License](https://www.pexels.com/license/)、商用利用可・帰属表示は法的には不要）から取得した実写素材である。TripDiary本体のUIには帰属表示欄がないため、撮影者名・撮影者URL・写真ページURL・Pexels写真ID等を記録した`manifest.json`（実行時に`seed-images/`配下へ生成。gitignore対象でリポジトリには含まない）と、このREADMEへの出所明記をもって対応する。

---

## セキュリティ

> ⚠️ **既知のセキュリティ制約**
>
> **HTTPS非採用について**: コスト・作業量を理由に、本番環境はHTTP運用とする（独自ドメイン・Elastic IP・Let's Encryptによる正式なHTTPS化は行わない）。ログイン情報・セッションが平文で流れ得るため、**確認用アカウントは使い捨て前提**とし、本番環境で個人情報・普段使いのパスワードを絶対に使い回さないこと。認証情報平文送信・第三者によるデータ改変のリスクを許容した上での公開判断である（確認用アカウントの認証情報自体は[公開URL・確認用アカウント](#公開url確認用アカウント)を参照）。

`pnpm audit`（2026-08-08時点）: 全依存 critical 0 / high 0 / moderate 0 / low 0（`pnpm-workspace.yaml`の`overrides`で`brace-expansion`・`js-yaml`・`dompurify`・`postcss`・`undici`・`nanoid`・`immutable`をパッチ／マイナー版に固定して解消。`immutable`は`swagger-ui-react`が直接依存に`^3.x.x`を指定しているが、実機でAPI Docsページの表示・操作を検証し4.x系でも問題ないことを確認済み）。
