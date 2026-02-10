import {
  ActivityIndicator,
  DeviceEventEmitter,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { addComment, getComments } from "../../api/posts";
import { api } from "../../api/client";

type CommentItem = {
  id: string;
  content?: string;
  created_at?: string;
  user?: {
    name?: string;
    avatar_url?: string | null;
  };
};

type PreviewPost = {
  caption?: string;
  media_url?: string;
  location_name?: string;
};

type Me = {
  id?: string;
  name?: string;
  avatar_url?: string | null;
};

function timeAgo(dateString?: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function CommentsScreen() {
  const { postId, post } = useLocalSearchParams<{ postId: string; post?: string }>();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  const previewPost = useMemo<PreviewPost | null>(() => {
    if (!post) return null;
    try {
      return JSON.parse(decodeURIComponent(post));
    } catch {
      return null;
    }
  }, [post]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await getComments(String(postId));
      const raw = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
      setComments(raw);
      return raw.length;
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    const value = text.trim();
    if (!value || posting) return;

    const temp: CommentItem = {
      id: `tmp-${Date.now()}`,
      content: value,
      created_at: new Date().toISOString(),
      user: { name: me?.name || "You", avatar_url: me?.avatar_url || null },
    };

    setComments((prev) => [...prev, temp]);
    DeviceEventEmitter.emit("post:comment-updated", {
      postId: String(postId),
      delta: 1,
    });
    setText("");
    setPosting(true);

    try {
      await addComment(String(postId), value);
      const nextCount = await fetchComments();
      DeviceEventEmitter.emit("post:comment-updated", {
        postId: String(postId),
        count: nextCount,
      });
    } catch {
      DeviceEventEmitter.emit("post:comment-updated", {
        postId: String(postId),
        delta: -1,
      });
      // keep optimistic entry if request fails
    } finally {
      setPosting(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  useEffect(() => {
    let mounted = true;
    const loadMe = async () => {
      try {
        const res = await api.get("/users/me");
        if (mounted) setMe(res.data);
      } catch {
        if (mounted) setMe(null);
      }
    };
    loadMe();
    return () => {
      mounted = false;
    };
  }, []);

  const renderComment = ({ item }: { item: CommentItem }) => {
    const name = item.user?.name || "User";
    const avatar =
      item.user?.avatar_url ||
      ((me?.name && name === me.name) ? me.avatar_url || "" : "");
    const ago = timeAgo(item.created_at);
    return (
      <View style={styles.commentRow}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.commentAvatar} />
        ) : (
          <View style={styles.commentAvatarFallback}>
            <Text style={styles.commentAvatarFallbackText}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.commentBody}>
          <View style={styles.commentMeta}>
            <Text style={styles.commentUser}>{name}</Text>
            {ago ? <Text style={styles.commentTime}>{ago}</Text> : null}
          </View>
          <Text style={styles.commentText}>{item.content || ""}</Text>
          <TouchableOpacity>
            <Text style={styles.replyText}>Reply</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.commentLike}>
          <Ionicons name="heart-outline" size={18} color="#c0c4cc" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comments</Text>
        <View style={styles.headerBtn} />
      </View>

      {previewPost ? (
        <View style={styles.previewRow}>
          {previewPost.media_url ? (
            <Image source={{ uri: previewPost.media_url }} style={styles.previewImage} />
          ) : (
            <View style={styles.previewImagePlaceholder} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {previewPost.caption || "Post"}
            </Text>
            <Text style={styles.previewSub} numberOfLines={1}>
              {previewPost.location_name || "View details"}
            </Text>
          </View>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderComment}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <View style={styles.inputBar}>
        {me?.avatar_url ? (
          <Image source={{ uri: me.avatar_url }} style={styles.inputAvatarImage} />
        ) : (
          <View style={styles.inputAvatar}>
            <Text style={styles.inputAvatarText}>
              {String(me?.name || "Y").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Add a comment..."
          style={styles.input}
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity onPress={submitComment} disabled={posting || !text.trim()}>
          <Text style={[styles.postBtn, (!text.trim() || posting) && styles.postBtnDisabled]}>
            Post
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
    paddingHorizontal: 10,
  },
  headerBtn: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 10,
  },
  previewImage: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
  },
  previewImagePlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  previewSub: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748b",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingVertical: 8,
  },
  separator: {
    height: 1,
    backgroundColor: "#f8fafc",
    marginLeft: 66,
  },
  commentRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "flex-start",
  },
  commentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    backgroundColor: "#dbeafe",
  },
  commentAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarFallbackText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  commentBody: {
    flex: 1,
    paddingRight: 10,
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  commentUser: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
  },
  commentTime: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },
  commentText: {
    fontSize: 16,
    lineHeight: 22,
    color: "#334155",
  },
  replyText: {
    marginTop: 5,
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },
  commentLike: {
    width: 24,
    alignItems: "center",
    marginTop: 12,
  },
  inputBar: {
    borderTopWidth: 1,
    borderTopColor: "#eef2f7",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
  },
  inputAvatarText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  inputAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e2e8f0",
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#111827",
  },
  postBtn: {
    color: "#0ea5e9",
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: 4,
  },
  postBtnDisabled: {
    color: "#94a3b8",
  },
});
