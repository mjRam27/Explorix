import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  followUser,
  getFollowers,
  getFollowing,
  getPublicItineraries,
  getPublicProfile,
  unfollowUser,
} from "../../api/users";
import { getFeed, getUserPosts } from "../../api/posts";

type PublicUser = {
  id: string;
  name?: string;
  bio?: string;
  avatar_url?: string | null;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  is_following?: boolean;
};

type ConnectionItem = {
  id: string;
  name?: string;
  avatar_url?: string | null;
  is_following?: boolean;
};

type PastItinerary = {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  status?: string;
  days?: Array<{
    day?: number;
    date?: string;
    places?: Array<{
      name?: string;
      title?: string;
      place_name?: string;
      category?: string;
      notes?: string | null;
    }>;
  }>;
};

export default function PublicProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "itineraries">("posts");
  const [pastItineraries, setPastItineraries] = useState<PastItinerary[]>([]);
  const [expandedItineraryId, setExpandedItineraryId] = useState<string | null>(null);

  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [connectionsTab, setConnectionsTab] = useState<"followers" | "following">(
    "followers"
  );
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [connectionQuery, setConnectionQuery] = useState("");
  const [relationBusy, setRelationBusy] = useState<Record<string, boolean>>({});
  const [avatarPreview, setAvatarPreview] = useState<ConnectionItem | null>(null);

  const avatarLetter = useMemo(
    () => String(user?.name || "U").charAt(0).toUpperCase(),
    [user?.name]
  );

  const loadProfile = async () => {
    if (!userId) {
      return;
    }
    const [profileRes, postsRes] = await Promise.all([
      getPublicProfile(String(userId)),
      getUserPosts(String(userId)),
    ]);
    const profile = profileRes.data;
    setUser(profile);
    const rawPosts = Array.isArray(postsRes.data)
      ? postsRes.data
      : Array.isArray(postsRes.data?.items)
      ? postsRes.data.items
      : [];
    const normalizedPosts = rawPosts.map((p: any) => ({
      ...p,
      media_url: p?.media_url ?? p?.mediaUrl ?? p?.image_url ?? null,
    }));
    let finalPosts = normalizedPosts;
    if (finalPosts.length === 0 && Number(profile?.posts_count ?? 0) > 0) {
      try {
        const feedRes = await getFeed();
        const feedItems = Array.isArray(feedRes.data)
          ? feedRes.data
          : Array.isArray(feedRes.data?.items)
          ? feedRes.data.items
          : [];
        finalPosts = feedItems
          .filter(
            (p: any) =>
              String(p?.user?.id || p?.user_id || "") === String(userId)
          )
          .map((p: any) => ({
            ...p,
            media_url: p?.media_url ?? p?.mediaUrl ?? p?.image_url ?? null,
          }));
      } catch {
        // keep empty posts
      }
    }
    setPosts(finalPosts);
    try {
      const itinRes = await getPublicItineraries(String(userId), 50);
      setPastItineraries(itinRes.data.items ?? []);
    } catch {
      setPastItineraries([]);
    }
  };

  useEffect(() => {
    if (!userId) {
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        await loadProfile();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const onToggleFollow = async () => {
    if (!user || followBusy) {
      return;
    }
    if (user.is_following) {
      Alert.alert(
        "Unfollow user?",
        `Do you want to unfollow ${user.name || "this user"}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Unfollow",
            style: "destructive",
            onPress: () => {
              void performFollowToggle(false);
            },
          },
        ]
      );
      return;
    }
    await performFollowToggle(true);
  };

  const performFollowToggle = async (nextFollowing: boolean) => {
    if (!user || followBusy) return;
    setFollowBusy(true);
    setUser((prev) =>
      prev
        ? {
            ...prev,
            is_following: nextFollowing,
            followers_count: Math.max(
              0,
              (prev.followers_count ?? 0) + (nextFollowing ? 1 : -1)
            ),
          }
        : prev
    );

    try {
      if (nextFollowing) {
        await followUser(user.id);
      } else {
        await unfollowUser(user.id);
      }
      await loadProfile();
    } finally {
      setFollowBusy(false);
    }
  };

  const openConnections = async (tab: "followers" | "following") => {
    if (!user) {
      return;
    }
    setConnectionsOpen(true);
    setConnectionsTab(tab);
    setConnectionsLoading(true);
    try {
      const res =
        tab === "followers" ? await getFollowers(user.id, 80) : await getFollowing(user.id, 80);
      setConnections(res.data.items ?? []);
    } finally {
      setConnectionsLoading(false);
    }
  };

  const renderConnectionItem = ({ item }: { item: ConnectionItem }) => (
    <View style={styles.connectionRow}>
      <Pressable
        onPress={() => {
          setConnectionsOpen(false);
          router.push({
            pathname: "/profile/[userId]",
            params: { userId: item.id },
          });
        }}
        onLongPress={() => setAvatarPreview(item)}
      >
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.connectionAvatar} />
        ) : (
          <View style={styles.connectionAvatarFallback}>
            <Text style={styles.connectionAvatarFallbackText}>
              {String(item.name || "U").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </Pressable>
      <Pressable
        style={{ flex: 1 }}
        onPress={() => {
          setConnectionsOpen(false);
          router.push({
            pathname: "/profile/[userId]",
            params: { userId: item.id },
          });
        }}
      >
        <Text style={styles.connectionName}>{item.name || "User"}</Text>
      </Pressable>
      <Pressable
        style={[styles.followMiniBtn, item.is_following ? styles.followingMiniBtn : styles.followMiniCta]}
        disabled={!!relationBusy[item.id]}
        onPress={async () => {
          if (relationBusy[item.id]) return;
          setRelationBusy((prev) => ({ ...prev, [item.id]: true }));
          const next = !item.is_following;
          try {
            if (next) {
              await followUser(item.id);
            } else {
              await unfollowUser(item.id);
            }
            setConnections((prev) =>
              prev.map((it) => (it.id === item.id ? { ...it, is_following: next } : it))
            );
          } finally {
            setRelationBusy((prev) => ({ ...prev, [item.id]: false }));
          }
        }}
      >
        <Text
          style={[
            styles.followMiniText,
            item.is_following ? styles.followingMiniText : styles.followMiniCtaText,
          ]}
        >
          {relationBusy[item.id] ? "..." : item.is_following ? "Following" : "Follow"}
        </Text>
      </Pressable>
    </View>
  );

  const onShareProfile = async () => {
    if (!user) return;
    const message = `Check out ${user.name || "this profile"} on Explorix.`;
    try {
      await Share.share({ message });
    } catch {
      // ignore share cancellations/errors
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text>User not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>{user.name || "Profile"}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 26 }} showsVerticalScrollIndicator={false}>
      <View style={styles.profileBlock}>
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>{avatarLetter}</Text>
          </View>
        )}
        <Text style={styles.name}>{user.name || "User"}</Text>
        {!!user.bio && <Text style={styles.bio}>{user.bio}</Text>}

        <View style={styles.statsRow}>
          <View style={styles.statWrap}>
            <Text style={styles.statValue}>{user.posts_count ?? posts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <Pressable style={styles.statWrap} onPress={() => openConnections("followers")}>
            <Text style={styles.statValue}>{user.followers_count ?? 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </Pressable>
          <Pressable style={styles.statWrap} onPress={() => openConnections("following")}>
            <Text style={styles.statValue}>{user.following_count ?? 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.followBtn, user.is_following ? styles.followingBtn : styles.followCta]}
            onPress={onToggleFollow}
            disabled={followBusy}
          >
            <Text
              style={[
                styles.followBtnText,
                user.is_following ? styles.followingBtnText : styles.followCtaText,
              ]}
            >
              {followBusy ? "Please wait..." : user.is_following ? "Following" : "Follow"}
            </Text>
          </Pressable>
          <Pressable style={styles.shareBtn} onPress={onShareProfile}>
            <Text style={styles.shareBtnText}>Share profile</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabBtn, activeTab === "posts" && styles.tabBtnActive]}
          onPress={() => setActiveTab("posts")}
        >
          <Ionicons
            name="grid-outline"
            size={20}
            color={activeTab === "posts" ? "#111827" : "#9ca3af"}
          />
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === "itineraries" && styles.tabBtnActive]}
          onPress={() => setActiveTab("itineraries")}
        >
          <Ionicons
            name="map-outline"
            size={20}
            color={activeTab === "itineraries" ? "#111827" : "#9ca3af"}
          />
        </Pressable>
      </View>

      {activeTab === "posts" ? (
        <View style={styles.grid}>
          {posts.length === 0 ? (
            <Text style={styles.emptyItinerary}>No posts yet</Text>
          ) : (
            posts.map((post, idx) => (
              <Pressable
                key={`${post.id ?? "post"}-${idx}`}
                style={styles.gridItem}
                onPress={() =>
                  router.push({
                    pathname: "/post/[postId]",
                    params: {
                      postId: String(post.id ?? ""),
                      post: encodeURIComponent(JSON.stringify(post)),
                      index: String(idx),
                      source: "user",
                      userId: String(user.id),
                      viewerUser: encodeURIComponent(
                        JSON.stringify({
                          id: user.id,
                          name: user.name || "User",
                          avatar_url: user.avatar_url ?? null,
                        })
                      ),
                    },
                  })
                }
              >
                {String(post.media_url || "").length > 0 ? (
                  <Image
                    source={{ uri: String(post.media_url) }}
                    style={styles.gridImage}
                  />
                ) : (
                  <View style={styles.gridPlaceholder} />
                )}
              </Pressable>
            ))
          )}
        </View>
      ) : (
        <View style={styles.itinerarySection}>
          {pastItineraries.length === 0 ? (
            <Text style={styles.emptyItinerary}>No itineraries</Text>
          ) : (
            pastItineraries.map((it) => (
              <Pressable
                key={it.id}
                style={styles.itineraryCard}
                onPress={() =>
                  setExpandedItineraryId((prev) => (prev === it.id ? null : it.id))
                }
              >
                <View style={styles.itineraryTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itineraryCardTitle}>{it.title || "Trip"}</Text>
                    <Text style={styles.itineraryCardSub}>{it.destination}</Text>
                    <Text style={styles.itineraryCardSub}>
                      {it.start_date} - {it.end_date}
                    </Text>
                  </View>
                  <Ionicons
                    name={expandedItineraryId === it.id ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#94a3b8"
                  />
                </View>
                {expandedItineraryId === it.id && (
                  <View style={styles.itineraryDetailWrap}>
                    {(it.days ?? []).length === 0 ? (
                      <Text style={styles.itineraryCardSub}>No place details available.</Text>
                    ) : (
                      (it.days ?? []).map((d, idx) => (
                        <View key={`${it.id}-d-${idx}`} style={{ marginTop: idx === 0 ? 0 : 8 }}>
                          <Text style={styles.dayTitle}>
                            Day {d.day ?? idx + 1}
                            {d.date ? ` - ${d.date}` : ""}
                          </Text>
                          {(d.places ?? []).length === 0 ? (
                            <Text style={styles.itineraryCardSub}>No places</Text>
                          ) : (
                            (d.places ?? []).map((p, pIdx) => (
                              <Text key={`${it.id}-d-${idx}-p-${pIdx}`} style={styles.placeLine}>
                                - {p.name || p.title || p.place_name || "Place"}
                                {p.category ? ` (${p.category})` : ""}
                              </Text>
                            ))
                          )}
                        </View>
                      ))
                    )}
                  </View>
                )}
              </Pressable>
            ))
          )}
        </View>
      )}
      </ScrollView>

      <Modal
        visible={connectionsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setConnectionsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {connectionsTab === "followers" ? "Followers" : "Following"}
              </Text>
              <Pressable onPress={() => setConnectionsOpen(false)}>
                <Ionicons name="close" size={20} color="#111827" />
              </Pressable>
            </View>
            <View style={styles.modalTabRow}>
              <Pressable
                style={[
                  styles.modalTabBtn,
                  connectionsTab === "followers" && styles.modalTabBtnActive,
                ]}
                onPress={() => openConnections("followers")}
              >
                <Text
                  style={[
                    styles.modalTabText,
                    connectionsTab === "followers" && styles.modalTabTextActive,
                  ]}
                >
                  Followers
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalTabBtn,
                  connectionsTab === "following" && styles.modalTabBtnActive,
                ]}
                onPress={() => openConnections("following")}
              >
                <Text
                  style={[
                    styles.modalTabText,
                    connectionsTab === "following" && styles.modalTabTextActive,
                  ]}
                >
                  Following
                </Text>
              </Pressable>
            </View>
            {connectionsLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator />
              </View>
            ) : (
              <FlatList
                data={connections.filter((it) =>
                  String(it.name || "")
                    .toLowerCase()
                    .includes(connectionQuery.trim().toLowerCase())
                )}
                keyExtractor={(item) => item.id}
                renderItem={renderConnectionItem}
                ListHeaderComponent={
                  <TextInput
                    value={connectionQuery}
                    onChangeText={setConnectionQuery}
                    placeholder="Search profiles"
                    style={styles.connectionSearch}
                  />
                }
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No profiles to show.</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!avatarPreview}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarPreview(null)}
      >
        <Pressable style={styles.previewOverlay} onPress={() => setAvatarPreview(null)}>
          <View style={styles.previewCard}>
            {avatarPreview?.avatar_url ? (
              <Image source={{ uri: avatarPreview.avatar_url }} style={styles.previewImage} />
            ) : (
              <View style={styles.previewFallback}>
                <Text style={styles.previewFallbackText}>
                  {String(avatarPreview?.name || "U").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  profileBlock: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 8,
  },
  avatarFallback: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 8,
    backgroundColor: "#1f6feb",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  bio: {
    fontSize: 13,
    color: "#4b5563",
    marginTop: 2,
    textAlign: "center",
  },
  statsRow: {
    marginTop: 12,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statWrap: {
    alignItems: "center",
    minWidth: 70,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 1,
  },
  followBtn: {
    marginTop: 12,
    flex: 1,
    height: 38,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  tabRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#111827",
  },
  followCta: {
    backgroundColor: "#2563eb",
  },
  followCtaText: {
    color: "#fff",
  },
  followingBtn: {
    backgroundColor: "#e5e7eb",
  },
  followingBtnText: {
    color: "#111827",
  },
  followBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
  },
  shareBtn: {
    marginTop: 12,
    flex: 1,
    height: 38,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e5e7eb",
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  grid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  gridItem: {
    width: "33.333%",
    aspectRatio: 1,
    padding: 1,
  },
  gridImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f3f4f6",
  },
  gridPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f3f4f6",
  },
  itinerarySection: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingBottom: 20,
  },
  itineraryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptyItinerary: {
    color: "#6b7280",
    fontSize: 13,
  },
  itineraryCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  itineraryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itineraryDetailWrap: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  dayTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  placeLine: {
    fontSize: 12,
    color: "#374151",
    marginBottom: 2,
  },
  itineraryCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  itineraryCardSub: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b7280",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    minHeight: "55%",
    maxHeight: "80%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 10,
    paddingHorizontal: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  modalTabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  modalTabBtn: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTabBtnActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  modalTabText: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 13,
  },
  modalTabTextActive: {
    color: "#fff",
  },
  connectionSearch: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  connectionRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  connectionAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  connectionAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1f6feb",
    alignItems: "center",
    justifyContent: "center",
  },
  connectionAvatarFallbackText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  connectionName: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  followMiniBtn: {
    minWidth: 84,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  followMiniCta: {
    backgroundColor: "#2563eb",
  },
  followMiniCtaText: {
    color: "#fff",
  },
  followingMiniBtn: {
    backgroundColor: "#e5e7eb",
  },
  followingMiniText: {
    color: "#111827",
  },
  followMiniText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyText: {
    marginTop: 20,
    textAlign: "center",
    color: "#6b7280",
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  previewCard: {
    width: 260,
    height: 260,
    borderRadius: 130,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f6feb",
  },
  previewFallbackText: {
    color: "#fff",
    fontSize: 72,
    fontWeight: "700",
  },
});
