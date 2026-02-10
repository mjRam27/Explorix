import {
  FlatList,
  ActivityIndicator,
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { useState, useCallback } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getFeed } from "../../api/posts";
import FeedPostCard from "../../components/feed/FeedPostCard";
import { SafeAreaView } from "react-native-safe-area-context";


export default function FeedScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [lastFetchAt, setLastFetchAt] = useState<number>(0);

  const dedupeById = (items: any[]) => {
    const map = new Map<string, any>();
    for (const item of items) {
      const key = String(item?.id ?? "");
      if (!key) continue;
      if (!map.has(key)) map.set(key, item);
    }
    return Array.from(map.values());
  };

  const refreshFeed = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const res = await getFeed(undefined);
      const items = res.data.items ?? res.data;
      setPosts(dedupeById(items));
      setCursor(res.data.next_cursor);
      setHasMore(!!res.data.next_cursor);
      setLastFetchAt(Date.now());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchFeed = async () => {
    if (!hasMore) return;

    const res = await getFeed(cursor);
    const items = res.data.items ?? res.data;

    setPosts((prev) => dedupeById([...prev, ...items]));
    setCursor(res.data.next_cursor);
    setHasMore(!!res.data.next_cursor);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (posts.length > 0 && now - lastFetchAt < 180000) {
        return;
      }
      refreshFeed(posts.length === 0);
    }, [refreshFeed, posts.length, lastFetchAt])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.headerWrap}>
        <Pressable style={styles.headerIconBtn}>
          <Ionicons name="menu" size={20} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Explorix</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.headerIconBtn}
            onPress={() => router.push("/feed-search")}
          >
            <Ionicons name="search" size={20} color="#111827" />
          </Pressable>
          <Pressable
            style={styles.headerIconBtn}
            onPress={() => router.push("/chat-screen")}
          >
            <Ionicons name="sparkles-outline" size={20} color="#111827" />
          </Pressable>
        </View>
      </View>
        <FlatList
          data={posts}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={({ item }) => <FeedPostCard post={item} />}
          onEndReached={fetchFeed}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => refreshFeed(true)}
        />
    </SafeAreaView>
  );

}

const styles = StyleSheet.create({
  headerWrap: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
