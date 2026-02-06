import * as SecureStore from "expo-secure-store";

export type NextStop = {
  id: number;
  title: string;
  latitude: number;
  longitude: number;
  category?: string | null;
};

const KEY = "next_stops";

export async function loadNextStops(): Promise<NextStop[]> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveNextStops(stops: NextStop[]) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(stops));
}

export async function addNextStop(stop: NextStop) {
  const existing = await loadNextStops();
  const deduped = existing.filter((s) => s.id !== stop.id);
  deduped.unshift(stop);
  await saveNextStops(deduped);
  return deduped;
}

export async function removeNextStop(id: number) {
  const existing = await loadNextStops();
  const next = existing.filter((s) => s.id !== id);
  await saveNextStops(next);
  return next;
}
