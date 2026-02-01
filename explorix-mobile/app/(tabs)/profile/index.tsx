// app/profile/index.tsx
import { ScrollView, ActivityIndicator, View, Text,Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";

import { api } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";

import ProfileHeader from "../../../components/profile/ProfileHeader";
import ProfileStats from "../../../components/profile/ProfileStats";
import ProfileTabs from "../../../components/profile/ProfileTabs";
import PostGrid from "../../../components/profile/PostGrid";
import PlaceGrid from "../../../components/profile/PlaceGrid";
import ItineraryGrid from "../../../components/profile/ItineraryGrid";
import SettingsDrawer from "../../../components/profile/SettingsDrawer";

type User = {
  user_id: string;
  email: string;
  name?: string;
  bio?: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { token, loading: authLoading, logout } = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    "posts" | "places" | "itineraries"
  >("posts");

  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;     // ⛔ wait for SecureStore
    if (!token) return;          // ⛔ not logged in

    const loadUser = async () => {
      try {
        const res = await api.get<User>("/users/me");
        setUser(res.data);
      } catch (err) {
        console.error("Failed to load profile", err);
        setError("Failed to load profile");
      } finally {
        setProfileLoading(false);
      }
    };

    loadUser();
  }, [authLoading, token]);


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
          bio={user.bio ?? "Explorer • Travel • Life"}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <ProfileStats posts={0} saved={0} itineraries={0} />

        <ProfileTabs activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "posts" && <PostGrid />}
        {activeTab === "places" && <PlaceGrid />}
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
