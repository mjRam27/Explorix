import { View, TouchableOpacity, Text, StyleSheet } from "react-native";

const MODES = ["all", "bus", "tram", "train", "fast"];

export default function TransportFilters({
  active,
  onChange,
}: {
  active: string;
  onChange: (m: string) => void;
}) {
  return (
    <View style={styles.row}>
      {MODES.map((m) => (
        <TouchableOpacity
          key={m}
          onPress={() => onChange(m)}
          style={[
            styles.chip,
            active === m && styles.active,
          ]}
        >
          <Text>{m.toUpperCase()}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 8,
  },
  chip: {
    backgroundColor: "#eee",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  active: {
    backgroundColor: "#0f9d58",
  },
});
