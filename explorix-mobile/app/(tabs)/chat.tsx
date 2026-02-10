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
  Modal,
  Alert,
} from "react-native";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "../../api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

const DEFAULT_GREETING = [
  {
    id: "m1",
    role: "assistant",
    content: "Hi there! How can I help you today?",
  },
];

const chatStorageKey = (userId: string) => `chat_history_v1:${userId}`;

export default function ChatScreen() {
  const router = useRouter();
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [chatUserKey, setChatUserKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>(DEFAULT_GREETING);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingProposal, setPendingProposal] = useState<{
    conversationId: string;
    proposalId: string;
  } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [savingProposalId, setSavingProposalId] = useState<string | null>(null);

  const orderedMessages = useMemo(
    () => messages.slice().reverse(),
    [messages]
  );

  useEffect(() => {
    const loadProfileAndHistory = async () => {
      try {
        const res = await api.get("/users/me");
        setUserAvatarUrl(res.data.avatar_url ?? null);
        const userKey = String(
          res.data?.id ?? res.data?.user_id ?? res.data?.email ?? "anonymous"
        );
        setChatUserKey(userKey);

        const raw = await AsyncStorage.getItem(chatStorageKey(userKey));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed?.messages) && parsed.messages.length > 0) {
            setMessages(parsed.messages);
          }
          if (typeof parsed?.conversationId === "string") {
            setConversationId(parsed.conversationId);
          }
        }
      } catch {
        setUserAvatarUrl(null);
      }
    };
    loadProfileAndHistory();
  }, []);

  useEffect(() => {
    if (!chatUserKey) return;
    const payload = {
      messages,
      conversationId,
      updatedAt: new Date().toISOString(),
    };
    AsyncStorage.setItem(chatStorageKey(chatUserKey), JSON.stringify(payload)).catch(
      () => {}
    );
  }, [chatUserKey, messages, conversationId]);

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
        itinerary_proposal: res.data?.itinerary_proposal ?? null,
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

  const formatIsoDate = (value: Date) => {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const onTapAddToItinerary = (proposalId: string) => {
    const convoId = conversationId;
    if (!convoId) {
      return;
    }
    setPendingProposal({
      conversationId: convoId,
      proposalId,
    });
    setSelectedDate(new Date());
    setShowDatePicker(true);
  };

  const commitProposal = async (dateOverride?: Date) => {
    if (!pendingProposal) return;
    const proposalId = pendingProposal.proposalId;
    const dateToSave = dateOverride ?? selectedDate;
    setSavingProposalId(proposalId);
    try {
      const payload = {
        conversation_id: pendingProposal.conversationId,
        proposal_id: pendingProposal.proposalId,
        start_date: formatIsoDate(dateToSave),
      };
      await api.post("/explorix/chat/itinerary/commit", payload);
      setMessages((prev) => [
        ...prev,
        {
          id: `s-${Date.now()}`,
          role: "assistant",
          content: `Saved to itinerary for ${formatIsoDate(dateToSave)}.`,
        },
      ]);
    } catch (error: any) {
      const detail =
        error?.response?.data?.detail ||
        error?.message ||
        "Could not save itinerary. Please try again.";
      setMessages((prev) => [
        ...prev,
        {
          id: `se-${Date.now()}`,
          role: "assistant",
          content: String(detail),
        },
      ]);
      Alert.alert("Save failed", String(detail));
    } finally {
      setSavingProposalId(null);
      setPendingProposal(null);
      setShowDatePicker(false);
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
            <ChatRow
              message={item}
              userAvatarUrl={userAvatarUrl}
              onAddToItinerary={onTapAddToItinerary}
              savingProposalId={savingProposalId}
            />
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
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowDatePicker(false);
          setPendingProposal(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose start date</Text>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              themeVariant="light"
              textColor="#111827"
              style={styles.datePicker}
              minimumDate={new Date()}
              onChange={(event: DateTimePickerEvent, date?: Date) => {
                if (Platform.OS === "android") {
                  if (event.type === "dismissed") {
                    setShowDatePicker(false);
                    setPendingProposal(null);
                    return;
                  }
                  const nextDate = date ?? selectedDate;
                  if (date) setSelectedDate(date);
                  commitProposal(nextDate);
                  return;
                }
                if (date) setSelectedDate(date);
              }}
            />
            {Platform.OS === "ios" ? (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => {
                    setShowDatePicker(false);
                    setPendingProposal(null);
                  }}
                  style={styles.modalBtnSecondary}
                >
                  <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={commitProposal} style={styles.modalBtnPrimary}>
                  <Text style={styles.modalBtnPrimaryText}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ChatRow({
  message,
  userAvatarUrl,
  onAddToItinerary,
  savingProposalId,
}: {
  message: any;
  userAvatarUrl: string | null;
  onAddToItinerary: (proposalId: string) => void;
  savingProposalId: string | null;
}) {
  const isUser = message.role === "user";
  const proposal = message?.itinerary_proposal;
  const proposalId =
    proposal && typeof proposal.proposal_id === "string" ? proposal.proposal_id : null;
  const canSave = Boolean(proposal?.can_save && proposalId);
  const isSaving = savingProposalId != null && savingProposalId === proposalId;
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
        {!isUser && canSave ? (
          <TouchableOpacity
            style={styles.addBtn}
            disabled={isSaving}
            onPress={() => onAddToItinerary(proposalId as string)}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.addBtnText}>Add to itinerary</Text>
            )}
          </TouchableOpacity>
        ) : null}
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
  addBtn: {
    marginTop: 10,
    backgroundColor: "#16a34a",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#111827",
  },
  datePicker: {
    width: "100%",
    height: Platform.OS === "ios" ? 180 : undefined,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 8,
  },
  modalBtnPrimary: {
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  modalBtnPrimaryText: {
    color: "#fff",
    fontWeight: "600",
  },
  modalBtnSecondary: {
    backgroundColor: "#eef2ff",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  modalBtnSecondaryText: {
    color: "#1f2937",
    fontWeight: "600",
  },
});
