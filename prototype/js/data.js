// ============================================================
// TripDiary Mock Data
// ============================================================

const INITIAL_DATA = {
  users: [
    {
      id: 'u1',
      name: '中田 咲',
      email: 'saki@example.com',
      password: 'password123',
      bio: '旅と写真が好きです。週末はよく近場の観光地を巡っています🌸',
      avatar: 'https://i.pravatar.cc/150?img=47',
    },
    {
      id: 'u2',
      name: '田中 健太',
      email: 'kenta@example.com',
      password: 'password123',
      bio: 'バックパッカー歴10年。アジア圏を中心に旅してます。',
      avatar: 'https://i.pravatar.cc/150?img=12',
    },
    {
      id: 'u3',
      name: '佐藤 みほ',
      email: 'miho@example.com',
      password: 'password123',
      bio: 'グルメ旅専門。美味しいものを求めて全国各地へ！',
      avatar: 'https://i.pravatar.cc/150?img=32',
    },
    {
      id: 'u4',
      name: '鈴木 大輔',
      email: 'daisuke@example.com',
      password: 'password123',
      bio: '登山と温泉が趣味。山頂からの景色は格別です。',
      avatar: 'https://i.pravatar.cc/150?img=15',
    },
    {
      id: 'u5',
      name: '山本 花子',
      email: 'hanako@example.com',
      password: 'password123',
      bio: '京都在住。歴史ある街並みをのんびり散歩するのが好き。',
      avatar: 'https://i.pravatar.cc/150?img=45',
    },
  ],

  posts: [
    {
      id: 'p1',
      userId: 'u2',
      title: '嵐山の竹林と渡月橋',
      body: '朝早く訪れると観光客も少なく、竹林の静けさを堪能できました。渡月橋からの景色は圧巻で、川面に映る山々が美しかったです。近くの湯豆腐も絶品でした。',
      areaTag: '京都',
      category: '自然',
      rating: 5,
      visitedAt: '2026-05-12',
      lat: 35.0094,
      lng: 135.6780,
      images: [
        'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=1200&h=675&fit=crop',
        'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&h=675&fit=crop',
      ],
      createdAt: '2026-06-01T09:00:00Z',
    },
    {
      id: 'p2',
      userId: 'u3',
      title: '道頓堀のたこ焼き食べ歩き',
      body: 'ミナミの繁華街をぶらぶらしながら色んなたこ焼き屋を食べ比べ。くくるのたこ焼きが特においしかった！甲賀流も外せない。夜のネオンも最高でした。',
      areaTag: '大阪',
      category: 'グルメ',
      rating: 4,
      visitedAt: '2026-05-20',
      lat: 34.6687,
      lng: 135.5017,
      images: [
        'https://images.unsplash.com/photo-1502098267185-6078b8b2e935?w=1200&h=675&fit=crop',
        'https://images.unsplash.com/photo-1556742393-d75f468bfcb0?w=1200&h=675&fit=crop',
      ],
      createdAt: '2026-06-03T12:00:00Z',
    },
    {
      id: 'p3',
      userId: 'u4',
      title: '富士山五合目ハイキング',
      body: '富士スバルラインで五合目まで車で上がり、そこから奥庭まで散策。雲海の上に頭を出す富士山は一生の思い出になりました。装備はしっかりと用意して行くことをおすすめします。',
      areaTag: '山梨',
      category: 'アウトドア',
      rating: 5,
      visitedAt: '2026-05-25',
      lat: 35.3606,
      lng: 138.7274,
      images: [
        'https://images.unsplash.com/photo-1570459027562-4a916cc6113f?w=1200&h=675&fit=crop',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=675&fit=crop',
      ],
      createdAt: '2026-06-05T08:00:00Z',
    },
    {
      id: 'p4',
      userId: 'u5',
      title: '金閣寺の黄金の輝き',
      body: '雨上がりに訪れたら、金色の外観が水面に映り込んで二重に楽しめました。混雑を避けるなら開門直後がおすすめ。近くの龍安寺の石庭もセットで訪問しました。',
      areaTag: '京都',
      category: '歴史・文化',
      rating: 4,
      visitedAt: '2026-06-01',
      lat: 35.0394,
      lng: 135.7292,
      images: [
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=675&fit=crop',
      ],
      createdAt: '2026-06-08T10:00:00Z',
    },
    {
      id: 'p5',
      userId: 'u1',
      title: '沖縄・青の洞窟シュノーケリング',
      body: '恩納村の青の洞窟は本当に感動的！透明度が高く、色とりどりの熱帯魚と泳げました。ガイドツアーで行ったので安心安全。ライセンスなしでも楽しめます。',
      areaTag: '沖縄',
      category: 'アウトドア',
      rating: 5,
      visitedAt: '2026-06-10',
      lat: 26.4061,
      lng: 127.8113,
      images: [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=675&fit=crop',
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&h=675&fit=crop',
      ],
      createdAt: '2026-06-12T15:00:00Z',
    },
    {
      id: 'p6',
      userId: 'u2',
      title: '浅草・仲見世通りの食べ歩き',
      body: '雷門から浅草寺まで続く仲見世通りは、揚げまんじゅうやにんぎり焼きなど食べ歩きグルメが充実。人力車で浅草を一周するのもおすすめです。',
      areaTag: '東京',
      category: 'グルメ',
      rating: 4,
      visitedAt: '2026-06-05',
      lat: 35.7148,
      lng: 139.7967,
      images: [
        'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&h=675&fit=crop',
      ],
      createdAt: '2026-06-14T11:00:00Z',
    },
    {
      id: 'p7',
      userId: 'u3',
      title: '箱根・大涌谷と芦ノ湖',
      body: '大涌谷の黒たまごを食べ、芦ノ湖でランチ。富士山を背景に撮る芦ノ湖の写真は絶景でした。ロープウェイからの眺めも最高。温泉付きの旅館でゆっくりしました。',
      areaTag: '神奈川',
      category: '自然',
      rating: 5,
      visitedAt: '2026-06-08',
      lat: 35.2325,
      lng: 139.0253,
      images: [
        'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=1200&h=675&fit=crop',
      ],
      createdAt: '2026-06-16T09:00:00Z',
    },
    {
      id: 'p8',
      userId: 'u4',
      title: '白川郷の合掌造り集落',
      body: '世界遺産の白川郷。冬の雪景色が有名ですが、新緑の季節もとても美しかったです。展望台からの眺めは圧巻。地元の民家でのランチも雰囲気満点でした。',
      areaTag: '岐阜',
      category: '歴史・文化',
      rating: 5,
      visitedAt: '2026-06-15',
      lat: 36.2572,
      lng: 136.9051,
      images: [
        'https://images.unsplash.com/photo-1598135753163-6167c1a1ad65?w=1200&h=675&fit=crop',
      ],
      createdAt: '2026-06-18T14:00:00Z',
    },
    {
      id: 'p9',
      userId: 'u1',
      title: '奈良・東大寺と鹿のお出迎え',
      body: '奈良公園の鹿は本当に人慣れしていて、せんべいをあげると群がってきます（笑）。東大寺の大仏殿は迫力満点！春日大社の灯籠も趣があって好きです。',
      areaTag: '奈良',
      category: '歴史・文化',
      rating: 4,
      visitedAt: '2026-06-18',
      lat: 34.6888,
      lng: 135.8399,
      images: [
        'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1200&h=675&fit=crop',
      ],
      createdAt: '2026-06-20T10:00:00Z',
    },
    {
      id: 'p10',
      userId: 'u5',
      title: '札幌・大通公園と時計台',
      body: '北海道の玄関口・札幌を満喫！大通公園でのビール祭りは賑やかで楽しかった。スープカレーは何杯でも食べられます。羊ヶ丘展望台のクラーク博士像も必見。',
      areaTag: '北海道',
      category: 'グルメ',
      rating: 4,
      visitedAt: '2026-06-20',
      lat: 43.0618,
      lng: 141.3545,
      images: [
        'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&h=675&fit=crop',
      ],
      createdAt: '2026-06-22T13:00:00Z',
    },
  ],

  likes: [
    { userId: 'u1', postId: 'p2' },
    { userId: 'u1', postId: 'p3' },
    { userId: 'u1', postId: 'p7' },
    { userId: 'u2', postId: 'p5' },
    { userId: 'u2', postId: 'p9' },
    { userId: 'u3', postId: 'p1' },
    { userId: 'u3', postId: 'p3' },
    { userId: 'u4', postId: 'p1' },
    { userId: 'u4', postId: 'p5' },
    { userId: 'u5', postId: 'p2' },
    { userId: 'u5', postId: 'p6' },
  ],

  wishlists: [
    { userId: 'u1', postId: 'p3' },
    { userId: 'u1', postId: 'p8' },
    { userId: 'u2', postId: 'p4' },
    { userId: 'u3', postId: 'p5' },
    { userId: 'u4', postId: 'p2' },
  ],

  visited: [
    { userId: 'u1', postId: 'p9' },
    { userId: 'u2', postId: 'p1' },
    { userId: 'u3', postId: 'p6' },
    { userId: 'u4', postId: 'p3' },
    { userId: 'u5', postId: 'p4' },
  ],

  follows: [
    { followerId: 'u1', followingId: 'u2' },
    { followerId: 'u1', followingId: 'u3' },
    { followerId: 'u2', followingId: 'u1' },
    { followerId: 'u2', followingId: 'u4' },
    { followerId: 'u3', followingId: 'u1' },
    { followerId: 'u3', followingId: 'u5' },
    { followerId: 'u4', followingId: 'u2' },
    { followerId: 'u5', followingId: 'u1' },
    { followerId: 'u5', followingId: 'u3' },
  ],

  comments: [
    { id: 'c1', postId: 'p1', userId: 'u1', body: '竹林の写真、雰囲気ありますね！私も行ってみたいです。', createdAt: '2026-06-02T10:00:00Z' },
    { id: 'c2', postId: 'p1', userId: 'u5', body: '渡月橋は何度行っても良いですよね。早朝おすすめです！', createdAt: '2026-06-02T14:00:00Z' },
    { id: 'c3', postId: 'p3', userId: 'u1', body: '雲海の富士山！憧れです。装備は何を持って行きましたか？', createdAt: '2026-06-06T09:00:00Z' },
    { id: 'c4', postId: 'p5', userId: 'u2', body: '青の洞窟は本当に綺麗ですよね！私も去年行きました。', createdAt: '2026-06-13T16:00:00Z' },
    { id: 'c5', postId: 'p5', userId: 'u3', body: 'シュノーケリング未経験でも楽しめますか？', createdAt: '2026-06-13T18:00:00Z' },
    { id: 'c6', postId: 'p7', userId: 'u1', body: '箱根の黒たまご、縁起物ですよね！芦ノ湖もセットで楽しめた様子で羨ましい。', createdAt: '2026-06-17T11:00:00Z' },
  ],
};

