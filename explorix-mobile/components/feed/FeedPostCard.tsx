// components/feed/FeedPostCard.tsx
import {
  Animated,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  DeviceEventEmitter,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
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
  const [commentsCount, setCommentsCount] = useState(resolvedCommentsCount);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const lastTapRef = useRef(0);
  const likeBurst = useRef(new Animated.Value(0)).current;
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

  const onImagePress = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      likeBurst.stopAnimation();
      likeBurst.setValue(0);
      Animated.sequence([
        Animated.timing(likeBurst, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.delay(350),
        Animated.timing(likeBurst, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
      if (!liked) {
        toggleLike();
      }
    }
    lastTapRef.current = now;
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

  useEffect(() => {
    setCommentsCount(resolvedCommentsCount);
  }, [resolvedCommentsCount, post?.id]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [userAvatar]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "post:comment-updated",
      (payload: { postId?: string; count?: number; delta?: number }) => {
        if (String(payload?.postId || "") !== String(post?.id || "")) return;
        if (Number.isFinite(Number(payload?.count))) {
          setCommentsCount(Math.max(0, Number(payload?.count)));
          return;
        }
        if (Number.isFinite(Number(payload?.delta))) {
          setCommentsCount((prev) => Math.max(0, prev + Number(payload?.delta)));
        }
      }
    );
    return () => sub.remove();
  }, [post?.id]);

  return (
    <View style={styles.card}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.userRow} onPress={openAuthorProfile}>
          <View style={styles.avatarWrap}>
            {userAvatar && !avatarLoadFailed ? (
              <Image
                source={{
                  uri: userAvatar,
                }}
                style={styles.avatar}
                onError={() => setAvatarLoadFailed(true)}
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
      <View style={styles.imageWrap}>
        <Pressable onPress={onImagePress}>
          <Image source={{ uri: post.media_url }} style={styles.image} />
        </Pressable>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.likeBurstOverlay,
            {
              opacity: likeBurst,
              transform: [
                {
                  scale: likeBurst.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.55, 1.15],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="heart" size={92} color="#ffffff" />
        </Animated.View>
      </View>

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
            onPress={() =>
              router.push({
                pathname: "/comments/[postId]",
                params: {
                  postId: String(post.id),
                  post: encodeURIComponent(
                    JSON.stringify({
                      caption: post.caption ?? "",
                      media_url: post.media_url ?? "",
                      location_name: post.location_name ?? "",
                    })
                  ),
                },
              })
            }
          >
            <Ionicons name="chatbubble-outline" size={22} color="#111827" />
            <Text style={styles.iconCountText}>{commentsCount}</Text>
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
        <Text style={styles.metaText}>View all {commentsCount} comments</Text>
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
  imageWrap: {
    position: "relative",
  },
  likeBurstOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
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
