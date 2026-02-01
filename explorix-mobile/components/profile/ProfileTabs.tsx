import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Tab = "posts" | "places" | "itineraries";

type Props = {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
};

export default function ProfileTabs({ activeTab, onChange }: Props) {
  return (
    <View style={styles.container}>
      <TabButton
        icon="grid-outline"
        active={activeTab === "posts"}
        onPress={() => onChange("posts")}
      />
      <TabButton
        icon="bookmark-outline"
        active={activeTab === "places"}
        onPress={() => onChange("places")}
      />
      <TabButton
        icon="map-outline"
        active={activeTab === "itineraries"}
        onPress={() => onChange("itineraries")}
      />
    </View>
  );
}

function TabButton({ icon, active, onPress }: any) {
  return (
    <TouchableOpacity style={styles.tab} onPress={onPress}>
      <Ionicons
        name={icon}
        size={22}
        color={active ? "#000" : "#999"}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
});
