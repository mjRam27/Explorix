import { View, Text, StyleSheet, Pressable } from "react-native";

type Props = {
  posts: number;
  followers: number;
  following: number;
  travelled: number;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
};

export default function ProfileStats({
  posts,
  followers,
  following,
  travelled,
  onFollowersPress,
  onFollowingPress,
}: Props) {
  return (
    <View style={styles.container}>
      <Stat label="Posts" value={posts} />
      <Stat label="Followers" value={followers} onPress={onFollowersPress} />
      <Stat label="Following" value={following} onPress={onFollowingPress} />
      <Stat label="Travelled" value={travelled} />
    </View>
  );
}

function Stat({
  label,
  value,
  onPress,
}: {
  label: string;
  value: number;
  onPress?: () => void;
}) {
  const Body = (
    <>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable style={styles.stat} onPress={onPress}>
        {Body}
      </Pressable>
    );
  }

  return (
    <View style={styles.stat}>
      {Body}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 16,
  },
  stat: {
    alignItems: "center",
  },
  value: {
    fontSize: 16,
    fontWeight: "700",
  },
  label: {
    fontSize: 12,
    color: "#666",
  },
});
