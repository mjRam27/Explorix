import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { api } from "../../api/client";
import { uploadAvatar } from "../../api/posts";
import { Ionicons } from "@expo/vector-icons";

type Profile = {
  name?: string;
  email?: string;
  bio?: string;
  avatar_url?: string | null;
};

export default function EditProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<Profile>("/users/me");
        setProfile(res.data);
        setName(res.data.name ?? "");
        setBio(res.data.bio ?? "");
        setAvatarUrl(res.data.avatar_url ?? null);
        setAvatarPath(res.data.avatar_url ?? null);
      } catch {
        Alert.alert("Failed to load profile");
      }
    };
    load();
  }, []);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const fileName = asset.uri.split("/").pop() ?? "avatar.jpg";
    const uploadRes = await uploadAvatar({
      uri: asset.uri,
      name: fileName,
      type: "image/jpeg",
    });

    const path = uploadRes.data.media_path;
    const signed = uploadRes.data.signed_url || uploadRes.data.media_url;
    if (!path) {
      Alert.alert("Upload failed", "No avatar path returned");
      return;
    }

    setAvatarPath(path);
    setAvatarUrl(signed);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/users/me", {
        name: name.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarPath,
      });
      router.back();
    } catch {
      Alert.alert("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>
                {(profile?.name ?? "U")[0]}
              </Text>
            </View>
          )}
          <Text style={styles.changePhoto}>Change photo</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="Your name"
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          style={[styles.input, styles.bioInput]}
          placeholder="Tell something about you"
          multiline
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
        >
          <Text style={styles.saveText}>
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  container: {
    padding: 20,
  },
  avatarWrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#1E88E5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
  },
  changePhoto: {
    marginTop: 8,
    color: "#4c5cff",
    fontWeight: "600",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  saveBtn: {
    backgroundColor: "#4c5cff",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveText: {
    color: "#fff",
    fontWeight: "600",
  },
});
