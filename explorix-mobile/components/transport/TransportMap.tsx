import MapView, { Region } from "react-native-maps";
import { StyleSheet, View } from "react-native";

type Props = {
  journey: any | null;
};

const INITIAL_REGION: Region = {
  latitude: 49.4875,
  longitude: 8.466,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

const lightMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#333333" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
];

export default function TransportMap({ journey }: Props) {
  // you can later draw polyline based on journey
  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={INITIAL_REGION}
        customMapStyle={lightMapStyle}
        mapType="standard"
      />
    </View>
  );
}
