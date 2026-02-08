import { api } from "./client";

export const getJourneys = (params: {
  from: string;
  to: string;
  products?: string[];
  departure?: string;
}) =>
  api.get("/transport/journey", {
    params: {
      from_station: params.from,
      to_station: params.to,
      "products[]": params.products,
      departure: params.departure,
    },
  });

export const getStations = (q: string) =>
  api.get("/transport/stations", { params: { q } });

export const getNearbyStations = (params: {
  lat: number;
  lon: number;
  results?: number;
  distance?: number;
}) =>
  api.get("/transport/stations/nearby", {
    params: {
      lat: params.lat,
      lon: params.lon,
      results: params.results ?? 8,
      distance: params.distance ?? 3000,
    },
  });

export const seedStations = (q: string, limit = 50) =>
  api.post("/transport/stations/seed", null, { params: { q, limit } });
