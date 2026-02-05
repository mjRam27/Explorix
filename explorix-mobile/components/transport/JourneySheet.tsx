import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRef, useState } from "react";
import JourneyCard from "./JourneyCard";

const SCREEN_HEIGHT = Dimensions.get("window").height;

// Positions (Y from top)
const COLLAPSED_Y = SCREEN_HEIGHT * 0.62;
const EXPANDED_Y = SCREEN_HEIGHT * 0.18;

type Props = {
  journeys?: any[];
  loading?: boolean;
  selectedJourney?: any | null;
  activeMode?: string;
  availableModes?: string[];
  onSelectJourney?: (journey: any) => void;
  onBackToList?: () => void;
};

export default function JourneySheet({
  journeys = [],
  loading = false,
  selectedJourney = null,
  activeMode = "all",
  availableModes = [],
  onSelectJourney,
  onBackToList,
}: Props) {
  const safeJourneys = Array.isArray(journeys) ? journeys : [];
  const [showStops, setShowStops] = useState(false);
  const translateY = useRef(new Animated.Value(COLLAPSED_Y)).current;
  const startY = useRef(COLLAPSED_Y);

  // 🟢 PAN ONLY FOR HANDLE
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        translateY.stopAnimation((value) => {
          startY.current = value;
        });
      },

      onPanResponderMove: (_, gesture) => {
        const nextY = Math.min(
          COLLAPSED_Y,
          Math.max(EXPANDED_Y, startY.current + gesture.dy)
        );
        translateY.setValue(nextY);
      },

      onPanResponderRelease: (_, gesture) => {
        Animated.spring(translateY, {
          toValue: gesture.dy < -50 ? EXPANDED_Y : COLLAPSED_Y,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      pointerEvents="box-none"   // ✅ CRITICAL
      style={[
        styles.sheet,
        { transform: [{ translateY }] },
      ]}
    >
      {/* 🔘 DRAG HANDLE */}
      <View {...panResponder.panHandlers} style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      {/* 📜 SCROLLABLE CONTENT */}
      <ScrollView
      keyboardDismissMode="on-drag"
        nestedScrollEnabled          // ✅ REQUIRED FOR iOS
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {selectedJourney && (
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={onBackToList}>
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.detailTitle}>Journey details</Text>
              <View style={{ width: 50 }} />
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Estimated Arrival</Text>
              <Text style={styles.detailValue}>
                {new Date(selectedJourney.arrival).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Next Stop</Text>
              <Text style={styles.detailValue}>
                {selectedJourney.legs?.[0]?.destination || selectedJourney.to}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.stopsToggle}
              onPress={() => setShowStops((v) => !v)}
            >
              <Text style={styles.stopsToggleText}>
                Next stops
              </Text>
              <Text style={styles.stopsToggleText}>
                {showStops ? "Hide" : "Show more"}
              </Text>
            </TouchableOpacity>

            {showStops && (
              <View style={styles.stopsList}>
                {(selectedJourney.legs ?? []).flatMap((leg: any) =>
                  (leg.stopovers ?? []).map((s: any) => s.name)
                ).slice(0, 12).map((name: string, idx: number) => (
                  <Text key={`${name}-${idx}`} style={styles.stopItem}>
                    {name}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {!selectedJourney && loading && (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading journeys...</Text>
          </View>
        )}

        {!selectedJourney && !loading && safeJourneys.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {activeMode !== "all"
                ? `${activeMode.toUpperCase()} not available`
                : "No journeys found"}
            </Text>
            {availableModes.length > 0 && (
              <Text style={styles.emptyHint}>
                Available: {availableModes.map((m) => m.toUpperCase()).join(", ")}
              </Text>
            )}
          </View>
        )}

        {!selectedJourney && !loading &&
          safeJourneys.map((j: any, i: number) => (
          <TouchableOpacity
            key={`${j.departure ?? "journey"}-${i}`}
            onPress={() => onSelectJourney?.(j)}
            activeOpacity={0.8}
          >
            <JourneyCard journey={j} index={i} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    elevation: 25,
    zIndex: 50,
  },

  handleContainer: {
    paddingVertical: 12,
    alignItems: "center",
  },

  handle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#ccc",
  },

  content: {
    paddingHorizontal: 16,
    paddingBottom: 60,
    flexGrow: 1,   // ✅ REQUIRED
  },

  loading: {
    paddingVertical: 24,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    color: "#666",
  },
  empty: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    color: "#666",
  },
  emptyHint: {
    color: "#999",
    marginTop: 6,
    fontSize: 12,
  },
  detailCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 12,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backText: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
  detailTitle: {
    fontWeight: "600",
    fontSize: 15,
    color: "#111",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  detailLabel: {
    color: "#6b7280",
    fontSize: 12,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  stopsToggle: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  stopsToggleText: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
  stopsList: {
    paddingTop: 6,
  },
  stopItem: {
    color: "#4b5563",
    fontSize: 12,
    paddingVertical: 2,
  },
});
