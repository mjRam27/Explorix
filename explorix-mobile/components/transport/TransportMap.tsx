import MapView, { Region } from "react-native-maps";
import { StyleSheet, View } from "react-native";

const INITIAL_REGION: Region = {
  latitude: 49.4875, // Heidelberg
  longitude: 8.466,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

const lightMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#333333" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
];

export default function TransportMap() {
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
