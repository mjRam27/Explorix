import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  name: string;
  email: string;
  bio?: string;
  avatarUrl?: string | null;
  onOpenSettings: () => void;
  onAddPost: () => void;
  onEditProfile: () => void;
};

export default function ProfileHeader({
  name,
  email,
  bio,
  avatarUrl,
  onOpenSettings,
  onAddPost,
  onEditProfile,
}: Props) {
  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.username}>{name}</Text>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onAddPost}
            hitSlop={10}
            style={styles.addBtn}
          >
            <Ionicons name="add-circle-outline" size={26} />
          </TouchableOpacity>

          <TouchableOpacity onPress={onOpenSettings} hitSlop={10}>
            <Ionicons name="menu-outline" size={26} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Avatar */}
      <View style={styles.avatarWrap}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{name[0]}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.email}>{email}</Text>

      {bio ? <Text style={styles.bio}>{bio}</Text> : null}

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={onEditProfile}>
          <Text style={styles.actionText}>Edit profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionText}>Share profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="person-add-outline" size={18} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },

  username: {
    fontSize: 18,
    fontWeight: "600",
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
  },

  addBtn: {
    marginRight: 14,
  },

  avatarWrap: {
    alignSelf: "center",
    marginVertical: 14,
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
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
  },

  name: {
    textAlign: "center",
    fontWeight: "600",
    fontSize: 15,
  },

  email: {
    textAlign: "center",
    color: "#666",
    fontSize: 13,
    marginTop: 2,
  },

  bio: {
    textAlign: "center",
    marginTop: 6,
    color: "#444",
    fontSize: 13,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 8,
  },
  actionText: {
    fontWeight: "500",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
