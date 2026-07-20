export type StatsResponse = {
  year: number | "all";
  completedPlans: number;
  totalPosts: number;
  totalPhotos: number;
  totalCost: number;
  visitedLocations: string[];
  topLocation: string | null;
  locationBreakdown: { location: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  ratingBreakdown: { rating: number; count: number }[];
  averageRating: number | null;
  topRatedPosts: {
    id: string;
    title: string;
    location: string;
    category: string | null;
    visitedAt: string;
    rating: number;
    thumbnail: string | null;
  }[];
  /** 単年表示時のみ、当年の月別投稿数。月別ヒートマップ用（全期間時は空配列） */
  monthlyPostCount: { month: number; count: number }[];
  /** 全期間表示時のみ、年別投稿数。折れ線（年別投稿数の推移）用（単年時は空配列） */
  yearlyPostCount: { year: number; count: number }[];
  /** 全期間表示時のみ、年をまたいだ月別（1〜12月）の通算投稿数。季節性ヒートマップ用（単年時は空配列） */
  seasonalPostCount: { month: number; count: number }[];
};

export type TimelinePost = {
  id: string;
  title: string;
  location: string;
  category: string | null;
  visitedAt: string;
  images: { url: string }[];
};

export type TimelineYearGroup = {
  year: number;
  posts: TimelinePost[];
};
