import { View, StyleSheet, Keyboard, TouchableWithoutFeedback } from "react-native";
import { useEffect, useState } from "react";
import ExploreMap from "../components/explore/ExploreMap";
import PlaceSheet from "../components/explore/PlaceSheet";
import { SearchBar } from "../components/explore/SearchBar";
import FilterBar from "../components/explore/FilterBar";
import RadiusSlider from "../components/explore/RadiusSlider";
import { apiGet } from "../api/client";
import { Place } from "../components/explore/types";
import { Ionicons } from "@expo/vector-icons";

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

  const [category, setCategory] = useState("all");
  const [radiusKm, setRadiusKm] = useState(5);
  const [showRadius, setShowRadius] = useState(false);

  const [region, setRegion] = useState({
    latitude: 49.48,
    longitude: 8.7,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  useEffect(() => {
    apiGet<Place[]>(
      `/places/geo/nearby?lat=${region.latitude}&lon=${region.longitude}`
    ).then(setPlaces);
  }, [region.latitude, region.longitude]);

  const filteredPlaces = places.filter((p) => {
    const matchesSearch =
      !activeSearch ||
      p.title.toLowerCase().includes(activeSearch.toLowerCase());

    // category logic later (group mapping)
    return matchesSearch;
  });

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        Keyboard.dismiss();
        setShowRadius(false);
      }}
      accessible={false}
    >
      <View style={styles.container}>
        {/* MAP */}
        <ExploreMap
          region={region}
          places={filteredPlaces}
          onMarkerPress={() => {}}
        />

        {/* SEARCH + FILTER OVERLAY */}
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

          <FilterBar
            categories={CATEGORY_GROUPS}
            activeCategory={category}
            radiusKm={radiusKm}
            onSelectCategory={(key) => {
              setCategory(key);
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
  onChange={setRadiusKm}
/>

          )}
        </View>

        {/* PLACE SHEET */}
        <PlaceSheet places={filteredPlaces} />
      </View>
    </TouchableWithoutFeedback>
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
});
