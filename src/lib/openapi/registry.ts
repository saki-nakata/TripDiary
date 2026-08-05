import "./zod-setup";
import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { postSchema, postUpdateSchema } from "@/lib/validations/post";
import { signupApiSchema, loginSchema } from "@/lib/validations/auth";
import { userUpdateSchema, passwordChangeApiSchema, emailChangeSchema, themeUpdateSchema } from "@/lib/validations/user";
import { planSchema, planUpdateSchema } from "@/lib/validations/plan";
import {
  errorResponseSchema,
  validationErrorResponseSchema,
  postResponseSchema,
  postListResponseSchema,
  commentResponseSchema,
  commentListResponseSchema,
  authorCommentListResponseSchema,
  likeToggleResponseSchema,
  notificationListResponseSchema,
  uploadResponseSchema,
  userResponseSchema,
  userProfileResponseSchema,
  followToggleResponseSchema,
  followUserListResponseSchema,
  userListResponseSchema,
  messageResponseSchema,
  themeResponseSchema,
  planResponseSchema,
  planListResponseSchema,
  paginatedPlanListResponseSchema,
  planDetailResponseSchema,
  statsYearsResponseSchema,
  statsResponseSchema,
} from "./schemas";

// registerPath()の呼び出しはNext.jsのビルド時静的解析（"Collecting page data"）が
// 本モジュールをインポートしただけで即座に実行されてしまう。この解析フェーズでは
// zod-to-openapiによるzodプロトタイプ拡張（zod-setup.ts）が正しく反映されず
// `t.openapi is not a function` でビルドが失敗するため、登録処理を関数化して
// 実リクエスト時（generateOpenApiDocument()呼び出し時）まで遅延させ、結果をキャッシュする。
let cachedRegistry: OpenAPIRegistry | undefined;

function buildRegistry(): OpenAPIRegistry {
  if (cachedRegistry) return cachedRegistry;

  const registry = new OpenAPIRegistry();

  const bearerAuth = registry.registerComponent("securitySchemes", "cookieAuth", {
  type: "apiKey",
  in: "cookie",
  name: "authjs.session-token",
});

const commonErrors = {
  400: { description: "バリデーションエラー", content: { "application/json": { schema: validationErrorResponseSchema } } },
  401: { description: "未認証", content: { "application/json": { schema: errorResponseSchema } } },
  403: { description: "権限がない（他人のリソース）", content: { "application/json": { schema: errorResponseSchema } } },
  404: { description: "存在しない", content: { "application/json": { schema: errorResponseSchema } } },
  500: { description: "サーバーエラー", content: { "application/json": { schema: errorResponseSchema } } },
};

// ─── posts ───
registry.registerPath({
  method: "get",
  path: "/api/posts",
  summary: "フォロー中ユーザー＋自分の投稿一覧（認証必須）",
  tags: ["Posts"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({
      cursor: z.string().optional(),
      limit: z.string().optional(),
    }),
  },
  responses: {
    200: { description: "投稿一覧", content: { "application/json": { schema: postListResponseSchema } } },
    401: commonErrors[401],
  },
});

registry.registerPath({
  method: "post",
  path: "/api/posts",
  summary: "投稿作成",
  tags: ["Posts"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: { content: { "application/json": { schema: postSchema } } },
  },
  responses: {
    201: { description: "作成された投稿", content: { "application/json": { schema: postResponseSchema } } },
    400: commonErrors[400],
    401: commonErrors[401],
  },
});

registry.registerPath({
  method: "get",
  path: "/api/posts/{id}",
  summary: "投稿詳細取得（認証不要）",
  tags: ["Posts"],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "投稿詳細", content: { "application/json": { schema: postResponseSchema } } },
    404: commonErrors[404],
  },
});

registry.registerPath({
  method: "put",
  path: "/api/posts/{id}",
  summary: "投稿更新（本人のみ）",
  tags: ["Posts"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: postUpdateSchema } } },
  },
  responses: {
    200: { description: "更新後の投稿", content: { "application/json": { schema: postResponseSchema } } },
    400: commonErrors[400],
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
    409: { description: "他のリクエストによる更新と競合（version不一致）", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/posts/{id}",
  summary: "投稿削除（本人のみ）",
  tags: ["Posts"],
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "削除完了", content: { "application/json": { schema: messageResponseSchema } } },
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
  },
});