function initData() {
  if (!localStorage.getItem('td_initialized')) {
    localStorage.setItem('td_users', JSON.stringify(INITIAL_DATA.users));
    localStorage.setItem('td_posts', JSON.stringify(INITIAL_DATA.posts));
    localStorage.setItem('td_likes', JSON.stringify(INITIAL_DATA.likes));
    localStorage.setItem('td_wishlists', JSON.stringify(INITIAL_DATA.wishlists));
    localStorage.setItem('td_visited', JSON.stringify(INITIAL_DATA.visited));
    localStorage.setItem('td_follows', JSON.stringify(INITIAL_DATA.follows));
    localStorage.setItem('td_comments', JSON.stringify(INITIAL_DATA.comments));
    localStorage.setItem('td_initialized', '1');
  }
}

function getUsers() { return JSON.parse(localStorage.getItem('td_users') || '[]'); }
function getPosts() { return JSON.parse(localStorage.getItem('td_posts') || '[]'); }
function getLikes() { return JSON.parse(localStorage.getItem('td_likes') || '[]'); }
function getWishlists() { return JSON.parse(localStorage.getItem('td_wishlists') || '[]'); }
function getVisited() { return JSON.parse(localStorage.getItem('td_visited') || '[]'); }
function getFollows() { return JSON.parse(localStorage.getItem('td_follows') || '[]'); }
function getComments() { return JSON.parse(localStorage.getItem('td_comments') || '[]'); }

