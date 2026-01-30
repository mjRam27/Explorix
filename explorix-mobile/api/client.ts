// // api/client.ts
// const BASE_URL = 'http://192.168.0.34:8000';

// export async function apiGet<T>(path: string): Promise<T> {
//   const res = await fetch(`${BASE_URL}${path}`);
//   if (!res.ok) {
//     const text = await res.text();
//     throw new Error(text);
//   }
//   return res.json();
// }

// api/client.ts
import axios from "axios";

export const api = axios.create({
  baseURL: "http://192.168.0.34:8000",
  headers: { "Content-Type": "application/json" },
});

// OPTIONAL helper to avoid changing old code
export async function apiGet<T>(path: string): Promise<T> {
  const res = await api.get<T>(path);
  return res.data;
}
