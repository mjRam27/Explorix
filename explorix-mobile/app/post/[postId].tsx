import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useMemo, useState } from "react";
import {
  likePost,
  unlikePost,
  savePost,
  unsavePost,
} from "../../api/posts";

type Post = {
  id: string;
  media_url?: string;
  caption?: string;
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
};

export default function PostDetailScreen() {
  const { postId, post } = useLocalSearchParams<{
    postId: string;
    post?: string;
  }>();

  const parsedPost = useMemo<Post | null>(() => {
    if (!post) return null;
    try {
      return JSON.parse(decodeURIComponent(post));
    } catch {
      return null;
    }
  }, [post]);

  const data = parsedPost ?? { id: postId };

  const [liked, setLiked] = useState(!!data.is_liked);
  const [saved, setSaved] = useState(!!data.is_saved);
  const [likesCount, setLikesCount] = useState(data.likes_count ?? 0);
  const [commentsCount] = useState(data.comments_count ?? 0);

  const toggleLike = async () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : prev - 1));
    try {
      nextLiked ? await likePost(data.id) : await unlikePost(data.id);
    } catch {
      setLiked(liked);
      setLikesCount(data.likes_count ?? 0);
    }
  };

  const toggleSave = async () => {
    const nextSaved = !saved;
    setSaved(nextSaved);
    try {
      nextSaved ? await savePost(data.id) : await unsavePost(data.id);
    } catch {
      setSaved(saved);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.mediaWrap}>
        {data.media_url ? (
          <Image
            source={{ uri: data.media_url }}
            style={styles.media}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.mediaPlaceholder} />
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity onPress={toggleLike}>
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={24}
            color={liked ? "#e53935" : "#fff"}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push(`/comments/${data.id}`)}>
          <Ionicons name="chatbubble-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={toggleSave}>
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={22}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.counts}>
        <Text style={styles.countText}>{likesCount} likes</Text>
        <Text style={styles.countText}>{commentsCount} comments</Text>
      </View>

      {data.caption ? (
        <Text style={styles.caption}>{data.caption}</Text>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f10",
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  mediaWrap: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#111",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  mediaPlaceholder: {
    flex: 1,
    backgroundColor: "#222",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 16,
  },
  counts: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  countText: {
    color: "#fff",
    fontSize: 13,
    marginTop: 2,
  },
  caption: {
    color: "#e6e6e6",
    paddingHorizontal: 16,
    paddingTop: 8,
    fontSize: 14,
  },
});
