import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';

export default function CustomerChatScreen({ navigation }) {
  const { sendChatMessage, subscribeToChatMessages, markChatRead } = useApp();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const roomId = currentUser.id;

  useEffect(() => {
    const unsub = subscribeToChatMessages(roomId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
    markChatRead(roomId, 'user');
    return () => unsub();
  }, []);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    setText('');
    try {
      await sendChatMessage(roomId, trimmed, 'user', currentUser.name, currentUser.name);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Hỗ trợ khách hàng</Text>
          <Text style={styles.headerSub}>ShipFood · Phản hồi trong vài phút</Text>
        </View>
        <View style={styles.onlineDot} />
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubble-ellipses-outline" size={60} color={COLORS.lightGray} />
            <Text style={styles.emptyTitle}>Chào {currentUser.name}!</Text>
            <Text style={styles.emptyDesc}>Bạn có thể nhắn tin cho chúng tôi{'\n'}về đơn hàng, thực đơn hoặc bất kỳ vấn đề nào.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMe = item.senderRole !== 'admin';
          return (
            <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
              {!isMe && (
                <View style={styles.adminAvatar}>
                  <Ionicons name="shield-checkmark" size={14} color="#fff" />
                </View>
              )}
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleAdmin]}>
                <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextAdmin]}>{item.text}</Text>
                <Text style={[styles.bubbleTime, isMe ? { color: 'rgba(255,255,255,0.7)' } : {}]}>{formatTime(item.createdAt)}</Text>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor={COLORS.gray}
          multiline
          maxLength={500}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, paddingTop: 52, paddingBottom: 14,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  back: { padding: 4 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#fff' },
  list: { padding: 16, paddingBottom: 8, flexGrow: 1, justifyContent: 'flex-end' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark, marginTop: 12 },
  emptyDesc: { fontSize: 13, color: COLORS.gray, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  msgRow: { marginBottom: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  msgRowRight: { justifyContent: 'flex-end' },
  msgRowLeft: { justifyContent: 'flex-start' },
  adminAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  bubble: { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleAdmin: { backgroundColor: '#fff', borderBottomLeftRadius: 4, elevation: 1 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTextAdmin: { color: COLORS.dark },
  bubbleTime: { fontSize: 10, color: COLORS.gray, marginTop: 4, textAlign: 'right' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: COLORS.lightGray,
  },
  input: {
    flex: 1, fontSize: 14, color: COLORS.dark, maxHeight: 100,
    borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  sendBtn: {
    backgroundColor: COLORS.primary, borderRadius: 22, width: 44, height: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.lightGray },
});
