import { describe, expect, it } from "vitest";
import { peakWorkloadVUs } from "./peak-vus";

describe("peakWorkloadVUs", () => {
  it("login用の補助VUを除外する", () => {
    expect(peakWorkloadVUs({ login: { vus: 1 }, steady: { vus: 10 } })).toBe(10);
  });

  it("ランプの到達VUを定数VUと比較する", () => {
    expect(peakWorkloadVUs({ spike: { stages: [{ target: 40 }, { target: 60 }] }, cooldown: { vus: 5 } })).toBe(60);
  });

  it("業務シナリオがない場合は0を返す", () => {
    expect(peakWorkloadVUs({ login: { vus: 1 } })).toBe(0);
  });
});
