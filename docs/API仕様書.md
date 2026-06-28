# TripDiary API仕様書

**バージョン:** 1.1
**作成日:** 2026-06-27
**更新日:** 2026-06-28
**作成者:** Nakata Saki

---

## 1. 概要

本アプリの API は Next.js App Router の Route Handlers として実装する。
エンドポイントは `/app/api/` 配下に配置する。

---

## 2. 認証方式

Auth.js v5（セッションベース）を使用する。

| 項目 | 内容 |
|------|------|
| 認証方式 | セッション（Auth.js Database Strategy） |
| セッション取得 | サーバーサイドで `auth()` を呼び出す |
| 未認証時の挙動 | 401 JSON レスポンスを返す |
| セッション有効期限 | 未定（Auth.js のデフォルト設定に従う） |

---

## 3. 共通仕様

### 3.1 レスポンス形式

- Content-Type：`application/json`
- 成功時：該当データ or `{ "message": "..." }`
- エラー時：`{ "error": "エラーメッセージ" }`

### 3.2 HTTPステータスコード

| コード | 意味 |
|--------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 400 | バリデーションエラー |
| 401 | 未認証 |
| 403 | 権限なし（本人以外が操作しようとした場合） |
| 404 | リソースが見つからない |
| 409 | 競合（メール重複など） |
| 500 | サーバーエラー |

### 3.3 ページネーション

カーソルベース（cursor-based）を採用する。

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| cursor | string | 前回取得した最後のレコードの `id`。指定しない場合は先頭から取得 |
| limit | number | 1回に取得する件数（デフォルト：20） |

**レスポンスに含まれるページネーション情報**
```json
{
  "posts": [...],
  "nextCursor": "cm_xxx",
  "hasMore": true
}
```
`nextCursor` が `null` の場合はデータの末尾に達したことを示す。

---

## 4. エンドポイント一覧

### 4.1 認証

| Method | エンドポイント | 説明 | 認証 |
|--------|--------------|------|------|
| POST | `/api/auth/signup` | ユーザー登録 | 不要 |
| GET / POST | `/api/auth/[...nextauth]` | Auth.js セッション管理 | - |

#### POST `/api/auth/signup`

**リクエスト**
```json
{
  "name": "田中花子",
  "email": "hanako@example.com",
  "password": "password123"
}
```

**レスポンス（201）**
```json
{
  "id": "cm_xxx",
  "name": "田中花子",
  "email": "hanako@example.com"
}
```

---

### 4.2 投稿

| Method | エンドポイント | 説明 | 認証 |
|--------|--------------|------|------|
| GET | `/api/posts/explore` | 探索ページ用全体フィード取得 | 不要 |
| GET | `/api/posts` | フォロー中フィード取得 | 必要 |
| POST | `/api/posts` | 投稿作成 | 必要 |
| GET | `/api/posts/[id]` | 投稿詳細取得 | 不要 |
| PUT | `/api/posts/[id]` | 投稿編集 | 必要（本人のみ） |
| DELETE | `/api/posts/[id]` | 投稿削除 | 必要（本人のみ） |

#### GET `/api/posts/explore`

全ユーザーの投稿を返す。未認証でもアクセス可能。

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| sort | string | 任意 | `newest`（デフォルト）または `popular`（いいね数降順） |
| category | string | 任意 | カテゴリで絞り込み（例：`グルメ`） |
| areaTag | string | 任意 | エリアタグで絞り込み |
| prefecture | string | 任意 | 都道府県で絞り込み（例：`京都府`、`海外`） |
| cursor | string | 任意 | ページネーション用カーソル（前回レスポンスの `nextCursor`） |
| limit | number | 任意 | 取得件数（デフォルト：20） |

**レスポンス（200）**
```json
{
  "posts": [
    {
      "id": "cm_xxx",
      "title": "嵐山 竹林の道",
      "body": "朝早くに行くと人が少なくておすすめです。",
      "areaTag": "京都",
      "category": "観光",
      "rating": 5,
      "visitedAt": "2026-03-15",
      "createdAt": "2026-06-27T10:00:00.000Z",
      "author": {
        "id": "u_xxx",
        "name": "田中花子",
        "image": "https://res.cloudinary.com/..."
      },
      "images": [
        { "url": "https://res.cloudinary.com/...", "displayOrder": 0 }
      ],
      "likeCount": 5,
      "commentCount": 2,
      "likedByCurrentUser": false
    }
  ],
  "nextCursor": "cm_yyy",
  "hasMore": true
}
```

