import { View, TextInput, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function SearchBar({ value, onChange, onSearch }: any) {
  return (
    <View style={styles.row}>
      <View style={styles.inputBox}>
        <Ionicons name="search" size={18} color="#999" />
        <TextInput
          placeholder="Search destinations..."
          value={value}
          onChangeText={onChange}
          style={styles.input}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={onSearch}>
        <Text style={styles.buttonText}>Search</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  inputBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",

    height: 45,                // 👈 makes it tall
    paddingHorizontal: 16,     // 👈 spacious feel
    borderRadius: 26,          // 👈 pill shape

    shadowColor: "#000",       // 👇 shadow = premium
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },

  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,              // 👈 bigger text
  },

  button: {
    height: 45,                // 👈 match input height
    backgroundColor: "#0f9d58",
    paddingHorizontal: 20,
    borderRadius: 26,
    justifyContent: "center",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});

