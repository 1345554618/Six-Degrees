type User = {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  city?: string;
  interests?: string[];
};

type Recommendation = User & {
  degrees: number;           // 幾度
  mutualCount: number;       // 共同朋友數
  pathPreview?: string[];    // 路徑預覽（可隱私處理）
};

let me: User = {
  id: "u_me",
  name: "Jack",
  bio: "喜歡設計、建材、也在做點社交產品 :)",
  city: "Taipei",
  interests: ["Design", "Startup", "Coffee"],
};

let connections: Array<{ id: string; name: string; status: "accepted" | "pending_in" | "pending_out" }> = [
  { id: "u_a", name: "Ming", status: "accepted" },
  { id: "u_b", name: "Annie", status: "accepted" },
  { id: "u_c", name: "Eason", status: "pending_in" },
];

let recommendations: Recommendation[] = [
  { id: "u_x", name: "Sophie", degrees: 2, mutualCount: 3, pathPreview: ["Jack", "Ming", "Sophie"], city: "Taipei", interests: ["Art", "Coffee"] },
  { id: "u_y", name: "Kevin", degrees: 3, mutualCount: 1, pathPreview: ["Jack", "Annie", "Tom", "Kevin"], city: "Taichung", interests: ["Hiking"] },
  { id: "u_z", name: "Yuki", degrees: 2, mutualCount: 2, pathPreview: ["Jack", "Annie", "Yuki"], city: "Taipei", interests: ["Design"] },
];

function sleep(ms = 300) {
  return new Promise((r) => setTimeout(r, ms));
}

export const mock = {
  async login(email: string, password: string) {
    await sleep();
    if (!email || !password) throw new Error("請輸入帳號密碼");
    return { token: "mock_token_123", user: { id: me.id, name: me.name } };
  },

  async getMe() {
    await sleep();
    return me;
  },

  async updateMe(patch: Partial<User>) {
    await sleep();
    me = { ...me, ...patch };
    return me;
  },

  async getConnections() {
    await sleep();
    return connections;
  },

  async getRecommendations(filter: { maxDegrees: number; city?: string }) {
    await sleep();
    return recommendations
      .filter((r) => r.degrees <= filter.maxDegrees)
      .filter((r) => (filter.city ? r.city === filter.city : true));
  },

  async inviteFriend(emailOrCode: string) {
    await sleep();
    connections.unshift({ id: "u_new", name: emailOrCode || "Invited Friend", status: "pending_out" });
    return { ok: true };
  },

  async acceptInvite(userId: string) {
    await sleep();
    connections = connections.map((c) => (c.id === userId ? { ...c, status: "accepted" } : c));
    return { ok: true };
  },

  async getGraph(params: { includePending?: boolean }) {
    await sleep();
    const includePending = !!params.includePending;

    const filtered = edges.filter(e => includePending ? true : e.status === "accepted");
    return {
      me: { id: me.id, name: me.name },
      users: users.map(u => ({ ...u })),
      edges: filtered.map(e => ({ ...e })),
      nameOf: getUserName, // 這行可不用回傳，Graph 也可用 users 查
    };
  },
  
};

type Edge = { a: string; b: string; status: "accepted" | "pending" };

const users: Array<{ id: string; name: string }> = [
  { id: "u_me", name: "Jack" },
  { id: "u_a", name: "Ming" },
  { id: "u_b", name: "Annie" },
  { id: "u_c", name: "Eason" },
  { id: "u_x", name: "Sophie" },
  { id: "u_y", name: "Kevin" },
  { id: "u_z", name: "Yuki" },
  // 你也可以繼續加更多 mock user
];

// 這裡是「真實關係線」：誰跟誰認識
let edges: Edge[] = [
  { a: "u_me", b: "u_a", status: "accepted" },
  { a: "u_me", b: "u_b", status: "accepted" },
  { a: "u_c", b: "u_me", status: "pending" },   // 對方邀請你，未接受
  { a: "u_a", b: "u_x", status: "accepted" },
  { a: "u_a", b: "u_z", status: "accepted" },
  { a: "u_b", b: "u_z", status: "accepted" },
  { a: "u_b", b: "u_y", status: "accepted" },
];

function getUserName(id: string) {
  return users.find(u => u.id === id)?.name || id;
}