> **N+1 対策**：`author` と `images` は Prisma の `include` で一括取得する（`prisma.post.findMany({ include: { author: true, images: true, _count: { select: { likes: true, comments: true } } } })`）。

#### GET `/api/posts`

フォロー中ユーザーの投稿を返す。認証必須。クエリパラメータは `explore` と同様（`sort` / `cursor` / `limit`）。

#### POST `/api/posts`

**リクエスト**
```json
{
  "title": "嵐山 竹林の道",
  "body": "朝早くに行くと人が少なくておすすめです。",
  "areaTag": "京都",
  "category": "観光",
  "rating": 5,
  "visitedAt": "2026-03-15",
  "latitude": 35.0116,
  "longitude": 135.6681,
  "images": [
    { "url": "https://res.cloudinary.com/...", "displayOrder": 0 },
    { "url": "https://res.cloudinary.com/...", "displayOrder": 1 }
  ]
}
```

**レスポンス（201）**
```json
{
  "id": "cm_xxx",
  "title": "嵐山 竹林の道"
}
```

---

### 4.3 コメント

| Method | エンドポイント | 説明 | 認証 |
|--------|--------------|------|------|
| GET | `/api/posts/[id]/comments` | コメント一覧取得 | 不要 |
| POST | `/api/posts/[id]/comments` | コメント投稿 | 必要 |
| DELETE | `/api/comments/[id]` | コメント削除 | 必要（本人のみ） |

#### POST `/api/posts/[id]/comments`

**リクエスト**
```json
{
  "body": "とても参考になりました！"
}
```

**レスポンス（201）**
```json
{
  "id": "cm_xxx",
  "body": "とても参考になりました！",
  "createdAt": "2026-06-27T10:00:00.000Z",
  "author": {
    "id": "u_xxx",
    "name": "田中花子",
    "image": "https://res.cloudinary.com/..."
  }
}
```

---

### 4.4 いいね / リスト

| Method | エンドポイント | 説明 | 認証 |
|--------|--------------|------|------|
| POST | `/api/posts/[id]/like` | いいね toggle | 必要 |
| POST | `/api/posts/[id]/wishlist` | 行きたい toggle | 必要 |
| POST | `/api/posts/[id]/visited` | 訪問済み toggle | 必要 |

**レスポンス例（like toggle）**
```json
{
  "liked": true,
  "likeCount": 6
}
```

---

### 4.5 ユーザー

| Method | エンドポイント | 説明 | 認証 |
|--------|--------------|------|------|
| GET | `/api/users/[id]` | ユーザー情報取得 | 不要 |
| PUT | `/api/users/[id]` | プロフィール編集 | 必要（本人のみ） |
| POST | `/api/users/[id]/follow` | フォロー toggle | 必要 |
| GET | `/api/users/search` | ユーザー名検索 | 不要 |

#### GET `/api/users/search`

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| q | string | 必須 | 検索キーワード（ユーザー名の部分一致） |
| cursor | string | 任意 | ページネーション用カーソル |
| limit | number | 任意 | 取得件数（デフォルト：20） |

**レスポンス（200）**
```json
{
  "users": [
    {
      "id": "u_xxx",
      "name": "田中花子",
      "image": "https://res.cloudinary.com/...",
      "bio": "旅が好きです",
      "followedByCurrentUser": false
    }
  ],
  "nextCursor": "u_yyy",
  "hasMore": false
}
```

#### GET `/api/users/[id]`

**レスポンス（200）**
```json
{
  "id": "u_xxx",
  "name": "田中花子",
  "image": "https://res.cloudinary.com/...",
  "bio": "旅が好きです",
  "followerCount": 12,
  "followingCount": 8,
  "followedByCurrentUser": true,
  "postCount": 25
}
```

#### PUT `/api/users/[id]`

