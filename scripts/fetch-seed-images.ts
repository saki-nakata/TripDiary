import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { CATEGORIES } from "@/lib/constants";

// 6-B2本番シード用の画像収集ツール（一回限りの実行、本番アプリの実行経路には含まれない）。
// Pexels Search API（Pexels License、商用可・許諾不要）からカテゴリ別に実写素材を取得する。
// Unsplash APIはCDNからのホットリンクを要求しており本計画のS3再ホスト設計と整合しないため不採用。
//
// 実行方法: pnpm exec dotenv -e .env.local -- pnpm exec tsx scripts/fetch-seed-images.ts
// PEXELS_API_KEYが.env.localに必要（.env.sample参照）。

const IMAGES_PER_CATEGORY = 3;
const OUTPUT_DIR = path.join(process.cwd(), "seed-images");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");

// Pexelsの英語検索の方が結果の的中率が高いため、カテゴリごとに英語クエリを対応付ける
const CATEGORY_QUERIES: Record<(typeof CATEGORIES)[number], string> = {
  観光: "japan sightseeing landmark",
  グルメ: "japanese food",
  "宿・ホテル": "hotel resort room",
  "季節・イベント": "japan seasonal festival",
  アクティビティ: "outdoor adventure activity",
  レジャー: "leisure vacation",
  "歴史・文化": "japanese temple shrine culture",
  その他: "japan travel scenery",
};

interface ManifestEntry {
  filename: string;
  sha256: string;
  photographer: string;
  photographer_url: string;
  url: string;
  pexelsId: number;
  query: string;
  category: string;
  license: "Pexels License";
}

interface PexelsPhoto {
  id: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: { large2x: string };
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[];
}

function loadExistingManifest(): Map<string, ManifestEntry> {
  if (!existsSync(MANIFEST_PATH)) return new Map();
  const entries: ManifestEntry[] = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  return new Map(entries.map((e) => [e.filename, e]));
}

async function fetchCategoryPhotos(query: string, apiKey: string): Promise<PexelsPhoto[]> {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(IMAGES_PER_CATEGORY));
  url.searchParams.set("orientation", "landscape");

  const res = await fetch(url, { headers: { Authorization: apiKey } });
  if (!res.ok) {
    throw new Error(`Pexels API失敗（query=${query}）: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as PexelsSearchResponse;
  return body.photos;
}

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`画像ダウンロード失敗: ${url}: ${res.status} ${res.statusText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    throw new Error("PEXELS_API_KEYが設定されていません。.env.localに追加してください（.env.sample参照）。");
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const manifest = loadExistingManifest();

  for (const category of CATEGORIES) {
    const query = CATEGORY_QUERIES[category];
    const categoryDir = path.join(OUTPUT_DIR, category);
    mkdirSync(categoryDir, { recursive: true });

    const targetFilenames = Array.from(
      { length: IMAGES_PER_CATEGORY },
      (_, i) => `${category}/${String(i + 1).padStart(2, "0")}.jpg`
    );
    const missing = targetFilenames.filter((f) => !manifest.has(f) || !existsSync(path.join(OUTPUT_DIR, f)));

    if (missing.length === 0) {
      console.log(`[fetch-seed-images] スキップ（既存）: ${category}`);
      continue;
    }

    console.log(`[fetch-seed-images] 取得中: ${category}（query="${query}"）`);
    const photos = await fetchCategoryPhotos(query, apiKey);
    if (photos.length < IMAGES_PER_CATEGORY) {
      console.warn(
        `[fetch-seed-images] 警告: ${category}は${IMAGES_PER_CATEGORY}件要求したが${photos.length}件しか取得できなかった`
      );
    }

    for (let i = 0; i < Math.min(photos.length, IMAGES_PER_CATEGORY); i++) {
      const filename = `${category}/${String(i + 1).padStart(2, "0")}.jpg`;
      const filePath = path.join(OUTPUT_DIR, filename);
      if (manifest.has(filename) && existsSync(filePath)) continue;

      const photo = photos[i];
      const buffer = await downloadImage(photo.src.large2x);
      writeFileSync(filePath, buffer);
      const sha256 = createHash("sha256").update(buffer).digest("hex");

      manifest.set(filename, {
        filename,
        sha256,
        photographer: photo.photographer,
        photographer_url: photo.photographer_url,
        url: photo.url,
        pexelsId: photo.id,
        query,
        category,
        license: "Pexels License",
      });
      console.log(`[fetch-seed-images] 保存: ${filename}（撮影者: ${photo.photographer}）`);
    }
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(Array.from(manifest.values()), null, 2) + "\n", "utf-8");
  console.log(`[fetch-seed-images] 完了。マニフェスト: ${MANIFEST_PATH}（${manifest.size}件）`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
