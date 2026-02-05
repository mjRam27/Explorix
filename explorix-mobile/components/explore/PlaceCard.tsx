// components/explore/PlaceCard.tsx
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Place } from "./types";

type Props = {
  place: Place;
  onNavigate?: () => void;
  onAddStop?: () => void;
  onSelect?: () => void;
};

export default function PlaceCard({
  place,
  onNavigate,
  onAddStop,
  onSelect,
}: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onSelect} activeOpacity={0.85}>
      <View style={styles.cardContent}>
        <Text style={styles.title}>{place.title}</Text>
        <Text style={styles.subtitle}>
          {typeof place.distance_km === "number"
            ? `${place.distance_km.toFixed(2)} km away`
            : "Distance unavailable"}
        </Text>
      </View>

      <View style={styles.actions}>
        {onNavigate && (
          <TouchableOpacity onPress={onNavigate}>
            <Ionicons name="navigate" size={22} color="#0f9d58" />
          </TouchableOpacity>
        )}
        {onAddStop && (
          <TouchableOpacity onPress={onAddStop} style={{ marginLeft: 12 }}>
            <Ionicons name="add-circle" size={22} color="#1d4ed8" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  cardContent: {
    flex: 1,
  },
  title: {
    fontWeight: "600",
    fontSize: 16,
  },
  subtitle: {
    color: "#666",
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
});
