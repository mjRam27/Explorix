import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "../../api/client";

export default function ChatScreen() {
  const router = useRouter();
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([
    {
      id: "m1",
      role: "assistant",
      content: "Hi there! How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const orderedMessages = useMemo(
    () => messages.slice().reverse(),
    [messages]
  );

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get("/users/me");
        setUserAvatarUrl(res.data.avatar_url ?? null);
      } catch {
        setUserAvatarUrl(null);
      }
    };
    loadProfile();
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await api.post("/explorix/chat", {
        message: text,
        conversation_id: conversationId,
      });

      if (!conversationId) {
        setConversationId(res.data.conversation_id);
      }

      const botMsg = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.data.response,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I couldn't reach the server.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={orderedMessages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ChatRow message={item} userAvatarUrl={userAvatarUrl} />
          )}
        />

        <View style={styles.inputWrap}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type your message..."
            style={styles.input}
            placeholderTextColor="#8b8b8b"
          />
          <TouchableOpacity style={styles.attachBtn}>
            <Ionicons name="attach" size={18} color="#5f6b7a" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="send" size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ChatRow({
  message,
  userAvatarUrl,
}: {
  message: any;
  userAvatarUrl: string | null;
}) {
  const isUser = message.role === "user";
  return (
    <View
      style={[
        styles.row,
        isUser ? styles.rowRight : styles.rowLeft,
      ]}
    >
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Text style={styles.aiAvatarText}>E</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleBot,
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            isUser ? styles.textUser : styles.textBot,
          ]}
        >
          {message.content}
        </Text>
      </View>
      {isUser ? (
        userAvatarUrl ? (
          <Image source={{ uri: userAvatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback} />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  header: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  body: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  rowLeft: {
    justifyContent: "flex-start",
  },
  rowRight: {
    justifyContent: "flex-end",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#d1d5db",
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  aiAvatarText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  bubble: {
    maxWidth: "72%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  bubbleBot: {
    backgroundColor: "#e9eef6",
    borderTopLeftRadius: 6,
  },
  bubbleUser: {
    backgroundColor: "#1976d2",
    borderTopRightRadius: 6,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 19,
  },
  textUser: {
    color: "#fff",
  },
  textBot: {
    color: "#1f2937",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: "#f5f6f7",
    borderRadius: 20,
    paddingHorizontal: 14,
    color: "#111827",
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    backgroundColor: "#eef1f5",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    backgroundColor: "#1d4ed8",
  },
});
