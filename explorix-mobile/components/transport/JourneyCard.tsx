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
  const firstLine = journey?.legs?.[0]?.line || journey?.line || "Connection";
  const transferSummary = (journey?.legs ?? [])
    .slice(0, -1)
    .map((leg: any, i: number) => {
      const next = journey?.legs?.[i + 1];
      if (!next) return null;
      return `Change at ${leg?.destination || "-"} to ${next?.line || next?.mode || "next"}`;
    })
    .filter(Boolean)
    .slice(0, 2);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Option {index + 1}  {firstLine}
      </Text>
      <Text style={styles.subtitle}>
        {depart}  {arrive}  {changes} change
      </Text>
      {journey?.from && journey?.to && (
        <Text style={styles.route}>
          {journey.from}  {journey.to}
        </Text>
      )}
      {transferSummary.map((t: string, idx: number) => (
        <Text key={`${t}-${idx}`} style={styles.transfer}>
          {t}
        </Text>
      ))}
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
  transfer: {
    marginTop: 4,
    color: "#4b5563",
    fontSize: 12,
  },
});
