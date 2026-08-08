# TripDiary

旅行スポットを記録・共有できる SNS 型旅行記録アプリ。スポット投稿・写真共有・いいね・コメント・フォロー・エリアタグ絞り込み・訪問済み/行きたいリスト・簡易地図などのソーシャル機能を備える。

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

## セキュリティ確認メモ

`pnpm audit` の残存警告（high 5 / low 1）は `swagger-ui-react` の内部依存由来。TripDiary本体機能への直接影響は限定的と判断し、critical 0 の状態で Phase 5 は完了とする。`swagger-ui-react` 側の修正版が公開され次第、依存更新で追従する。

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

## パフォーマンステスト

perf専用MySQLへ再シードした環境で、k6による負荷試験とPlaywrightによるWeb Vitals計測を実施しています。詳細な実行手順・シナリオ・閾値は[performance/k6/README.md](performance/k6/README.md)を参照してください。

> ⚠️ 以下の実測値・スクリーンショットは、ログイン処理のパスワード照合に`bcryptjs`を使用していた時点（Phase 6 6-A2でネイティブ実装の`@node-rs/bcrypt`へ置き換える前）のものです。ログイン処理のCPU負荷特性が変わりうるため、本番デプロイ（Phase 6-B）完了後に再計測し、この節を更新する予定です。

| 種別 | ピーク業務VU | 結果 | 主な実測値 |
|---|---:|---|---|
| Smoke | 1 | PASS | p95 120ms / p99 463ms / エラー率 0% |
| Load | 10 | PASS | steady p95 670ms / p99 744ms / エラー率 0% |
| Stress | 50 | N/A | vu50 p95 1011ms / p99 1380ms、全体エラー率 0.005% |
| Spike | 60 | PASS | cooldown p99 655ms / 603ms / エラー率 0.034% |

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
├── public/
├── .env.local
├── .env.sample
└── package.json
```

---

## ローカル開発環境のセットアップ

### 前提条件

- Node.js 24 / pnpm（本番EC2・CIともにNode.js 24で統一。`@node-rs/bcrypt`のネイティブアドオンがビルド時のNodeバージョンに依存するため）
- Docker（開発用MySQLコンテナの起動に使用）
- Leaflet + OpenStreetMap（APIキー不要）
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

# 5. DB マイグレーション
pnpm prisma migrate dev

# 6. 開発サーバー起動
pnpm dev
```

| サービス | URL |
|---------|-----|
| アプリ | http://localhost:3000 |

---

## 主なコマンド

