import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Video } from "expo-av";
import { createPost, uploadPostMedia } from "../api/posts";

/* -------------------- CONSTANTS -------------------- */

const CATEGORIES = [
  "food",
  "nature",
  "culture",
  "shopping",
  "hidden_gems",
] as const;

type Category = (typeof CATEGORIES)[number];

/* -------------------- SCREEN -------------------- */

export default function UploadScreen() {
  const router = useRouter();

  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [locationName, setLocationName] = useState("");
  const [hasAudio, setHasAudio] = useState(true);
  const [posting, setPosting] = useState(false);

  /* -------------------- PICK MEDIA -------------------- */

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setMediaUri(asset.uri);
      setMediaType(asset.type === "video" ? "video" : "image");
    }
  };

  /* -------------------- POST (MOCK) -------------------- */

  const handlePost = async () => {
    if (!mediaUri || !mediaType) {
      Alert.alert("Missing media", "Please select an image or video");
      return;
    }

    if (!category) {
      Alert.alert("Missing category", "Please select a category");
      return;
    }

    setPosting(true);

    try {
      const fileName =
        mediaUri.split("/").pop() ??
        (mediaType === "video" ? "upload.mp4" : "upload.jpg");
      const fileType =
        mediaType === "video" ? "video/mp4" : "image/jpeg";

      const uploadRes = await uploadPostMedia({
        uri: mediaUri,
        name: fileName,
        type: fileType,
      });

      const mediaPath = uploadRes.data.media_path;
      if (!mediaPath) {
        Alert.alert("Upload failed", "No media path returned");
        return;
      }

      await createPost({
        media_url: mediaPath,
        media_type: mediaType,
        category,
        caption,
        location_name: locationName || null,
        latitude: null,
        longitude: null,
      });

      router.back();
    } catch (err) {
      Alert.alert("Upload failed", "Please try again");
    } finally {
      setPosting(false);
    }
  };

/* -------------------- UI -------------------- */

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>New post</Text>

        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* MEDIA PICKER */}
        <TouchableOpacity style={styles.mediaBox} onPress={pickMedia}>
          {!mediaUri && (
            <View style={styles.placeholder}>
              <Ionicons name="image-outline" size={40} color="#7a7a7a" />
              <Text style={styles.placeholderText}>
                Tap to select image or video
              </Text>
            </View>
          )}

          {mediaUri && mediaType === "image" && (
            <Image source={{ uri: mediaUri }} style={styles.media} />
          )}

          {mediaUri && mediaType === "video" && (
            <Video
              source={{ uri: mediaUri }}
              style={styles.media}
              useNativeControls
              isLooping
              shouldPlay={false}
              isMuted={!hasAudio}
            />
          )}
        </TouchableOpacity>

        {/* VIDEO AUDIO TOGGLE */}
        {mediaType === "video" && (
          <View style={styles.row}>
            <Text style={styles.label}>Sound</Text>
            <Switch value={hasAudio} onValueChange={setHasAudio} />
          </View>
        )}

        {/* CAPTION */}
        <TextInput
          placeholder="Add a caption..."
          placeholderTextColor="#777"
          style={styles.input}
          multiline
          value={caption}
          onChangeText={setCaption}
        />

        {/* CATEGORY */}
        <Text style={styles.sectionTitle}>Category</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                category === cat && styles.chipActive,
              ]}
              onPress={() => setCategory(cat)}
            >
              <Text
                style={[
                  styles.chipText,
                  category === cat && styles.chipTextActive,
                ]}
              >
                {cat.replace("_", " ")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* LOCATION */}
        <TextInput
          placeholder="Add location (optional)"
          placeholderTextColor="#777"
          style={styles.input}
          value={locationName}
          onChangeText={setLocationName}
        />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.shareBtn, posting && { opacity: 0.6 }]}
          onPress={handlePost}
          disabled={posting}
        >
          <Text style={styles.shareText}>
            {posting ? "Sharing..." : "Share"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* -------------------- STYLES -------------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0f1113",
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1f1f1f",
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },

  container: {
    padding: 16,
    paddingBottom: 120,
  },

  mediaBox: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#1b1b1b",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 18,
  },

  media: {
    width: "100%",
    height: "100%",
  },

  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderText: {
    color: "#888",
    marginTop: 8,
  },

  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
    color: "#fff",
  },

  sectionTitle: {
    fontWeight: "600",
    marginBottom: 8,
    color: "#fff",
  },

  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },

  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
    marginRight: 8,
    marginBottom: 8,
  },

  chipActive: {
    backgroundColor: "#4c5cff",
    borderColor: "#4c5cff",
  },

  chipText: {
    fontSize: 13,
    color: "#bbb",
  },

  chipTextActive: {
    color: "#fff",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#1f1f1f",
    backgroundColor: "#0f1113",
  },
  shareBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4c5cff",
    alignItems: "center",
    justifyContent: "center",
  },
  shareText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
