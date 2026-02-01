import { View, Text, StyleSheet } from "react-native";

type Props = {
  posts: number;
  saved: number;
  itineraries: number;
};

export default function ProfileStats({
  posts,
  saved,
  itineraries,
}: Props) {
  return (
    <View style={styles.container}>
      <Stat label="Posts" value={posts} />
      <Stat label="Saved" value={saved} />
      <Stat label="Itineraries" value={itineraries} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 16,
  },
  stat: {
    alignItems: "center",
  },
  value: {
    fontSize: 16,
    fontWeight: "700",
  },
  label: {
    fontSize: 12,
    color: "#666",
  },
});
