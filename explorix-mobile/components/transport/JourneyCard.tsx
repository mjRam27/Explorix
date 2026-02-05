import { View, Text, StyleSheet } from "react-native";

const formatTime = (iso?: string) => {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function JourneyCard({
  journey,
  index,
}: {
  journey: any;
  index: number;
}) {
  const depart = formatTime(journey?.departure);
  const arrive = formatTime(journey?.arrival);
  const changes = journey?.changes ?? 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Journey option {index + 1}
      </Text>
      <Text style={styles.subtitle}>
        {depart}  {arrive}  {changes} change
      </Text>
      {journey?.from && journey?.to && (
        <Text style={styles.route}>
          {journey.from}  {journey.to}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#f7f7f7",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  title: {
    fontWeight: "600",
    fontSize: 16,
  },
  subtitle: {
    marginTop: 4,
    color: "#555",
    fontSize: 13,
  },
  route: {
    marginTop: 6,
    color: "#777",
    fontSize: 12,
  },
});
