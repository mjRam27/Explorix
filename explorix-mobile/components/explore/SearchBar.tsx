import { View, TextInput, TouchableOpacity, Text, StyleSheet, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";

export function SearchBar({ value, onChange, onSearch }: any) {
  const inputRef = useRef<TextInput | null>(null);

  const handleSearch = () => {
    inputRef.current?.blur();
    Keyboard.dismiss();
    onSearch?.();
  };

  return (
    <View style={styles.row}>
      <View style={styles.inputBox}>
        <Ionicons name="search" size={18} color="#999" />
        <TextInput
          ref={inputRef}
          placeholder="Search destinations..."
          value={value}
          onChangeText={onChange}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          style={styles.input}
        />
        {String(value || "").length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={() => onChange?.("")}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSearch}>
        <Text style={styles.buttonText}>Search</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  inputBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    height: 44,
    paddingHorizontal: 19,
    borderRadius: 26,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },

  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },

  clearBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },

  button: {
    height: 45,
    backgroundColor: "#0f9d58",
    paddingHorizontal: 24,
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
