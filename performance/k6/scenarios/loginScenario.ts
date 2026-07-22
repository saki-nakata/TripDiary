import { sleep } from "k6";
import { login } from "../helpers/auth.ts";
import { userForCurrentVu } from "../helpers/csv.ts";

// ログイン専用シナリオ。bcryptコスト12のCPU負荷を専用のendpoint:loginタグで独立して計測する
// （フィード系と混ぜるとログインの重さが他エンドポイントのp95を汚染するため）。
export function loginScenario(): void {
  const user = userForCurrentVu();
  login(user.email, user.password);
  sleep(1);
}
