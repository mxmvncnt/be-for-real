import { DateTime } from "luxon";

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

export type VideoType = "clip" | "mashup";

export type Video = {
  id: string;
  userId: string;
  createdAt: string;
  filename: string;
  type: VideoType;
};

export type RewindVideo = Video & {
  username: string;
  isYou: boolean;
};

export function resolveVideoUrl(video: Pick<Video, "filename">) {
  return video.filename ? `/videos/${video.filename}` : "";
}

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
  acceptFriendRequest: (friendId: string) =>
    request<{ message: string }>(`/friend/${friendId}/accept`, {
      method: "POST",
      headers: getAuthHeaders(),
    }),
  removeFriend: (friendId: string) =>
    request<{ message: string }>(`/friend/${friendId}/remove`, {
      method: "POST",
      headers: getAuthHeaders(),
    }),
  getFriendRequestsReceived: () =>
    request<Friend[]>("/friend/requests/received", {
      headers: getAuthHeaders(),
    }),
  getFriendRequestsSent: () =>
    request<Friend[]>("/friend/requests/sent", {
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
  generateMashup: async (dateIsoString: string) => {
    const date =
      DateTime.fromISO(dateIsoString).startOf("day").toISO() ?? dateIsoString;
    const response = await fetch(
      `${API_BASE_URL}/videos/mashup/${encodeURIComponent(date)}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json() as Promise<Video>;
  },
  getRewindFeed: () =>
    request<RewindVideo[]>("/videos/feed", {
      headers: getAuthHeaders(),
    }),
  logout: () => 
    request<{ ok:boolean }>("/auth/logout", {
      method: "POST",
      headers: getAuthHeaders(),
    }),
};
