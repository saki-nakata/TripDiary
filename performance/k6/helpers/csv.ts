import { SharedArray } from "k6/data";
import exec from "k6/execution";

export interface PerfUser {
  id: string;
  email: string;
  password: string;
  nickname: string;
}

// performance/seed.ts が生成する users.csv（id,email,password,nickname）を読み込む。
// SharedArray はメインgoroutineで一度だけパースし、全VUで読み取り専用に共有する。
export const users = new SharedArray<PerfUser>("perf-users", () => {
  const lines = open("../data/users.csv")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const [, ...rows] = lines; // ヘッダー行（id,email,password,nickname）を除く
  return rows.map((line) => {
    const [id, email, password, nickname] = line.split(",");
    return { id, email, password, nickname };
  });
});

// scenarios を複数に分割した場合、exec.vu.idInTest がテスト全体で連番になるかscenarioごとに
// 振り直されるかはk6のバージョン・executor構成に依存する。後者だと特定ユーザーへの
// アクセスが偏るが、実害は「一部ユーザーへの書き込み集中」程度に留まる。
export function userForCurrentVu(): PerfUser {
  const index = (exec.vu.idInTest - 1) % users.length;
  return users[index];
}

// フォロートグル・他ユーザーのプロフィール閲覧の対象。自分自身を誤って対象にしないよう、
// 名簿上「次のユーザー」を決定的に選ぶ（users.length >= 2 が前提）。
export function otherUserForCurrentVu(): PerfUser {
  const selfIndex = (exec.vu.idInTest - 1) % users.length;
  const otherIndex = (selfIndex + 1) % users.length;
  return users[otherIndex];
}

export const samplePostIds: {
  mostLikedPostId: string;
  mostLikedPostAuthorId: string | null;
  samplePostId: string;
} = JSON.parse(open("../data/sample-post-ids.json"));
