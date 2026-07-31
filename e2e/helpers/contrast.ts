import type { Locator } from "@playwright/test";

/**
 * WCAG準拠のコントラスト比を、要素のgetComputedStyleから計算する。
 * 背景が透明な場合は祖先要素を遡り、半透明な背景は下地とアルファ合成して実効背景色を求める。
 * getComputedStyleはブラウザ内でしか評価できないため、ロジック全体をlocator.evaluateへ渡す。
 */
export async function getContrastRatio(locator: Locator): Promise<number> {
  return locator.evaluate((el) => {
    // getComputedStyleは、Tailwind v4の広色域パレット（zinc-400等）に対して
    // `rgb()`ではなく`lab(...)`/`oklch(...)`等の現代的なCSS色関数を返すことがある。
    // 独自にパースするとこれらの形式を取りこぼし誤って不透明な黒(0,0,0,0)扱いになるため、
    // Canvas 2Dにfillstyleとして渡し、getImageDataで常に8bit sRGBへ正規化させる
    // （Canvasは任意の妥当なCSS <color> をパースできるため、形式を問わず頑健）。
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    function parseColor(value: string): [number, number, number, number] {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    }

    function toLinear(c: number): number {
      const cs = c / 255;
      return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
    }

    function luminance([r, g, b]: [number, number, number]): number {
      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    }

    function effectiveBackground(node: Element | null): [number, number, number] {
      let current: Element | null = node;
      while (current) {
        const [r, g, b, a] = parseColor(getComputedStyle(current).backgroundColor);
        if (a > 0) {
          if (a >= 0.999) return [r, g, b];
          const behind = effectiveBackground(current.parentElement);
          return [r * a + behind[0] * (1 - a), g * a + behind[1] * (1 - a), b * a + behind[2] * (1 - a)];
        }
        current = current.parentElement;
      }
      // どの祖先にも不透明な背景が見つからない場合はページ既定の白とみなす
      return [255, 255, 255];
    }

    const [fr, fg, fb] = parseColor(getComputedStyle(el).color);
    const bg = effectiveBackground(el);

    const l1 = luminance([fr, fg, fb]);
    const l2 = luminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  });
}

/** WCAG 2.1の通常テキスト基準（4.5:1）。 */
export const WCAG_NORMAL_TEXT_MIN_CONTRAST = 4.5;
/** WCAG 2.1の大きいテキスト・太字の基準（3:1）。ボタンラベル等の判定に使う。 */
export const WCAG_LARGE_TEXT_MIN_CONTRAST = 3;
