export type StatsResponse = {
  year: number | "all";
  completedPlans: number;
  totalPosts: number;
  totalPhotos: number;
  totalCost: number;
  visitedLocations: string[];
  topLocation: string | null;
  categoryBreakdown: { category: string; count: number }[];
  monthlyPostCount: { month: number; count: number }[];
  yearlyPostCount: { year: number; count: number }[];
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
