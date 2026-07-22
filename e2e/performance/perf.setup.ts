import { test as setup } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { STORAGE_STATE_PATH, USERS_CSV_PATH } from "./constants";

setup("perfユーザーでログインしてstorageStateを保存する", async ({ page }) => {
  // performance/seed.ts が生成するusers.csv（id,email,password,nickname）の先頭ユーザーを使う。
  // シード前提（5-B）のため、ファイルが無ければ即座に失敗させる（test.skipは使わない）。
  const csv = fs.readFileSync(USERS_CSV_PATH, "utf-8");
  const [, firstDataLine] = csv.split("\n");
  const [, email, password] = firstDataLine.split(",");

  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/");

  fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
