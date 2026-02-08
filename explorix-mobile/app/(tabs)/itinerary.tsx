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
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as Calendar from "expo-calendar";
import * as Location from "expo-location";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import Slider from "@react-native-community/slider";
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";
import {
  createItinerary,
  createAutoItinerary,
  createAutoItineraryNearby,
  getItineraryById,
  getMyItineraries,
  saveDraftItinerary,
  deleteItinerary,
  updateItinerary,
  getNextStops,
  removeNextStop,
} from "../../api/itinerary";
import { searchPlaces } from "../../api/places";

type ItineraryListItem = {
  id: string;
  title: string;
  destination?: string | null;
  duration_days?: number;
  start_date?: string | null;
  end_date?: string | null;
  travel_style?: string | null;
  tags?: string[] | null;
};

type EnrichedPlace = {
  id: number;
  name: string;
  category?: string | null;
  city?: string | null;
  country_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
  travel_style?: string | null;
  tags?: string[] | null;
  days: EnrichedDay[];
};

export default function ItineraryScreen() {
  const router = useRouter();
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
  const [smartStartDate, setSmartStartDate] = useState("");
  const [smartStartDateValue, setSmartStartDateValue] = useState(new Date());
  const [showSmartStartPicker, setShowSmartStartPicker] = useState(false);
  const [destinationCategories, setDestinationCategories] = useState<string[]>(
    []
  );
  const [useNearby, setUseNearby] = useState(false);
  const [nearbyCategories, setNearbyCategories] = useState<string[]>([]);
  const [nearbyRadius, setNearbyRadius] = useState(5);
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
  const [startDateValue, setStartDateValue] = useState(new Date());
  const [endDateValue, setEndDateValue] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [nextStops, setNextStops] = useState<any[]>([]);
  const [deletingItineraryId, setDeletingItineraryId] = useState<string | null>(
    null
  );
  const [deletingPlaceKey, setDeletingPlaceKey] = useState<string | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const activeDays = useMemo(() => detail?.days ?? [], [detail]);
  const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
  const formatDate = (d: Date) => d.toISOString().slice(0, 10);
  const detailDateRange = useMemo(() => {
    if (!detail?.days?.length) return null;
    const start = detail.days[0]?.date;
    const end = detail.days[detail.days.length - 1]?.date;
    if (!start || !end) return null;
    return `${start} - ${end}`;
  }, [detail]);

  const detailLocation = useMemo(() => {
    if (!detail?.days?.length) return detail?.destination ?? "";
    for (const day of detail.days) {
      for (const place of day.places) {
        if (place.city || place.country_code) {
          const city = place.city ?? detail.destination;
          const country = place.country_code ?? "";
          return `${city}${country ? `, ${country}` : ""}`;
        }
      }
    }
    return detail.destination;
  }, [detail]);

  const addItineraryToCalendar = async () => {
    if (!detail) return;
    setCalendarLoading(true);
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Calendar access is required.");
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT
      );
      const defaultCalendar =
        calendars.find((cal) => cal.allowsModifications) ?? calendars[0];
      if (!defaultCalendar) {
        Alert.alert("No calendar", "No writable calendar found.");
        return;
      }

      for (const day of detail.days) {
        const start = new Date(day.date);
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        const notes =
          day.places && day.places.length > 0
            ? day.places.map((p) => `• ${p.name}`).join("\n")
            : "No places added yet.";

        await Calendar.createEventAsync(defaultCalendar.id, {
          title: `${detail.title} - Day ${day.day}`,
          startDate: start,
          endDate: end,
          allDay: true,
          notes,
          location: detailLocation ?? detail.destination,
        });
      }

      Alert.alert("Added", "Itinerary added to your calendar.");
    } catch {
      Alert.alert("Failed", "Could not add events to calendar.");
    } finally {
      setCalendarLoading(false);
    }
  };

  const getTripStatus = (start?: string | null, end?: string | null) => {
    if (!start || !end) return null;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return null;
    }
    const today = new Date();
    const todayOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    if (endDate < todayOnly) return "PAST";
    if (startDate > todayOnly) return "SOON";
    return "CURRENT";
  };

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    loadNextStops();
  }, [section]);

  useFocusEffect(
    useMemo(
      () => () => {
        loadNextStops();
      },
      []
    )
  );

  async function loadNextStops() {
    try {
      const res = await getNextStops();
      const list = Array.isArray(res.data) ? res.data : [];
      if (list.length > 0) {
        setNextStops(list);
        return;
      }
      const local = await import("../../utils/nextStops");
      const fallback = await local.loadNextStops();
      setNextStops(Array.isArray(fallback) ? fallback : []);
    } catch {
      try {
        const local = await import("../../utils/nextStops");
        const fallback = await local.loadNextStops();
        setNextStops(Array.isArray(fallback) ? fallback : []);
      } catch {
        setNextStops([]);
      }
    }
  }

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
          start_date: it.start_date ?? null,
          end_date: it.end_date ?? null,
          travel_style: it.travel_style ?? null,
          tags: Array.isArray(it.tags) ? it.tags : [],
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (id: string) => {
    if (selectedId === id) {
      setSelectedId(null);
      setDetail(null);
      return;
    }

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
      await wait(1200);
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
      const today = new Date();
      setStartDateValue(today);
      setEndDateValue(today);
      await loadList();
    } finally {
      await wait(1200);
      setCreating(false);
    }
  };

  const handleAutoBuild = async () => {
    const days = Number(autoDays);
    if (!Number.isFinite(days) || days < 1) return;

    setAutoLoading(true);
    try {
      await wait(1200);
      if (useNearby) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission needed", "Location access is required.");
          return;
        }
        const current = await Location.getCurrentPositionAsync({});
        const radiusKm = nearbyRadius || 5;
        const res = await createAutoItineraryNearby({
          lat: current.coords.latitude,
          lon: current.coords.longitude,
          radiusKm,
          days,
          style: autoStyle,
          category: nearbyCategories.length
            ? nearbyCategories.join(",")
            : null,
        });
        setDraft({
          ...res.data,
          travel_style: res.data?.travel_style ?? autoStyle,
          selected_categories:
            res.data?.selected_categories ??
            (nearbyCategories.length ? nearbyCategories : []),
        });
      } else {
        if (!autoDestination.trim()) return;
        const res = await createAutoItinerary({
          destination: autoDestination.trim(),
          days,
          style: autoStyle,
          category: destinationCategories.length
            ? destinationCategories.join(",")
            : null,
          start_date: smartStartDate || null,
        });
        setDraft({
          ...res.data,
          travel_style: res.data?.travel_style ?? autoStyle,
          selected_categories:
            res.data?.selected_categories ??
            (destinationCategories.length ? destinationCategories : []),
        });
      }
    } finally {
      await wait(1200);
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

  const removeDraftPlace = (
    dayIndex: number,
    slot: "morning" | "afternoon" | "evening",
    placeId: number
  ) => {
    setDraft((prev: any) => {
      if (!prev?.days?.[dayIndex]?.slots?.[slot]) return prev;
      const next = { ...prev };
      next.days = [...prev.days];
      const day = { ...next.days[dayIndex] };
      day.slots = { ...day.slots };
      day.slots[slot] = (day.slots[slot] ?? []).filter(
        (p: any) => p.place_id !== placeId
      );
      next.days[dayIndex] = day;
      return next;
    });
  };

  const saveDraft = async () => {
    if (!draft) return;
    await saveDraftItinerary(draft);
    setDraft(null);
    await loadList();
  };

  const removePlaceFromItinerary = async (
    itineraryId: string,
    dayIndex: number,
    placeId: number
  ) => {
    if (!detail) return;
    const key = `${itineraryId}:${dayIndex}:${placeId}`;
    setDeletingPlaceKey(key);
    await wait(800);
    const nextDays = detail.days.map((day, idx) => {
      if (idx !== dayIndex) return day;
      return {
        ...day,
        places: day.places.filter((p) => p.id !== placeId),
      };
    });

    const payloadDays = nextDays.map((day, index) => ({
      day: day.day ?? index + 1,
      date: String(day.date),
      places: day.places.map((p, orderIndex) => ({
        place_id: p.id,
        order: orderIndex + 1,
      })),
    }));

    await updateItinerary(itineraryId, { days: payloadDays });
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            days: nextDays,
            duration_days: nextDays.length,
          }
        : prev
    );
    setDeletingPlaceKey(null);
  };

  const updateDays = async (
    itineraryId: string,
    nextDays: EnrichedDay[]
  ) => {
    const payloadDays = nextDays.map((day, index) => ({
      day: day.day ?? index + 1,
      date: String(day.date),
      places: day.places.map((p, orderIndex) => ({
        place_id: p.id,
        order: orderIndex + 1,
      })),
    }));
    await updateItinerary(itineraryId, { days: payloadDays });
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            days: nextDays,
            duration_days: nextDays.length,
          }
        : prev
    );
  };

  const handleReorderDay = async (
    itineraryId: string,
    dayIndex: number,
    places: EnrichedPlace[]
  ) => {
    if (!detail) return;
    const nextDays = detail.days.map((day, idx) =>
      idx === dayIndex ? { ...day, places } : day
    );
    await updateDays(itineraryId, nextDays);
  };

  const goToPlace = (place: {
    id: number;
    title: string;
    latitude: number;
    longitude: number;
    category?: string | null;
  }) => {
    router.push({
      pathname: "/explore",
      params: {
        placeId: String(place.id),
        placeTitle: place.title,
        placeLat: String(place.latitude),
        placeLng: String(place.longitude),
        placeCategory: place.category ?? "",
        autoRoute: "1",
      },
    });
  };

  const goToTransport = (place: {
    id: number;
    title: string;
    latitude: number;
    longitude: number;
  }) => {
    router.push({
      pathname: "/transport",
      params: {
        autoTransport: "1",
        toName: place.title,
        destLat: String(place.latitude),
        destLng: String(place.longitude),
      },
    });
  };


  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete itinerary?",
      "This will remove the itinerary permanently.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingItineraryId(id);
            await wait(800);
            await deleteItinerary(id);
            setSelectedId(null);
            setDetail(null);
            await loadList();
            await wait(800);
            setDeletingItineraryId(null);
          },
        },
      ]
    );
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
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      !useNearby && styles.toggleBtnActive,
                    ]}
                    onPress={() => setUseNearby(false)}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        !useNearby && styles.toggleTextActive,
                      ]}
                    >
                      Destination
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      useNearby && styles.toggleBtnActive,
                    ]}
                    onPress={() => setUseNearby(true)}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        useNearby && styles.toggleTextActive,
                      ]}
                    >
                      Current location
                    </Text>
                  </TouchableOpacity>
                </View>

                {!useNearby ? (
                  <>
                    <Text style={styles.inputLabel}>Where to?</Text>
                    <TextInput
                      placeholder="City or country"
                      placeholderTextColor="#94a3b8"
                      value={autoDestination}
                      onChangeText={setAutoDestination}
                      style={styles.input}
                    />
                    <Text style={styles.inputLabel}>Category</Text>
                    <View style={styles.chipRow}>
                      {[
                        "food",
                        "nature",
                        "culture",
                        "shopping",
                        "sports",
                        "stay",
                        "entertainment",
                        "nightlife",
                      ].map((cat) => {
                        const active = destinationCategories.includes(cat);
                        return (
                          <TouchableOpacity
                            key={cat}
                            style={[
                              styles.chip,
                              active && styles.chipActive,
                            ]}
                            onPress={() => {
                              setDestinationCategories((prev) =>
                                prev.includes(cat)
                                  ? prev.filter((c) => c !== cat)
                                  : [...prev, cat]
                              );
                            }}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                active && styles.chipTextActive,
                              ]}
                            >
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <Text style={styles.inputLabel}>Start date</Text>
                    <TouchableOpacity
                      style={[styles.input, styles.dateButton]}
                      onPress={() => setShowSmartStartPicker(true)}
                    >
                      <Text style={smartStartDate ? styles.dateText : styles.datePlaceholder}>
                        {smartStartDate || "Select date"}
                      </Text>
                      <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                    </TouchableOpacity>
                    {showSmartStartPicker && (
                      <DateTimePicker
                        value={smartStartDateValue}
                        mode="date"
                        display={Platform.OS === "ios" ? "compact" : "default"}
                        onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                          if (Platform.OS !== "ios") setShowSmartStartPicker(false);
                          if (event.type === "dismissed" || !selectedDate) return;
                          setSmartStartDateValue(selectedDate);
                          setSmartStartDate(formatDate(selectedDate));
                          if (Platform.OS === "ios") setShowSmartStartPicker(false);
                        }}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <Text style={styles.inputLabel}>Category</Text>
                    <View style={styles.chipRow}>
                      {[
                        "food",
                        "events",
                        "nature",
                        "culture",
                        "shopping",
                        "nightlife",
                        "sports",
                        "wellness",
                        "stay",
                        "entertainment",
                      ].map((cat) => {
                        const active = nearbyCategories.includes(cat);
                        return (
                          <TouchableOpacity
                            key={cat}
                            style={[
                              styles.chip,
                              active && styles.chipActive,
                            ]}
                            onPress={() => {
                              setNearbyCategories((prev) =>
                                prev.includes(cat)
                                  ? prev.filter((c) => c !== cat)
                                  : [...prev, cat]
                              );
                            }}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                active && styles.chipTextActive,
                              ]}
                            >
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <Text style={styles.inputLabel}>Radius (km)</Text>
                    <Text style={styles.radiusValue}>{nearbyRadius} km</Text>
                    <Slider
                      minimumValue={1}
                      maximumValue={80}
                      step={1}
                      value={nearbyRadius}
                      onValueChange={(v) => setNearbyRadius(v)}
                      minimumTrackTintColor="#0f9d58"
                      maximumTrackTintColor="#d1d5db"
                    />
                  </>
                )}
                <Text style={styles.inputLabel}>How many days?</Text>
                <TextInput
                  placeholder="Days"
                  placeholderTextColor="#94a3b8"
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
                  <View style={styles.btnRow}>
                    {autoLoading && (
                      <ActivityIndicator size="small" color="#ffffff" />
                    )}
                    <Text style={styles.primaryBtnText}>
                      {autoLoading ? "Building..." : "Build My Trip"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {draft && (
                <View style={styles.draftCard}>
                  <Text style={styles.sectionTitle}>Draft plan</Text>
                  <View style={styles.draftMetaWrap}>
                    {!!draft.travel_style && (
                      <View style={styles.detailBadge}>
                        <Text style={styles.detailBadgeText}>
                          STYLE: {String(draft.travel_style).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {Array.isArray(draft.selected_categories) &&
                      draft.selected_categories.slice(0, 4).map((cat: string) => (
                        <View key={cat} style={styles.detailBadge}>
                          <Text style={styles.detailBadgeText}>
                            {String(cat).toUpperCase()}
                          </Text>
                        </View>
                      ))}
                  </View>
                  {draft.days?.map((day: any, dayIndex: number) => (
                    <View key={day.day} style={styles.dayBlock}>
                      <Text style={styles.dayTitle}>Day {day.day}</Text>
                      {(["morning", "afternoon", "evening"] as const).map(
                        (slot) => (
                          <View key={slot} style={styles.slotBlock}>
                            <View style={styles.slotHeader}>
                              <Text style={styles.slotTitle}>{slot}</Text>
                            </View>
                            {(day.slots?.[slot] ?? []).map((p: any) => (
                              <View key={p.place_id} style={styles.placeRow}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.placeName}>{p.name}</Text>
                                  {!!p.category && (
                                    <Text style={styles.placeMeta}>
                                      {p.category}
                                    </Text>
                                  )}
                                </View>
                                <TouchableOpacity
                                  style={styles.iconTrashBtn}
                                  onPress={() =>
                                    removeDraftPlace(dayIndex, slot, p.place_id)
                                  }
                                >
                                  <Ionicons name="remove" size={14} color="#94a3b8" />
                                </TouchableOpacity>
                              </View>
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
                        placeholderTextColor="#94a3b8"
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
                  placeholderTextColor="#94a3b8"
                  value={formTitle}
                  onChangeText={setFormTitle}
                  style={styles.input}
                />
                <TextInput
                  placeholder="Destination"
                  placeholderTextColor="#94a3b8"
                  value={formDestination}
                  onChangeText={setFormDestination}
                  style={styles.input}
                />
                <View style={styles.rowInputs}>
                  <TouchableOpacity
                    style={[styles.input, styles.inputHalf, styles.dateButton]}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Text style={formStartDate ? styles.dateText : styles.datePlaceholder}>
                      {formStartDate || "Start date"}
                    </Text>
                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.input, styles.inputHalf, styles.dateButton]}
                    onPress={() => setShowEndPicker(true)}
                  >
                    <Text style={formEndDate ? styles.dateText : styles.datePlaceholder}>
                      {formEndDate || "End date"}
                    </Text>
                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                {showStartPicker && (
                  <DateTimePicker
                    value={startDateValue}
                    mode="date"
                    display={Platform.OS === "ios" ? "compact" : "default"}
                    onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                      if (Platform.OS !== "ios") setShowStartPicker(false);
                      if (event.type === "dismissed" || !selectedDate) return;
                      setStartDateValue(selectedDate);
                      setFormStartDate(formatDate(selectedDate));
                      if (!formEndDate || new Date(formEndDate) < selectedDate) {
                        setEndDateValue(selectedDate);
                        setFormEndDate(formatDate(selectedDate));
                      }
                      if (Platform.OS === "ios") setShowStartPicker(false);
                    }}
                  />
                )}
                {showEndPicker && (
                  <DateTimePicker
                    value={endDateValue}
                    mode="date"
                    minimumDate={startDateValue}
                    display={Platform.OS === "ios" ? "compact" : "default"}
                    onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                      if (Platform.OS !== "ios") setShowEndPicker(false);
                      if (event.type === "dismissed" || !selectedDate) return;
                      setEndDateValue(selectedDate);
                      setFormEndDate(formatDate(selectedDate));
                      if (Platform.OS === "ios") setShowEndPicker(false);
                    }}
                  />
                )}
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleCreate}
                  disabled={creating}
                >
                  <View style={styles.btnRow}>
                    {creating && (
                      <ActivityIndicator size="small" color="#ffffff" />
                    )}
                    <Text style={styles.primaryBtnText}>
                      {creating ? "Saving..." : "Save Itinerary"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {section === "next" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Next Stop</Text>
              <View style={styles.card}>
                {nextStops.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No saved stops yet. Add from Explore.
                  </Text>
                ) : (
                  nextStops.map((stop) => (
                    <View key={stop.id} style={styles.placeRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.placeName}>{stop.title}</Text>
                        {!!stop.category && (
                          <Text style={styles.placeMeta}>{stop.category}</Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => goToPlace(stop)}
                      >
                        <Text style={styles.actionText}>Navigate</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconTrashBtn}
                        onPress={async () => {
                          await removeNextStop(stop.id);
                          await loadNextStops();
                        }}
                      >
                        <Ionicons name="trash" size={14} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
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
                  styles.planCard,
                  selectedId === it.id && styles.cardActive,
                ]}
                onPress={() => openDetail(it.id)}
              >
                <View style={styles.planRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.planTitleRow}>
                      <Text style={styles.planTitle}>{it.title}</Text>
                      {getTripStatus(it.start_date, it.end_date) && (
                        <View style={styles.detailBadge}>
                          <Text style={styles.detailBadgeText}>
                            {getTripStatus(it.start_date, it.end_date)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.planDates}>
                      {it.start_date ?? "Date TBD"} - {it.end_date ?? "Date TBD"}
                    </Text>
                    <Text style={styles.planLocation}>
                      {(it.destination ?? "Unknown destination").toUpperCase()}
                    </Text>
                    <View style={styles.metaTagRow}>
                      {!!it.travel_style && (
                        <View style={styles.detailBadge}>
                          <Text style={styles.detailBadgeText}>
                            {it.travel_style.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      {(it.tags ?? []).slice(0, 2).map((tag) => (
                        <View key={`${it.id}-${tag}`} style={styles.detailBadge}>
                          <Text style={styles.detailBadgeText}>
                            {String(tag).toUpperCase()}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <Ionicons
                    name={selectedId === it.id ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#94a3b8"
                  />
                  <TouchableOpacity
                    style={styles.planTrashBtn}
                    onPress={() => handleDelete(it.id)}
                    disabled={deletingItineraryId === it.id}
                  >
                    {deletingItineraryId === it.id ? (
                      <ActivityIndicator size="small" color="#64748b" />
                    ) : (
                      <Ionicons name="trash" size={16} color="#94a3b8" />
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {detail && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Itinerary details</Text>
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.detailTitleRow}>
                      <Text style={styles.detailTitle}>{detail.title}</Text>
                      {getTripStatus(
                        detail.days?.[0]?.date,
                        detail.days?.[detail.days.length - 1]?.date
                      ) && (
                        <View style={styles.detailBadge}>
                          <Text style={styles.detailBadgeText}>
                            {getTripStatus(
                              detail.days?.[0]?.date,
                              detail.days?.[detail.days.length - 1]?.date
                            )}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.detailDates}>
                      {detailDateRange ?? "Date TBD"}
                    </Text>
                  <Text style={styles.detailLocation}>
                    {(detailLocation ?? detail.destination).toUpperCase()}
                  </Text>
                  <View style={styles.metaTagRow}>
                    {!!detail.travel_style && (
                      <View style={styles.detailBadge}>
                        <Text style={styles.detailBadgeText}>
                          {detail.travel_style.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {(detail.tags ?? []).slice(0, 4).map((tag) => (
                      <View key={`${detail.id}-${tag}`} style={styles.detailBadge}>
                        <Text style={styles.detailBadgeText}>
                          {String(tag).toUpperCase()}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
                  <TouchableOpacity
                    style={styles.detailCalendarBtn}
                    onPress={addItineraryToCalendar}
                    disabled={calendarLoading}
                  >
                    {calendarLoading ? (
                      <ActivityIndicator size="small" color="#0f9d58" />
                    ) : (
                      <Ionicons name="calendar" size={16} color="#0f9d58" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.detailTrashBtn}
                    onPress={() => handleDelete(detail.id)}
                    disabled={deletingItineraryId === detail.id}
                  >
                    {deletingItineraryId === detail.id ? (
                      <ActivityIndicator size="small" color="#64748b" />
                    ) : (
                      <Ionicons name="trash" size={16} color="#94a3b8" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {activeDays.map((day, dayIndex) => (
                <View key={day.day} style={styles.dayBlock}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayTitle}>
                      Day {day.day} - {day.date}
                    </Text>
                    {day.places.length > 0 &&
                      day.places[0].latitude != null &&
                      day.places[0].longitude != null && (
                        <TouchableOpacity
                          style={styles.startDayBtn}
                          onPress={() =>
                            goToPlace({
                              id: day.places[0].id,
                              title: day.places[0].name,
                              latitude: day.places[0].latitude as number,
                              longitude: day.places[0].longitude as number,
                              category: day.places[0].category ?? null,
                            })
                          }
                        >
                          <Ionicons name="navigate" size={14} color="#fff" />
                          <Text style={styles.startDayText}>Start day</Text>
                        </TouchableOpacity>
                      )}
                  </View>
                  {day.places.length === 0 && (
                    <Text style={styles.emptyText}>No places yet.</Text>
                  )}
                  <DraggableFlatList
                    data={day.places}
                    keyExtractor={(item) => String(item.id)}
                    scrollEnabled={false}
                    onDragEnd={({ data }) =>
                      handleReorderDay(detail.id, dayIndex, data)
                    }
                    renderItem={({
                      item: place,
                      drag,
                      isActive,
                    }: RenderItemParams<EnrichedPlace>) => (
                      <View
                        style={[
                          styles.placeRow,
                          isActive && styles.placeRowActive,
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.dragHandle}
                          onLongPress={drag}
                        >
                          <Ionicons name="reorder-three" size={18} color="#64748b" />
                        </TouchableOpacity>
                        <View style={styles.placeInfo}>
                          <Text style={styles.placeName}>{place.name}</Text>
                          {!!place.category && (
                            <Text style={styles.placeMeta}>{place.category}</Text>
                          )}
                        </View>
                        <View style={styles.placeActions}>
                          {place.latitude != null &&
                            place.longitude != null && (
                              <TouchableOpacity
                                style={styles.iconNavBtn}
                                onPress={() =>
                                  goToPlace({
                                    id: place.id,
                                    title: place.name,
                                    latitude: place.latitude as number,
                                    longitude: place.longitude as number,
                                    category: place.category ?? null,
                                  })
                                }
                              >
                                <Ionicons name="navigate" size={16} color="#fff" />
                              </TouchableOpacity>
                            )}
                          {place.latitude != null &&
                            place.longitude != null && (
                              <TouchableOpacity
                                style={styles.iconTransportBtn}
                                onPress={() =>
                                  goToTransport({
                                    id: place.id,
                                    title: place.name,
                                    latitude: place.latitude as number,
                                    longitude: place.longitude as number,
                                  })
                                }
                              >
                                <Ionicons name="bus" size={15} color="#fff" />
                              </TouchableOpacity>
                            )}
                          <TouchableOpacity
                            style={styles.iconTrashBtn}
                            onPress={() =>
                              removePlaceFromItinerary(
                                detail.id,
                                dayIndex,
                                place.id
                              )
                            }
                            disabled={
                              deletingPlaceKey ===
                              `${detail.id}:${dayIndex}:${place.id}`
                            }
                          >
                            {deletingPlaceKey ===
                            `${detail.id}:${dayIndex}:${place.id}` ? (
                              <ActivityIndicator size="small" color="#64748b" />
                            ) : (
                              <Ionicons name="trash" size={14} color="#94a3b8" />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  />
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
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: {
    color: "#111827",
    fontSize: 14,
  },
  datePlaceholder: {
    color: "#94a3b8",
    fontSize: 14,
  },
  radiusValue: {
    color: "#111827",
    fontWeight: "600",
    marginBottom: 6,
  },
  primaryBtn: {
    backgroundColor: "#0f9d58",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  planCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  planDates: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 12,
  },
  planLocation: {
    marginTop: 2,
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "700",
  },
  planTrashBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
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
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  detailBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  detailBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0284c7",
  },
  detailDates: {
    marginTop: 6,
    color: "#64748b",
    fontSize: 12,
  },
  detailLocation: {
    marginTop: 2,
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "700",
  },
  metaTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  draftMetaWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  detailTrashBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  detailCalendarBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
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
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  startDayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#3b82f6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  startDayText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  placeRow: {
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  placeRowActive: {
    backgroundColor: "#eef2ff",
    borderRadius: 10,
    paddingHorizontal: 6,
  },
  dragHandle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontWeight: "600",
  },
  placeMeta: {
    color: "#6b7280",
    fontSize: 12,
  },
  placeActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  iconTransportBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  iconTrashBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
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
  toggleRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#0f9d58",
  },
  toggleText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  toggleTextActive: {
    color: "#fff",
  },
});
