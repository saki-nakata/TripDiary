import { describe, it, expect, afterEach } from "vitest";
import { getBucketHostname } from "@/lib/s3-url";

describe("getBucketHostname", () => {
  const originalBucket = process.env.AWS_S3_BUCKET_NAME;
  const originalRegion = process.env.AWS_REGION;

  afterEach(() => {
    if (originalBucket === undefined) delete process.env.AWS_S3_BUCKET_NAME;
    else process.env.AWS_S3_BUCKET_NAME = originalBucket;
    if (originalRegion === undefined) delete process.env.AWS_REGION;
    else process.env.AWS_REGION = originalRegion;
  });

  it("bucket_region両方設定済み_バーチャルホスト形式のホスト名を返す", () => {
    process.env.AWS_S3_BUCKET_NAME = "my-bucket";
    process.env.AWS_REGION = "ap-northeast-1";

    expect(getBucketHostname()).toBe("my-bucket.s3.ap-northeast-1.amazonaws.com");
  });

  it("bucket未設定_undefinedを返す", () => {
    delete process.env.AWS_S3_BUCKET_NAME;
    process.env.AWS_REGION = "ap-northeast-1";

    expect(getBucketHostname()).toBeUndefined();
  });

  it("region未設定_undefinedを返す", () => {
    process.env.AWS_S3_BUCKET_NAME = "my-bucket";
    delete process.env.AWS_REGION;

    expect(getBucketHostname()).toBeUndefined();
  });

  it("両方未設定_undefinedを返す", () => {
    delete process.env.AWS_S3_BUCKET_NAME;
    delete process.env.AWS_REGION;

    expect(getBucketHostname()).toBeUndefined();
  });
});
