import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";

type Props = {
  visible: boolean;
  value: Date;
  onClose: () => void;
  onConfirm: (date: Date) => void;
};

export default function DateTimeModal({
  visible,
  value,
  onClose,
  onConfirm,
}: Props) {
  const [tempDate, setTempDate] = useState(value);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>Date / time</Text>
            <TouchableOpacity onPress={() => onConfirm(tempDate)}>
              <Text style={styles.done}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* DATE PICKER */}
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="inline"
            onChange={(_, d) => d && setTempDate(d)}
          />

          {/* TIME PICKER */}
          <DateTimePicker
            value={tempDate}
            mode="time"
            display="spinner"
            onChange={(_, d) => d && setTempDate(d)}
          />

          {/* QUICK ACTIONS */}
          <View style={styles.quickRow}>
            <QuickButton label="Now" onPress={() => setTempDate(new Date())} />
            <QuickButton
              label="in 15 min"
              onPress={() =>
                setTempDate(new Date(Date.now() + 15 * 60 * 1000))
              }
            />
            <QuickButton
              label="in 1h"
              onPress={() =>
                setTempDate(new Date(Date.now() + 60 * 60 * 1000))
              }
            />
          </View>

          <TouchableOpacity onPress={onClose} style={styles.cancel}>
            <Text style={{ color: "#888" }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function QuickButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.quickBtn}>
      <Text style={styles.quickText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#1e1e1e",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  header: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  done: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "600",
  },
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  quickBtn: {
    borderWidth: 1,
    borderColor: "#555",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  quickText: {
    color: "#fff",
  },
  cancel: {
    alignItems: "center",
    marginTop: 12,
  },
});
