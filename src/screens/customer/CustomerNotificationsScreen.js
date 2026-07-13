import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../utils/format';

export default function CustomerNotificationsScreen({ navigation }) {
  const { subscribeNotifications, markAllNotificationsRead } = useApp();
  const { currentUser } = useAuth();
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    const unsub = subscribeNotifications(currentUser.id, setNotifs);
    markAllNotificationsRead(currentUser.id);
    return () => unsub();
  }, []);

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1) return 'Vừa xong';
    if (diff < 60) return `${diff} phút trước`;
    if (diff < 1440) return `${Math.floor(diff / 60)} giờ trước`;
    return d.toLocaleDateString('vi-VN');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông báo</Text>
      </View>

      <FlatList
        data={notifs}
        keyExtractor={n => n.id}
        contentContainerStyle={{ flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={64} color={COLORS.lightGray} />
            <Text style={styles.emptyTitle}>Chưa có thông báo</Text>
            <Text style={styles.emptyDesc}>Các thông báo về đơn hàng sẽ hiển thị ở đây</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.notifRow, !item.read && styles.notifUnread]}>
            <View style={[styles.iconWrap, !item.read && styles.iconWrapUnread]}>
              <Ionicons name="notifications" size={20} color={item.read ? COLORS.gray : COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]}>{item.title}</Text>
              <Text style={styles.notifBody}>{item.body}</Text>
              <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#F5F5F5' }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, paddingTop: 52, paddingBottom: 14,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  back: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark, marginTop: 12 },
  emptyDesc: { fontSize: 13, color: COLORS.gray, marginTop: 6, textAlign: 'center' },
  notifRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fff', padding: 14,
  },
  notifUnread: { backgroundColor: '#FFF8F5' },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.lightGray,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  iconWrapUnread: { backgroundColor: COLORS.primary + '20' },
  notifTitle: { fontSize: 14, fontWeight: '500', color: COLORS.dark },
  notifTitleUnread: { fontWeight: 'bold' },
  notifBody: { fontSize: 13, color: COLORS.gray, marginTop: 2, lineHeight: 18 },
  notifTime: { fontSize: 11, color: COLORS.lightGray, marginTop: 4 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary, marginTop: 6, flexShrink: 0,
  },
});