```bash
pnpm dev             # 開発サーバー起動
pnpm build           # 本番ビルド
pnpm lint            # ESLint 実行
pnpm typecheck       # 型チェック（tsc --noEmit）
pnpm prisma studio       # Prisma Studio（DB GUI）
pnpm prisma migrate dev  # マイグレーション実行

# テスト（詳細は docs/テスト設計書.md 参照）
pnpm test                    # Vitest（単体・統合テスト）を実行
pnpm test:coverage           # カバレッジ計測付きで実行
pnpm prisma:migrate:test     # テスト用DBにスキーマ適用（事前に docker compose up -d mysql-test が必要）
pnpm playwright test --project=e2e  # E2Eテスト（認証フロー・投稿の主要フロー）
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
| ~~`NEXT_PUBLIC_MAPBOX_TOKEN`~~ | 不要（Leaflet + OpenStreetMap に変更） |

---

## デモ動画

本番環境（http://54.248.13.248 ）に対して、常設デモアカウントで実際に操作しながら撮影した動画。いずれも無音・カット無しの通し撮りで、ブラウザのアドレスバーは映らない（Playwrightの録画仕様のため）。代表的な主要機能をカバーしているが、投稿の編集・削除やアンフォロー等の操作は含まない。

<summary>① 閲覧・いいね・行きたい・コメント</summary>

<video controls src="docs/demo/01-feed-engage.mp4"></video>

未ログインでのトップページ閲覧→ログイン→探索ポータル→投稿詳細（画像ライトボックス）→いいね→「行きたい」登録→コメント投稿。

<details>
<summary>② 投稿する（地図・複数枚画像）</summary>

<video controls src="docs/demo/02-post-create.mp4"></video>

新規投稿フォームの入力（タイトル・本文・カテゴリ・エリア・評価・訪問日）→Leaflet地図でのスポット位置指定→画像2枚のアップロード→投稿完了後、ホームでのハイライト表示と投稿詳細での画像・地図の反映確認。

画像アップロードは`@aws-sdk/client-s3`でS3へ保存し、表示は`next/image`経由でS3から配信される。動画では扱っていないが、投稿には費用内訳（自分のみ表示）を記録する機能もある。

</details>

<details>
<summary>③ つながる（検索・フォロー・TabiScore）</summary>

<video controls src="docs/demo/03-social.mp4"></video>

通知一覧の閲覧（他ユーザーからの反応が視界に入ると自動的に既読化される）→ユーザー検索→プロフィール（TabiScore表示）→フォロー。

</details>

<details>
<summary>④ 記録と振り返り（旅行プラン・旅行レポート・地図・テーマ）</summary>

<video controls src="docs/demo/04-record-and-reflect.mp4"></video>

マイページ→旅行プラン新規作成（スポット追加、地図に反映）→旅行レポート（統計カード・エリア別バブルチャート・カテゴリ別グラフ・月別ヒートマップ・年別推移・年フィルタ）→表示テーマのダーク/ライト切り替え→訪問済み（都道府県塗り分け地図）→ログアウト。

APIドキュメント（Swagger UI）は動画に含めていないが、[本番URL/api-docs](http://54.248.13.248/api-docs)で常時閲覧可能。

</details>

<details>
<summary>⑤ モバイル表示</summary>

<video controls height="400" src="docs/demo/05-mobile.mp4"></video>

未ログイン時のモバイル表示（検索→投稿詳細）→ログイン後のモバイル下部ナビ（新規投稿アイコンの長押しでラベルがポップアップ表示される）。

</details>

---

## 本番環境へのデプロイ

本番環境は AWS EC2（アプリ）+ AWS RDS（MySQL）+ AWS S3（画像ストレージ）、Terraform（`infra/terraform/`）でコード管理して構築している（Phase 6-B、2026-08-06 構築・デプロイ・実機能検証まで完了）。「公開阻止DoD」（実S3/IAM実機検証・監視実証等）・本番シード投入（6-B2）を経て、**2026-08-07 一般公開済み**: http://54.248.13.248 。インフラの詳細・デプロイ手順は [docs/インフラ構成書.md](docs/インフラ構成書.md)・[infra/terraform/README.md](infra/terraform/README.md) を参照。

> ⚠️ **HTTPS非採用について**: コスト・作業量を理由に、本番環境はHTTP運用とする（独自ドメイン・Elastic IP・Let's Encryptによる正式なHTTPS化は行わない）。ログイン情報・セッションが平文で流れ得るため、**確認用アカウントは使い捨て前提**とし、本番環境で個人情報・普段使いのパスワードを絶対に使い回さないこと。

### 確認用アカウント（6-B2本番シード）

本番URL（http://54.248.13.248 ）で動作確認する場合は、以下の確認用アカウントを使用する。`isProtected: true`のためパスワード・メールアドレスの変更はできない。

| 項目 | 値 |
|------|-----|
| メールアドレス | `confirm@tripdiary.example` |
| パスワード | `TripDiary-Confirm-2026-Seed` |

⚠️ 本番はHTTP運用のため認証情報が平文で流れ得る。**このアカウントは確認専用の使い捨てとして扱い、他サービスと共用しているパスワードを入力しないこと。**

自分の投稿9件（画像付き）・旅行プラン2件（完了済み1件＋進行中1件）・行きたい登録済みで、ログイン後すぐに「旅行レポート」「行きたい」「旅行プラン」「訪問済み」の各画面を空でない状態で確認できる。

> ⚠️ **`isProtected` が守るのはパスワード・メールアドレスの変更のみ**（`user.service.ts`の`changePasswordService`/`changeEmailService`）。認証情報を公開している以上、**誰でもログインして確認用アカウントの投稿・旅行プラン・行きたい等を編集・削除できる**。デモとしての完成状態が壊された場合は、下記「確認用アカウントのデータ復旧」の手順で戻す。

#### 確認用アカウントのデータ復旧

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
