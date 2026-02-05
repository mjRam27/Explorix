// components/explore/types.ts

// export type Place = {
//   id: number;

//   // Core identity
//   title: string;
//   category?: string;

//   // Location
//   latitude: number;
//   longitude: number;

//   // Distance (from backend)
//   distance_km: number;

//   // Optional extras (safe for future)
//   map_url?: string;
// };
export type Place = {
  id: number;
  title: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  category?: string;
  map_url?: string;
};