function saveUsers(d) { localStorage.setItem('td_users', JSON.stringify(d)); }
function savePosts(d) { localStorage.setItem('td_posts', JSON.stringify(d)); }
function saveLikes(d) { localStorage.setItem('td_likes', JSON.stringify(d)); }
function saveWishlists(d) { localStorage.setItem('td_wishlists', JSON.stringify(d)); }
function saveVisited(d) { localStorage.setItem('td_visited', JSON.stringify(d)); }
function saveFollows(d) { localStorage.setItem('td_follows', JSON.stringify(d)); }
function saveComments(d) { localStorage.setItem('td_comments', JSON.stringify(d)); }

function getUserById(id) { return getUsers().find(u => u.id === id); }
function getPostById(id) { return getPosts().find(p => p.id === id); }

function getLikeCount(postId) { return getLikes().filter(l => l.postId === postId).length; }
function getCommentCount(postId) { return getComments().filter(c => c.postId === postId).length; }
function isLiked(userId, postId) { return getLikes().some(l => l.userId === userId && l.postId === postId); }
function isWishlisted(userId, postId) { return getWishlists().some(w => w.userId === userId && w.postId === postId); }
function isVisitedPost(userId, postId) { return getVisited().some(v => v.userId === userId && v.postId === postId); }
function isFollowing(followerId, followingId) { return getFollows().some(f => f.followerId === followerId && f.followingId === followingId); }
function getFollowerCount(userId) { return getFollows().filter(f => f.followingId === userId).length; }
function getFollowingCount(userId) { return getFollows().filter(f => f.followerId === userId).length; }

