import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
} from "react-native";
import { useRef } from "react";

const SCREEN_HEIGHT = Dimensions.get("window").height;

// Positions (Y from top)
const COLLAPSED_Y = SCREEN_HEIGHT * 0.62;
const EXPANDED_Y = SCREEN_HEIGHT * 0.18;

type Props = {
  onSelectJourney?: (journey: any) => void;
};

export default function JourneySheet({ onSelectJourney }: Props) {
  const translateY = useRef(new Animated.Value(COLLAPSED_Y)).current;
  const startY = useRef(COLLAPSED_Y);

  // 🟢 PAN ONLY FOR HANDLE
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        translateY.stopAnimation((value) => {
          startY.current = value;
        });
      },

      onPanResponderMove: (_, gesture) => {
        const nextY = Math.min(
          COLLAPSED_Y,
          Math.max(EXPANDED_Y, startY.current + gesture.dy)
        );
        translateY.setValue(nextY);
      },

      onPanResponderRelease: (_, gesture) => {
        Animated.spring(translateY, {
          toValue: gesture.dy < -50 ? EXPANDED_Y : COLLAPSED_Y,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      pointerEvents="box-none"   // ✅ CRITICAL
      style={[
        styles.sheet,
        { transform: [{ translateY }] },
      ]}
    >
      {/* 🔘 DRAG HANDLE */}
      <View {...panResponder.panHandlers} style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      {/* 📜 SCROLLABLE CONTENT */}
      <ScrollView
      keyboardDismissMode="on-drag"
        nestedScrollEnabled          // ✅ REQUIRED FOR iOS
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {Array.from({ length: 20 }).map((_, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.title}>Journey option {i + 1}</Text>
            <Text style={styles.subtitle}>
              09:{10 + i} → 09:{40 + i} • 1 change
            </Text>
          </View>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    elevation: 25,
    zIndex: 50,
  },

  handleContainer: {
    paddingVertical: 12,
    alignItems: "center",
  },

  handle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#ccc",
  },

  content: {
    paddingHorizontal: 16,
    paddingBottom: 60,
    flexGrow: 1,   // ✅ REQUIRED
  },

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
});
