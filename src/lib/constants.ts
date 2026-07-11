export const CATEGORIES = [
  "観光",
  "グルメ",
  "宿・ホテル",
  "季節・イベント",
  "アクティビティ",
  "レジャー",
  "歴史・文化",
  "その他",
] as const;

export const LOCATIONS = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
  "海外",
] as const;

export type Location = (typeof LOCATIONS)[number];

export const SORT_OPTIONS = [
  { value: "latest", label: "新着順" },
  { value: "popular", label: "人気順" },
] as const;

export const CATEGORY_ICONS: Record<string, string> = {
  観光: "🗼",
  グルメ: "🍟",
  "宿・ホテル": "🏨",
  "季節・イベント": "🌸",
  アクティビティ: "🏕️",
  レジャー: "🎡",
  "歴史・文化": "🎎",
  その他: "📌",
  // 旧カテゴリ名（カテゴリ再編前の投稿データ向けエイリアス）
  自然: "🌸",
};

// CategoryIcon コンポーネント用の Twemoji コードポイント（CATEGORY_ICONS の絵文字と対応）
export const CATEGORY_TWEMOJI: Record<string, string> = {
  観光: "1f5fc",
  グルメ: "1f35f",
  "宿・ホテル": "1f3e8",
  "季節・イベント": "1f338",
  アクティビティ: "1f3d5",
  レジャー: "1f3a1",
  "歴史・文化": "1f38e",
  その他: "1f4cc",
  自然: "1f338",
};

export const CATEGORY_COLORS: Record<string, string> = {
  観光: "bg-orange-50 text-orange-800",
  グルメ: "bg-amber-100 text-amber-800",
  "宿・ホテル": "bg-pink-100 text-pink-800",
  "季節・イベント": "bg-pink-50 text-pink-700",
  アクティビティ: "bg-sky-100 text-sky-800",
  レジャー: "bg-fuchsia-100 text-fuchsia-800",
  "歴史・文化": "bg-purple-100 text-purple-800",
  その他: "bg-slate-100 text-slate-600",
};
