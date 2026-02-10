// app/profile/index.tsx
import {
  ScrollView,
  ActivityIndicator,
  FlatList,
  Modal,
  View,
  Text,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { api } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { getMyPosts, getSavedPosts } from "../../../api/posts";
import {
  followUser,
  getFollowers,
  getFollowing,
  unfollowUser,
} from "../../../api/users";

import ProfileHeader from "../../../components/profile/ProfileHeader";
import ProfileStats from "../../../components/profile/ProfileStats";
import ProfileTabs from "../../../components/profile/ProfileTabs";
import ItineraryGrid from "../../../components/profile/ItineraryGrid";
import SettingsDrawer from "../../../components/profile/SettingsDrawer";

type User = {
  id?: string;
  user_id: string;
  email: string;
  name?: string;
  bio?: string;
  avatar_url?: string | null;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  travelled_count?: number;
};

type ConnectionItem = {
  id: string;
  name?: string;
  avatar_url?: string | null;
  is_following?: boolean;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { token, loading: authLoading, logout } = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileRefreshing, setProfileRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [lastProfileFetchAt, setLastProfileFetchAt] = useState<number>(0);
  const [lastPostsFetchAt, setLastPostsFetchAt] = useState<number>(0);
  const [lastSavedFetchAt, setLastSavedFetchAt] = useState<number>(0);

  const [activeTab, setActiveTab] = useState<
    "posts" | "saved" | "itineraries"
  >("posts");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [connectionsTab, setConnectionsTab] = useState<"followers" | "following">(
    "followers"
  );
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [connectionQuery, setConnectionQuery] = useState("");
  const [relationBusy, setRelationBusy] = useState<Record<string, boolean>>({});
  const [avatarPreview, setAvatarPreview] = useState<ConnectionItem | null>(null);

  const loadUser = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) {
        setProfileLoading(true);
      } else {
        setProfileRefreshing(true);
      }

      try {
        const res = await api.get<User>("/users/me", { params: { refresh: 1 } });
        setUser(res.data);
        setLastProfileFetchAt(Date.now());
      } catch (err) {
        console.error("Failed to load profile", err);
        setError("Failed to load profile");
      } finally {
        setProfileLoading(false);
        setProfileRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    if (authLoading) return;     //  wait for SecureStore
    if (!token) return;          //  not logged in
    loadUser(true);
  }, [authLoading, token, loadUser]);

  const loadPosts = useCallback(
    async (showSpinner = false) => {
      if (!showSpinner) {
        setProfileRefreshing(true);
      }
      try {
        const res = await getMyPosts();
        setPosts(res.data.items ?? res.data);
        setLastPostsFetchAt(Date.now());
      } catch (err) {
        console.error("Failed to load posts", err);
      } finally {
        setProfileRefreshing(false);
      }
    },
    []
  );

  const loadSavedPosts = useCallback(async () => {
    try {
      const res = await getSavedPosts();
      setSavedPosts(res.data.items ?? res.data);
      setLastSavedFetchAt(Date.now());
    } catch (err) {
      console.error("Failed to load saved posts", err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "saved") {
      loadSavedPosts();
    }
  }, [activeTab, loadSavedPosts]);

  const openConnections = useCallback(
    async (tab: "followers" | "following") => {
      const profileId = String(user?.id || user?.user_id || "");
      if (!profileId) return;
      setConnectionsOpen(true);
      setConnectionsTab(tab);
      setConnectionsLoading(true);
      try {
        const res =
          tab === "followers"
            ? await getFollowers(profileId, 100)
            : await getFollowing(profileId, 100);
        setConnections(res.data.items ?? []);
      } finally {
        setConnectionsLoading(false);
      }
    },
    [user?.id, user?.user_id]
  );

  useFocusEffect(
    useCallback(() => {
      if (authLoading || !token) return;
      // Always refresh own posts on focus so newly uploaded posts appear immediately.
      loadPosts(false);
      loadUser(false);
      if (activeTab === "saved") {
        loadSavedPosts();
      }
    }, [
      authLoading,
      token,
      loadPosts,
      loadUser,
      activeTab,
      loadSavedPosts,
    ])
  );


const handleLogout = () => {
  Alert.alert(
    "Log out",
    "Are you sure you want to log out?",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            // 🔐 Ensure header exists BEFORE backend call
            if (token) {
              api.defaults.headers.common.Authorization = `Bearer ${token}`;
              await api.post("/auth/logout");
            }
          } catch (err) {
            console.warn("Logout log failed (safe to ignore)");
          }

          // 🔴 Clear locally
          await logout();

          router.replace("/auth/login");
        },
      },
    ]
  );
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
        style={[
          styles.followMiniBtn,
          item.is_following ? styles.followingMiniBtn : styles.followMiniCta,
        ]}
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




  /* -------------------- RENDER STATES -------------------- */

  // 1️⃣ Auth still restoring
  if (authLoading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ActivityIndicator style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  // 2️⃣ Profile loading
  if (profileLoading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ActivityIndicator style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  // 3️⃣ Error state
  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>{error}</Text>
      </SafeAreaView>
    );
  }

  // 4️⃣ No user (should not happen, but safe)
  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>No user data</Text>
      </SafeAreaView>
    );
  }

  /* -------------------- MAIN UI -------------------- */

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          name={user.name ?? user.email.split("@")[0]}
          email={user.email}
          bio={user.bio ?? "Explorer - Travel - Life"}
          avatarUrl={user.avatar_url ?? null}
          onOpenSettings={() => setSettingsOpen(true)}
          onAddPost={() => router.push("/upload")}
          onEditProfile={() => router.push("/profile/edit")}
        />

        <ProfileStats
          posts={posts.length || user.posts_count || 0}
          followers={user.followers_count ?? 0}
          following={user.following_count ?? 0}
          travelled={user.travelled_count ?? 0}
          onFollowersPress={() => openConnections("followers")}
          onFollowingPress={() => openConnections("following")}
        />


        <ProfileTabs activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "posts" &&
          (posts.length === 0 ? (
            <Text style={{ textAlign: "center", marginTop: 20 }}>
              No posts yet
            </Text>
          ) : (
            <View style={styles.grid}>
              {posts.map((post) => (
                <Pressable
                  key={post.id}
                  style={styles.gridItem}
                  onPress={() => {
                    const initialIndex = posts.findIndex((p) => p.id === post.id);
                    return (
                    router.push({
                      pathname: "/post/[postId]",
                      params: {
                        postId: post.id,
                        post: encodeURIComponent(JSON.stringify(post)),
                        index: String(initialIndex >= 0 ? initialIndex : 0),
                        source: "my",
                        userId: String(user.id || user.user_id || ""),
                        viewerUser: encodeURIComponent(
                          JSON.stringify({
                            id: user.id || user.user_id,
                            name: user.name ?? user.email.split("@")[0],
                            avatar_url: user.avatar_url ?? null,
                          })
                        ),
                      },
                    })
                    );
                  }}
                >
                  {post.media_url ? (
                    <Image
                      source={{ uri: post.media_url }}
                      style={styles.gridImage}
                    />
                  ) : (
                    <View style={styles.gridPlaceholder} />
                  )}
                </Pressable>
              ))}
            </View>
          ))}

        {activeTab === "saved" &&
          (savedPosts.length === 0 ? (
            <Text style={{ textAlign: "center", marginTop: 20 }}>
              No saved posts yet
            </Text>
          ) : (
            <View style={styles.grid}>
              {savedPosts.map((post) => (
                <Pressable
                  key={post.id}
                  style={styles.gridItem}
                  onPress={() => {
                    const initialIndex = savedPosts.findIndex((p) => p.id === post.id);
                    return (
                    router.push({
                      pathname: "/post/[postId]",
                      params: {
                        postId: post.id,
                        post: encodeURIComponent(JSON.stringify(post)),
                        index: String(initialIndex >= 0 ? initialIndex : 0),
                        source: "saved",
                        userId: String(user.id || user.user_id || ""),
                        viewerUser: encodeURIComponent(
                          JSON.stringify({
                            id: user.id || user.user_id,
                            name: user.name ?? user.email.split("@")[0],
                            avatar_url: user.avatar_url ?? null,
                          })
                        ),
                      },
                    })
                    );
                  }}
                >
                  {post.media_url ? (
                    <Image
                      source={{ uri: post.media_url }}
                      style={styles.gridImage}
                    />
                  ) : (
                    <View style={styles.gridPlaceholder} />
                  )}
                </Pressable>
              ))}
            </View>
          ))}
        {activeTab === "itineraries" && <ItineraryGrid />}
      </ScrollView>

      <SettingsDrawer
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogout={handleLogout}
      />

      <TouchableOpacity
        style={styles.cameraFab}
        onPress={() => router.push("/snap/camera")}
      >
        <Ionicons name="camera-outline" size={24} color="#fff" />
      </TouchableOpacity>

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
                ListEmptyComponent={<Text style={styles.emptyText}>No profiles to show.</Text>}
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  gridItem: {
    width: "33.333%",
    aspectRatio: 1,
    padding: 1,
  },
  gridImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#eee",
  },
  gridPlaceholder: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
  cameraFab: {
    position: "absolute",
    right: 20,
    bottom: 26,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
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