**リクエスト**
```json
{
  "name": "田中花子（更新）",
  "bio": "旅と写真が好きです"
}
```

---

### 4.6 画像アップロード

| Method | エンドポイント | 説明 | 認証 |
|--------|--------------|------|------|
| POST | `/api/upload/post` | 投稿写真を S3 にアップロード | 必要 |
| POST | `/api/upload/avatar` | プロフィール画像を S3 にアップロード | 必要 |

**リクエスト（multipart/form-data）**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| file | File | アップロードする画像ファイル |

**レスポンス（200）**
```json
{
  "url": "https://s3.ap-northeast-1.amazonaws.com/tripdiary/..."
}
```

---

---

### 4.8 旅行プラン API

| Method | エンドポイント | 説明 | 認証 |
|--------|--------------|------|------|
| GET | `/api/plans` | 自分のプラン一覧取得 | 必要 |
| POST | `/api/plans` | プラン作成 | 必要 |
| GET | `/api/plans/[id]` | プラン詳細取得 | 必要（本人のみ） |
| PUT | `/api/plans/[id]` | プラン更新 | 必要（本人のみ） |
| DELETE | `/api/plans/[id]` | プラン削除 | 必要（本人のみ） |
| PATCH | `/api/plans/[id]/complete` | 完了フラグ切り替え | 必要（本人のみ） |

**GET `/api/plans` レスポンス（200）**
```json
[
  {
    "id": "pl_xxx",
    "title": "京都・奈良 2泊3日",
    "startDate": "2026-08-10",
    "endDate": "2026-08-12",
    "budget": 50000,
    "budgetBreakdown": [
      { "label": "交通費", "amount": 20000 },
      { "label": "宿泊費", "amount": 20000 },
      { "label": "食費", "amount": 10000 }
    ],
    "memo": "抹茶スイーツを制覇する旅",
    "completed": false,
    "spotIds": ["p1", "p2", "p3"],
    "createdAt": "2026-07-01T10:00:00Z"
  }
]
```

**POST `/api/plans` リクエスト**
```json
{
  "title": "京都・奈良 2泊3日",
  "startDate": "2026-08-10",
  "endDate": "2026-08-12",
  "budgetBreakdown": [
    { "label": "交通費", "amount": 20000 }
  ],
  "memo": "抹茶スイーツを制覇する旅",
  "spotIds": ["p1", "p2", "p3"]
}
```

**PATCH `/api/plans/[id]/complete` リクエスト**
```json
{ "completed": true }
```

**エラーレスポンス**

| ステータス | 条件 |
|-----------|------|
| 403 | 本人以外がアクセス |
| 404 | プランが存在しない |

---

### 4.9 旅行レポート API

| Method | エンドポイント | 説明 | 認証 |
|--------|--------------|------|------|
| GET | `/api/stats/years` | 自分の投稿がある年一覧取得 | 必要 |
| GET | `/api/stats?year=YYYY` | 年別統計データ取得 | 必要 |

**GET `/api/stats/years` レスポンス（200）**
```json
{ "years": [2026, 2025, 2024] }
```

**GET `/api/stats?year=2026` レスポンス（200）**
```json
{
  "year": 2026,
  "completedPlans": 2,
  "totalPosts": 5,
  "totalPhotos": 9,
  "totalCost": 125000,
  "visitedPrefectures": ["沖縄県", "奈良県", "静岡県"],
  "topPrefecture": "沖縄県",
  "categoryBreakdown": [
    { "category": "アクティビティ", "count": 2 },
    { "category": "歴史・文化", "count": 2 },
    { "category": "自然", "count": 1 }
  ],
  "monthlyCost": [
    { "month": 4, "cost": 12000 },
    { "month": 6, "cost": 80000 }
  ]
}
```

**エラーレスポンス**

| ステータス | 条件 |
|-----------|------|
| 400 | `year` パラメータが不正な数値 |
| 401 | 未認証 |

---

## 5. 関連ドキュメント

| ドキュメント | ファイル |
|------------|---------|
| 要件定義書 | [要件定義書.md](要件定義書.md) |
| 各機能定義書 | [機能定義書/](機能定義書/) |
