import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Category = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type Props = {
  categories: Category[];
  activeCategory: string;
  radiusKm: number;
  onSelectCategory: (key: string) => void;
  onPressRadius: () => void;
};

export default function FilterBar({
  categories,
  activeCategory,
  radiusKm,
  onSelectCategory,
  onPressRadius,
}: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* Radius chip */}
      <TouchableOpacity style={styles.radiusChip} onPress={onPressRadius}>
        <Ionicons name="location" size={16} color="#0f9d58" />
        <Text style={styles.radiusText}>{radiusKm} km</Text>
      </TouchableOpacity>

      {/* Category chips */}
      {categories.map((c) => {
        const active = c.key === activeCategory;

        return (
          <TouchableOpacity
            key={c.key}
            onPress={() => onSelectCategory(c.key)}
            style={[styles.chip, active && styles.activeChip]}
          >
            <Ionicons
              name={c.icon}
              size={16}
              color={active ? "#fff" : "#555"}
            />
            <Text style={[styles.text, active && styles.activeText]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
container: {
  paddingHorizontal: 12,
  gap: 8,
  marginTop: 10, // 👈 ADD THIS
}
,
  radiusChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eaf7f0",
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 20,
    gap: 6,
  },
  radiusText: {
    color: "#0f9d58",
    fontWeight: "600",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 20,
    gap: 6,
  },
  activeChip: {
    backgroundColor: "#0f9d58",
  },
  text: {
    color: "#555",
    fontSize: 14,
  },
  activeText: {
    color: "#fff",
    fontWeight: "600",
  },
});
