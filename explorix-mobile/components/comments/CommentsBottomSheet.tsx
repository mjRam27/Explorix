import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
  forwardRef,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getComments, addComment } from "../../api/posts";

type Props = {
  postId?: string;
  onCommentAdded: () => void;
  onDismiss?: () => void;
};

const CommentsBottomSheet = forwardRef<BottomSheetModal, Props>(
  ({ postId, onCommentAdded, onDismiss }, ref) => {
    const snapPoints = useMemo(() => ["60%"], []);

    const [comments, setComments] = useState<any[]>([]);
    const [text, setText] = useState("");

    useEffect(() => {
      if (!postId) return;
      setComments([]);
      getComments(postId).then((res) => setComments(res.data));
    }, [postId]);

    const submit = async () => {
      if (!postId || !text.trim()) return;

      // optimistic UI
      const temp = {
        id: Date.now().toString(),
        content: text,
        user: { name: "You" },
      };

      setComments((prev) => [temp, ...prev]);
      setText("");
      onCommentAdded();

      try {
        await addComment(postId, text);
      } catch {
        // optional rollback later
      }
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enablePanDownToClose
        onDismiss={onDismiss}
      >
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          inverted
          renderItem={({ item }) => (
            <View style={styles.comment}>
              <Text style={styles.user}>
                {item.user?.name || "User"}
              </Text>
              <Text>{item.content}</Text>
            </View>
          )}
        />

        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Add a comment..."
            style={styles.input}
          />
          <TouchableOpacity onPress={submit}>
            <Text style={styles.postBtn}>Post</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>
    );
  }
);

export default CommentsBottomSheet;

const styles = StyleSheet.create({
  comment: {
    padding: 12,
  },
  user: {
    fontWeight: "600",
    marginBottom: 2,
  },
  inputRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "#eee",
    padding: 10,
    alignItems: "center",
  },
  input: {
    flex: 1,
    padding: 8,
  },
  postBtn: {
    color: "#0095f6",
    fontWeight: "600",
  },
});
