import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  name: string;
  email: string;
  bio?: string;
  onOpenSettings: () => void;
  onAddPost: () => void;
};

export default function ProfileHeader({
  name,
  email,
  bio,
  onOpenSettings,
  onAddPost,
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
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{name[0]}</Text>
      </View>

      {/* Info */}
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.email}>{email}</Text>

      {bio ? <Text style={styles.bio}>{bio}</Text> : null}

      <TouchableOpacity style={styles.editBtn}>
        <Text style={styles.editText}>Edit profile</Text>
      </TouchableOpacity>
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

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#1E88E5",
    alignSelf: "center",
    marginVertical: 14,
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

  editBtn: {
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignItems: "center",
  },

  editText: {
    fontWeight: "500",
  },
});
