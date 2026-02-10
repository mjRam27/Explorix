// app/(tabs)/_layout.tsx
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Tabs } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen
          name="feed"
          options={{
            tabBarIcon: ({ color }) => (
              <Ionicons name="home" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="explore" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="transport"
          options={{
            tabBarIcon: ({ color }) => (
              <Ionicons name="bus" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="itinerary"
          options={{
            tabBarIcon: ({ color }) => (
              <Ionicons name="calendar" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile/index"
          options={{
            title: "profile",
            tabBarLabel: "profile",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="person" size={22} color={color} />
            ),
          }}
        />
      </Tabs>
    </GestureHandlerRootView>
  );
}
