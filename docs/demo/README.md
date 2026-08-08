# デモ動画の撮影記録（Phase 6-C）

README本体の「デモ動画」節に埋め込まれている`.mp4`5本の撮影記録。撮影手順・スクリプト本体は`e2e/demo/`を参照。

## 撮影日・対象

- 撮影日: 2026-08-08
- 対象: 本番環境（http://54.248.13.248 ）、常設デモアカウント（`seed-demo-user` / `demo@tripdiary.example`）
- 撮影対象投稿（`DEMO_TARGET_POST_ID`）: `seed-post-g-008`（撮影直前に本番の探索ポータルの人気枠先頭に表示されていることを確認）
- フォロー対象（`DEMO_FOLLOW_TARGET_NICKNAME`）: `旅人05`

## 実行結果

`pnpm demo:record`（`demo-login`→`demo`・`demo-mobile`の依存関係経由）を1回実行し、6ファイル（公開動画5本）すべて一発成功。撮り直しは発生しなかった。

| ファイル | 内容 | 実測時間 |
|---|---|---|
| `00-auth.setup.ts` | ログイン（storageState保存、副作用なし） | 12.0s |
| `01-feed-engage.demo.spec.ts` | 閲覧・いいね・行きたい・コメント | 21.5s |
| `02-post-create.demo.spec.ts` | 投稿する（地図・複数枚画像） | 26.9s |
| `03-social.demo.spec.ts` | つながる（通知・検索・フォロー・TabiScore） | 19.3s |
| `04-record-and-reflect.demo.spec.ts` | 記録と振り返り（プラン・レポート・地図・テーマ） | 44.9s |
| `05-mobile.demo.spec.ts` | モバイル（未ログイン→ログイン後の長押し） | 26.9s |

## 動画ファイルサイズ（変換後、`docs/demo/*.mp4`）

`00`と`01`の`.webm`はffmpeg concatデマクサで連結してから変換し、`01-feed-engage.mp4`として公開している。

| ファイル | サイズ |
|---|---|
| `01-feed-engage.mp4` | 1.5M |
| `02-post-create.mp4` | 1.9M |
| `03-social.mp4` | 991K |
| `04-record-and-reflect.mp4` | 1.9M |
| `05-mobile.mp4` | 336K |

合計約6.6MB。全ファイルとも音声トラックなし（`ffprobe`で確認済み）。GitHub上での再生確認済み（下記「README埋め込み時のトラブルと対応」参照）。

## README埋め込み時のトラブルと対応（重要、再撮影時も同じ手順が必要）

**GitHubのMarkdownレンダラーは、srcの値に関わらず`<video>`タグを一律で除去する**（`<details>`/`<summary>`/`<img>`は許可されるが`<video>`は非許可。レンダリング後のHTMLを`curl`で確認し`<video`要素が0件だったことで判明）。そのため、以下はいずれも**再生できない**:

- `<video src="docs/demo/xxx.mp4">`（リポジトリ内の相対パス）— タグごと除去される
- `<video src="https://raw.githubusercontent.com/...">`（絶対URLでも同様にタグごと除去される。仮にタグが残ったとしても`Content-Type: application/octet-stream`＋`nosniff`で配信されるため再生不可）
- `<video src="https://cdn.jsdelivr.net/gh/...">`（`Content-Type: video/mp4`で正しく配信されるが、そもそも`<video>`タグ自体が除去されるため無意味）

**唯一の正しい方法**: GitHubのuser-attachments機能を使う。Issue/PR本文の入力欄に動画ファイルをドラッグ&ドロップすると、`https://github.com/user-attachments/assets/<uuid>`という裸のURLが自動挿入される。このURLを`<video>`タグで囲まず、**Markdown中に裸のリンクとしてそのまま貼るだけ**でGitHub側が自動的にインラインの動画プレーヤー（実体は`https://private-user-images.githubusercontent.com/...`への署名付きURL）へ変換する。

再撮影・動画差し替え時の手順:
1. 新しい`.mp4`を`docs/demo/`に置く（既存ファイルを上書き、またはファイル名変更）
2. GitHub Issue作成画面（`/issues/new`）等の本文入力欄に動画をドラッグ&ドロップし、挿入された裸のURLをコピー（Issueを実際に送信する必要はない）
3. アップロード先のファイルサイズ（`curl --range 0-0`のレスポンスの`Content-Range`）をローカルの`.mp4`の実サイズと照合し、意図した順序・ファイルであることを確認する
4. READMEの該当箇所の裸URLを差し替える

## 動画から外した項目とその理由

参照動画（1機能をゆっくり見せる密度の単一フロー動画）との比較検討を経て、以下3項目は動画に含めず、README本文の説明文で補足する方針にした。

- **ドラッグ&ドロップでの画像並べ替え**: `dnd-kit`のPointerSensor/TouchSensorによる実装だが、撮り直しリスクの割に得るものが少ないと判断し見送り
- **費用内訳の入力**: 既に要素の多い②（投稿する）にこれ以上入力欄を足す価値が低いと判断
- **api-docs（Swagger UI）の表示**: 描画が重く、締めのカットとして弱いため見送り。README本文にリンクのみ記載

## 事前条件チェック（撮影直前に確認した項目）

- 対象投稿が存在し、画像2枚以上あり、デモアカウント自身の投稿ではないこと（本番の探索ポータルをcurlで確認）
- デモアカウントの表示テーマがライトであること（`00-auth.setup.ts`の`ensureLightTheme()`で自動保証）

## 撮影で作成したコンテンツ

以下は削除せず、常設デモアカウントの追加コンテンツとして本番に残している。

- `seed-post-g-008`へのいいね・行きたい登録・コメント1件
- 新規投稿1件（タイトル「デモ動画用の旅の記録」、画像2枚、地図座標あり）
- `旅人05`へのフォロー
- 新規旅行プラン1件（タイトル「気になるスポット巡りプラン」、スポットは上記新規投稿）

## 常設デモアカウントのパスワードリセット（2026-08-08）

6-B2で発行されたパスワードをSakiさんが把握していなかったため、EC2上でPrisma経由でパスワードハッシュを直接更新した（一回限りの手動操作）。新しい認証情報は`実装計画書/phase6.md`（gitignore対象）に記録済み。
