import { api } from "./client";

export type ItineraryPlace = {
  place_id: number;
  order: number;
  start_time?: string | null;
  duration_minutes?: number;
  notes?: string | null;
};

export type ItineraryDay = {
  day: number;
  date: string;
  title?: string | null;
  notes?: string | null;
  places: ItineraryPlace[];
};

export type ItineraryCreateRequest = {
  title: string;
  description?: string | null;
  destination: string;
  start_date: string;
  end_date: string;
  days: ItineraryDay[];
  travel_style?: string | null;
  budget?: string | null;
  tags?: string[];
  is_public?: boolean;
};

export const getMyItineraries = () => api.get("/itinerary/my");

export const getItineraryById = (id: string) =>
  api.get(`/itinerary/${id}`);

export const createItinerary = (payload: ItineraryCreateRequest) =>
  api.post("/itinerary/", payload);

export const createAutoItinerary = (payload: {
  destination: string;
  days: number;
  style: "adventurous" | "relaxing" | "fun";
}) => api.post("/itinerary/auto", payload);

export const saveDraftItinerary = (draft: any) =>
  api.post("/itinerary/add", { draft });
