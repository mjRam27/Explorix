import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import {
  listSnapDrafts,
  deleteSnapDraft,
  updateSnapDraft,
  type SnapDraft,
} from "../../lib/snapDrafts";

export default function SnapDraftsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<SnapDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const drafts = await listSnapDrafts();
      setItems(drafts);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const removeDraft = (draft: SnapDraft) => {
    Alert.alert("Delete photo?", "This removes it from local drafts.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteSnapDraft(draft.id);
          setItems((prev) => prev.filter((x) => x.id !== draft.id));
        },
      },
    ]);
  };

  const rotateDraft = async (draft: SnapDraft) => {
    setBusyId(draft.id);
    try {
      const result = await ImageManipulator.manipulateAsync(
        draft.uri,
        [{ rotate: 90 }],
        { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
      );
      await updateSnapDraft(draft.id, { uri: result.uri });
      setItems((prev) =>
        prev.map((x) => (x.id === draft.id ? { ...x, uri: result.uri } : x))
      );
    } finally {
      setBusyId(null);
    }
  };

  const mirrorDraft = async (draft: SnapDraft) => {
    setBusyId(draft.id);
    try {
      const result = await ImageManipulator.manipulateAsync(
        draft.uri,
        [{ flip: ImageManipulator.FlipType.Horizontal }],
        { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
      );
      await updateSnapDraft(draft.id, { uri: result.uri });
      setItems((prev) =>
        prev.map((x) => (x.id === draft.id ? { ...x, uri: result.uri } : x))
      );
    } finally {
      setBusyId(null);
    }
  };

  const renderItem = ({ item }: { item: SnapDraft }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.uri }} style={styles.image} />
      <View style={styles.meta}>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
        <Text style={styles.status}>Status: {item.status}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => rotateDraft(item)}
          disabled={busyId === item.id}
        >
          <Text style={styles.actionText}>Rotate</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => mirrorDraft(item)}
          disabled={busyId === item.id}
        >
          <Text style={styles.actionText}>Mirror</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() =>
            router.push({
              pathname: "/upload",
              params: {
                draftId: item.id,
                draftUri: item.uri,
                draftLat:
                  item.latitude != null ? String(item.latitude) : undefined,
                draftLng:
                  item.longitude != null ? String(item.longitude) : undefined,
                draftLocationName: item.location_name ?? undefined,
              },
            })
          }
          disabled={busyId === item.id}
        >
          <Text style={styles.uploadText}>Upload</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => removeDraft(item)}
          disabled={busyId === item.id}
        >
          <Ionicons name="trash-outline" size={16} color="#111827" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My snapped photos</Text>
        <TouchableOpacity onPress={() => router.push("/snap/camera")}>
          <Ionicons name="camera-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No photos yet</Text>
          <TouchableOpacity
            style={styles.captureStartBtn}
            onPress={() => router.push("/snap/camera")}
          >
            <Text style={styles.captureStartText}>Open camera</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0b0f14" },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  list: { paddingHorizontal: 14, paddingBottom: 24 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: "#fff", marginBottom: 14 },
  captureStartBtn: {
    backgroundColor: "#2d6cdf",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  captureStartText: { color: "#fff", fontWeight: "600" },
  card: {
    backgroundColor: "#111827",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  image: { width: "100%", height: 200, backgroundColor: "#111" },
  meta: { paddingHorizontal: 10, paddingTop: 10 },
  date: { color: "#d1d5db", fontSize: 12 },
  status: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  actionBtn: {
    backgroundColor: "#1f2937",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: { color: "#e5e7eb", fontWeight: "600", fontSize: 12 },
  uploadBtn: {
    backgroundColor: "#2d6cdf",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: "auto",
  },
  uploadText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e5e7eb",
  },
});
