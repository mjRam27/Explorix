import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRef } from "react";
import PlaceCard from "./PlaceCard";
import { Place } from "./types";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const COLLAPSED = SCREEN_HEIGHT * 0.65;
const EXPANDED = SCREEN_HEIGHT * 0.25;

type Props = {
  places: Place[];
  selectedPlace?: Place | null;
  routeEta?: string | null;
  routeDistance?: string | null;
  onExpand: () => void;
  onCollapse: () => void;
  onClearSelection?: () => void;
  onNavigate?: (place: Place) => void;
  onAddStop?: (place: Place) => void;
  onSelectPlace?: (place: Place) => void;
};

export default function PlaceSheet({
  places,
  selectedPlace,
  routeEta,
  routeDistance,
  onExpand,
  onCollapse,
  onClearSelection,
  onNavigate,
  onAddStop,
  onSelectPlace,
}: Props) {
  const translateY = useRef(new Animated.Value(COLLAPSED)).current;
  const startY = useRef(COLLAPSED);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,

      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dy) > 8,

      onPanResponderGrant: () => {
        translateY.stopAnimation((value) => {
          startY.current = value;
        });
      },

      onPanResponderMove: (_, gesture) => {
        const nextY = Math.min(
          COLLAPSED,
          Math.max(EXPANDED, startY.current + gesture.dy)
        );
        translateY.setValue(nextY);
      },

      onPanResponderRelease: (_, gesture) => {
        const shouldExpand = gesture.dy < -50;

        Animated.spring(translateY, {
          toValue: shouldExpand ? EXPANDED : COLLAPSED,
          useNativeDriver: false,
        }).start();

        if (shouldExpand) {
          onExpand();
        } else {
          onCollapse();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[styles.sheet, { transform: [{ translateY }] }]}
      pointerEvents="box-none"
    >
      {/* DRAG HANDLE */}
      <View {...panResponder.panHandlers} style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      {/* CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {selectedPlace ? (
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={onClearSelection}>
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.detailTitle}>Place details</Text>
              <View style={{ width: 50 }} />
            </View>
            <Text style={styles.detailName}>{selectedPlace.title}</Text>
            <Text style={styles.detailSub}>
              {typeof selectedPlace.distance_km === "number"
                ? `${selectedPlace.distance_km.toFixed(2)} km away`
                : "Distance unavailable"}
            </Text>
            {(routeEta || routeDistance) && (
              <View style={styles.detailMetaRow}>
                {routeDistance && (
                  <Text style={styles.detailMetaText}>
                    Distance: {routeDistance}
                  </Text>
                )}
                {routeEta && (
                  <Text style={styles.detailMetaText}>ETA: {routeEta}</Text>
                )}
              </View>
            )}
            <View style={styles.detailActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onNavigate?.(selectedPlace)}
              >
                <Text style={styles.actionText}>Navigate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.secondaryBtn]}
                onPress={() => onAddStop?.(selectedPlace)}
              >
                <Text style={styles.secondaryText}>Add next stop</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.count}>Places nearby: {places.length}</Text>
            {places.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                onNavigate={() => onNavigate?.(place)}
                onAddStop={() => onAddStop?.(place)}
                onSelect={() => onSelectPlace?.(place)}
              />
            ))}
          </>
        )}
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 20,
    zIndex: 100,
  },
  handleContainer: {
    paddingVertical: 12,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  count: {
    fontWeight: "600",
    marginBottom: 12,
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
  },
  detailName: {
    fontSize: 16,
    fontWeight: "600",
  },
  detailSub: {
    marginTop: 4,
    color: "#666",
  },
  detailActions: {
    flexDirection: "row",
    marginTop: 12,
  },
  detailMetaRow: {
    marginTop: 8,
    gap: 4,
  },
  detailMetaText: {
    color: "#374151",
    fontSize: 13,
  },
  actionBtn: {
    backgroundColor: "#0f9d58",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginRight: 8,
  },
  actionText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryBtn: {
    backgroundColor: "#e5e7eb",
  },
  secondaryText: {
    color: "#111827",
    fontWeight: "600",
  },
});
