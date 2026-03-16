import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import { getComments, addComment } from "../../api/posts";

export default function CommentsScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    try {
      const res = await getComments(postId);
      setComments(res.data);
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!text.trim()) return;

    const temp = {
      id: Date.now().toString(),
      content: text,
      user: { name: "You" },
    };

    setComments((prev) => [temp, ...prev]);
    setText("");

    try {
      await addComment(postId, text);
      fetchComments();
    } catch {
      alert("Failed to post comment");
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        inverted
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <Text style={styles.username}>{item.user?.name || "User"}</Text>
            <Text>{item.content}</Text>
          </View>
        )}
      />

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Add a comment…"
          style={styles.input}
        />
        <TouchableOpacity onPress={submitComment}>
          <Text style={styles.postBtn}>Post</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  comment: { padding: 12 },
  username: { fontWeight: "600", marginBottom: 2 },
  inputRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "#eee",
    padding: 10,
    alignItems: "center",
  },
  input: { flex: 1, padding: 8 },
  postBtn: { color: "#0095f6", fontWeight: "600" },
});
