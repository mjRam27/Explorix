import { api } from "./client";

export const searchUsers = (q: string, limit = 20) =>
  api.get("/users/search", { params: { q, limit } });

export const getPublicProfile = (userId: string) =>
  api.get(`/users/${userId}`);

export const getFollowers = (userId: string, limit = 50) =>
  api.get(`/users/${userId}/followers`, { params: { limit } });

export const getFollowing = (userId: string, limit = 50) =>
  api.get(`/users/${userId}/following`, { params: { limit } });

export const followUser = (userId: string) => api.post(`/social/follow/${userId}`);

export const unfollowUser = (userId: string) =>
  api.post(`/social/unfollow/${userId}`);

export const getPublicPastItineraries = (userId: string, limit = 30) =>
  api.get(`/users/${userId}/itineraries/past`, { params: { limit } });

export const getPublicItineraries = (userId: string, limit = 50) =>
  api.get(`/users/${userId}/itineraries`, { params: { limit } });
