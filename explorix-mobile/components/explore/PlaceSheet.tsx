// components/explore/PlaceSheet.tsx
import { View, Text, StyleSheet } from "react-native";
import { useMemo, useRef } from "react";
import BottomSheet from "@gorhom/bottom-sheet";
import { Place } from "./types";

type Props = {
  places: Place[];
};

export default function PlaceSheet({ places }: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["30%", "70%"], []);

return (
  <BottomSheet
    ref={sheetRef}
    index={0}
    snapPoints={snapPoints}
    enablePanDownToClose={false}
  >
    <View style={styles.content}>
      <Text style={{ fontWeight: "600" }}>
        PLACES COUNT: {places.length}
      </Text>
    </View>
  </BottomSheet>
);

}

const styles = StyleSheet.create({
  content: {
    padding: 20,
  },
});
