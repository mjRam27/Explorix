import { View, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  from: string;
  to: string;
  onChangeFrom: (v: string) => void;
  onChangeTo: (v: string) => void;
};

export default function FromToInputs({
  from,
  to,
  onChangeFrom,
  onChangeTo,
}: Props) {
  return (
    <View style={styles.container}>
      <TextInput
        placeholder="From"
        value={from}
        onChangeText={onChangeFrom}
        style={styles.input}
      />
      <TextInput
        placeholder="To"
        value={to}
        onChangeText={onChangeTo}
        style={styles.input}
      />

      <TouchableOpacity style={styles.swap}>
        <Ionicons name="swap-vertical" size={20} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1f1f1f",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 12,
  },
  input: {
    backgroundColor: "#2b2b2b",
    color: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  swap: {
    position: "absolute",
    right: 16,
    top: "45%",
  },
});
