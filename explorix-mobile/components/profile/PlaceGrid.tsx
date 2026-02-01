import { View, Text, StyleSheet } from "react-native";

export default function PlaceGrid() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Saved places will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 40,
    alignItems: "center",
  },
  text: {
    color: "#999",
  },
});
