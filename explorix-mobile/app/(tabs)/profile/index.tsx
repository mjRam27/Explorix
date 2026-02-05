// app/profile/index.tsx
import {
  ScrollView,
  ActivityIndicator,
  View,
  Text,
  Alert,
  Image,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";

import { api } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { getMyPosts, getSavedPosts } from "../../../api/posts";

import ProfileHeader from "../../../components/profile/ProfileHeader";
import ProfileStats from "../../../components/profile/ProfileStats";
import ProfileTabs from "../../../components/profile/ProfileTabs";
import ItineraryGrid from "../../../components/profile/ItineraryGrid";
import SettingsDrawer from "../../../components/profile/SettingsDrawer";

type User = {
  user_id: string;
  email: string;
  name?: string;
  bio?: string;
  avatar_url?: string | null;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
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

  const loadUser = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) {
        setProfileLoading(true);
      } else {
        setProfileRefreshing(true);
      }

      try {
        const res = await api.get<User>("/users/me");
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

  useFocusEffect(
    useCallback(() => {
      if (authLoading || !token) return;
      const now = Date.now();
      if (posts.length === 0 || now - lastPostsFetchAt >= 180000) {
        loadPosts(posts.length === 0);
      }
      if (!user || now - lastProfileFetchAt >= 180000) {
        loadUser(false);
      }
      if (activeTab === "saved") {
        if (
          savedPosts.length === 0 ||
          now - lastSavedFetchAt >= 180000
        ) {
          loadSavedPosts();
        }
      }
    }, [
      authLoading,
      token,
      loadPosts,
      loadUser,
      posts.length,
      activeTab,
      loadSavedPosts,
      lastProfileFetchAt,
      lastPostsFetchAt,
      lastSavedFetchAt,
      user,
      savedPosts.length,
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
                  onPress={() =>
                    router.push({
                      pathname: "/post/[postId]",
                      params: {
                        postId: post.id,
                        post: encodeURIComponent(JSON.stringify(post)),
                      },
                    })
                  }
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
                  onPress={() =>
                    router.push({
                      pathname: "/post/[postId]",
                      params: {
                        postId: post.id,
                        post: encodeURIComponent(JSON.stringify(post)),
                      },
                    })
                  }
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
});
