import { View, Text, StyleSheet } from "react-native";

export default function ItineraryGrid() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Saved itineraries will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  text: {
    color: "#666",
    textAlign: "center",
  },
});
