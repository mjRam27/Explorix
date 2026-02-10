import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import FeedPostCard from "../../components/feed/FeedPostCard";
import { getMyPosts, getSavedPosts, getUserPosts } from "../../api/posts";

type Post = {
  id: string;
  user?: {
    id?: string;
    name?: string;
    avatar_url?: string | null;
  };
  media_url?: string;
  mediaUrl?: string;
  image_url?: string;
  image?: string;
  media?: { url?: string; media_url?: string } | null;
  caption?: string;
  created_at?: string;
  location_name?: string;
};

export default function PostDetailScreen() {
  const { postId, post, posts, index, viewerUser, source, userId } = useLocalSearchParams<{
    postId: string;
    post?: string;
    posts?: string;
    index?: string;
    viewerUser?: string;
    source?: "my" | "saved" | "user";
    userId?: string;
  }>();
  const listRef = useRef<FlatList<Post>>(null);
  const [fetchedPosts, setFetchedPosts] = useState<Post[] | null>(null);
  const [loading, setLoading] = useState(false);

  const parsedPost = useMemo<Post | null>(() => {
    if (!post) return null;
    try {
      return JSON.parse(decodeURIComponent(post));
    } catch {
      return null;
    }
  }, [post]);

  const parsedPosts = useMemo<Post[]>(() => {
    if (!posts) return [];
    try {
      const decoded = JSON.parse(decodeURIComponent(posts));
      return Array.isArray(decoded) ? decoded : [];
    } catch {
      return [];
    }
  }, [posts]);

  const parsedViewerUser = useMemo<{ id?: string; name?: string; avatar_url?: string | null } | null>(() => {
    if (!viewerUser) return null;
    try {
      return JSON.parse(decodeURIComponent(viewerUser));
    } catch {
      return null;
    }
  }, [viewerUser]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!source) return;
      setLoading(true);
      try {
        let res: any;
        if (source === "my") {
          res = await getMyPosts();
        } else if (source === "saved") {
          res = await getSavedPosts();
        } else if (source === "user" && userId) {
          res = await getUserPosts(String(userId));
        }
        const raw = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.items)
          ? res.data.items
          : [];
        if (mounted) setFetchedPosts(raw);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [source, userId]);

  const data = useMemo<Post[]>(() => {
    const base =
      (fetchedPosts && fetchedPosts.length > 0 ? fetchedPosts : null) ??
      (parsedPosts.length > 0 ? parsedPosts : parsedPost ? [parsedPost] : [{ id: postId }]);
    return base.map((item: any) => ({
      ...item,
      media_url:
        item.media_url ??
        item.mediaUrl ??
        item.image_url ??
        item.image ??
        item.media?.url ??
        item.media?.media_url ??
        undefined,
      user: {
        id: item?.user?.id || parsedViewerUser?.id,
        name: item?.user?.name || item?.user?.username || parsedViewerUser?.name,
        avatar_url:
          item?.user?.avatar_url ||
          item?.user?.avatarUrl ||
          item?.user?.avatar ||
          item?.user?.profile_pic ||
          item?.user?.profile_image_url ||
          item?.avatar_url ||
          item?.avatarUrl ||
          item?.avatar ||
          item?.profile_pic ||
          item?.profile_image_url ||
          parsedViewerUser?.avatar_url ||
          null,
      },
    }));
  }, [parsedPost, parsedPosts, postId, parsedViewerUser, fetchedPosts]);

  const initialIndex = useMemo(() => {
    if (fetchedPosts && fetchedPosts.length > 0 && postId) {
      const idxById = data.findIndex((p) => String(p.id) === String(postId));
      if (idxById >= 0) return idxById;
    }
    const idx = Number(index ?? 0);
    if (Number.isNaN(idx)) return 0;
    return Math.max(0, Math.min(idx, Math.max(0, data.length - 1)));
  }, [index, data, fetchedPosts, postId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Posts</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item, idx) => `${item.id}-${idx}`}
        initialScrollIndex={initialIndex}
        showsVerticalScrollIndicator={false}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        onScrollToIndexFailed={({ index: failedIndex }) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({
              index: Math.min(failedIndex, Math.max(0, data.length - 1)),
              animated: true,
            });
          }, 250);
        }}
        renderItem={({ item }) => (
          <FeedPostCard post={item as any} />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}><ActivityIndicator /></View>
          ) : (
            <View style={styles.centered}><Text style={styles.emptyText}>No posts found.</Text></View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  headerTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "600",
  },
  list: {
    backgroundColor: "#fff",
  },
  listContent: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: "#6b7280",
  },
});
