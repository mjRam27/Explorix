// api/posts.ts
import { api } from "./client";


export const getFeed = (cursor?: string) =>
  api.get("/social/feed", { params: { cursor } });

export const getMyPosts = () =>
  api.get("/posts/me");

export const getUserPosts = (userId: string) =>
  api.get(`/posts/user/${userId}`);

export const likePost = (postId: string) =>
  api.post(`/posts/${postId}/like`);

export const unlikePost = (postId: string) =>
  api.post(`/posts/${postId}/unlike`);

export const savePost = (postId: string) =>
  api.post(`/posts/${postId}/save`);

export const unsavePost = (postId: string) =>
  api.post(`/posts/${postId}/unsave`);

export const addComment = (postId: string, content: string) =>
  api.post(`/posts/${postId}/comments`, { content });

export const getComments = (postId: string) =>
  api.get(`/posts/${postId}/comments`);

export const getPostNavigation = (postId: string) =>
  api.get(`/posts/${postId}/navigate`);

export const uploadPostMedia = (file: {
  uri: string;
  name: string;
  type: string;
}) => {
  const form = new FormData();
  form.append("file", file as any);
  return api.post("/uploads/post-media", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const createPost = (payload: {
  media_url: string;
  media_type: "image" | "video";
  category: "food" | "nature" | "culture" | "shopping" | "hidden_gems";
  caption?: string;
  location_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}) => api.post("/posts/", payload);
