import 'react-native-gesture-handler';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Tabs screenOptions={{ headerShown: false }}>
          <Tabs.Screen name="feed" options={{ tabBarIcon: ({ color }) => <Ionicons name="home" size={22} color={color} /> }} />
          <Tabs.Screen name="explore" options={{ tabBarIcon: ({ color }) => <Ionicons name="map" size={22} color={color} /> }} />
          <Tabs.Screen name="transport" options={{ tabBarIcon: ({ color }) => <Ionicons name="bus" size={22} color={color} /> }} />
          <Tabs.Screen name="chat" options={{ tabBarIcon: ({ color }) => <Ionicons name="chatbubble" size={22} color={color} /> }} />
          <Tabs.Screen name="profile" options={{ tabBarIcon: ({ color }) => <Ionicons name="person" size={22} color={color} /> }} />
        </Tabs>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
