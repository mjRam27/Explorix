// components/explore/ExploreMap.tsx
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import { StyleSheet, View } from "react-native";
import { useEffect, useRef } from "react";
import { Place } from "./types";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  region: Region;
  places: Place[];
  selectedPlace: Place | null;
  userLocation: {
    latitude: number;
    longitude: number;
    heading?: number | null;
  } | null;
  routeCoords: { latitude: number; longitude: number }[];
  sheetExpanded: boolean;
  onMarkerPress: (place: Place) => void;
  onUserPan: () => void;
};

export default function ExploreMap({
  region,
  places,
  selectedPlace,
  userLocation,
  routeCoords,
  sheetExpanded,
  onMarkerPress,
  onUserPan,
}: Props) {
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (!selectedPlace || !mapRef.current) return;

    mapRef.current.animateToRegion(
      {
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      },
      500
    );
  }, [selectedPlace]);

  useEffect(() => {
    if (!mapRef.current || routeCoords.length < 2) return;

    mapRef.current.fitToCoordinates(routeCoords, {
      edgePadding: { top: 120, right: 60, bottom: 220, left: 60 },
      animated: true,
    });
  }, [routeCoords]);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={(ref) => {
          mapRef.current = ref;
        }}
        style={StyleSheet.absoluteFill}
        region={region}
        scrollEnabled={!sheetExpanded}
        zoomEnabled={!sheetExpanded}
        rotateEnabled={!sheetExpanded}
        pitchEnabled={!sheetExpanded}
        onPanDrag={onUserPan}
      >
        {userLocation && (
          <Marker coordinate={userLocation} title="You">
            <View style={styles.userArrowWrap}>
              <Ionicons
                name="navigate"
                size={18}
                color="#2563eb"
                style={{
                  transform: [
                    {
                      rotate: `${userLocation.heading ?? 0}deg`,
                    },
                  ],
                }}
              />
            </View>
          </Marker>
        )}
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
        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={4}
            strokeColor="#0f9d58"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  userArrowWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#dbeafe",
  },
});
