export type Category =
  | "観光"
  | "グルメ"
  | "宿・ホテル"
  | "季節・イベント"
  | "アクティビティ"
  | "レジャー"
  | "歴史・文化"
  | "その他";

export type CostBreakdownItem = {
  label: string;
  amount: number;
};

export type PostAuthor = {
  id: string;
  nickname: string;
  image: string | null;
};

export type PostImage = {
  id: string;
  url: string;
  displayOrder: number;
};

export type Post = {
  id: string;
  title: string;
  body: string;
  location: string;
  category: string | null;
  rating: number | null;
  visitedAt: string;
  cost: number | null;
  costBreakdown: CostBreakdownItem[] | null;
  lat: number | null;
  lng: number | null;
  planId: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  images: PostImage[];
  _count: {
    likes: number;
    comments: number;
  };
  isLiked?: boolean;
  isWishlisted?: boolean;
  isVisited?: boolean;
};

export type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: PostAuthor;
};

export type PostsResponse = {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type CommentsResponse = {
  comments: Comment[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type PostFormData = {
  title: string;
  body: string;
  location: string;
  category: string;
  rating: number;
  visitedAt: string;
  costBreakdown: CostBreakdownItem[];
  lat: number | null;
  lng: number | null;
  planId: string | null;
  imageUrls: string[];
};
