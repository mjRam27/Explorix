// components/feed/FeedPostCard.tsx
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useRouter } from "expo-router";

import {
  likePost,
  unlikePost,
  savePost,
  unsavePost,
} from "../../api/posts";


type Props = {
  post: any;
};

export default function FeedPostCard({ post }: Props) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.is_liked);
  const [saved, setSaved] = useState(post.is_saved);
  const [likesCount, setLikesCount] = useState(post.likes_count);

  /* LIKE */
  const toggleLike = async () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : prev - 1));

    try {
      nextLiked ? await likePost(post.id) : await unlikePost(post.id);
    } catch {
      setLiked(liked);
      setLikesCount(post.likes_count);
    }
  };

  /* SAVE */
  const toggleSave = async () => {
    const nextSaved = !saved;
    setSaved(nextSaved);

    try {
      nextSaved ? await savePost(post.id) : await unsavePost(post.id);
    } catch {
      setSaved(saved);
    }
  };

  return (
    <View style={styles.card}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.userRow}>
          <Image
            source={{
              uri: post.user?.avatar_url || "https://i.pravatar.cc/100",
            }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.username}>
              {post.user?.name || "Explorer"}
            </Text>
            {post.location && (
              <Text style={styles.location}>{post.location}</Text>
            )}
          </View>
        </View>
        <Ionicons name="ellipsis-horizontal" size={18} />
      </View>

      {/* IMAGE */}
      <Image source={{ uri: post.media_url }} style={styles.image} />

      {/* ACTIONS */}
      <View style={styles.actions}>
        <View style={styles.leftActions}>
          <TouchableOpacity onPress={toggleLike}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={26}
              color={liked ? "#e53935" : "#000"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginLeft: 16 }}
            onPress={() => router.push(`/comments/${post.id}`)}
          >
            <Ionicons name="chatbubble-outline" size={24} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={toggleSave}>
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={24}
          />
        </TouchableOpacity>
      </View>

      {/* COUNTS */}
      <View style={styles.counts}>
        <Text style={styles.countText}>{likesCount} likes</Text>

        <TouchableOpacity
          onPress={() => router.push(`/comments/${post.id}`)}
        >
          <Text style={styles.countText}>
            View all {post.comments_count ?? 0} comments
          </Text>
        </TouchableOpacity>
      </View>

      {/* CAPTION */}
      <Text style={styles.caption}>
        <Text style={styles.username}>
          {post.user?.name || "Explorer"}{" "}
        </Text>
        {post.caption}
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  username: {
    fontWeight: "600",
    fontSize: 14,
  },
  location: {
    fontSize: 12,
    color: "#666",
  },
  image: {
    width: "100%",
    aspectRatio: 4 / 5,
    backgroundColor: "#eee",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  leftActions: {
    flexDirection: "row",
  },
  counts: {
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  countText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#000",
  },
  caption: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
    fontSize: 13,
  },
});
