import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { searchUsers } from "../api/users";
import { useAuth } from "../context/AuthContext";

const RECENT_KEY = "feed:recent_user_searches";

type UserItem = {
  id: string;
  name?: string;
  avatar_url?: string | null;
};

export default function FeedSearchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UserItem[]>([]);
  const [recents, setRecents] = useState<UserItem[]>([]);

  const queryTrimmed = query.trim();

  const loadRecents = async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setRecents(Array.isArray(parsed) ? parsed : []);
    } catch {
      setRecents([]);
    }
  };

  const persistRecents = async (items: UserItem[]) => {
    setRecents(items);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, 20)));
  };

  useEffect(() => {
    loadRecents();
  }, []);

  useEffect(() => {
    if (queryTrimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchUsers(queryTrimmed, 20);
        const all = (res.data.items ?? []) as UserItem[];
        const myId = String(user?.user_id || "");
        setResults(all.filter((u) => String(u.id) !== myId));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [queryTrimmed]);

  const onPickUser = async (item: UserItem) => {
    const next = [item, ...recents.filter((r) => r.id !== item.id)];
    await persistRecents(next);
    Keyboard.dismiss();
    router.push({
      pathname: "/profile/[userId]",
      params: { userId: item.id },
    });
  };

  const visibleRecents = useMemo(() => {
    const myId = String(user?.user_id || "");
    return recents.filter((r) => String(r.id) !== myId).slice(0, 8);
  }, [recents, user?.user_id]);
  const showingSearch = queryTrimmed.length >= 2;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color="#64748b" />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search people..."
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons name="close" size={18} color="#64748b" />
            </Pressable>
          )}
        </View>
      </View>

      {showingSearch ? (
        loading ? (
          <View style={styles.centered}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => onPickUser(item)}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>
                      {String(item.name || "U").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.name}>{item.name || "User"}</Text>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No users found</Text>}
          />
        )
      ) : (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            <Pressable onPress={() => persistRecents([])}>
              <Text style={styles.clearAll}>Clear All</Text>
            </Pressable>
          </View>
          {visibleRecents.length === 0 ? (
            <Text style={styles.empty}>No recent searches</Text>
          ) : (
            visibleRecents.map((item) => (
              <View key={item.id} style={styles.row}>
                <Pressable style={styles.rowMain} onPress={() => onPickUser(item)}>
                  <Ionicons name="time-outline" size={18} color="#94a3b8" />
                  <Text style={styles.name}>{item.name || "User"}</Text>
                </Pressable>
                <Pressable
                  onPress={() => persistRecents(recents.filter((r) => r.id !== item.id))}
                >
                  <Ionicons name="close" size={18} color="#94a3b8" />
                </Pressable>
              </View>
            ))
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#3b82f6",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
  },
  searchInput: { flex: 1, fontSize: 16, color: "#0f172a" },
  section: { paddingHorizontal: 16, paddingTop: 8 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 28, fontWeight: "700", color: "#111827" },
  clearAll: { fontSize: 14, color: "#2563eb", fontWeight: "600" },
  row: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 10,
    paddingVertical: 8,
  },
  rowMain: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f6feb",
  },
  avatarText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  name: { fontSize: 18, color: "#111827", fontWeight: "600" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { color: "#6b7280", marginTop: 14, fontSize: 14 },
});
