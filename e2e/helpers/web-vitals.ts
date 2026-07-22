import { Page } from "@playwright/test";

export type WebVitals = {
  ttfb: number;
  fcp: number;
  lcp: number;
  cls: number;
  domContentLoaded: number;
  loadComplete: number;
};

export async function collectWebVitals(page: Page): Promise<Partial<WebVitals>> {
  // PerformanceObserver を先に登録してから navigate する必要があるため、
  // このヘルパーはページ遷移後に呼び出し、少し待機してから収集する
  return page.evaluate(() => {
    return new Promise<Partial<WebVitals>>((resolve) => {
      const vitals: Partial<WebVitals> = {};

      // Navigation Timing (同期的に取得可能)
      const navEntries = performance.getEntriesByType("navigation");
      if (navEntries.length > 0) {
        const nav = navEntries[0] as PerformanceNavigationTiming;
        vitals.ttfb = Math.round(nav.responseStart - nav.requestStart);
        vitals.domContentLoaded = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
        vitals.loadComplete = Math.round(nav.loadEventEnd - nav.startTime);
      }

      // FCP は navigation 完了直後に Performance Timeline へ反映されないことがあるため、
      // getEntriesByName の一回読みではなく buffered observer でも取得する。
      const fcpEntries = performance.getEntriesByName("first-contentful-paint");
      if (fcpEntries.length > 0) vitals.fcp = Math.round(fcpEntries[0].startTime);
      const paintObserver = new PerformanceObserver((list) => {
        const fcpEntry = list.getEntries().find((entry) => entry.name === "first-contentful-paint");
        if (fcpEntry) vitals.fcp = Math.round(fcpEntry.startTime);
      });
      try {
        paintObserver.observe({ type: "paint", buffered: true });
      } catch {
        // Paint Timing 未サポートブラウザ
      }

      // LCP (buffered)
      let lcp = 0;
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          lcp = Math.round(entries[entries.length - 1].startTime);
        }
      });
      try {
        lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      } catch {
        // LCP 未サポートブラウザ
      }

      // CLS (buffered)
      let cls = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // hadRecentInput が false のシフトのみ累積
          if (!(entry as PerformanceEntry & { hadRecentInput: boolean }).hadRecentInput) {
            cls += (entry as PerformanceEntry & { value: number }).value;
          }
        }
      });
      try {
        clsObserver.observe({ type: "layout-shift", buffered: true });
      } catch {
        // CLS 未サポートブラウザ
      }

      // 3秒後に収集（LCP / CLS が確定するのを待つ）
      setTimeout(() => {
        lcpObserver.disconnect();
        clsObserver.disconnect();
        paintObserver.disconnect();
        if (lcp > 0) vitals.lcp = lcp;
        vitals.cls = Math.round(cls * 1000) / 1000;
        resolve(vitals);
      }, 3000);
    });
  });
}

export function assertWebVitals(
  vitals: Partial<WebVitals>,
  thresholds: Partial<Record<keyof WebVitals, number>>
) {
  for (const [key, limit] of Object.entries(thresholds) as [keyof WebVitals, number][]) {
    const value = vitals[key];
    // TimeLineの実装は値がundefinedの場合に黙って合格扱いにしていた（LCP取得失敗が偽陰性になる不具合）。
    // 必須メトリクス（呼び出し側がthresholdsに指定したもの＝ttfb/lcp等）は欠損自体を失敗にする。
    if (value === undefined) {
      throw new Error(`[WebVitals] ${key} が取得できませんでした（未定義）`);
    }
    if (value > limit) {
      throw new Error(`[WebVitals] ${key} = ${value}ms が閾値 ${limit}ms を超えています`);
    }
  }
}
