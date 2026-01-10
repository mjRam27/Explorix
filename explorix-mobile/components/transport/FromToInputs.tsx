import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  from: string;
  to: string;
  onChangeFrom: (v: string) => void;
  onChangeTo: (v: string) => void;
  date: Date;
  onPressDate: () => void;
  onSearch: () => void;
  onSwap: () => void;
};

export default function FromToInputs({
  from,
  to,
  onChangeFrom,
  onChangeTo,
  date,
  onPressDate,
  onSearch,
  onSwap,
}: Props) {
  return (
    <View style={styles.container}>
      {/* FROM + TO + SWAP */}
      <View style={styles.inputRow}>
        <View style={{ flex: 1 }}>
          <TextInput
            placeholder="From"
            placeholderTextColor="#999"
            value={from}
            onChangeText={onChangeFrom}
            style={styles.input}
          />

          <TextInput
            placeholder="To"
            placeholderTextColor="#999"
            value={to}
            onChangeText={onChangeTo}
            style={styles.input}
          />
        </View>

        {/* SWAP BUTTON – RIGHT CENTER */}
        <TouchableOpacity style={styles.swapButton} onPress={onSwap}>
          <Ionicons name="swap-vertical" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* DATE / TIME */}
      <TouchableOpacity style={styles.row} onPress={onPressDate}>
        <Ionicons name="calendar" size={18} color="#333" />
        <Text style={styles.rowText}>
          {date.toLocaleDateString()}{" "}
          {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </TouchableOpacity>

      {/* SEARCH */}
      <TouchableOpacity style={styles.searchButton} onPress={onSearch}>
        <Text style={styles.searchText}>Search</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 16,
    marginHorizontal: 16,
    elevation: 6,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  input: {
    backgroundColor: "#f5f5f5",
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 8,
    color: "#000",
  },

  swapButton: {
    marginLeft: 8,
    backgroundColor: "#0f9d58",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f3f3f3",
    borderRadius: 10,
    marginTop: 6,
  },

  rowText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
  },

  searchButton: {
    marginTop: 10,
    backgroundColor: "#0f9d58",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  searchText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
