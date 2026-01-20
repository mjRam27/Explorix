import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";

const CATEGORIES = [
  { key: "all", label: "🌍 All" },
  { key: "beach", label: "🏖 Beaches" },
  { key: "mountain", label: "⛰ Mountains" },
  { key: "city", label: "🏙 Cities" },
  { key: "nature", label: "🌲 Nature" },
];

export function CategoryChips({ selected, onSelect }: any) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {CATEGORIES.map((c) => (
        <TouchableOpacity
          key={c.key}
          style={[
            styles.chip,
            selected === c.key && styles.active,
          ]}
          onPress={() => onSelect(c.key)}
        >
          <Text
            style={[
              styles.text,
              selected === c.key && styles.activeText,
            ]}
          >
            {c.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f2f2f2",
    marginRight: 8,
  },
  active: { backgroundColor: "#0f9d58" },
  text: { color: "#333" },
  activeText: { color: "#fff", fontWeight: "600" },
});
