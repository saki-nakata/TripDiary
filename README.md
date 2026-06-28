# TripDiary

旅行スポットを記録・共有できる SNS 型旅行記録アプリ。スポット投稿・写真共有・いいね・コメント・フォロー・エリアタグ絞り込み・訪問済み/行きたいリスト・簡易地図などのソーシャル機能を備える。

---

## 技術スタック

| 役割 | 技術・バージョン |
|------|----------------|
| フロントエンド | Next.js 16.2.9 + TypeScript |
| スタイリング | Tailwind CSS 4.3.1 |
| バックエンド | Next.js Route Handlers |
| ORM | Prisma 7.8.0 |
| 認証 | Auth.js（next-auth v5 beta.31） |
| データベース | MySQL（Railway） |
| 画像ストレージ | Cloudinary |
| 地図 | Leaflet + OpenStreetMap |
| ホスティング | Vercel（アプリ）+ Railway（MySQL） |

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
| UI | スマートフォン・タブレット・PC に対応したレスポンシブレイアウト |

---

## ディレクトリ構成

```
TripDiary/
├── docs/                          # ドキュメント類
│   ├── project-plan.md            # プロジェクト計画書
│   ├── 要件定義書.md
│   ├── DB設計書.md
│   ├── API仕様書.md
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
│   │   ├── (auth)/                # 認証画面
│   │   ├── (main)/                # メイン画面
│   │   └── api/                   # Route Handlers
│   ├── components/                # 共通コンポーネント
│   ├── lib/                       # ユーティリティ（prisma / auth / cloudinary）
│   └── types/                     # 型定義
├── prisma/
│   └── schema.prisma
├── public/
├── .env.local
├── .env.sample
└── package.json
```

---

## ローカル開発環境のセットアップ

### 前提条件

- Node.js 20 以上
- MySQL（または Railway への接続情報）
- Cloudinary アカウント
- Leaflet + OpenStreetMap（APIキー不要）

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

# 4. DB マイグレーション
pnpm prisma migrate dev

# 5. 開発サーバー起動
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
pnpm prisma studio       # Prisma Studio（DB GUI）
pnpm prisma migrate dev  # マイグレーション実行
```

---

## 環境変数

`.env.sample` を参照して `.env.local` を作成する。

| 変数名 | 説明 |
|--------|------|
| `DATABASE_URL` | MySQL 接続 URL（Railway） |
| `NEXTAUTH_SECRET` | Auth.js のシークレットキー |
| `NEXTAUTH_URL` | アプリの URL（開発時は http://localhost:3000） |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary クラウド名 |
| `CLOUDINARY_API_KEY` | Cloudinary API キー |
| `CLOUDINARY_API_SECRET` | Cloudinary API シークレット |
| ~~`NEXT_PUBLIC_MAPBOX_TOKEN`~~ | 不要（Leaflet + OpenStreetMap に変更） |

---

## 本番環境へのデプロイ

本番環境は Vercel（アプリ）+ Railway（MySQL）で構成する。インフラの詳細は [docs/インフラ構成書.md](docs/インフラ構成書.md) を参照。

```bash
# Vercel CLI でデプロイ
vercel --prod
```

---

## ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [要件定義書](docs/要件定義書.md) | 機能要件・非機能要件・技術スタック |
| [DB 設計書](docs/DB設計書.md) | ER 図・テーブル定義 |
| [API 仕様書](docs/API仕様書.md) | エンドポイント一覧・リクエスト/レスポンス仕様 |
| [画面設計書](docs/画面設計書.md) | ワイヤーフレーム（全画面） |
| [画面遷移図](docs/画面遷移図.md) | 画面間の遷移フロー |
| [シーケンス図](docs/シーケンス図.md) | 認証・投稿・ソーシャル機能のシーケンス |
| [インフラ構成書](docs/インフラ構成書.md) | Vercel + Railway 構成・デプロイフロー |
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
