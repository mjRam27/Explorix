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
