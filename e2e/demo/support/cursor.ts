import type { Page } from "@playwright/test";

// デモ動画は無音のため、クリック対象が分かるようマウスカーソルを疑似的に描画する
// （page.hover()は実際にmousemoveイベントを発火するため、fill()前にhover()を挟む
// 各specの設計がそのままカーソル追従に効く）。全spec（00〜05）の先頭で呼ぶ。
export async function installPseudoCursor(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const cursor = document.createElement("div");
    cursor.style.cssText =
      "position:fixed;width:16px;height:16px;border-radius:50%;background:rgba(255,0,0,.6);" +
      "pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%);transition:left .05s,top .05s;";
    document.addEventListener("DOMContentLoaded", () => document.body.appendChild(cursor));
    document.addEventListener("mousemove", (e) => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
    });
  });
}
