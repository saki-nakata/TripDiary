import "./zod-setup";
import { z } from "zod";
import { CATEGORIES, LOCATIONS } from "@/lib/constants";

export const errorResponseSchema = z
  .object({
    error: z.string(),
  })
  .openapi("ErrorResponse");

export const validationErrorResponseSchema = z
  .object({
    error: z.record(z.string(), z.array(z.string())),
  })
  .openapi("ValidationErrorResponse");

const authorSchema = z
  .object({
    id: z.string(),
    nickname: z.string(),
    image: z.string().nullable(),
  })
  .openapi("Author");

const postImageSchema = z
  .object({
    id: z.string(),
    url: z.string(),
    displayOrder: z.number().int(),
  })
  .openapi("PostImage");

export const postResponseSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    body: z.string(),
    location: z.enum(LOCATIONS),
    category: z.enum(CATEGORIES).nullable(),
    rating: z.number().int().min(1).max(5).nullable(),
    visitedAt: z.string(),
    cost: z.number().int().nullable(),
    costBreakdown: z.array(z.object({ label: z.string(), amount: z.number().int() })).nullable(),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    planId: z.string().nullable(),
    authorId: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    author: authorSchema,
    images: z.array(postImageSchema),
    _count: z.object({ likes: z.number().int(), comments: z.number().int() }),
    isLiked: z.boolean().optional(),
    isWishlisted: z.boolean().optional(),
    isVisited: z.boolean().optional(),
  })
  .openapi("Post");

export const postListResponseSchema = z
  .object({
    posts: z.array(postResponseSchema),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  })
  .openapi("PostList");

export const commentResponseSchema = z
  .object({
    id: z.string(),
    body: z.string(),
    postId: z.string(),
    authorId: z.string(),
    createdAt: z.string(),
    author: authorSchema,
  })
  .openapi("Comment");

export const commentListResponseSchema = z
  .object({
    comments: z.array(commentResponseSchema),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  })
  .openapi("CommentList");

export const likeToggleResponseSchema = z
  .object({
    liked: z.boolean(),
  })
  .openapi("LikeToggleResult");

export const notificationResponseSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    isRead: z.boolean(),
    createdAt: z.string(),
  })
  .openapi("Notification");

export const notificationListResponseSchema = z
  .object({
    notifications: z.array(notificationResponseSchema),
  })
  .openapi("NotificationList");

export const uploadResponseSchema = z
  .object({
    url: z.string(),
  })
  .openapi("UploadResult");

export const userResponseSchema = z
  .object({
    id: z.string(),
    nickname: z.string(),
    email: z.string().email(),
  })
  .openapi("User");

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi("MessageResponse");
