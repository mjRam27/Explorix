import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  deleteItinerary,
  getItineraryById,
  getMyItineraries,
} from "../../api/itinerary";

type ItineraryListItem = {
  id: string;
  title: string;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

type ItineraryDetail = {
  id: string;
  destination?: string | null;
  days?: Array<{
    places?: Array<{
      name: string;
      country_code?: string | null;
      city?: string | null;
    }>;
  }>;
};

type Row = {
  id: string;
  title: string;
  start_date?: string | null;
  end_date?: string | null;
  group: string;
  places: string[];
};

function countryCodeToFlag(code: string): string {
  const normalized = String(code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return "";
  const points = [...normalized].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...points);
}

export default function ItineraryGrid() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPastTrips = useCallback(async () => {
    setLoading(true);
    try {
      const listRes = await getMyItineraries();
      const list = (listRes.data ?? []) as ItineraryListItem[];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const past = list.filter((it) => {
        if (!it.end_date) return false;
        const end = new Date(it.end_date);
        return !Number.isNaN(end.getTime()) && end < today;
      });

      const details = await Promise.all(
        past.map(async (it) => {
          try {
            const res = await getItineraryById(it.id);
            return { ...it, detail: res.data as ItineraryDetail };
          } catch {
            return { ...it, detail: null };
          }
        })
      );

      const normalized: Row[] = details.map((it) => {
        const detail = it.detail;
        const places = (detail?.days ?? [])
          .flatMap((d) => d.places ?? [])
          .map((p) => p.name)
          .filter(Boolean);
        const uniquePlaces = Array.from(new Set(places)).slice(0, 20);
        const firstPlace = (detail?.days ?? [])
          .flatMap((d) => d.places ?? [])
          .find((p) => !!p);
        const group =
          firstPlace?.country_code ||
          it.destination?.split(",").slice(-1)[0]?.trim() ||
          "OTHER";

        return {
          id: it.id,
          title: it.title,
          start_date: it.start_date,
          end_date: it.end_date,
          group: group.toUpperCase(),
          places: uniquePlaces,
        };
      });

      setRows(normalized);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPastTrips();
  }, [loadPastTrips]);

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of rows) {
      const current = map.get(row.group) ?? [];
      current.push(row);
      map.set(row.group, current);
    }
    return Array.from(map.entries());
  }, [rows]);

  const handleDelete = (id: string) => {
    Alert.alert("Delete itinerary?", "This will remove it from profile.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeletingId(id);
          await deleteItinerary(id);
          setRows((prev) => prev.filter((r) => r.id !== id));
          if (expandedId === id) setExpandedId(null);
          setDeletingId(null);
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No past itineraries yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {grouped.map(([group, items]) => (
        <View key={group} style={styles.groupWrap}>
          <Text style={styles.groupTitle}>
            {countryCodeToFlag(group) ? `${countryCodeToFlag(group)} ${group}` : group}
          </Text>
          {items.map((item) => (
            <View key={item.id} style={styles.card}>
              <Pressable
                style={styles.row}
                onPress={() =>
                  setExpandedId((prev) => (prev === item.id ? null : item.id))
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.date}>
                    {item.start_date ?? "Date TBD"} - {item.end_date ?? "Date TBD"}
                  </Text>
                </View>
                <Ionicons
                  name={expandedId === item.id ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#94a3b8"
                />
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item.id)}
                >
                  {deletingId === item.id ? (
                    <ActivityIndicator size="small" color="#64748b" />
                  ) : (
                    <Ionicons name="trash" size={14} color="#94a3b8" />
                  )}
                </Pressable>
              </Pressable>
              {expandedId === item.id && (
                <View style={styles.placesWrap}>
                  {item.places.length === 0 ? (
                    <Text style={styles.empty}>No places stored.</Text>
                  ) : (
                    item.places.map((name, idx) => (
                      <Text key={`${item.id}-${name}-${idx}`} style={styles.place}>
                        - {name}
                      </Text>
                    ))
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  text: {
    color: "#666",
    textAlign: "center",
  },
  groupWrap: {
    marginBottom: 14,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  title: {
    fontWeight: "700",
    color: "#111827",
  },
  date: {
    marginTop: 2,
    color: "#64748b",
    fontSize: 12,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  placesWrap: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  place: {
    marginTop: 6,
    color: "#374151",
    fontSize: 13,
  },
  empty: {
    marginTop: 8,
    color: "#94a3b8",
    fontSize: 12,
  },
});
