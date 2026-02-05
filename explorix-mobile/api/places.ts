import { api } from "./client";

export const getNearbyPlaces = (params: {
  lat: number;
  lon: number;
  radiusKm: number;
  category?: string | null;
}) =>
  api.get("/places/geo/nearby", {
    params: {
      lat: params.lat,
      lon: params.lon,
      radius_km: params.radiusKm,
      category:
        params.category && params.category !== "all"
          ? params.category
          : undefined,
    },
  });

export const searchPlaces = (query: string) =>
  api.get("/places/pois/search", { params: { query } });

export const getRoute = (params: {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  mode?: string;
}) =>
  api.get("/places/geo/route", {
    params: {
      origin_lat: params.originLat,
      origin_lng: params.originLng,
      dest_lat: params.destLat,
      dest_lng: params.destLng,
      mode: params.mode ?? "walking",
    },
  });
