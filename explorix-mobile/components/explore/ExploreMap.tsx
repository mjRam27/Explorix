// components/explore/ExploreMap.tsx
import MapView, { Marker, Region } from "react-native-maps";
import { StyleSheet, View } from "react-native";
import { Place } from "./types";

type Props = {
  region: Region;
  places: Place[];
  onMarkerPress: (place: Place) => void;
};

export default function ExploreMap({ region, places, onMarkerPress }: Props) {
  return (
    <View style={{ flex: 1 }}>

      <MapView style={StyleSheet.absoluteFill} region={region}>
        {places.map((p) => (
<Marker
  key={p.id}
  coordinate={{
    latitude: p.latitude,
    longitude: p.longitude,
  }}
  title={p.title}
  description={`${p.distance_km.toFixed(2)} km away`}
  onPress={() => onMarkerPress(p)}
/>

        ))}
      </MapView>
    </View>
  );
}
