import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, Alert, TextInput, Modal, ScrollView,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, COLORS } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';

const STATUS_COLOR = {
  'Chờ shop': '#FF9800',
  'Chờ xác nhận': '#2196F3',
  'Đang lấy hàng': '#9C27B0',
  'Đã lấy hàng': '#00BCD4',
  'Đang giao': '#FF9800',
  'Đã giao': '#4CAF50',
  'Đã hủy': '#9E9E9E',
};

const STATUS_TABS = ['Chờ shop', 'Chờ xác nhận', 'Đang giao', 'Đã giao', 'Tất cả'];
const DATE_FILTERS = ['Hôm nay', 'Hôm qua', '7 ngày', 'Tất cả'];

function isSameDay(d, ref) {
  return d.getDate() === ref.getDate() && d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
}

export default function ShopOrdersScreen() {
  const { getShopOrders, confirmShopOrder, rejectOrder } = useApp();
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState('Chờ shop');
  const [dateFilter, setDateFilter] = useState('Hôm nay');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const allShopOrders = getShopOrders(currentUser.id);

  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const byDate = allShopOrders.filter(o => {
    const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    if (dateFilter === 'Hôm nay') return isSameDay(d, now);
    if (dateFilter === 'Hôm qua') return isSameDay(d, yesterday);
    if (dateFilter === '7 ngày') return d >= sevenDaysAgo;
    return true;
  });

  const orders = filter === 'Tất cả'
    ? [...byDate].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : [...byDate].filter(o => {
        if (filter === 'Đang giao') return ['Đang lấy hàng', 'Đã lấy hàng', 'Đang giao'].includes(o.status);
        return o.status === filter;
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const pendingCount = allShopOrders.filter(o => o.status === 'Chờ shop').length;
  const totalFees = byDate.filter(o => o.status === 'Đã giao').reduce((s, o) => s + (o.shippingFee || 0), 0);

  const handleConfirm = (order) => {
    Alert.alert(
      'Xác nhận đơn hàng?',
      `Đơn #${order.id.slice(-6).toUpperCase()} của ${order.userName}`,
      [
        { text: 'Hủy' },
        { text: 'Xác nhận nhận đơn', onPress: () => confirmShopOrder(order.id, order) },
      ]
    );
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      Alert.alert('Vui lòng nhập lý do từ chối');
      return;
    }
    const o = orders.find(x => x.id === rejectModal);
    rejectOrder(rejectModal, rejectReason.trim(), o);
    setRejectModal(null);
    setRejectReason('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đơn hàng</Text>
        <Text style={styles.headerSub}>
          {pendingCount > 0 ? `🔔 ${pendingCount} đơn chờ xác nhận · ` : ''}
          Ship đã giao: {formatCurrency(totalFees)}
        </Text>
      </View>

      {/* Status tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabContent}>
        {STATUS_TABS.map(s => {
          const count = s === 'Tất cả' ? byDate.length
            : s === 'Đang giao' ? byDate.filter(o => ['Đang lấy hàng', 'Đã lấy hàng', 'Đang giao'].includes(o.status)).length
            : byDate.filter(o => o.status === s).length;
          return (
            <TouchableOpacity key={s} style={[styles.tab, filter === s && styles.tabActive]} onPress={() => setFilter(s)}>
              <Text style={[styles.tabText, filter === s && styles.tabTextActive]}>{s}</Text>
              {count > 0 && (
                <View style={[styles.tabCount, filter === s && styles.tabCountActive]}>
                  <Text style={[styles.tabCountText, filter === s && styles.tabCountTextActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Date filter */}
      <View style={styles.dateRow}>
        {DATE_FILTERS.map(d => (
          <TouchableOpacity key={d} style={[styles.dateChip, dateFilter === d && styles.dateChipActive]} onPress={() => setDateFilter(d)}>
            <Text style={[styles.dateChipText, dateFilter === d && styles.dateChipTextActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={orders}
        keyExtractor={o => o.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.orderId}>#{item.id.slice(-6).toUpperCase()}</Text>
              <View style={[styles.statusPill, { backgroundColor: (STATUS_COLOR[item.status] || '#999') + '20' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] || '#999' }]}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.orderTime}>{formatDate(item.createdAt)}</Text>

            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={14} color={COLORS.gray} />
              <Text style={styles.infoText}>{item.userName}</Text>
              {item.userPhone ? (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.userPhone}`)}>
                  <Text style={styles.phone}>{item.userPhone}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.gray} />
              <Text style={styles.infoText} numberOfLines={2}>{item.deliveryAddress}</Text>
            </View>

            {item.items?.length > 0 && (
              <View style={styles.itemsBox}>
                {item.items.map((f, i) => (
                  <Text key={i} style={styles.itemText}>• {f.quantity}× {f.name}{f.selectedToppings?.length > 0 ? ` (+${f.selectedToppings.map(t => t.name).join(', ')})` : ''}</Text>
                ))}
              </View>
            )}

            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>
                {item.distanceKm != null ? `${item.distanceKm} km  ·  ` : ''}Phí ship
              </Text>
              <Text style={styles.feeVal}>{formatCurrency(item.shippingFee || 0)}</Text>
            </View>

            {item.note ? <Text style={styles.note}>📝 {item.note}</Text> : null}

            {item.status === 'Đã hủy' && item.cancelReason ? (
              <View style={styles.cancelBox}>
                <Ionicons name="close-circle-outline" size={14} color='#F44336' />
                <Text style={styles.cancelText}>Lý do: {item.cancelReason}</Text>
              </View>
            ) : null}

            {item.status === 'Chờ shop' && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => { setRejectModal(item.id); setRejectReason(''); }}
                >
                  <Ionicons name="close-circle-outline" size={16} color='#F44336' />
                  <Text style={styles.rejectBtnText}>Từ chối</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={() => handleConfirm(item)}>
                  <Ionicons name="checkmark-circle-outline" size={16} color='#fff' />
                  <Text style={styles.confirmBtnText}>Nhận đơn</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={64} color={COLORS.lightGray} />
            <Text style={styles.emptyText}>Chưa có đơn nào</Text>
          </View>
        }
      />

      <Modal visible={!!rejectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Lý do từ chối đơn</Text>
            <Text style={styles.modalHint}>Khách hàng sẽ thấy lý do này</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="VD: Hết nguyên liệu, Shop đang đóng cửa..."
              placeholderTextColor={COLORS.gray}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRejectModal(null)}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleReject}>
                <Text style={styles.modalConfirmText}>Xác nhận từ chối</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: '#2196F3', padding: 16, paddingTop: 52 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 3 },
  tabBar: { backgroundColor: '#fff', maxHeight: 52, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tabContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F5F5F5', gap: 4 },
  tabActive: { backgroundColor: '#2196F3' },
  tabText: { fontSize: 12, color: COLORS.gray, fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: 'bold' },
  tabCount: { backgroundColor: COLORS.lightGray, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabCountText: { fontSize: 10, color: COLORS.gray, fontWeight: 'bold' },
  tabCountTextActive: { color: '#fff' },
  dateRow: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  dateChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: COLORS.lightGray },
  dateChipActive: { backgroundColor: '#2196F3' },
  dateChipText: { fontSize: 12, color: COLORS.gray, fontWeight: '500' },
  dateChipTextActive: { color: '#fff', fontWeight: 'bold' },
  list: { padding: 12, paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  orderId: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark },
  orderTime: { fontSize: 11, color: COLORS.gray, marginBottom: 10 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 },
  infoText: { flex: 1, fontSize: 13, color: COLORS.dark },
  phone: { fontSize: 13, color: '#2196F3', fontWeight: '600' },
  itemsBox: { backgroundColor: '#F9F9F9', borderRadius: 8, padding: 8, marginBottom: 8 },
  itemText: { fontSize: 12, color: COLORS.dark, paddingVertical: 1 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.lightGray, marginTop: 4 },
  feeLabel: { fontSize: 13, color: COLORS.gray },
  feeVal: { fontSize: 14, fontWeight: 'bold', color: '#2196F3' },
  note: { fontSize: 12, color: COLORS.gray, marginTop: 6, fontStyle: 'italic' },
  cancelBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF3F3', borderRadius: 8, padding: 8, marginTop: 8 },
  cancelText: { fontSize: 12, color: '#F44336', flex: 1 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: '#F44336', borderRadius: 10, padding: 10 },
  rejectBtnText: { color: '#F44336', fontWeight: 'bold', fontSize: 14 },
  confirmBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#4CAF50', borderRadius: 10, padding: 10 },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.gray, fontSize: 15, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.dark, marginBottom: 4 },
  modalHint: { fontSize: 12, color: COLORS.gray, marginBottom: 14 },
  modalInput: { borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.dark, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancel: { flex: 1, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: COLORS.lightGray, alignItems: 'center' },
  modalCancelText: { fontSize: 14, color: COLORS.gray, fontWeight: '600' },
  modalConfirm: { flex: 2, padding: 13, borderRadius: 12, backgroundColor: '#F44336', alignItems: 'center' },
  modalConfirmText: { fontSize: 14, color: '#fff', fontWeight: 'bold' },
});
