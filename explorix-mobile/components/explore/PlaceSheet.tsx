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
import PlaceCard from "./PlaceCard";
import { Place } from "./types";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const COLLAPSED = SCREEN_HEIGHT * 0.65;
const EXPANDED = SCREEN_HEIGHT * 0.25;

type Props = {
  places: Place[];
};

export default function PlaceSheet({ places }: Props) {
  const translateY = useRef(new Animated.Value(COLLAPSED)).current;
  const startY = useRef(COLLAPSED);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
onMoveShouldSetPanResponder: (_, gesture) =>
  Math.abs(gesture.dy) > 8,


      onPanResponderGrant: () => {
        translateY.stopAnimation((v) => (startY.current = v));
      },

      onPanResponderMove: (_, gesture) => {
        const nextY = Math.min(
          COLLAPSED,
          Math.max(EXPANDED, startY.current + gesture.dy)
        );
        translateY.setValue(nextY);
      },

      onPanResponderRelease: (_, gesture) => {
        Animated.spring(translateY, {
          toValue: gesture.dy < -50 ? EXPANDED : COLLAPSED,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[styles.sheet, { transform: [{ translateY }] }]}
      pointerEvents="box-none"
    >
      {/* DRAG HANDLE */}
      <View {...panResponder.panHandlers} style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      {/* SCROLLABLE CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.count}>Places nearby: {places.length}</Text>

        {places.map((place) => (
          <PlaceCard key={place.id} place={place} />
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 20,
    zIndex: 100,
  },
  handleContainer: {
    paddingVertical: 12,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  count: {
    fontWeight: "600",
    marginBottom: 12,
  },
});
