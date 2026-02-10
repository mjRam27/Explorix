// app/(tabs)/transport.tsx
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  Text,
  Keyboard,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";

import TransportMap from "../../components/transport/TransportMap";
import JourneySheet from "../../components/transport/JourneySheet";
import FromToInputs from "../../components/transport/FromToInputs";
import DateTimeModal from "../../components/transport/DateTimeModal";
import { getJourneys, getNearbyStations, getStations } from "../../api/transport";



export default function TransportScreen() {
  const params = useLocalSearchParams();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);

  const [dateTime, setDateTime] = useState(new Date());
  const [showDateModal, setShowDateModal] = useState(false);

  const [searchActive, setSearchActive] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<any>(null);
  const [journeys, setJourneys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeField, setActiveField] = useState<"from" | "to" | null>(null);
  const [autoSearchMessage, setAutoSearchMessage] = useState<string | null>(null);
  const [nearestLoading, setNearestLoading] = useState(false);
  const lastAutoTransportKeyRef = useRef<string>("");
  const suggestionCacheRef = useRef<Map<string, any[]>>(new Map());
  const suggestionReqSeqRef = useRef(0);
  const isStationId = (value: string | null | undefined) =>
    !!value && (value.includes(":") || /^[0-9]+$/.test(value));
  const pickNearestWithDistance = (list: any[], _maxMeters: number) => {
    if (!Array.isArray(list) || list.length === 0) return null;
    const withDistance = list
      .filter((x) => typeof x?.distance === "number" && Number.isFinite(x.distance))
      .sort((a, b) => a.distance - b.distance);
    if (withDistance.length > 0) {
      return withDistance[0];
    }
    return null;
  };

  useEffect(() => {
    const query = activeField === "from" ? from : activeField === "to" ? to : "";
    const normalized = query.trim().toLowerCase();
    if (!normalized || normalized.length < 2) {
      setSuggestions([]);
      return;
    }

    const cached = suggestionCacheRef.current.get(normalized);
    if (cached) {
      setSuggestions(cached);
      return;
    }

    // Fast local fallback from nearest cached prefix while network request runs.
    let prefixSeeded = false;
    const closestPrefix = Array.from(suggestionCacheRef.current.keys())
      .filter((k) => normalized.startsWith(k))
      .sort((a, b) => b.length - a.length)[0];
    if (closestPrefix) {
      const seeded = (suggestionCacheRef.current.get(closestPrefix) || [])
        .filter((item: any) =>
          String(item?.name || "").toLowerCase().includes(normalized)
        )
        .slice(0, 20);
      if (seeded.length > 0) {
        setSuggestions(seeded);
        prefixSeeded = true;
      }
    }

    suggestionReqSeqRef.current += 1;
    const reqSeq = suggestionReqSeqRef.current;
    const timer = setTimeout(async () => {
      try {
        const res = await getStations(query.trim());
        if (reqSeq !== suggestionReqSeqRef.current) return;
        const data = Array.isArray(res.data) ? res.data : [];
        suggestionCacheRef.current.set(normalized, data);
        setSuggestions(data);
      } catch {
        if (!prefixSeeded) setSuggestions([]);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [from, to, activeField]);

  const runJourneySearch = async (fromValue: string, toValue: string) => {
    if (!fromValue.trim() || !toValue.trim()) {
      Alert.alert("Missing stations", "Please enter From and To");
      return;
    }

    setLoading(true);
    try {
      const res = await getJourneys({
        from: fromValue.trim(),
        to: toValue.trim(),
        departure: dateTime.toISOString(),
      });
      if (res.data?.status === "error") {
        const msg = String(res.data?.message || "No journey found");
        if (msg.includes("503") || msg.toLowerCase().includes("service unavailable")) {
          Alert.alert(
            "Provider busy",
            "Transport provider is temporarily unavailable. Please retry in a few seconds."
          );
        } else {
          Alert.alert("No journeys", msg);
        }
        setJourneys([]);
        setSearchActive(true);
        return;
      }

      const list = Array.isArray(res.data?.journeys)
        ? res.data.journeys
        : Array.isArray(res.data)
        ? res.data
        : [];
      setJourneys(list);
      setSearchActive(true);
    } catch {
      Alert.alert("No journeys", "Please try a different time or route.");
    } finally {
      setLoading(false);
    }
  };

  const resolveInputToStationId = async (value: string): Promise<string | null> => {
    const raw = value.trim();
    if (!raw) return null;
    if (isStationId(raw)) return raw;
    try {
      const res = await getStations(raw);
      const list = Array.isArray(res.data) ? res.data : [];
      if (list.length === 0) return null;
      const exact = list.find(
        (item: any) => String(item?.name || "").trim().toLowerCase() === raw.toLowerCase()
      );
      const picked = exact || list[0];
      return picked?.id ? String(picked.id) : null;
    } catch {
      return null;
    }
  };

  const handleSearch = async () => {
    let resolvedFrom = fromId || from;
    let resolvedTo = toId || to;

    if (!isStationId(resolvedFrom)) {
      const stationId = await resolveInputToStationId(from);
      if (stationId) {
        resolvedFrom = stationId;
        setFromId(stationId);
      }
    }
    if (!isStationId(resolvedTo)) {
      const stationId = await resolveInputToStationId(to);
      if (stationId) {
        resolvedTo = stationId;
        setToId(stationId);
      }
    }

    if (!isStationId(resolvedFrom) || !isStationId(resolvedTo)) {
      Alert.alert(
        "Pick stations from suggestions",
        "We could not resolve station IDs for both stops. Please pick From and To from suggestions."
      );
      return;
    }
    await runJourneySearch(resolvedFrom, resolvedTo);
  };

  const bootstrapNearestStation = async () => {
    setNearestLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setAutoSearchMessage("Location permission denied. Please enter From station manually.");
        return null;
      }
      const current = await Location.getCurrentPositionAsync({});
      const stationRes = await getNearbyStations({
        lat: current.coords.latitude,
        lon: current.coords.longitude,
        results: 20,
        distance: 6000,
      });
      const firstStation = pickNearestWithDistance(stationRes.data, 4000);
      if (firstStation?.name) {
        setFrom(firstStation.name);
        setFromId(firstStation.id ?? null);
        if (typeof firstStation.distance === "number" && firstStation.distance > 4000) {
          setAutoSearchMessage(
            `Using closest station (${(firstStation.distance / 1000).toFixed(
              1
            )} km away).`
          );
        } else {
          setAutoSearchMessage(null);
        }
        return (firstStation.id || firstStation.name) as string;
      }
      setAutoSearchMessage("Nearest station not found. Please enter From station manually.");
      return null;
    } catch {
      setAutoSearchMessage("Auto origin failed. Please pick a From station manually.");
      return null;
    } finally {
      setNearestLoading(false);
    }
  };

  useEffect(() => {
    const autoTransport = params?.autoTransport === "1";
    const toName = typeof params?.toName === "string" ? params.toName : "";
    const destLat = typeof params?.destLat === "string" ? Number(params.destLat) : null;
    const destLng = typeof params?.destLng === "string" ? Number(params.destLng) : null;
    if (!autoTransport || !toName) return;
    const autoKey = `${toName}|${destLat ?? ""}|${destLng ?? ""}`;
    if (lastAutoTransportKeyRef.current === autoKey) return;
    lastAutoTransportKeyRef.current = autoKey;

    const bootstrapFromLiveLocation = async () => {
      setSearchActive(false);
      setSelectedJourney(null);
      setTo(toName);
      setToId(null);
      let fromCandidate = from;
      let toCandidate = toName;

      try {
        const nearest = await bootstrapNearestStation();
        if (nearest) fromCandidate = nearest;
      } catch {}

      try {
        if (destLat != null && destLng != null && Number.isFinite(destLat) && Number.isFinite(destLng)) {
          const toNearbyRes = await getNearbyStations({
            lat: destLat,
            lon: destLng,
            results: 20,
            distance: 6000,
          });
          const nearestTo = pickNearestWithDistance(toNearbyRes.data, 4000);
          if (nearestTo?.name) {
            setTo(nearestTo.name);
            setToId(nearestTo.id ?? null);
            toCandidate = (nearestTo.id || nearestTo.name) as string;
          }
        }
      } catch {}

      if (isStationId(fromCandidate) && isStationId(toCandidate)) {
        await runJourneySearch(fromCandidate, toCandidate);
      } else {
        setAutoSearchMessage(
          "Auto station match incomplete. Pick From and To from suggestions, then tap Search."
        );
      }
    };

    bootstrapFromLiveLocation();
  }, [params]);

  return (
    // <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View
        style={styles.container}
        onTouchStart={() => {
          Keyboard.dismiss();
        }}
      >

        {/* MAP ALWAYS EXISTS */}
        <TransportMap
          journey={selectedJourney}
          onMapPress={() => {
            Keyboard.dismiss();
            setActiveField(null);
            setSuggestions([]);
          }}
        />

        {/* 🔙 BACK BUTTON */}
        {searchActive && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setSearchActive(false);
              setSelectedJourney(null);
            }}
          >
            <Ionicons name="arrow-back" size={22} color="#000" />
          </TouchableOpacity>
        )}

        {/* 🔼 TOP INPUTS (ONLY BEFORE SEARCH) */}
        {!searchActive && (
          <View style={styles.topOverlay}>
            <FromToInputs
              from={from}
              to={to}
              onChangeFrom={(value) => {
                setFrom(value);
                setFromId(null);
              }}
              onChangeTo={(value) => {
                setTo(value);
                setToId(null);
              }}
              onFocusFrom={() => setActiveField("from")}
              onFocusTo={() => setActiveField("to")}
              date={dateTime}
              onPressDate={() => setShowDateModal(true)}
              onSwap={() => {
                setFrom(to);
                setTo(from);
                setFromId(toId);
                setToId(fromId);
              }}
              onSearch={handleSearch}
              onUseNearestStation={async () => {
                await bootstrapNearestStation();
              }}
              nearestLoading={nearestLoading}
            />
            {!!autoSearchMessage && (
              <View style={styles.autoHint}>
                <Text style={styles.autoHintText}>{autoSearchMessage}</Text>
              </View>
            )}

            {activeField && suggestions.length > 0 && (
              <View style={styles.suggestionBox}>
                <FlatList
                  data={suggestions}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => {
                        if (activeField === "from") {
                          setFrom(item.name);
                          setFromId(item.id ?? null);
                        } else {
                          setTo(item.name);
                          setToId(item.id ?? null);
                        }
                        setSuggestions([]);
                        setActiveField(null);
                      }}
                    >
                      <Text style={styles.suggestionTitle}>{item.name}</Text>
                      {item.line && (
                        <Text style={styles.suggestionLine}>{item.line}</Text>
                      )}
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>
        )}

        {/* 🕒 DATE TIME MODAL */}
        <DateTimeModal
          visible={showDateModal}
          value={dateTime}
          onClose={() => setShowDateModal(false)}
          onConfirm={(d) => {
            setDateTime(d);
            setShowDateModal(false);
          }}
        />

        {/* 🔽 BOTTOM SHEET (ONLY AFTER SEARCH) */}
        {searchActive && (
          <JourneySheet
            journeys={journeys}
            loading={loading}
            selectedJourney={selectedJourney}
            onSelectJourney={(journey) => setSelectedJourney(journey)}
            onBackToList={() => setSelectedJourney(null)}
          />
        )}

      </View>
    // </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  topOverlay: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    zIndex: 20,
  },

  backButton: {
    position: "absolute",
    top: 48,
    left: 16,
    backgroundColor: "#fff",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    zIndex: 30,
  },
  suggestionBox: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 16,
    paddingVertical: 6,
    elevation: 6,
  },
  autoHint: {
    marginTop: 8,
    marginHorizontal: 16,
    backgroundColor: "#fff7ed",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  autoHintText: {
    color: "#9a3412",
    fontSize: 12,
    fontWeight: "500",
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  suggestionLine: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
});
