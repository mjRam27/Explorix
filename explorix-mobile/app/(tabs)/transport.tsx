// app/(tabs)/transport.tsx
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  Text,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

import TransportMap from "../../components/transport/TransportMap";
import JourneySheet from "../../components/transport/JourneySheet";
import FromToInputs from "../../components/transport/FromToInputs";
import TransportFilters from "../../components/transport/TransportFilters";
import DateTimeModal from "../../components/transport/DateTimeModal";
import { getJourneys, getStations } from "../../api/transport";



export default function TransportScreen() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [mode, setMode] = useState("all");

  const [dateTime, setDateTime] = useState(new Date());
  const [showDateModal, setShowDateModal] = useState(false);

  const [searchActive, setSearchActive] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<any>(null);
  const [journeys, setJourneys] = useState<any[]>([]);
  const [allJourneys, setAllJourneys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeField, setActiveField] = useState<"from" | "to" | null>(null);

  const normalizeMode = (m?: string) => (m || "").toLowerCase();

  const filterJourneys = (items: any[], m: string) => {
    if (m === "all") return items;
    return items.filter((j) => normalizeMode(j.mode) === m);
  };

  const safeAllJourneys = Array.isArray(allJourneys) ? allJourneys : [];
  const availableModes = Array.from(
    new Set(safeAllJourneys.map((j) => normalizeMode(j.mode)).filter(Boolean))
  );

  useEffect(() => {
    const query = activeField === "from" ? from : activeField === "to" ? to : "";
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await getStations(query.trim());
        setSuggestions(res.data || []);
      } catch {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [from, to, activeField]);

  const handleSearch = async () => {
    if (!from.trim() || !to.trim()) {
      Alert.alert("Missing stations", "Please enter From and To");
      return;
    }

    setLoading(true);
    try {
      const res = await getJourneys({
        from: from.trim(),
        to: to.trim(),
        departure: dateTime.toISOString(),
      });
      if (res.data?.status === "error") {
        Alert.alert("No journeys", res.data?.message || "No journey found");
        setAllJourneys([]);
        setJourneys([]);
        setSearchActive(true);
        return;
      }

      const list = Array.isArray(res.data?.journeys)
        ? res.data.journeys
        : Array.isArray(res.data)
        ? res.data
        : [];
      setAllJourneys(list);
      setJourneys(filterJourneys(list, mode));
      setSearchActive(true);
    } catch {
      Alert.alert("No journeys", "Please try a different time or route.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>

        {/* MAP ALWAYS EXISTS */}
        <TransportMap journey={selectedJourney} />

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
              onChangeFrom={setFrom}
              onChangeTo={setTo}
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
            />

            <TransportFilters
              active={mode}
              onChange={(m) => {
                setMode(m);
                setJourneys(filterJourneys(allJourneys, m));
                setSelectedJourney(null);
              }}
            />

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
                          setFromId(null);
                        } else {
                          setTo(item.name);
                          setToId(null);
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
            activeMode={mode}
            availableModes={availableModes}
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
