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
import { useLocalSearchParams, useRouter } from "expo-router";

import ExploreMap from "../../components/explore/ExploreMap";
import PlaceSheet from "../../components/explore/PlaceSheet";
import { SearchBar } from "../../components/explore/SearchBar";
import FilterBar from "../../components/explore/FilterBar";
import RadiusSlider from "../../components/explore/RadiusSlider";

import { Place } from "../../components/explore/types";
import { getNearbyPlaces, searchPlaces, getRoute } from "../../api/places";
import { addNextStop as addNextStopApi } from "../../api/itinerary";

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
  { key: "stay", label: "Stay", icon: "bed-outline" },
  { key: "entertainment", label: "Fun", icon: "musical-notes" },
  { key: "sports", label: "Sports", icon: "football" },
  { key: "services", label: "Services", icon: "briefcase" },
];

export default function ExploreScreen() {
  const router = useRouter();
  const [places, setPlaces] = useState<Place[]>([]);
  const [searchText, setSearchText] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [routeEta, setRouteEta] = useState<string | null>(null);
  const [routeDistance, setRouteDistance] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [radiusKm, setRadiusKm] = useState(5);
  const [appliedRadiusKm, setAppliedRadiusKm] = useState(5);
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
  const [pendingRoutePlace, setPendingRoutePlace] = useState<Place | null>(null);

  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const params = useLocalSearchParams();
  const lastHandledPlaceId = useRef<string | null>(null);
  const placeIdParam = typeof params?.placeId === "string" ? params.placeId : undefined;
  const placeLatParam = typeof params?.placeLat === "string" ? params.placeLat : undefined;
  const placeLngParam = typeof params?.placeLng === "string" ? params.placeLng : undefined;
  const placeTitleParam = typeof params?.placeTitle === "string" ? params.placeTitle : undefined;
  const placeCategoryParam =
    typeof params?.placeCategory === "string" ? params.placeCategory : undefined;
  const autoRouteParam = typeof params?.autoRoute === "string" ? params.autoRoute : undefined;
  const hasValidCoords = (p: { latitude?: number; longitude?: number }) =>
    Number.isFinite(p.latitude) && Number.isFinite(p.longitude);
  const toNum = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const normalizePlace = (raw: any, idx = 0): Place | null => {
    if (!raw) return null;
    const latitude = toNum(raw.latitude ?? raw.lat);
    const longitude = toNum(raw.longitude ?? raw.lon ?? raw.lng);
    if (latitude == null || longitude == null) return null;
    const title = String(raw.title ?? raw.name ?? "Unknown place");
    const id = Number(raw.id ?? raw.place_id ?? idx + 1);
    const distance_km = toNum(raw.distance_km ?? raw.distance) ?? undefined;
    const category =
      raw.category != null ? String(raw.category) : undefined;
    return {
      id: Number.isFinite(id) ? id : idx + 1,
      title,
      latitude,
      longitude,
      distance_km,
      category,
      map_url: raw.map_url ?? undefined,
    };
  };
  const normalizePlaceList = (payload: any): Place[] => {
    const list = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.places)
      ? payload.places
      : Array.isArray(payload?.results)
      ? payload.results
      : [];
    const normalized = list
      .map((item: any, idx: number) => normalizePlace(item, idx))
      .filter((p: Place | null): p is Place => !!p);
    const seen = new Set<string>();
    return normalized.filter((p) => {
      const key = `${p.id}-${p.title}-${p.latitude}-${p.longitude}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

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
    if (!placeIdParam) return;
    if (lastHandledPlaceId.current === placeIdParam) return;

    const place: Place = {
      id: Number(placeIdParam),
      title: placeTitleParam ?? "Selected place",
      latitude: Number(placeLatParam),
      longitude: Number(placeLngParam),
      distance_km: 0,
      category: placeCategoryParam ?? undefined,
    };

    if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
      return;
    }

    lastHandledPlaceId.current = placeIdParam;
    setSelectedPlace(place);
    setFollowUser(false);
    setRegion((prev) => ({
      ...prev,
      latitude: place.latitude,
      longitude: place.longitude,
    }));

    if (autoRouteParam === "1") {
      setPendingRoutePlace(place);
    }
  }, [
    placeIdParam,
    placeLatParam,
    placeLngParam,
    placeTitleParam,
    placeCategoryParam,
    autoRouteParam,
  ]);

  useEffect(() => {
    if (!pendingRoutePlace || !userLocation) return;
    handleNavigate(pendingRoutePlace);
    setPendingRoutePlace(null);
  }, [pendingRoutePlace, userLocation]);

  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedRadiusKm(radiusKm);
    }, 220);
    return () => clearTimeout(t);
  }, [radiusKm]);

  useEffect(() => {
    const center = userLocation ?? {
      latitude: region.latitude,
      longitude: region.longitude,
    };
    const limit = Math.min(100, Math.max(20, appliedRadiusKm * 2));

    getNearbyPlaces({
      lat: center.latitude,
      lon: center.longitude,
      radiusKm: appliedRadiusKm,
      limit,
      category,
    })
      .then((res) => setPlaces(normalizePlaceList(res.data)))
      .catch(() => setPlaces([]));
  }, [userLocation, region.latitude, region.longitude, appliedRadiusKm, category]);

  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    const query = searchText.trim().toLowerCase();
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      if (!searchText.trim()) {
        setActiveSearch("");
      }
      return;
    }

    // Show immediate local suggestions so the list appears even before API returns.
    const localMatches = places
      .filter((p) => p.title?.toLowerCase().includes(query))
      .slice(0, 8);
    setSuggestions(localMatches);
    setShowSuggestions(true);

    searchTimerRef.current = setTimeout(() => {
      searchPlaces(searchText.trim())
        .then((res) => {
          const remote = normalizePlaceList(res.data);
          const merged = [...localMatches, ...remote];
          const deduped: Place[] = [];
          const seen = new Set<string>();
          for (const item of merged) {
            const key = String((item as any)?.id ?? (item as any)?.title ?? "");
            if (!key || seen.has(key)) continue;
            seen.add(key);
            deduped.push(item as Place);
          }
          setSuggestions(deduped.slice(0, 20));
        })
        .catch(() => setSuggestions([]));
    }, 300);
  }, [searchText, places]);

  const filteredPlaces = places.filter((p) =>
    !activeSearch
      ? true
      : p.title.toLowerCase().includes(activeSearch.toLowerCase())
  );
  const navigationActive = routeCoords.length > 1 && !!selectedPlace;
  const visiblePlaces =
    navigationActive && selectedPlace ? [selectedPlace] : filteredPlaces;

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
      setSelectedPlace(place);
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
    <View
      style={styles.container}
      onTouchStart={() => {
        Keyboard.dismiss();
        setShowSuggestions(false);
      }}
    >
      {/* MAP */}
      <ExploreMap
        region={region}
        places={visiblePlaces}
        selectedPlace={selectedPlace}
        userLocation={userLocation}
        routeCoords={routeCoords}
        sheetExpanded={sheetExpanded}
        onMarkerPress={(place) => {
          setSelectedPlace(place);
          setRouteCoords([]);
          setRouteEta(null);
          setRouteDistance(null);
          setFollowUser(false);
        }}
        onUserPan={() => setFollowUser(false)}
      />

      {/* SEARCH + FILTER */}
      <View style={styles.searchOverlay}>
        <SearchBar
          value={searchText}
          onChange={(value: string) => {
            setSearchText(value);
            setShowSuggestions(true);
          }}
          onSearch={() => {
            Keyboard.dismiss();
            const match = suggestions.find(
              (s) => s.title.toLowerCase() === searchText.trim().toLowerCase()
            );
            if (match && hasValidCoords(match)) {
              setSelectedPlace(match);
              setFollowUser(false);
              setRegion((prev) => ({
                ...prev,
                latitude: match.latitude,
                longitude: match.longitude,
              }));
            }
            setActiveSearch(searchText);
            setSuggestions([]);
            setShowSuggestions(false);
            setShowRadius(false);
          }}
        />

        {showSuggestions && !!suggestions.length && (
          <View style={styles.suggestionBox}>
            {suggestions.map((item) => (
              <TouchableOpacity
                key={`${item.id}-${item.title}`}
                style={styles.suggestionRow}
                onPress={() => {
                  setSearchText(item.title);
                  setActiveSearch(item.title);
                  setSuggestions([]);
                  setShowSuggestions(false);
                  if (hasValidCoords(item)) {
                    setSelectedPlace(item);
                    setRouteCoords([]);
                    setRouteEta(null);
                    setRouteDistance(null);
                    setFollowUser(false);
                    setRegion((prev) => ({
                      ...prev,
                      latitude: item.latitude,
                      longitude: item.longitude,
                    }));
                  } else {
                    setSelectedPlace(null);
                  }
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
            setRouteCoords([]);
            setRouteEta(null);
            setRouteDistance(null);
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
        places={visiblePlaces}
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
        onAddStop={async (place) => {
          await addNextStopApi({
            id: place.id,
            title: place.title,
            latitude: place.latitude,
            longitude: place.longitude,
            category: place.category ?? null,
          });
          Alert.alert("Added", "Saved to Next Stop list.");
        }}
        onTransport={(place) => {
          router.push({
            pathname: "/transport",
            params: {
              autoTransport: "1",
              toName: place.title,
              destLat: String(place.latitude),
              destLng: String(place.longitude),
            },
          });
        }}
        onSelectPlace={(place) => {
          setSelectedPlace(place);
          setRouteCoords([]);
          setRouteEta(null);
          setRouteDistance(null);
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
