// components/explore/PlaceCard.tsx
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Place } from "./types";

type Props = {
  place: Place;
  onNavigate?: () => void;
};

export default function PlaceCard({ place, onNavigate }: Props) {
  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{place.title}</Text>
        <Text style={styles.subtitle}>
          {place.distance_km.toFixed(2)} km away
        </Text>
      </View>

      {onNavigate && (
        <TouchableOpacity onPress={onNavigate}>
          <Ionicons name="navigate" size={22} color="#0f9d58" />
        </TouchableOpacity>
      )}
    </View>
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
    zIndex: 10,
  },
  title: {
    fontWeight: "600",
    fontSize: 16,
  },
  subtitle: {
    color: "#666",
    marginTop: 4,
  },
});
