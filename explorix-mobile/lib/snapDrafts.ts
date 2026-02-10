import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

const SNAP_DRAFTS_KEY = "snap_drafts_v1";
const SNAP_DIR = `${FileSystem.documentDirectory}snap_drafts/`;

export type SnapDraft = {
  id: string;
  uri: string;
  createdAt: string;
  updatedAt: string;
  status: "draft_local" | "uploading" | "uploaded" | "failed";
  category?: string | null;
  caption?: string;
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
};

const ensureDir = async () => {
  const info = await FileSystem.getInfoAsync(SNAP_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(SNAP_DIR, { intermediates: true });
  }
};

const readAll = async (): Promise<SnapDraft[]> => {
  const raw = await AsyncStorage.getItem(SNAP_DRAFTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAll = async (items: SnapDraft[]) => {
  await AsyncStorage.setItem(SNAP_DRAFTS_KEY, JSON.stringify(items));
};

export const listSnapDrafts = async () => {
  const drafts = await readAll();
  return drafts.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
};

export const addSnapDraft = async (
  sourceUri: string,
  meta?: {
    latitude?: number | null;
    longitude?: number | null;
    location_name?: string | null;
  }
) => {
  await ensureDir();
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const targetUri = `${SNAP_DIR}${id}.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: targetUri });

  const now = new Date().toISOString();
  const draft: SnapDraft = {
    id,
    uri: targetUri,
    createdAt: now,
    updatedAt: now,
    status: "draft_local",
    latitude: meta?.latitude ?? null,
    longitude: meta?.longitude ?? null,
    location_name: meta?.location_name ?? null,
  };
  const drafts = await readAll();
  drafts.unshift(draft);
  await writeAll(drafts);
  return draft;
};

export const updateSnapDraft = async (
  id: string,
  patch: Partial<Omit<SnapDraft, "id" | "createdAt">>
) => {
  const drafts = await readAll();
  const next = drafts.map((d) =>
    d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d
  );
  await writeAll(next);
  return next.find((d) => d.id === id) ?? null;
};

export const deleteSnapDraft = async (id: string) => {
  const drafts = await readAll();
  const found = drafts.find((d) => d.id === id);
  const next = drafts.filter((d) => d.id !== id);
  await writeAll(next);
  if (found?.uri) {
    try {
      const info = await FileSystem.getInfoAsync(found.uri);
      if (info.exists) await FileSystem.deleteAsync(found.uri, { idempotent: true });
    } catch {
      // Ignore file cleanup errors.
    }
  }
};

export const getSnapDraftById = async (id: string) => {
  const drafts = await readAll();
  return drafts.find((d) => d.id === id) ?? null;
};