registry.registerPath({
  method: "get",
  path: "/api/posts/explore",
  summary: "探索フィード（検索・絞り込み用、認証不要）",
  tags: ["Posts"],
  request: {
    query: z.object({
      cursor: z.string().optional(),
      limit: z.string().optional(),
      sort: z.enum(["latest", "popular"]).optional(),
      category: z.string().optional(),
      location: z.string().optional(),
      q: z.string().optional(),
    }),
  },
  responses: {
    200: { description: "投稿一覧", content: { "application/json": { schema: postListResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/posts/portal",
  summary: "ホーム画面用ポータルフィード（認証不要）",
  tags: ["Posts"],
  responses: {
    200: {
      description: "人気・新着・エリア別・カテゴリ別まとめ",
      content: {
        "application/json": {
          schema: z.object({
            popular: z.array(postResponseSchema),
            latest: z.array(postResponseSchema),
            locations: z.array(z.object({ location: z.string(), count: z.number(), thumbnailUrl: z.string().nullable() })),
            categories: z.array(z.object({ category: z.string(), count: z.number() })),
            topRated: z.array(postResponseSchema),
          }),
        },
      },
    },
  },
});

// ─── mypage（継続取得API、GATE-22） ───
registry.registerPath({
  method: "get",
  path: "/api/mypage/wishlist",
  summary: "自分の行きたいリスト一覧（継続取得、本人のみ）",
  tags: ["Posts"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({ cursor: z.string().optional(), limit: z.string().optional() }),
  },
  responses: {
    200: { description: "投稿一覧", content: { "application/json": { schema: postListResponseSchema } } },
    401: commonErrors[401],
  },
});

registry.registerPath({
  method: "get",
  path: "/api/mypage/visited",
  summary: "自分の訪問済みリスト一覧（継続取得、本人のみ）",
  tags: ["Posts"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({ cursor: z.string().optional(), limit: z.string().optional() }),
  },
  responses: {
    200: { description: "投稿一覧", content: { "application/json": { schema: postListResponseSchema } } },
    401: commonErrors[401],
  },
});

// ─── likes / wishlist / visited ───
for (const [key, summary] of [
  ["like", "投稿へのいいねトグル"],
  ["wishlist", "投稿の行きたいトグル"],
  ["visited", "投稿の訪問済みトグル"],
] as const) {
  registry.registerPath({
    method: "post",
    path: `/api/posts/{id}/${key}`,
    summary,
    tags: ["Posts"],
    security: [{ [bearerAuth.name]: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: { description: "トグル結果", content: { "application/json": { schema: likeToggleResponseSchema } } },
      401: commonErrors[401],
      404: commonErrors[404],
    },
  });
}

// ─── comments ───
registry.registerPath({
  method: "get",
  path: "/api/posts/{id}/comments",
  summary: "投稿のコメント一覧",
  tags: ["Comments"],
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({ cursor: z.string().optional(), limit: z.string().optional() }),
  },
  responses: {
    200: { description: "コメント一覧", content: { "application/json": { schema: commentListResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/posts/{id}/comments",
  summary: "コメント投稿",
  tags: ["Comments"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: z.object({ body: z.string().min(1).max(2000) }) } } },
  },
  responses: {
    201: { description: "作成されたコメント", content: { "application/json": { schema: commentResponseSchema } } },
    400: commonErrors[400],
    401: commonErrors[401],
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/comments/{id}",
  summary: "コメント削除（自分のコメントのみ）",
  tags: ["Comments"],
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "削除完了", content: { "application/json": { schema: messageResponseSchema } } },
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
  },
});

// ─── notifications ───
registry.registerPath({
  method: "get",
  path: "/api/notifications",
  summary: "通知一覧取得（継続取得、既定limit=20・最大50）",
  tags: ["Notifications"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({ cursor: z.string().optional(), limit: z.string().optional() }),
  },
  responses: {
    200: { description: "通知一覧", content: { "application/json": { schema: notificationListResponseSchema } } },
    401: commonErrors[401],
  },
});

registry.registerPath({
  method: "get",
  path: "/api/notifications/unread-count",
  summary: "未読通知件数取得",
  tags: ["Notifications"],
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: { description: "未読件数", content: { "application/json": { schema: z.object({ count: z.number().int() }) } } },
    401: commonErrors[401],
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/notifications/{id}/read",
  summary: "通知を既読にする",
  tags: ["Notifications"],
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "既読完了", content: { "application/json": { schema: messageResponseSchema } } },
    401: commonErrors[401],
    404: commonErrors[404],
  },
});

// ─── users ───
registry.registerPath({
  method: "get",
  path: "/api/users/{id}",
  summary: "ユーザープロフィール取得（認証不要、email非公開）",
  tags: ["Users"],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "ユーザープロフィール", content: { "application/json": { schema: userProfileResponseSchema } } },
    404: commonErrors[404],
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/{id}/posts",
  summary: "指定ユーザーの投稿一覧（継続取得、認証不要）。マイページ「自分の投稿」タブ・公開プロフィールの投稿タブの両方で使用（GATE-22）",
  tags: ["Posts"],
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({
      cursor: z.string().optional(),
      limit: z.string().optional(),
      year: z.string().optional(),
    }),
  },
  responses: {
    200: { description: "投稿一覧", content: { "application/json": { schema: postListResponseSchema } } },
  },
});

