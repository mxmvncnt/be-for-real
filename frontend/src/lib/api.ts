export type HealthResponse = {
  ok: boolean;
  service: string;
  timestamp: string;
};

export type RegisterPayload = {
  username: string;
  email: string;
  password: string;
};

export type RegisterResponse = {
  id: string;
  username: string;
  email: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type Friend = {
  id: string;
  username: string;
  email: string;
  profilePicUrl?: string | null;
};

export type CurrentUser = {
  id: string;
  username: string;
  email: string;
  description?: string | null;
  profilePicUrl?: string | null;
};

export type RewindVideo = {
  id: string;
  userId: string;
  username: string;
  createdAt: string;
  videoUrl: string;
  type: string | null;
  isYou: boolean;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function getAuthHeaders(): Record<string, string> {
  const token = window.localStorage.getItem("bfr.token");
  if (!token) {
    return {};
  }

  return { authorization: token };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<HealthResponse>("/api/health"),
  login: (payload: LoginPayload) =>
    request<string>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  register: (payload: RegisterPayload) =>
    request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getFriends: () =>
    request<Friend[]>("/friend/list", {
      headers: getAuthHeaders(),
    }),
  getCurrentUser: () =>
    request<CurrentUser>("/user/me", {
      headers: getAuthHeaders(),
    }),
  searchUsers: (query: string) =>
    request<Friend[]>(`/user/search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders(),
    }),
  addFriend: (friendId: string) =>
    request<{ message: string }>(`/friend/${friendId}/add`, {
      method: "POST",
      headers: getAuthHeaders(),
    }),
  removeFriend: (friendId: string) =>
    request<{ message: string }>(`/friend/${friendId}/remove`, {
      method: "POST",
      headers: getAuthHeaders(),
    }),
  uploadClip: async (video: Blob, createdAt: string) => {
    const formData = new FormData();
    formData.append("video", video, `rewind-${createdAt}.webm`);
    formData.append("createdAt", createdAt);

    const response = await fetch(`${API_BASE_URL}/videos/clips`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json() as Promise<RewindVideo>;
  },
  uploadMashup: async (video: Blob, createdAt: string) => {
    const formData = new FormData();
    formData.append("video", video, `mashup-${createdAt}.webm`);
    formData.append("createdAt", createdAt);

    const response = await fetch(`${API_BASE_URL}/videos/mashup`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json() as Promise<RewindVideo>;
  },
  getRewindFeed: () =>
    request<RewindVideo[]>("/videos/feed", {
      headers: getAuthHeaders(),
    }),
};
