import MapView, {
  Region,
  Marker,
  AnimatedRegion,
  Polyline,
} from "react-native-maps";
import { StyleSheet, View, TouchableOpacity, Text } from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";

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
  const mapRef = useRef<MapView | null>(null);
  const [userMoved, setUserMoved] = useState(false);
  const programmaticMove = useRef(false);
  const [vehiclePosition, setVehiclePosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const lastVehiclePosition = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [followVehicle, setFollowVehicle] = useState(false);

  const vehicleCoord = useRef(
    new AnimatedRegion({
      latitude: INITIAL_REGION.latitude,
      longitude: INITIAL_REGION.longitude,
      latitudeDelta: 0,
      longitudeDelta: 0,
    })
  ).current;

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

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    const start = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 3000,
          distanceInterval: 10,
        },
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        }
      );
    };
    start();
    return () => {
      sub?.remove();
    };
  }, []);

  useEffect(() => {
    if (!fromCoord || !toCoord || !mapRef.current) return;

    programmaticMove.current = true;
    mapRef.current.animateToRegion(
      {
        latitude: fromCoord.latitude,
        longitude: fromCoord.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      },
      600
    );
    setTimeout(() => {
      programmaticMove.current = false;
    }, 700);
    setUserMoved(false);
    setFollowVehicle(true);

    vehicleCoord.setValue({
      latitude: fromCoord.latitude,
      longitude: fromCoord.longitude,
    });
    lastVehiclePosition.current = {
      latitude: fromCoord.latitude,
      longitude: fromCoord.longitude,
    };

    const now = Date.now();
    const departMs = journey?.departure
      ? new Date(journey.departure).getTime()
      : now;
    const arriveMs = journey?.arrival
      ? new Date(journey.arrival).getTime()
      : now + 8000;
    const startMs = Math.max(now, departMs);
    const durationMs = Math.max(3000, arriveMs - startMs);

    const startAnimation = () => {
      vehicleCoord.timing({
        latitude: toCoord.latitude,
        longitude: toCoord.longitude,
        duration: durationMs,
        useNativeDriver: false,
      }).start();
    };

    if (departMs > now) {
      const delay = departMs - now;
      setTimeout(startAnimation, delay);
    } else {
      startAnimation();
    }
  }, [fromCoord, toCoord, vehicleCoord, journey]);

  useEffect(() => {
    let last = 0;
    const id = vehicleCoord.addListener((v) => {
      const pos = { latitude: v.latitude, longitude: v.longitude };
      setVehiclePosition(pos);

      const prev = lastVehiclePosition.current;
      lastVehiclePosition.current = pos;

      const now = Date.now();
      if (!followVehicle || userMoved || !mapRef.current || now - last < 600) {
        return;
      }

      last = now;
      const heading =
        prev
          ? (Math.atan2(
              pos.longitude - prev.longitude,
              pos.latitude - prev.latitude
            ) *
              180) /
            Math.PI
          : 0;

      programmaticMove.current = true;
      mapRef.current.animateCamera(
        {
          center: pos,
          pitch: 55,
          heading,
          zoom: 16,
        },
        { duration: 500 }
      );
      setTimeout(() => {
        programmaticMove.current = false;
      }, 550);
    });

    return () => {
      vehicleCoord.removeListener(id);
    };
  }, [vehicleCoord, followVehicle, userMoved]);

  const routeLine = useMemo(() => {
    if (!fromCoord || !toCoord) return [];
    return [fromCoord, toCoord];
  }, [fromCoord, toCoord]);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={INITIAL_REGION}
        customMapStyle={lightMapStyle}
        mapType="standard"
        ref={(ref) => (mapRef.current = ref)}
        onRegionChangeComplete={() => {
          if (!programmaticMove.current) {
            setUserMoved(true);
            setFollowVehicle(false);
          }
        }}
      >
        {fromCoord && (
          <Marker coordinate={fromCoord} title="Start" />
        )}
        {toCoord && (
          <Marker coordinate={toCoord} title="Destination" />
        )}
        {routeLine.length > 0 && (
          <Polyline
            coordinates={routeLine}
            strokeWidth={3}
            strokeColor="#1d4ed8"
          />
        )}
        {fromCoord && toCoord && (
          <Marker.Animated coordinate={vehicleCoord} title="Vehicle">
            <View style={styles.vehicleDot} />
          </Marker.Animated>
        )}
        {userLocation && (
          <Marker coordinate={userLocation} title="You" pinColor="#10b981" />
        )}
      </MapView>
      {userMoved && vehiclePosition && (
        <View style={styles.recenterWrap}>
          <TouchableOpacity
            style={styles.recenterBtn}
            onPress={() => {
              programmaticMove.current = true;
              mapRef.current?.animateToRegion(
                {
                  latitude: vehiclePosition.latitude,
                  longitude: vehiclePosition.longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                },
                500
              );
              setTimeout(() => {
                programmaticMove.current = false;
              }, 600);
              setUserMoved(false);
            }}
          >
            <Text style={styles.recenterText}>◎</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  vehicleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#0f9d58",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  recenterWrap: {
    position: "absolute",
    right: 16,
    top: 120,
  },
  recenterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  recenterText: {
    fontSize: 18,
  },
});
