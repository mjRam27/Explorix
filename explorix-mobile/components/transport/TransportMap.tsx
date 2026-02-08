import MapView, { Region, Marker, Polyline } from "react-native-maps";
import { StyleSheet, View, TouchableOpacity, Text } from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";

type Props = {
  journey: any | null;
  onMapPress?: () => void;
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

export default function TransportMap({ journey, onMapPress }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const [userMoved, setUserMoved] = useState(false);
  const programmaticMove = useRef(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [followUser, setFollowUser] = useState(false);

  const toNumber = (value: any) => {
    if (value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const fromCoord = useMemo(() => {
    const lat = toNumber(journey?.from_lat) ?? toNumber(journey?.legs?.[0]?.origin_lat);
    const lng = toNumber(journey?.from_lng) ?? toNumber(journey?.legs?.[0]?.origin_lng);
    if (lat == null || lng == null) return null;
    return { latitude: lat, longitude: lng };
  }, [journey]);

  const toCoord = useMemo(() => {
    const legs = journey?.legs ?? [];
    const lastLeg = legs[legs.length - 1];
    const firstLeg = legs[0];
    const lat =
      toNumber(journey?.to_lat) ??
      toNumber(lastLeg?.destination_lat) ??
      toNumber(firstLeg?.destination_lat);
    const lng =
      toNumber(journey?.to_lng) ??
      toNumber(lastLeg?.destination_lng) ??
      toNumber(firstLeg?.destination_lng);
    if (lat == null || lng == null) return null;
    return { latitude: lat, longitude: lng };
  }, [journey]);

  const journeyPath = useMemo(() => {
    const points: { latitude: number; longitude: number }[] = [];
    const pushPoint = (lat: any, lng: any) => {
      const a = toNumber(lat);
      const b = toNumber(lng);
      if (a == null || b == null) return;
      points.push({ latitude: a, longitude: b });
    };
    const pushGeoPolyline = (poly: any) => {
      if (!poly) return;
      if (poly?.type === "LineString" && Array.isArray(poly?.coordinates)) {
        for (const c of poly.coordinates) {
          if (Array.isArray(c) && c.length >= 2) pushPoint(c[1], c[0]);
        }
        return;
      }
      if (poly?.features && Array.isArray(poly.features)) {
        for (const f of poly.features) {
          const coords = f?.geometry?.coordinates;
          const type = f?.geometry?.type;
          if (type === "LineString" && Array.isArray(coords)) {
            for (const c of coords) {
              if (Array.isArray(c) && c.length >= 2) pushPoint(c[1], c[0]);
            }
          }
        }
      }
    };

    const legs = journey?.legs ?? [];
    for (const leg of legs) {
      pushGeoPolyline(leg?.polyline);
      pushPoint(leg?.origin_lat, leg?.origin_lng);
      for (const s of leg?.stopovers ?? []) {
        pushPoint(s?.latitude, s?.longitude);
      }
      pushPoint(leg?.destination_lat, leg?.destination_lng);
    }

    if (points.length === 0) {
      if (fromCoord) points.push(fromCoord);
      if (toCoord) points.push(toCoord);
    }

    const deduped: { latitude: number; longitude: number }[] = [];
    for (const p of points) {
      const prev = deduped[deduped.length - 1];
      if (
        prev &&
        Math.abs(prev.latitude - p.latitude) < 1e-6 &&
        Math.abs(prev.longitude - p.longitude) < 1e-6
      ) {
        continue;
      }
      deduped.push(p);
    }
    return deduped;
  }, [journey, fromCoord, toCoord]);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    const start = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1200,
          distanceInterval: 1,
        },
        (pos) => {
          const currentPos = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setUserLocation(currentPos);
          if (followUser && !userMoved && mapRef.current) {
            programmaticMove.current = true;
            mapRef.current.animateCamera(
              {
                center: currentPos,
                pitch: 55,
                heading: Number.isFinite(pos.coords.heading ?? NaN)
                  ? Number(pos.coords.heading)
                  : 0,
                zoom: 16,
              },
              { duration: 500 }
            );
            setTimeout(() => {
              programmaticMove.current = false;
            }, 550);
          }
        }
      );
    };
    start();
    return () => {
      sub?.remove();
    };
  }, [followUser, userMoved]);

  useEffect(() => {
    if (!journeyPath.length || !mapRef.current) return;

    programmaticMove.current = true;
    if (journeyPath.length > 1) {
      mapRef.current.fitToCoordinates(journeyPath, {
        edgePadding: { top: 120, right: 80, bottom: 260, left: 80 },
        animated: true,
      });
    } else {
      mapRef.current.animateToRegion(
        {
          latitude: journeyPath[0].latitude,
          longitude: journeyPath[0].longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        },
        600
      );
    }
    setTimeout(() => {
      programmaticMove.current = false;
    }, 700);
    setUserMoved(false);
    setFollowUser(true);
  }, [journeyPath]);

  const routeLine = journeyPath;
  const startMarker = fromCoord ?? (routeLine.length > 0 ? routeLine[0] : null);
  const endMarker =
    toCoord ?? (routeLine.length > 1 ? routeLine[routeLine.length - 1] : null);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={INITIAL_REGION}
        customMapStyle={lightMapStyle}
        mapType="standard"
        showsUserLocation
        followsUserLocation={followUser && !userMoved}
        ref={(ref) => (mapRef.current = ref)}
        onPress={() => onMapPress?.()}
        onRegionChangeComplete={() => {
          if (!programmaticMove.current) {
            setUserMoved(true);
            setFollowUser(false);
          }
        }}
      >
        {startMarker && <Marker coordinate={startMarker} title="Start" />}
        {endMarker && <Marker coordinate={endMarker} title="Destination" />}
        {routeLine.length > 0 && (
          <Polyline coordinates={routeLine} strokeWidth={3} strokeColor="#1d4ed8" />
        )}
      </MapView>
      {userMoved && userLocation && (
        <View style={styles.recenterWrap}>
          <TouchableOpacity
            style={styles.recenterBtn}
            onPress={() => {
              programmaticMove.current = true;
              mapRef.current?.animateToRegion(
                {
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                },
                500
              );
              setTimeout(() => {
                programmaticMove.current = false;
              }, 600);
              setUserMoved(false);
              setFollowUser(true);
            }}
          >
            <Text style={styles.recenterText}>Go</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  recenterWrap: {
    position: "absolute",
    right: 16,
    top: 120,
  },
  recenterBtn: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    paddingHorizontal: 10,
  },
  recenterText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
