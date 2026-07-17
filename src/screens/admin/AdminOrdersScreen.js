import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ScrollView, Linking,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, COLORS } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';

const STATUSES = ['Tất cả', 'Chờ shop', 'Chờ xác nhận', 'Đã xác nhận', 'Đang lấy hàng', 'Đã lấy hàng', 'Đang giao', 'Đã giao', 'Đã hủy'];
const STATUS_COLOR = {
  'Chờ shop': '#FF9800',
  'Chờ xác nhận': '#FFC107',
  'Đã xác nhận': '#2196F3',
  'Đang lấy hàng': '#9C27B0',
  'Đã lấy hàng': '#00BCD4',
  'Đang giao': '#FF9800',
  'Đã giao': '#4CAF50',
  'Đã hủy': '#9E9E9E',
};
const ALL_STATUSES = ['Chờ shop', 'Chờ xác nhận', 'Đã xác nhận', 'Đang lấy hàng', 'Đã lấy hàng', 'Đang giao', 'Đã giao', 'Đã hủy'];

export default function AdminOrdersScreen() {
  const { allOrders, updateOrderStatus, confirmTransferPayment } = useApp();
  const [filterStatus, setFilterStatus] = useState('Tất cả');

  const pending = allOrders.filter(o => o.status === 'Chờ xác nhận' || o.status === 'Chờ shop').length;

  const getTs = (o) => { const v = o.createdAt; if (!v) return 0; return v?.toDate ? v.toDate().getTime() : new Date(v).getTime() || 0; };
  const orders = filterStatus === 'Tất cả'
    ? [...allOrders].sort((a, b) => getTs(b) - getTs(a))
    : [...allOrders].filter(o => o.status === filterStatus).sort((a, b) => getTs(b) - getTs(a));

  const nextStatus = (current) => {
    const idx = ALL_STATUSES.indexOf(current);
    return idx < ALL_STATUSES.length - 2 ? ALL_STATUSES[idx + 1] : null;
  };

  const handleUpdateStatus = (order) => {
    const next = nextStatus(order.status);
    if (!next) return;
    Alert.alert('Cập nhật đơn hàng', `Chuyển sang: "${next}"?`, [
      { text: 'Hủy' },
      { text: 'Xác nhận', onPress: () => updateOrderStatus(order.id, next, order) },
    ]);
  };

  const openGoogleMaps = (order) => {
    let url;
    if (order.deliveryLocation?.latitude && order.deliveryLocation?.longitude) {
      const { latitude, longitude } = order.deliveryLocation;
      url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    } else if (order.deliveryAddress) {
      const encoded = encodeURIComponent(order.deliveryAddress);
      url = `https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`;
    } else {
      Alert.alert('Không có địa chỉ', 'Đơn hàng này chưa có thông tin địa chỉ');
      return;
    }
    Linking.openURL(url).catch(() =>
      Alert.alert('Lỗi', 'Không thể mở Google Maps. Hãy cài Google Maps trên thiết bị.')
    );
  };

  const handleCancel = (order) => {
    Alert.alert('Hủy đơn hàng', `Hủy đơn #${order.id.slice(-6)} của ${order.userName}?`, [
      { text: 'Không' },
      { text: 'Hủy đơn', style: 'destructive', onPress: () => updateOrderStatus(order.id, 'Đã hủy', order) },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Quản lý Đơn hàng</Text>
          {pending > 0 && (
            <Text style={styles.pendingText}>🔔 {pending} đơn chờ xác nhận</Text>
          )}
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{orders.length}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {STATUSES.map(s => {
          const count = s === 'Tất cả' ? allOrders.length : allOrders.filter(o => o.status === s).length;
          return (
            <TouchableOpacity key={s} style={[styles.filterChip, filterStatus === s && styles.filterChipActive]} onPress={() => setFilterStatus(s)}>
              <Text style={[styles.filterText, filterStatus === s && styles.filterTextActive]}>{s}</Text>
              {count > 0 && (
                <View style={[styles.countPill, filterStatus === s && styles.countPillActive]}>
                  <Text style={[styles.countPillText, filterStatus === s && styles.countPillTextActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={orders}
        keyExtractor={o => o.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.orderId}>Đơn #{item.id.slice(-6).toUpperCase()}</Text>
                <Text style={styles.customerName}>
                  <Ionicons name="person-outline" size={12} color={COLORS.gray} /> {item.userName}
                </Text>
                {item.userPhone ? (
                  <Text style={styles.customerPhone}>
                    <Ionicons name="call-outline" size={12} color={COLORS.gray} /> {item.userPhone}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.statusPill, { backgroundColor: (STATUS_COLOR[item.status] || '#999') + '20' }]}>
                <Text style={[styles.statusPillText, { color: STATUS_COLOR[item.status] || '#999' }]}>{item.status}</Text>
              </View>
            </View>

            {item.shopName && (
              <View style={styles.shopRow}>
                <Ionicons name="storefront-outline" size={13} color="#9C27B0" />
                <Text style={styles.shopText}>Lấy tại: {item.shopName}</Text>
              </View>
            )}

            {item.shipperName && (
              <View style={styles.shipperRow}>
                <Ionicons name="bicycle-outline" size={13} color="#FF9800" />
                <Text style={styles.shipperText}>Shipper: {item.shipperName}</Text>
              </View>
            )}

            <View style={styles.itemsBox}>
              {item.items.map((f, i) => (
                <View key={i} style={styles.foodRow}>
                  <Text style={styles.foodQty}>{f.quantity || f.qty || 1}x</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.foodName}>{f.name}</Text>
                    {f.selectedToppings?.length > 0 && (
                      <Text style={styles.foodTopping}>
                        Kèm: {f.selectedToppings.map(t => t.name.replace('Thêm ', '')).join(', ')}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.foodPrice}>{formatCurrency((f.price + (f.selectedToppings || f.toppings || []).reduce((s, t) => s + t.price, 0)) * (f.quantity || f.qty || 1))}</Text>
                </View>
              ))}
            </View>

            <View style={styles.addrBlock}>
              <View style={styles.addrRow}>
                <Ionicons name="location-outline" size={14} color={COLORS.primary} />
                <Text style={styles.addrText}>{item.deliveryAddress}</Text>
                {item.deliveryLocation && (
                  <View style={styles.gpsPill}>
                    <Text style={styles.gpsPillText}>📍GPS</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.mapsBtn} onPress={() => openGoogleMaps(item)}>
                <Ionicons name="navigate" size={15} color="#fff" />
                <Text style={styles.mapsBtnText}>Mở Google Maps chỉ đường</Text>
              </TouchableOpacity>
            </View>
            {item.note ? (
              <View style={styles.noteRow}>
                <Ionicons name="document-text-outline" size={13} color={COLORS.gray} />
                <Text style={styles.noteText}>{item.note}</Text>
              </View>
            ) : null}

            <View style={styles.cardFoot}>
              <View>
                <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                {item.distanceKm !== null && item.distanceKm !== undefined ? (
                  <Text style={styles.distanceText}>
                    📏 {item.distanceKm} km · Ship: {(item.shippingFee || item.shipFee || 0) === 0 ? 'Miễn phí' : formatCurrency(item.shippingFee || item.shipFee || 0)}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.totalText}>{formatCurrency(item.total != null ? (item.total + (item.shippingFee || item.shipFee || 0)) : (item.totalAmount || 0))}</Text>
            </View>

            {item.status !== 'Đã giao' && item.status !== 'Đã hủy' && (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item)}>
                  <Ionicons name="close" size={14} color="#F44336" />
                  <Text style={styles.cancelBtnText}>Hủy đơn</Text>
                </TouchableOpacity>
                {nextStatus(item.status) && (
                  <TouchableOpacity style={styles.nextBtn} onPress={() => handleUpdateStatus(item)}>
                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                    <Text style={styles.nextBtnText}>{nextStatus(item.status)}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={60} color={COLORS.lightGray} />
            <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, padding: 16, paddingTop: 52,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  pendingText: { fontSize: 13, color: COLORS.secondary, marginTop: 4 },
  countBadge: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  countText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  filterBar: { backgroundColor: '#fff', height: 52, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  filterContent: { paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', height: 52 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F5F5F5', marginRight: 8 },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterText: { fontSize: 12, color: COLORS.gray, fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: 'bold' },
  countPill: { backgroundColor: COLORS.lightGray, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 4 },
  countPillActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  countPillText: { fontSize: 10, color: COLORS.gray, fontWeight: 'bold' },
  countPillTextActive: { color: '#fff' },
  list: { padding: 12, paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  orderId: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark },
  customerName: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  customerPhone: { fontSize: 12, color: COLORS.primary, marginTop: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontSize: 12, fontWeight: 'bold' },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3E5F5', borderRadius: 8, padding: 6, marginBottom: 6 },
  shopText: { fontSize: 12, color: '#7B1FA2', fontWeight: '700' },
  shipperRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF3E0', borderRadius: 8, padding: 6, marginBottom: 8 },
  shipperText: { fontSize: 12, color: '#E65100', fontWeight: '600' },
  itemsBox: { backgroundColor: COLORS.background, borderRadius: 10, padding: 10, marginBottom: 10 },
  foodRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4 },
  foodQty: { width: 28, fontSize: 13, fontWeight: 'bold', color: COLORS.primary },
  foodName: { fontSize: 13, color: COLORS.dark, fontWeight: '500' },
  foodTopping: { fontSize: 11, color: COLORS.gray },
  foodPrice: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  addrBlock: { marginBottom: 6 },
  addrRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  addrText: { flex: 1, fontSize: 13, color: COLORS.dark, marginLeft: 6 },
  gpsPill: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 4 },
  gpsPillText: { fontSize: 10, color: '#2E7D32', fontWeight: 'bold' },
  mapsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1a73e8', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  mapsBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  noteText: { flex: 1, fontSize: 12, color: COLORS.gray, fontStyle: 'italic', marginLeft: 6 },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  dateText: { fontSize: 11, color: COLORS.gray },
  distanceText: { fontSize: 11, color: COLORS.primary, marginTop: 2 },
  totalText: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#F44336', gap: 4 },
  cancelBtnText: { color: '#F44336', fontWeight: '600', fontSize: 13 },
  nextBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 10, backgroundColor: COLORS.primary, gap: 4 },
  nextBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.gray, fontSize: 15, marginTop: 12 },
});
