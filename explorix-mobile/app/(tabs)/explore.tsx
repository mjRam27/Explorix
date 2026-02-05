// app/explore.tsx
import {
  View,
  StyleSheet,
  Keyboard,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

import ExploreMap from "../../components/explore/ExploreMap";
import PlaceSheet from "../../components/explore/PlaceSheet";
import { SearchBar } from "../../components/explore/SearchBar";
import FilterBar from "../../components/explore/FilterBar";
import RadiusSlider from "../../components/explore/RadiusSlider";

import { Place } from "../../components/explore/types";
import { getNearbyPlaces, searchPlaces, getRoute } from "../../api/places";

type Category = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const CATEGORY_GROUPS: Category[] = [
  { key: "all", label: "All", icon: "grid" },
  { key: "food", label: "Food", icon: "restaurant" },
  { key: "nature", label: "Nature", icon: "leaf" },
  { key: "culture", label: "Culture", icon: "library" },
  { key: "shopping", label: "Shopping", icon: "cart" },
];

export default function ExploreScreen() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [searchText, setSearchText] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [routeEta, setRouteEta] = useState<string | null>(null);
  const [routeDistance, setRouteDistance] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [radiusKm, setRadiusKm] = useState(5);
  const [showRadius, setShowRadius] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [followUser, setFollowUser] = useState(true);

  const [region, setRegion] = useState({
    latitude: 49.48,
    longitude: 8.7,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    heading?: number | null;
  } | null>(null);

  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    const startLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      if (!isMounted) return;

      const next = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        heading: current.coords.heading,
      };

      setUserLocation(next);
      setRegion((prev) => ({
        ...prev,
        latitude: next.latitude,
        longitude: next.longitude,
      }));

      locationWatchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 50,
          timeInterval: 10000,
        },
        (loc) => {
          const updated = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            heading: loc.coords.heading,
          };
          setUserLocation(updated);
          if (followUser) {
            setRegion((prev) => ({
              ...prev,
              latitude: updated.latitude,
              longitude: updated.longitude,
            }));
          }
        }
      );
    };

    startLocation();

    return () => {
      isMounted = false;
      locationWatchRef.current?.remove();
      locationWatchRef.current = null;
    };
  }, [followUser]);

  useEffect(() => {
    const center = userLocation ?? {
      latitude: region.latitude,
      longitude: region.longitude,
    };

    getNearbyPlaces({
      lat: center.latitude,
      lon: center.longitude,
      radiusKm,
      category,
    })
      .then((res) => setPlaces(res.data))
      .catch(() => setPlaces([]));
  }, [userLocation, region.latitude, region.longitude, radiusKm, category]);

  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (!searchText || searchText.trim().length < 2) {
      setSuggestions([]);
      if (!searchText.trim()) {
        setActiveSearch("");
      }
      return;
    }

    searchTimerRef.current = setTimeout(() => {
      searchPlaces(searchText.trim())
        .then((res) => setSuggestions(res.data))
        .catch(() => setSuggestions([]));
    }, 300);
  }, [searchText]);

  const filteredPlaces = places.filter((p) =>
    !activeSearch
      ? true
      : p.title.toLowerCase().includes(activeSearch.toLowerCase())
  );

  const decodePolyline = (encoded: string) => {
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;
    const coords: { latitude: number; longitude: number }[] = [];

    while (index < len) {
      let b = 0;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      coords.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return coords;
  };

  const handleNavigate = async (place: Place) => {
    if (!userLocation) return;

    try {
      const res = await getRoute({
        originLat: userLocation.latitude,
        originLng: userLocation.longitude,
        destLat: place.latitude,
        destLng: place.longitude,
        mode: "walking",
      });

      const polyline = res.data?.polyline;
      if (polyline) {
        const coords = decodePolyline(polyline);
        setRouteCoords(coords);
        setRouteEta(res.data?.duration_text ?? null);
        setRouteDistance(res.data?.distance_text ?? null);
      } else {
        Alert.alert("No route found", "Try another destination.");
      }
    } catch {
      Alert.alert("Navigation failed", "Unable to get route right now.");
    }
  };

  return (
    <View style={styles.container}>
      {/* MAP */}
      <ExploreMap
        region={region}
        places={filteredPlaces}
        selectedPlace={selectedPlace}
        userLocation={userLocation}
        routeCoords={routeCoords}
        sheetExpanded={sheetExpanded}
        onMarkerPress={(place) => {
          setSelectedPlace(place);
          setFollowUser(false);
        }}
        onUserPan={() => setFollowUser(false)}
      />

      {/* SEARCH + FILTER */}
      <View style={styles.searchOverlay}>
        <SearchBar
          value={searchText}
          onChange={setSearchText}
          onSearch={() => {
            Keyboard.dismiss();
            setActiveSearch(searchText);
            setShowRadius(false);
          }}
        />

        {!!suggestions.length && (
          <View style={styles.suggestionBox}>
            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.suggestionRow}
                onPress={() => {
                  setSearchText(item.title);
                  setActiveSearch(item.title);
                  setSuggestions([]);
                  setSelectedPlace(item);
                  setFollowUser(false);
                  setRegion((prev) => ({
                    ...prev,
                    latitude: item.latitude,
                    longitude: item.longitude,
                  }));
                }}
              >
                <Text style={styles.suggestionTitle}>{item.title}</Text>
                {!!item.category && (
                  <Text style={styles.suggestionMeta}>{item.category}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <FilterBar
          categories={CATEGORY_GROUPS}
          activeCategory={category}
          radiusKm={radiusKm}
          onSelectCategory={(key) => {
            setCategory(key);
            setActiveSearch("");
            setShowRadius(false);
          }}
          onPressRadius={() => {
            Keyboard.dismiss();
            setShowRadius((v) => !v);
          }}
        />

        {showRadius && (
          <RadiusSlider
            visible={showRadius}
            value={radiusKm}
            onChange={(v) => {
              setRadiusKm(v);
              setActiveSearch("");
            }}
          />
        )}
      </View>

      {/* BOTTOM SHEET */}
      <PlaceSheet
        places={filteredPlaces}
        selectedPlace={selectedPlace}
        onClearSelection={() => {
          setSelectedPlace(null);
          setRouteCoords([]);
          setRouteEta(null);
          setRouteDistance(null);
        }}
        onExpand={() => setSheetExpanded(true)}
        onCollapse={() => setSheetExpanded(false)}
        onNavigate={handleNavigate}
        onAddStop={() => {}}
        onSelectPlace={(place) => {
          setSelectedPlace(place);
          setFollowUser(false);
          setRegion((prev) => ({
            ...prev,
            latitude: place.latitude,
            longitude: place.longitude,
          }));
        }}
        routeEta={routeEta}
        routeDistance={routeDistance}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchOverlay: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  suggestionBox: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
  },
  suggestionRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  suggestionMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b7280",
  },
});
