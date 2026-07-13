import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';

function ChatRoom({ room, navigation, sendChatMessage, subscribeToChatMessages, markChatRead }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const unsub = subscribeToChatMessages(room.roomId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
    markChatRead(room.roomId, 'admin');
    return () => unsub();
  }, [room.roomId]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    setText('');
    try {
      await sendChatMessage(room.roomId, trimmed, 'admin', currentUser.name || 'Admin');
    } finally { setSending(false); }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{room.userName || room.roomId.slice(-8)}</Text>
          <Text style={styles.headerSub}>Khách hàng</Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubble-outline" size={50} color={COLORS.lightGray} />
            <Text style={styles.emptyText}>Chưa có tin nhắn</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isAdmin = item.senderRole === 'admin';
          return (
            <View style={[styles.msgRow, isAdmin ? styles.msgRowRight : styles.msgRowLeft]}>
              <View style={[styles.bubble, isAdmin ? styles.bubbleAdmin : styles.bubbleUser]}>
                <Text style={[styles.bubbleText, isAdmin ? styles.bubbleTextAdmin : {}]}>{item.text}</Text>
                <Text style={[styles.bubbleTime, isAdmin ? { color: 'rgba(255,255,255,0.7)' } : {}]}>{formatTime(item.createdAt)}</Text>
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
          placeholder="Trả lời..."
          placeholderTextColor={COLORS.gray}
          multiline maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function AdminChatScreen({ navigation, route }) {
  const { subscribeToChatList, sendChatMessage, subscribeToChatMessages, markChatRead } = useApp();
  const [chatList, setChatList] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(route?.params?.room || null);

  useEffect(() => {
    const unsub = subscribeToChatList((list) => setChatList(list));
    return () => unsub();
  }, []);

  if (selectedRoom) {
    return (
      <ChatRoom
        room={selectedRoom}
        navigation={{ goBack: () => setSelectedRoom(null) }}
        sendChatMessage={sendChatMessage}
        subscribeToChatMessages={subscribeToChatMessages}
        markChatRead={markChatRead}
      />
    );
  }

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút`;
    if (diff < 86400000) return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hỗ trợ khách hàng</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{chatList.length}</Text>
        </View>
      </View>
      <FlatList
        data={chatList}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={60} color={COLORS.lightGray} />
            <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>
          </View>
        }
        renderItem={({ item }) => {
          const unread = item.unread_admin || 0;
          return (
            <TouchableOpacity style={styles.roomCard} onPress={() => setSelectedRoom(item)} activeOpacity={0.8}>
              <View style={styles.roomAvatar}>
                <Ionicons name="person" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.roomHeader}>
                  <Text style={styles.roomName}>{item.userName || `Khách ${item.roomId?.slice(-6)}`}</Text>
                  <Text style={styles.roomTime}>{formatTime(item.lastAt)}</Text>
                </View>
                <Text style={[styles.roomLast, unread > 0 && styles.roomLastUnread]} numberOfLines={1}>
                  {item.lastMessage || 'Bắt đầu cuộc trò chuyện'}
                </Text>
              </View>
              {unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', flex: 1 },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  countBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  countText: { color: '#fff', fontWeight: 'bold' },
  roomCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, elevation: 2,
  },
  roomAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  roomName: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark },
  roomTime: { fontSize: 11, color: COLORS.gray },
  roomLast: { fontSize: 13, color: COLORS.gray },
  roomLastUnread: { color: COLORS.dark, fontWeight: '600' },
  unreadBadge: { backgroundColor: COLORS.primary, borderRadius: 12, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.gray, fontSize: 14, marginTop: 12 },
  // Chat room styles
  list: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  msgRow: { marginBottom: 10, flexDirection: 'row' },
  msgRowRight: { justifyContent: 'flex-end' },
  msgRowLeft: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleAdmin: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleUser: { backgroundColor: '#fff', borderBottomLeftRadius: 4, elevation: 1 },
  bubbleText: { fontSize: 14, color: COLORS.dark, lineHeight: 20 },
  bubbleTextAdmin: { color: '#fff' },
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
  sendBtn: { backgroundColor: COLORS.primary, borderRadius: 22, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: COLORS.lightGray },
});
