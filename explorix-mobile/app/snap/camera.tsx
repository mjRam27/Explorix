import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { addSnapDraft } from "../../lib/snapDrafts";
import * as Location from "expo-location";

export default function SnapCameraScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!permission) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.text}>Loading camera permissions...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.text}>Camera access is required to take photos.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryText}>Grant camera access</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push("/snap/drafts")}
        >
          <Text style={styles.secondaryText}>View photos</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const takePhoto = async () => {
    if (!cameraRef) return;
    try {
      const result = await cameraRef.takePictureAsync({
        quality: 0.85,
      });
      if (result?.uri) {
        setCapturedUri(result.uri);
      }
    } catch {
      Alert.alert("Camera error", "Could not capture photo.");
    }
  };

  const saveDraft = async () => {
    if (!capturedUri) return;
    setSaving(true);
    try {
      let latitude: number | null = null;
      let longitude: number | null = null;
      let locationName: string | null = null;

      try {
        const locPerm = await Location.requestForegroundPermissionsAsync();
        if (locPerm.status === "granted") {
          const current = await Location.getCurrentPositionAsync({});
          latitude = current.coords.latitude;
          longitude = current.coords.longitude;
          const geo = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });
          const first = geo?.[0];
          if (first) {
            locationName =
              first.city ||
              first.subregion ||
              first.region ||
              first.country ||
              null;
          }
        }
      } catch {
        // Keep draft save working even if location fails.
      }

      await addSnapDraft(capturedUri, {
        latitude,
        longitude,
        location_name: locationName,
      });
      Alert.alert("Saved", "Photo saved to local drafts.");
      setCapturedUri(null);
      router.push("/snap/drafts");
    } catch {
      Alert.alert("Save failed", "Could not save photo to drafts.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Snap</Text>
        <TouchableOpacity onPress={() => router.push("/snap/drafts")}>
          <Text style={styles.link}>View photos</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {!capturedUri ? (
          <CameraView style={styles.camera} facing={facing} ref={setCameraRef} />
        ) : (
          <Image source={{ uri: capturedUri }} style={styles.camera} />
        )}
      </View>

      <View style={styles.footer}>
        {!capturedUri ? (
          <>
            <TouchableOpacity
              style={styles.roundBtn}
              onPress={() =>
                setFacing((prev) => (prev === "back" ? "front" : "back"))
              }
            >
              <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
            <View style={styles.roundBtnPlaceholder} />
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.secondaryBtnWide}
              onPress={() => setCapturedUri(null)}
            >
              <Text style={styles.secondaryText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtnWide, saving && { opacity: 0.7 }]}
              onPress={saveDraft}
              disabled={saving}
            >
              <Text style={styles.primaryText}>
                {saving ? "Saving..." : "Save to drafts"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#050505" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050505",
    paddingHorizontal: 24,
  },
  text: { color: "#fff", textAlign: "center", marginBottom: 12 },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { color: "#9ad0ff", fontWeight: "600" },
  body: { flex: 1, paddingHorizontal: 12, paddingBottom: 10 },
  camera: { flex: 1, borderRadius: 14, overflow: "hidden" },
  footer: {
    height: 110,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 20,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  roundBtnPlaceholder: { width: 44, height: 44 },
  captureBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#fff",
  },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: "#2d6cdf",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryBtnWide: {
    flex: 1,
    backgroundColor: "#2d6cdf",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "600" },
  secondaryBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#4b5563",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  secondaryBtnWide: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#4b5563",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryText: { color: "#fff", fontWeight: "600" },
});
