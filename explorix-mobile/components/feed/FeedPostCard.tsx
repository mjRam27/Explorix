// components/feed/FeedPostCard.tsx
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useRouter } from "expo-router";

import {
  likePost,
  unlikePost,
  savePost,
  unsavePost,
  getPostNavigation,
} from "../../api/posts";
import { addNextStop as addNextStopApi } from "../../api/itinerary";


type Props = {
  post: any;
};

export default function FeedPostCard({ post }: Props) {
  const router = useRouter();
  const userId = String(post?.user?.id || post?.user_id || post?.author_id || "");
  const userName = String(
    post?.user?.name ||
      post?.user?.username ||
      post?.username ||
      post?.author_name ||
      "Explorer"
  );
  const userAvatar = String(
    post?.user?.avatar_url ||
      post?.user?.avatarUrl ||
      post?.user?.avatar ||
      post?.user?.profile_pic ||
      post?.user?.profile_image_url ||
      post?.avatar_url ||
      post?.avatarUrl ||
      post?.avatar ||
      post?.profile_pic ||
      post?.profile_image_url ||
      ""
  );
  const resolvedLikesCount = Number(
    post?.likes_count ?? post?.likesCount ?? post?.like_count ?? 0
  );
  const resolvedCommentsCount = Number(
    post?.comments_count ?? post?.commentsCount ?? post?.comment_count ?? 0
  );
  const [liked, setLiked] = useState(post.is_liked);
  const [saved, setSaved] = useState(post.is_saved);
  const [likesCount, setLikesCount] = useState(resolvedLikesCount);
  const hasInlineCoords =
    Number.isFinite(Number(post?.latitude)) &&
    Number.isFinite(Number(post?.longitude));

  const toStableIntId = (value: string | number) => {
    const s = String(value ?? "");
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = (hash * 31 + s.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) + 1;
  };

  const resolveCoords = async () => {
    try {
      const navRes = await getPostNavigation(post.id);
      const lat = Number(navRes.data?.latitude);
      const lng = Number(navRes.data?.longitude);
      const title = String(
        navRes.data?.location_name || post.location_name || post.caption || "Post location"
      );
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { latitude: lat, longitude: lng, title };
      }
    } catch {
      // fallback below
    }

    if (hasInlineCoords) {
      return {
        latitude: Number(post.latitude),
        longitude: Number(post.longitude),
        title: String(post.location_name || post.caption || "Post location"),
      };
    }
    return null;
  };

  const navigateToPlace = async () => {
    const coords = await resolveCoords();
    if (!coords) {
      Alert.alert("No location", "This post has no location for navigation.");
      return;
    }

      router.push({
        pathname: "/explore",
        params: {
          placeId: String(post.id),
          placeLat: String(coords.latitude),
          placeLng: String(coords.longitude),
          placeTitle: coords.title,
          placeCategory: String(post.category || ""),
          autoRoute: "1",
        },
      });
  };

  const addAsNextStop = async () => {
    const coords = await resolveCoords();
    if (!coords) {
      Alert.alert("No location", "This post has no location to add as next stop.");
      return;
    }
    try {
      await addNextStopApi({
        id: toStableIntId(post.id),
        title: coords.title,
        latitude: coords.latitude,
        longitude: coords.longitude,
        category: post.category ?? null,
      });
      Alert.alert("Added", "Post location added to Next Stop list.");
    } catch {
      Alert.alert("Failed", "Could not add this location as next stop.");
    }
  };

  /* LIKE */
  const toggleLike = async () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : prev - 1));

    try {
      nextLiked ? await likePost(post.id) : await unlikePost(post.id);
    } catch {
      setLiked(liked);
      setLikesCount(resolvedLikesCount);
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

  const openAuthorProfile = () => {
    if (!userId) return;
    router.push({
      pathname: "/profile/[userId]",
      params: { userId },
    });
  };

  return (
    <View style={styles.card}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.userRow} onPress={openAuthorProfile}>
          <View style={styles.avatarWrap}>
            {userAvatar ? (
              <Image
                source={{
                  uri: userAvatar,
                }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {String(userName || "U").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View>
            <Text style={styles.username}>
              {userName}
            </Text>
            {post.location && (
              <Text style={styles.location}>{post.location}</Text>
            )}
          </View>
        </TouchableOpacity>
        <Ionicons name="ellipsis-horizontal" size={18} />
      </View>

      {/* IMAGE */}
      <Image source={{ uri: post.media_url }} style={styles.image} />

      {/* ACTIONS */}
      <View style={styles.actions}>
        <View style={styles.leftActions}>
          <TouchableOpacity style={styles.iconWithCount} onPress={toggleLike}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={24}
              color={liked ? "#e53935" : "#000"}
            />
            <Text style={styles.iconCountText}>{likesCount ?? 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconWithCount}
            onPress={() => router.push(`/comments/${post.id}`)}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#111827" />
            <Text style={styles.iconCountText}>{resolvedCommentsCount}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={toggleSave}>
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={22}
            color="#111827"
          />
        </TouchableOpacity>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{likesCount ?? 0} likes</Text>
        <Text style={styles.metaText}>View all {resolvedCommentsCount} comments</Text>
      </View>

      {/* CAPTION */}
      <Text style={styles.caption}>
        <Text style={styles.username} onPress={openAuthorProfile}>
          {userName}{" "}
        </Text>
        {post.caption}
      </Text>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickBtn}
          onPress={navigateToPlace}
        >
          <Ionicons name="paper-plane-outline" size={14} color="#111827" />
          <Text style={styles.quickBtnText}>Go</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickBtnSecondary}
          onPress={addAsNextStop}
        >
          <Ionicons name="add-circle-outline" size={14} color="#111827" />
          <Text style={styles.quickBtnSecondaryText}>Plan</Text>
        </TouchableOpacity>
      </View>

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
  avatarWrap: {
    width: 36,
    height: 36,
    marginRight: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f6feb",
  },
  avatarFallbackText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
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
    alignItems: "center",
  },
  leftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconWithCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconCountText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  caption: {
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 8,
    fontSize: 13,
  },
  metaRow: {
    paddingHorizontal: 12,
    paddingTop: 6,
    gap: 2,
  },
  metaText: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "500",
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
  },
  quickBtn: {
    backgroundColor: "#e5e7eb",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quickBtnText: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 13,
  },
  quickBtnSecondary: {
    backgroundColor: "#e5e7eb",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quickBtnSecondaryText: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 13,
  },
});
