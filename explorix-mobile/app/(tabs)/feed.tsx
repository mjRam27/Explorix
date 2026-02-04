import { FlatList, ActivityIndicator, View } from "react-native";
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { getFeed } from "../../api/posts";
import FeedPostCard from "../../components/feed/FeedPostCard";
import { SafeAreaView } from "react-native-safe-area-context";


export default function FeedScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);

  const refreshFeed = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const res = await getFeed(undefined);
      const items = res.data.items ?? res.data;
      setPosts(items);
      setCursor(res.data.next_cursor);
      setHasMore(!!res.data.next_cursor);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchFeed = async () => {
    if (!hasMore) return;

    const res = await getFeed(cursor);
    const items = res.data.items ?? res.data;

    setPosts((prev) => [...prev, ...items]);
    setCursor(res.data.next_cursor);
    setHasMore(!!res.data.next_cursor);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      refreshFeed(posts.length === 0);
    }, [refreshFeed])
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
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
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
