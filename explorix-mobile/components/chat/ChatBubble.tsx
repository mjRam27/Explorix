import { View, Text } from 'react-native';

export default function ChatBubble({ message, isUser }: any) {
  return (
    <View style={{
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      backgroundColor: isUser ? '#059669' : '#e5e7eb',
      padding: 12,
      borderRadius: 12,
      marginVertical: 4,
      maxWidth: '80%'
    }}>
      <Text style={{ color: isUser ? '#fff' : '#000' }}>
        {message.content}
      </Text>
    </View>
  );
}
