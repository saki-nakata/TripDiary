export type BudgetBreakdownItem = {
  label: string;
  amount: number;
};

export type PlanSpotPost = {
  id: string;
  title: string;
  location: string;
  category: string | null;
  rating: number | null;
  lat: number | null;
  lng: number | null;
  images: { url: string }[];
};

export type PlanLinkedPost = {
  id: string;
  title: string;
  location: string;
  category: string | null;
  visitedAt: string;
  images: { url: string }[];
};

export type Plan = {
  id: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  budgetBreakdown: BudgetBreakdownItem[] | null;
  memo: string | null;
  completed: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  spotCount?: number;
};

export type PlanSpotEntry = {
  displayOrder: number;
  post: PlanSpotPost | null;
  freeTitle: string | null;
  freeLocation: string | null;
  freeCategory: string | null;
};

export type PlanDetail = Plan & {
  spots: PlanSpotEntry[];
  linkedPosts: PlanLinkedPost[];
};

export type PlanSpotInput =
  | { type: "post"; postId: string }
  | { type: "free"; title: string; location: string; category?: string | null };
