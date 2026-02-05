// app/(tabs)/itinerary.tsx
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  createItinerary,
  createAutoItinerary,
  getItineraryById,
  getMyItineraries,
  saveDraftItinerary,
} from "../../api/itinerary";
import { searchPlaces } from "../../api/places";

type ItineraryListItem = {
  id: string;
  title: string;
  destination?: string | null;
  duration_days?: number;
};

type EnrichedPlace = {
  id: number;
  name: string;
  category?: string | null;
  city?: string | null;
  country_code?: string | null;
  order: number;
};

type EnrichedDay = {
  day: number;
  date: string;
  title?: string | null;
  notes?: string | null;
  places: EnrichedPlace[];
};

type ItineraryDetail = {
  id: string;
  title: string;
  destination: string;
  duration_days: number;
  days: EnrichedDay[];
};

export default function ItineraryScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ItineraryListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ItineraryDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [section, setSection] = useState<"smart" | "manual" | "next">("smart");

  const [autoLoading, setAutoLoading] = useState(false);
  const [autoDestination, setAutoDestination] = useState("");
  const [autoDays, setAutoDays] = useState("3");
  const [autoStyle, setAutoStyle] = useState<
    "adventurous" | "relaxing" | "fun"
  >("fun");
  const [draft, setDraft] = useState<any | null>(null);
  const [draftSearch, setDraftSearch] = useState("");
  const [draftResults, setDraftResults] = useState<any[]>([]);
  const [activeSlot, setActiveSlot] = useState<{
    dayIndex: number;
    slot: "morning" | "afternoon" | "evening";
  } | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formDestination, setFormDestination] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  const activeDays = useMemo(() => detail?.days ?? [], [detail]);

  useEffect(() => {
    loadList();
  }, []);

  const loadList = async () => {
    try {
      setLoading(true);
      const res = await getMyItineraries();
      const data = res.data ?? [];
      setItems(
        data.map((it: any) => ({
          id: String(it.id),
          title: it.title,
          destination: it.destination ?? null,
          duration_days: it.duration_days ?? null,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    try {
      const res = await getItineraryById(id);
      setDetail(res.data);
    } catch {
      setDetail(null);
    }
  };

  const handleCreate = async () => {
    if (!formTitle || !formDestination || !formStartDate || !formEndDate) {
      return;
    }

    setCreating(true);
    try {
      const start = new Date(formStartDate);
      const end = new Date(formEndDate);
      const msPerDay = 24 * 60 * 60 * 1000;
      const totalDays = Math.max(
        1,
        Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1
      );
      const days = Array.from({ length: totalDays }, (_, idx) => {
        const date = new Date(start.getTime() + idx * msPerDay);
        return {
          day: idx + 1,
          date: date.toISOString().slice(0, 10),
          places: [],
        };
      });

      const payload = {
        title: formTitle,
        destination: formDestination,
        start_date: formStartDate,
        end_date: formEndDate,
        days,
      };
      await createItinerary(payload);
      setFormTitle("");
      setFormDestination("");
      setFormStartDate("");
      setFormEndDate("");
      await loadList();
    } finally {
      setCreating(false);
    }
  };

  const handleAutoBuild = async () => {
    if (!autoDestination.trim()) return;
    const days = Number(autoDays);
    if (!Number.isFinite(days) || days < 1) return;

    setAutoLoading(true);
    try {
      const res = await createAutoItinerary({
        destination: autoDestination.trim(),
        days,
        style: autoStyle,
      });
      setDraft(res.data);
    } finally {
      setAutoLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (draftSearch.trim().length < 2) {
      setDraftResults([]);
      return;
    }
    searchPlaces(draftSearch.trim())
      .then((res) => {
        if (active) setDraftResults(res.data ?? []);
      })
      .catch(() => {
        if (active) setDraftResults([]);
      });
    return () => {
      active = false;
    };
  }, [draftSearch]);

  const addPlaceToDraft = (place: any) => {
    if (!draft || !activeSlot) return;
    const next = { ...draft };
    const day = next.days?.[activeSlot.dayIndex];
    if (!day?.slots?.[activeSlot.slot]) return;

    const already = day.slots[activeSlot.slot].some(
      (p: any) => p.place_id === place.id
    );
    if (already) return;

    day.slots[activeSlot.slot].push({
      place_id: place.id,
      name: place.title,
      category: place.category,
    });
    setDraft(next);
    setDraftSearch("");
    setDraftResults([]);
  };

  const saveDraft = async () => {
    if (!draft) return;
    await saveDraftItinerary(draft);
    setDraft(null);
    await loadList();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Travel Itinerary Planner</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadList}>
          <Ionicons name="refresh" size={18} color="#111827" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#0f9d58" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.topTabs}>
            <TouchableOpacity
              style={[styles.topTab, section === "smart" && styles.topTabActive]}
              onPress={() => setSection("smart")}
            >
              <Text
                style={[
                  styles.topTabText,
                  section === "smart" && styles.topTabTextActive,
                ]}
              >
                Smart Build
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.topTab, section === "manual" && styles.topTabActive]}
              onPress={() => setSection("manual")}
            >
              <Text
                style={[
                  styles.topTabText,
                  section === "manual" && styles.topTabTextActive,
                ]}
              >
                Manual Entry
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.topTab, section === "next" && styles.topTabActive]}
              onPress={() => setSection("next")}
            >
              <Text
                style={[
                  styles.topTabText,
                  section === "next" && styles.topTabTextActive,
                ]}
              >
                Next Stop
              </Text>
            </TouchableOpacity>
          </View>

          {section === "smart" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Smart Build</Text>
              <View style={styles.card}>
                <Text style={styles.inputLabel}>Where to?</Text>
                <TextInput
                  placeholder="City or country"
                  value={autoDestination}
                  onChangeText={setAutoDestination}
                  style={styles.input}
                />
                <Text style={styles.inputLabel}>How many days?</Text>
                <TextInput
                  placeholder="Days"
                  value={autoDays}
                  onChangeText={setAutoDays}
                  keyboardType="numeric"
                  style={styles.input}
                />
                <Text style={styles.inputLabel}>Vacation Type</Text>
                <View style={styles.chipRow}>
                  {(["adventurous", "relaxing", "fun"] as const).map((style) => (
                    <TouchableOpacity
                      key={style}
                      style={[
                        styles.chip,
                        autoStyle === style && styles.chipActive,
                      ]}
                      onPress={() => setAutoStyle(style)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          autoStyle === style && styles.chipTextActive,
                        ]}
                      >
                        {style}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleAutoBuild}
                  disabled={autoLoading}
                >
                  <Text style={styles.primaryBtnText}>
                    {autoLoading ? "Building..." : "Build My Trip"}
                  </Text>
                </TouchableOpacity>
              </View>

              {draft && (
                <View style={styles.draftCard}>
                  <Text style={styles.sectionTitle}>Draft plan</Text>
                  {draft.days?.map((day: any, dayIndex: number) => (
                    <View key={day.day} style={styles.dayBlock}>
                      <Text style={styles.dayTitle}>Day {day.day}</Text>
                      {(["morning", "afternoon", "evening"] as const).map(
                        (slot) => (
                          <View key={slot} style={styles.slotBlock}>
                            <View style={styles.slotHeader}>
                              <Text style={styles.slotTitle}>{slot}</Text>
                              <TouchableOpacity
                                onPress={() =>
                                  setActiveSlot({ dayIndex, slot })
                                }
                              >
                                <Ionicons
                                  name="add-circle"
                                  size={18}
                                  color="#0f9d58"
                                />
                              </TouchableOpacity>
                            </View>
                            {(day.slots?.[slot] ?? []).map((p: any) => (
                              <Text key={p.place_id} style={styles.placeName}>
                                {p.name}
                              </Text>
                            ))}
                          </View>
                        )
                      )}
                    </View>
                  ))}

                  {activeSlot && (
                    <View style={styles.searchBlock}>
                      <Text style={styles.sectionTitle}>Add place</Text>
                      <TextInput
                        placeholder="Search places"
                        value={draftSearch}
                        onChangeText={setDraftSearch}
                        style={styles.input}
                      />
                      {draftResults.map((p) => (
                        <TouchableOpacity
                          key={p.id}
                          style={styles.searchResult}
                          onPress={() => addPlaceToDraft(p)}
                        >
                          <Text style={styles.placeName}>{p.title}</Text>
                          <Text style={styles.placeMeta}>
                            {p.category ?? "place"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity style={styles.primaryBtn} onPress={saveDraft}>
                    <Text style={styles.primaryBtnText}>
                      Save to my itineraries
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {section === "manual" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Manual Entry</Text>
              <View style={styles.card}>
                <TextInput
                  placeholder="Trip title"
                  value={formTitle}
                  onChangeText={setFormTitle}
                  style={styles.input}
                />
                <TextInput
                  placeholder="Destination"
                  value={formDestination}
                  onChangeText={setFormDestination}
                  style={styles.input}
                />
                <View style={styles.rowInputs}>
                  <TextInput
                    placeholder="Start date (YYYY-MM-DD)"
                    value={formStartDate}
                    onChangeText={setFormStartDate}
                    style={[styles.input, styles.inputHalf]}
                  />
                  <TextInput
                    placeholder="End date (YYYY-MM-DD)"
                    value={formEndDate}
                    onChangeText={setFormEndDate}
                    style={[styles.input, styles.inputHalf]}
                  />
                </View>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleCreate}
                  disabled={creating}
                >
                  <Text style={styles.primaryBtnText}>
                    {creating ? "Saving..." : "Save Itinerary"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {section === "next" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Next Stop</Text>
              <View style={styles.card}>
                <Text style={styles.emptyText}>
                  Quick-add from saved places will show here.
                </Text>
                <TouchableOpacity style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Browse Saved Places</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My itineraries</Text>
            {items.length === 0 && (
              <Text style={styles.emptyText}>No itineraries yet.</Text>
            )}
            {items.map((it) => (
              <TouchableOpacity
                key={it.id}
                style={[
                  styles.card,
                  selectedId === it.id && styles.cardActive,
                ]}
                onPress={() => openDetail(it.id)}
              >
                <Text style={styles.cardTitle}>{it.title}</Text>
                <Text style={styles.cardSub}>
                  {it.destination ?? "Unknown destination"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {detail && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Itinerary details</Text>
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>{detail.title}</Text>
                <Text style={styles.detailSub}>{detail.destination}</Text>
                <Text style={styles.detailMeta}>
                  {detail.duration_days} day(s)
                </Text>
              </View>

              {activeDays.map((day) => (
                <View key={day.day} style={styles.dayBlock}>
                  <Text style={styles.dayTitle}>
                    Day {day.day} - {day.date}
                  </Text>
                  {day.places.length === 0 && (
                    <Text style={styles.emptyText}>No places yet.</Text>
                  )}
                  {day.places.map((place) => (
                    <View key={place.id} style={styles.placeRow}>
                      <Text style={styles.placeName}>{place.name}</Text>
                      {!!place.category && (
                        <Text style={styles.placeMeta}>{place.category}</Text>
                      )}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f7fb",
    paddingTop: 44,
  },
  header: {
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 120,
  },
  topTabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  topTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
  },
  topTabActive: {
    backgroundColor: "#0f9d58",
  },
  topTabText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  topTabTextActive: {
    color: "#fff",
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 10,
    color: "#111827",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  inputLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 6,
  },
  rowInputs: {
    flexDirection: "row",
    gap: 8,
  },
  inputHalf: {
    flex: 1,
  },
  primaryBtn: {
    backgroundColor: "#0f9d58",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardActive: {
    borderColor: "#0f9d58",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  cardSub: {
    color: "#6b7280",
    marginTop: 4,
  },
  emptyText: {
    color: "#9ca3af",
    marginBottom: 8,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryBtnText: {
    color: "#111827",
    fontWeight: "600",
  },
  detailCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  detailSub: {
    color: "#6b7280",
    marginTop: 4,
  },
  detailMeta: {
    marginTop: 6,
    color: "#111827",
    fontWeight: "600",
  },
  dayBlock: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },
  dayTitle: {
    fontWeight: "600",
    marginBottom: 8,
  },
  placeRow: {
    paddingVertical: 6,
  },
  placeName: {
    fontWeight: "600",
  },
  placeMeta: {
    color: "#6b7280",
    fontSize: 12,
  },
  draftCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 12,
  },
  slotBlock: {
    paddingVertical: 8,
  },
  slotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  slotTitle: {
    fontWeight: "600",
    textTransform: "capitalize",
  },
  searchBlock: {
    marginTop: 10,
  },
  searchResult: {
    paddingVertical: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: "#0f9d58",
  },
  chipText: {
    fontSize: 12,
    textTransform: "capitalize",
  },
  chipTextActive: {
    color: "#fff",
  },
});
