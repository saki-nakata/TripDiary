import "./zod-setup";
import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { postSchema } from "@/lib/validations/post";
import { signupApiSchema, loginSchema } from "@/lib/validations/auth";
import {
  errorResponseSchema,
  validationErrorResponseSchema,
  postResponseSchema,
  postListResponseSchema,
  commentResponseSchema,
  commentListResponseSchema,
  likeToggleResponseSchema,
  notificationListResponseSchema,
  uploadResponseSchema,
  userResponseSchema,
  messageResponseSchema,
} from "./schemas";

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
    body: { content: { "application/json": { schema: postSchema } } },
  },
  responses: {
    200: { description: "更新後の投稿", content: { "application/json": { schema: postResponseSchema } } },
    400: commonErrors[400],
    401: commonErrors[401],
    403: commonErrors[403],
    404: commonErrors[404],
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
  summary: "通知一覧取得",
  tags: ["Notifications"],
  security: [{ [bearerAuth.name]: [] }],
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

export function generateOpenApiDocument() {
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
