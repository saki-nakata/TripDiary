import { describe, it, expect } from "vitest";
import { buildSpotRecordHref } from "@/lib/plan-spot-link";
import type { PlanSpotEntry } from "@/types/plan";

const basePost = {
  id: "post-1",
  title: "スポットA",
  location: "東京都",
  category: "観光",
  rating: null,
  lat: null,
  lng: null,
  authorId: "user-1",
  images: [{ url: "https://bucket.s3.ap-northeast-1.amazonaws.com/uploads/user-1/img.jpg" }],
};

function makeSpot(overrides: Partial<typeof basePost> = {}): PlanSpotEntry {
  return {
    displayOrder: 0,
    freeTitle: null,
    freeLocation: null,
    freeCategory: null,
    post: { ...basePost, ...overrides },
  };
}

describe("buildSpotRecordHref", () => {
  it("自分が作成した投稿のスポットはpresetImageUrlを含む", () => {
    const spot = makeSpot({ authorId: "user-1" });
    const href = buildSpotRecordHref("plan-1", spot, "user-1");
    expect(href).toContain("presetImageUrl=");
    expect(href).toContain(encodeURIComponent(basePost.images[0].url));
  });

  it("他ユーザーが作成した投稿のスポットはpresetImageUrlを含まないがタイトル等は維持される", () => {
    const spot = makeSpot({ authorId: "other-user" });
    const href = buildSpotRecordHref("plan-1", spot, "user-1");
    expect(href).not.toContain("presetImageUrl=");
    expect(href).toContain(`presetTitle=${encodeURIComponent(basePost.title)}`);
    expect(href).toContain(`presetLocation=${encodeURIComponent(basePost.location)}`);
    expect(href).toContain(`presetCategory=${encodeURIComponent(basePost.category)}`);
  });

  it("自由入力スポットはpost自体が無いためpresetImageUrlを含まない", () => {
    const spot: PlanSpotEntry = {
      displayOrder: 0,
      post: null,
      freeTitle: "自由入力スポット",
      freeLocation: "大阪府",
      freeCategory: "グルメ",
    };
    const href = buildSpotRecordHref("plan-1", spot, "user-1");
    expect(href).not.toContain("presetImageUrl=");
    expect(href).toContain(`presetTitle=${encodeURIComponent("自由入力スポット")}`);
  });
});