function toggleLike(userId, postId) {
  const likes = getLikes();
  const idx = likes.findIndex(l => l.userId === userId && l.postId === postId);
  if (idx >= 0) likes.splice(idx, 1); else likes.push({ userId, postId });
  saveLikes(likes);
}
function toggleWishlist(userId, postId) {
  const ws = getWishlists();
  const idx = ws.findIndex(w => w.userId === userId && w.postId === postId);
  if (idx >= 0) ws.splice(idx, 1); else ws.push({ userId, postId });
  saveWishlists(ws);
}
function toggleVisited(userId, postId) {
  const vs = getVisited();
  const idx = vs.findIndex(v => v.userId === userId && v.postId === postId);
  if (idx >= 0) vs.splice(idx, 1); else vs.push({ userId, postId });
  saveVisited(vs);
}
function toggleFollow(followerId, followingId) {
  const follows = getFollows();
  const idx = follows.findIndex(f => f.followerId === followerId && f.followingId === followingId);
  if (idx >= 0) follows.splice(idx, 1); else follows.push({ followerId, followingId });
  saveFollows(follows);
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function renderStars(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<span class="star ${i <= rating ? 'filled' : ''}">★</span>`;
  }
  return html;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function categoryBadge(category) {
  const map = {
    '自然': 'badge-nature',
    'グルメ': 'badge-gourmet',
    'アウトドア': 'badge-outdoor',
    '歴史・文化': 'badge-culture',
    'その他': 'badge-other',
  };
  return `<span class="badge ${map[category] || 'badge-other'}">${category}</span>`;
}

const CATEGORIES = ['自然', 'グルメ', 'アウトドア', '歴史・文化', 'その他'];

function calcTabiScore(userId) {
  const postCount    = getPosts().filter(p => p.userId === userId).length;
  const visitedCount = getVisited().filter(v => v.userId === userId).length;
  const userPostIds  = getPosts().filter(p => p.userId === userId).map(p => p.id);
  const likeCount    = getLikes().filter(l => userPostIds.includes(l.postId)).length;
  const commentCount = getComments().filter(c => userPostIds.includes(c.postId)).length;
  return postCount * 10 + visitedCount * 5 + likeCount * 3 + commentCount * 2;
}

function getScoreLabel(score) {
  if (score >= 100) return { label: 'プラチナトラベラー', color: '#7c3aed' };
  if (score >= 60)  return { label: 'ゴールドトラベラー',  color: '#d97706' };
  if (score >= 30)  return { label: 'シルバートラベラー',  color: '#475569' };
  return                   { label: 'ブロンズトラベラー',  color: '#92400e' };
}

function getFollowActivities(currentUserId) {
  const followingIds = getFollows()
    .filter(f => f.followerId === currentUserId)
    .map(f => f.followingId);

  const activities = [];

  getPosts()
    .filter(p => followingIds.includes(p.userId))
    .forEach(p => {
      activities.push({ type: 'post', userId: p.userId, post: p, date: p.createdAt });
    });

  getLikes()
    .filter(l => followingIds.includes(l.userId))
    .forEach(l => {
      const post = getPostById(l.postId);
      if (post) activities.push({ type: 'like', userId: l.userId, post, date: post.createdAt + '_like_' + l.userId });
    });

  getComments()
    .filter(c => followingIds.includes(c.userId))
    .forEach(c => {
      const post = getPostById(c.postId);
      if (post) activities.push({ type: 'comment', userId: c.userId, post, comment: c, date: c.createdAt });
    });

  getFollows()
    .filter(f => followingIds.includes(f.followerId) && followingIds.includes(f.followingId))
    .forEach(f => {
      activities.push({ type: 'follow', userId: f.followerId, targetId: f.followingId, date: '2026-06-10T00:00:00Z' });
    });

  activities.sort((a, b) => new Date(b.date) - new Date(a.date));
  return activities;
}
