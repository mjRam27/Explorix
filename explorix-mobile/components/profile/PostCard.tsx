// components/profile/PostCard.tsx
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { router } from "expo-router";
import {
  likePost,
  unlikePost,
  savePost,
  unsavePost,
  getPostNavigation,
} from "../../api/posts";

type PostProps = {
  post: {
    id: string;
    media_url?: string;
    media_type?: "image" | "video";
    caption?: string;

    likes_count?: number;
    comments_count?: number;
    is_liked?: boolean;
    is_saved?: boolean;
  };
  showActions?: boolean;
};

export default function PostCard({ post, showActions = false }: PostProps) {
  const {
    likes_count = 0,
    comments_count = 0,
    is_liked = false,
    is_saved = false,
  } = post;

  const onLike = async () => {
    is_liked ? await unlikePost(post.id) : await likePost(post.id);
  };

  const onSave = async () => {
    is_saved ? await unsavePost(post.id) : await savePost(post.id);
  };

  const navigateToPlace = async () => {
    try {
      const res = await getPostNavigation(post.id);
      router.push({
        pathname: "/explore",
        params: {
          lat: res.data.latitude,
          lng: res.data.longitude,
          name: res.data.location_name,
        },
      });
    } catch {
      alert("No navigation available");
    }
  };

  return (
    <View style={styles.card}>
      {/* MEDIA */}
      {post.media_url && (
        <Image
          source={{ uri: post.media_url }}
          style={styles.media}
          resizeMode="cover"
        />
      )}

      {/* CAPTION */}
      {post.caption && <Text style={styles.caption}>{post.caption}</Text>}

      {/* ACTIONS (ONLY IN FEED / DETAIL) */}
      {showActions && (
        <View style={styles.actions}>
          <Pressable onPress={onLike}>
            <Text>❤️ {likes_count}</Text>
          </Pressable>

          <Pressable>
            <Text>💬 {comments_count}</Text>
          </Pressable>

          <Pressable onPress={onSave}>
            <Text>{is_saved ? "🔖 Saved" : "🔖 Save"}</Text>
          </Pressable>

          <Pressable onPress={navigateToPlace}>
            <Text>🧭 Navigate</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  media: {
    width: "100%",
    height: 280,
    backgroundColor: "#eee",
  },
  caption: {
    padding: 10,
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
  },
});
