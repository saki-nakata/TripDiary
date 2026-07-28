import { describe, it, expect, vi, beforeEach } from "vitest";

const { sendMock, S3ClientMock } = vi.hoisted(() => {
  const sendMock = vi.fn();
  const S3ClientMock = vi.fn(function S3Client() {
    return { send: sendMock };
  });
  return { sendMock, S3ClientMock };
});

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: S3ClientMock,
  PutObjectCommand: vi.fn(function PutObjectCommand(this: { input: unknown }, input: unknown) {
    this.input = input;
  }),
  DeleteObjectsCommand: vi.fn(function DeleteObjectsCommand(this: { input: unknown }, input: unknown) {
    this.input = input;
  }),
}));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/request-context", () => ({
  getRequestContext: vi.fn(() => undefined),
}));

import { logger } from "@/lib/logger";
import { getRequestContext } from "@/lib/request-context";
import { DeleteObjectsCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = "test-bucket";
const REGION = "ap-northeast-1";
const HOSTNAME = `${BUCKET}.s3.${REGION}.amazonaws.com`;

function ownedUrl(userId: string, filename = "abc.jpg") {
  return `https://${HOSTNAME}/uploads/${userId}/${filename}`;
}

describe("s3.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AWS_S3_BUCKET_NAME = BUCKET;
    process.env.AWS_REGION = REGION;
    sendMock.mockReset();
  });

  describe("S3Clientの遅延生成", () => {
    it("import直後はS3Clientが生成されず_初回のsend系呼び出しで生成されること", async () => {
      vi.resetModules();
      const s3 = await import("@/lib/s3");
      expect(S3ClientMock).not.toHaveBeenCalled();

      sendMock.mockResolvedValue({});
      await s3.uploadObject("uploads/user-1/abc.jpg", Buffer.from("x"), "image/jpeg");

      expect(S3ClientMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("uploadObject", () => {
    it("ContentTypeを含めてPutObjectCommandを呼び出し_正しいURLを返す", async () => {
      const { uploadObject } = await import("@/lib/s3");
      sendMock.mockResolvedValue({});

      const url = await uploadObject("uploads/user-1/abc.jpg", Buffer.from("x"), "image/jpeg");

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: BUCKET,
        Key: "uploads/user-1/abc.jpg",
        Body: Buffer.from("x"),
        ContentType: "image/jpeg",
      });
      expect(url).toBe(`https://${HOSTNAME}/uploads/user-1/abc.jpg`);
    });

    it("AWS_REGION未設定_明確なメッセージのErrorを投げてsendは呼ばれない", async () => {
      delete process.env.AWS_REGION;
      const { uploadObject } = await import("@/lib/s3");

      await expect(uploadObject("uploads/user-1/abc.jpg", Buffer.from("x"), "image/jpeg")).rejects.toThrow(
        "S3設定"
      );
      expect(sendMock).not.toHaveBeenCalled();
    });

    it("AWS_S3_BUCKET_NAME未設定_明確なメッセージのErrorを投げてsendは呼ばれない", async () => {
      delete process.env.AWS_S3_BUCKET_NAME;
      const { uploadObject } = await import("@/lib/s3");

      await expect(uploadObject("uploads/user-1/abc.jpg", Buffer.from("x"), "image/jpeg")).rejects.toThrow(
        "S3設定"
      );
      expect(sendMock).not.toHaveBeenCalled();
    });
  });

  describe("extractKeyFromUrl", () => {
    it("正常なバケットURL_キーを返す", async () => {
      const { extractKeyFromUrl } = await import("@/lib/s3");
      expect(extractKeyFromUrl(`https://${HOSTNAME}/uploads/user-1/abc.jpg`)).toBe("uploads/user-1/abc.jpg");
    });

    it("percent-encodingを含むパス_デコードしたキーを返す", async () => {
      const { extractKeyFromUrl } = await import("@/lib/s3");
      expect(extractKeyFromUrl(`https://${HOSTNAME}/uploads/user-1/a%20b.jpg`)).toBe("uploads/user-1/a b.jpg");
    });

    it("ホスト名不一致_nullを返しwarnログが出る", async () => {
      const { extractKeyFromUrl } = await import("@/lib/s3");
      expect(extractKeyFromUrl("https://evil.example.com/uploads/user-1/abc.jpg")).toBeNull();
      expect(logger.warn).toHaveBeenCalled();
    });

    it("uploads_で始まらないパス_nullを返す", async () => {
      const { extractKeyFromUrl } = await import("@/lib/s3");
      expect(extractKeyFromUrl(`https://${HOSTNAME}/other/user-1/abc.jpg`)).toBeNull();
    });

    it("URLとして解析できない文字列_nullを返す", async () => {
      const { extractKeyFromUrl } = await import("@/lib/s3");
      expect(extractKeyFromUrl("not-a-url")).toBeNull();
    });

    it("不正なpercent-encoding_nullを返す", async () => {
      const { extractKeyFromUrl } = await import("@/lib/s3");
      expect(extractKeyFromUrl(`https://${HOSTNAME}/uploads/user-1/%E0%A4%A`)).toBeNull();
    });
  });

  describe("isOwnedS3Url", () => {
    it("自分のprefixのURL_trueを返す", async () => {
      const { isOwnedS3Url } = await import("@/lib/s3");
      expect(isOwnedS3Url(ownedUrl("user-1"), "user-1")).toBe(true);
    });

    it("他人のprefixのURL_falseを返す", async () => {
      const { isOwnedS3Url } = await import("@/lib/s3");
      expect(isOwnedS3Url(ownedUrl("user-2"), "user-1")).toBe(false);
    });

    it("解析不能なURL_falseを返す", async () => {
      const { isOwnedS3Url } = await import("@/lib/s3");
      expect(isOwnedS3Url("not-a-url", "user-1")).toBe(false);
    });
  });

  describe("deleteOwnedObjectsByUrl", () => {
    it("所有者prefix外のURLは削除対象から除外される", async () => {
      const { deleteOwnedObjectsByUrl } = await import("@/lib/s3");
      sendMock.mockResolvedValue({});

      await deleteOwnedObjectsByUrl([ownedUrl("user-1", "a.jpg"), ownedUrl("user-2", "b.jpg")], "user-1");

      expect(DeleteObjectsCommand).toHaveBeenCalledWith({
        Bucket: BUCKET,
        Delete: { Objects: [{ Key: "uploads/user-1/a.jpg" }] },
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it("全件所有者外_S3Client.sendを呼ばない", async () => {
      const { deleteOwnedObjectsByUrl } = await import("@/lib/s3");

      await deleteOwnedObjectsByUrl([ownedUrl("user-2", "b.jpg")], "user-1");

      expect(sendMock).not.toHaveBeenCalled();
    });

    it("空配列_S3Client.sendを呼ばない", async () => {
      const { deleteOwnedObjectsByUrl } = await import("@/lib/s3");

      await deleteOwnedObjectsByUrl([], "user-1");

      expect(sendMock).not.toHaveBeenCalled();
    });

    it("send自体がrejectしても_deleteOwnedObjectsByUrlはresolveしlogger.errorが呼ばれる", async () => {
      const { deleteOwnedObjectsByUrl } = await import("@/lib/s3");
      sendMock.mockRejectedValue(new Error("network error"));

      await expect(deleteOwnedObjectsByUrl([ownedUrl("user-1")], "user-1")).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });

    it("レスポンスにErrorsが含まれる場合_各要素についてlogger.errorが呼ばれる", async () => {
      const { deleteOwnedObjectsByUrl } = await import("@/lib/s3");
      sendMock.mockResolvedValue({
        Errors: [{ Key: "uploads/user-1/a.jpg", Code: "AccessDenied", Message: "denied" }],
      });

      await deleteOwnedObjectsByUrl([ownedUrl("user-1", "a.jpg")], "user-1");

      expect(logger.error).toHaveBeenCalledWith(
        { ownerUserId: "user-1", key: "uploads/user-1/a.jpg", code: "AccessDenied", message: "denied" },
        "S3オブジェクト削除に一部失敗"
      );
    });

    // ─── アクセスログとの相関確認（requestId/method/path） ───
    it("send自体がrejectした場合_内部の失敗ログにrequestContextが含まれる", async () => {
      vi.mocked(getRequestContext).mockReturnValue({
        requestId: "req-1",
        method: "DELETE",
        path: "/api/posts/post-1",
      });
      const { deleteOwnedObjectsByUrl } = await import("@/lib/s3");
      sendMock.mockRejectedValue(new Error("network error"));

      await deleteOwnedObjectsByUrl([ownedUrl("user-1")], "user-1");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: "req-1", method: "DELETE", path: "/api/posts/post-1" }),
        "S3オブジェクト削除に失敗"
      );
    });

    it("パーシャル失敗ログにもrequestContextが含まれる", async () => {
      vi.mocked(getRequestContext).mockReturnValue({
        requestId: "req-2",
        method: "PUT",
        path: "/api/users/user-1",
      });
      const { deleteOwnedObjectsByUrl } = await import("@/lib/s3");
      sendMock.mockResolvedValue({
        Errors: [{ Key: "uploads/user-1/a.jpg", Code: "AccessDenied", Message: "denied" }],
      });

      await deleteOwnedObjectsByUrl([ownedUrl("user-1", "a.jpg")], "user-1");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: "req-2", method: "PUT", path: "/api/users/user-1" }),
        "S3オブジェクト削除に一部失敗"
      );
    });
  });
});
