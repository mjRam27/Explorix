import { View, Text, StyleSheet } from "react-native";

export default function PostGrid() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>No posts yet</Text>
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
