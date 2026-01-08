import { View, Text, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";
import Slider from "@react-native-community/slider";

type Props = {
  visible: boolean;
  value: number;
  onChange: (v: number) => void;
};

export default function RadiusSlider({ visible, value, onChange }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: visible ? 0 : -10,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}   // 👈 important
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={styles.label}>Search radius: {value} km</Text>
      <Slider
        minimumValue={1}
        maximumValue={20}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor="#0f9d58"
        maximumTrackTintColor="#ccc"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 16,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
  },
  label: {
    fontWeight: "600",
    marginBottom: 6,
  },
});