registry.registerPath({
  method: "put",
  path: "/api/users/{id}",
  summary: "プロフィール編集（本人のみ）",
  tags: ["Users"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: userUpdateSchema } } },
  },
  responses: {
    200: { description: "更新後のユーザー情報", content: { "application/json": { schema: userResponseSchema } } },
    400: commonErrors[400],
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
    409: { description: "他のリクエストによる更新と競合（version不一致）", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/users/{id}/password",
  summary: "パスワード変更（本人のみ、現在のパスワード確認あり）",
  tags: ["Users"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: passwordChangeApiSchema } } },
  },
  responses: {
    200: { description: "変更結果", content: { "application/json": { schema: messageResponseSchema } } },
    400: commonErrors[400],
    401: commonErrors[401],
    403: commonErrors[403],
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/users/{id}/email",
  summary: "メールアドレス変更（本人のみ、現在のパスワード確認あり）",
  tags: ["Users"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: emailChangeSchema } } },
  },
  responses: {
    200: { description: "変更結果", content: { "application/json": { schema: messageResponseSchema } } },
    400: commonErrors[400],
    401: commonErrors[401],
    403: commonErrors[403],
    409: { description: "メールアドレス重複", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/me/theme",
  summary: "ログイン直後・ログアウト直前のテーマ設定同期（DB優先、DBがnullならCookie値をDBへ昇格）",
  tags: ["Users"],
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: { description: "同期後のテーマ設定", content: { "application/json": { schema: themeResponseSchema } } },
    401: commonErrors[401],
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/me/theme",
  summary: "テーマ設定の明示的な変更（本人のみ）",
  tags: ["Users"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: { content: { "application/json": { schema: themeUpdateSchema } } },
  },
  responses: {
    200: { description: "変更後のテーマ設定", content: { "application/json": { schema: themeResponseSchema } } },
    400: commonErrors[400],
    401: commonErrors[401],
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/{id}/follow",
  summary: "フォロー／アンフォロー トグル",
  tags: ["Users"],
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "トグル結果", content: { "application/json": { schema: followToggleResponseSchema } } },
    400: commonErrors[400],
    401: commonErrors[401],
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/{id}/comments",
  summary: "投稿したコメント一覧を継続取得（cursor/limit対応、既定limit=20・最大50。GATE-22種類B、2026-07-30新設）",
  tags: ["Users"],
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({ cursor: z.string().optional(), limit: z.string().optional() }),
  },
  responses: {
    200: { description: "コメント一覧", content: { "application/json": { schema: authorCommentListResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/{id}/comments-received",
  summary: "自分の投稿に届いたコメント一覧を継続取得（本人限定、cursor/limit対応。GATE-22種類B、2026-07-30新設）",
  tags: ["Users"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({ cursor: z.string().optional(), limit: z.string().optional() }),
  },
  responses: {
    200: { description: "コメント一覧", content: { "application/json": { schema: authorCommentListResponseSchema } } },
    401: commonErrors[401],
    403: commonErrors[403],
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/{id}/followers",
  summary: "フォロワー一覧を継続取得（cursor/limit対応、既定limit=20・最大50。GATE-22種類B、2026-07-30新設）",
  tags: ["Users"],
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({ cursor: z.string().optional(), limit: z.string().optional() }),
  },
  responses: {
    200: { description: "フォロワー一覧", content: { "application/json": { schema: followUserListResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/{id}/following",
  summary: "フォロー中一覧を継続取得（cursor/limit対応、既定limit=20・最大50。GATE-22種類B、2026-07-30新設）",
  tags: ["Users"],
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({ cursor: z.string().optional(), limit: z.string().optional() }),
  },
  responses: {
    200: { description: "フォロー中一覧", content: { "application/json": { schema: followUserListResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/search",
  summary: "ユーザー検索（ニックネーム部分一致・qを省略した場合は全ユーザーが対象）。結果はcursor順（ID昇順）で返し、ログイン中の場合は自分自身を除外",
  tags: ["Users"],
  request: {
    query: z.object({
      q: z.string().optional(),
      cursor: z.string().optional(),
      limit: z.string().optional(),
    }),
  },
  responses: {
    200: { description: "ユーザー一覧", content: { "application/json": { schema: userListResponseSchema } } },
  },
});

// ─── upload ───
registry.registerPath({
  method: "post",
  path: "/api/upload/post",
  summary: "投稿画像アップロード",
  tags: ["Upload"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({ file: z.string().openapi({ format: "binary" }) }),
        },
      },
    },
  },
  responses: {
    200: { description: "アップロード結果", content: { "application/json": { schema: uploadResponseSchema } } },
    400: commonErrors[400],
    401: commonErrors[401],
  },
});

registry.registerPath({
  method: "post",
  path: "/api/upload/avatar",
  summary: "プロフィール画像アップロード（jpeg/png/webp・5MB以内）",
  tags: ["Upload"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({ file: z.string().openapi({ format: "binary" }) }),
        },
      },
    },
  },
  responses: {
    200: { description: "アップロード結果", content: { "application/json": { schema: uploadResponseSchema } } },
    400: commonErrors[400],
    401: commonErrors[401],
  },
});

// ─── plans ───
registry.registerPath({
  method: "get",
  path: "/api/plans",
  summary: "自分のプラン一覧取得",
  tags: ["Plans"],
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: { description: "プラン一覧", content: { "application/json": { schema: planListResponseSchema } } },
    401: commonErrors[401],
  },
});

registry.registerPath({
  method: "get",
  path: "/api/mypage/plans/active",
  summary: "進行中プラン一覧を継続取得（本人限定、cursor/limit対応、既定limit=20・最大50。GATE-22種類B、2026-07-30新設）",
  tags: ["Plans"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({ cursor: z.string().optional(), limit: z.string().optional() }),
  },
  responses: {
    200: { description: "進行中プラン一覧", content: { "application/json": { schema: paginatedPlanListResponseSchema } } },
    401: commonErrors[401],
  },
});

registry.registerPath({
  method: "get",
  path: "/api/mypage/plans/completed",
  summary: "完了済みプラン一覧を継続取得（本人限定、year/cursor/limit対応、既定limit=20・最大50。GATE-22種類B、2026-07-30新設）",
  tags: ["Plans"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({ year: z.string().optional(), cursor: z.string().optional(), limit: z.string().optional() }),
  },
  responses: {
    200: { description: "完了済みプラン一覧", content: { "application/json": { schema: paginatedPlanListResponseSchema } } },
    401: commonErrors[401],
  },
});

registry.registerPath({
  method: "post",
  path: "/api/plans",
  summary: "プラン作成",
  tags: ["Plans"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: { content: { "application/json": { schema: planSchema } } },
  },
  responses: {
    201: { description: "作成されたプラン", content: { "application/json": { schema: planResponseSchema } } },
    400: commonErrors[400],
    401: commonErrors[401],
  },
});

registry.registerPath({
  method: "get",
  path: "/api/plans/{id}",
  summary: "プラン詳細取得（本人のみ）",
  tags: ["Plans"],
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "プラン詳細", content: { "application/json": { schema: planDetailResponseSchema } } },
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
  },
});

registry.registerPath({
  method: "put",
  path: "/api/plans/{id}",
  summary: "プラン更新（本人のみ）。完了状態（completed）もここに統合されており、PATCH /complete相当の呼び出しは不要（GATE-21）",
  tags: ["Plans"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: planUpdateSchema } } },
  },
  responses: {
    200: { description: "更新されたプラン", content: { "application/json": { schema: planResponseSchema } } },
    400: commonErrors[400],
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
    409: { description: "他のリクエストによる更新と競合（version不一致）", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/plans/{id}",
  summary: "プラン削除（本人のみ）",
  tags: ["Plans"],
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "削除結果", content: { "application/json": { schema: messageResponseSchema } } },
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/plans/{id}/complete",
  summary: "完了フラグの設定（本人のみ）。目標状態completedとversionを受け取る冪等な更新（旧トグル仕様から変更）",
  tags: ["Plans"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({ completed: z.boolean(), version: z.number().int().nonnegative() }),
        },
      },
    },
  },
  responses: {
    200: { description: "更新されたプラン", content: { "application/json": { schema: planResponseSchema } } },
    400: commonErrors[400],
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
    409: { description: "他のリクエストによる更新と競合（version不一致）", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

// ─── stats ───
registry.registerPath({
  method: "get",
  path: "/api/stats/years",
  summary: "投稿がある年一覧取得",
  tags: ["Stats"],
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: { description: "年一覧", content: { "application/json": { schema: statsYearsResponseSchema } } },
    401: commonErrors[401],
  },
});

registry.registerPath({
  method: "get",
  path: "/api/stats",
  summary: "年別統計データ取得",
  tags: ["Stats"],
  security: [{ [bearerAuth.name]: [] }],
  request: { query: z.object({ year: z.string().describe('年（例: "2026"）または "all"（全期間）') }) },
  responses: {
    200: { description: "年別統計", content: { "application/json": { schema: statsResponseSchema } } },
    400: commonErrors[400],
    401: commonErrors[401],
  },
});

// ─── auth ───
registry.registerPath({
  method: "post",
  path: "/api/auth/signup",
  summary: "サインアップ",
  tags: ["Auth"],
  request: { body: { content: { "application/json": { schema: signupApiSchema } } } },
  responses: {
    201: { description: "作成されたユーザー", content: { "application/json": { schema: userResponseSchema } } },
    400: commonErrors[400],
    409: { description: "メールアドレス重複", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.register("Login", loginSchema);

// ─── health ───
registry.registerPath({
  method: "get",
  path: "/api/health",
  summary: "ヘルスチェック（認証不要。k6の疎通確認・Phase 6のNginx/PM2ヘルスチェックから使用）",
  tags: ["Health"],
  responses: {
    200: { description: "正常", content: { "application/json": { schema: z.object({ status: z.literal("ok") }) } } },
    503: { description: "DB接続不可", content: { "application/json": { schema: z.object({ status: z.literal("error") }) } } },
  },
});

  cachedRegistry = registry;
  return registry;
}

export function generateOpenApiDocument() {
  const registry = buildRegistry();
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "TripDiary API",
      version: "1.0.0",
      description: "TripDiary バックエンドAPI仕様（Zodスキーマから自動生成）",
    },
    servers: [{ url: "/" }],
  });
}
