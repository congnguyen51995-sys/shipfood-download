import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Linking, ScrollView, Animated,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, COLORS } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';

const STATUS_COLOR = {
  'Chờ xác nhận': '#FFC107',
  'Đã xác nhận': '#2196F3',
  'Đang lấy hàng': '#9C27B0',
  'Đã lấy hàng': '#00BCD4',
  'Đang giao': '#FF9800',
  'Đã giao': '#4CAF50',
  'Đã hủy': '#9E9E9E',
};

// Các bước sau khi đã nhận đơn
const MY_STEPS = ['Đang lấy hàng', 'Đã lấy hàng', 'Đang giao', 'Đã giao'];
const STEP_NEXT_ACTION = {
  'Đang lấy hàng': { label: 'Đã lấy hàng xong', next: 'Đã lấy hàng', icon: 'bag-check-outline', color: '#00BCD4' },
  'Đã lấy hàng': { label: 'Bắt đầu đi giao', next: 'Đang giao', icon: 'bicycle', color: '#FF9800' },
  'Đang giao': { label: 'Đã giao xong', next: 'Đã giao', icon: 'checkmark-circle', color: '#4CAF50' },
};

// Progress step bar
function StepBar({ status }) {
  const steps = MY_STEPS;
  const cur = steps.indexOf(status);
  return (
    <View style={stepStyles.wrap}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <View style={stepStyles.stepCol}>
            <View style={[stepStyles.dot, { backgroundColor: i <= cur ? STATUS_COLOR[s] : '#E0E0E0' }]}>
              {i < cur && <Ionicons name="checkmark" size={10} color="#fff" />}
              {i === cur && <View style={stepStyles.dotInner} />}
            </View>
            <Text style={[stepStyles.label, i <= cur && { color: STATUS_COLOR[s], fontWeight: '700' }]} numberOfLines={1}>{s}</Text>
          </View>
          {i < steps.length - 1 && (
            <View style={[stepStyles.line, { backgroundColor: i < cur ? '#4CAF50' : '#E0E0E0' }]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  stepCol: { alignItems: 'center', width: 56 },
  dot: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  label: { fontSize: 9, color: '#aaa', textAlign: 'center' },
  line: { flex: 1, height: 2, marginTop: 9 },
});

export default function ShipperOrdersScreen() {
  const { allOrders, updateOrderStatus, claimOrder, updateOrderPayment, notifyShipperNearby } = useApp();
  const { currentUser } = useAuth();
  const [tab, setTab] = useState('new'); // 'new' | 'mine' | 'done'
  const prevCount = useRef(0);

  // Available orders: Đã xác nhận + chưa có shipper
  const availableOrders = allOrders.filter(
    o => o.status === 'Đã xác nhận' && !o.shipperId
  );

  // My active orders: claimed by me, not yet delivered
  const myActiveOrders = allOrders.filter(
    o => o.shipperId === currentUser.id && o.status !== 'Đã giao' && o.status !== 'Đã hủy'
  );

  // My delivered orders
  const myDoneOrders = allOrders.filter(
    o => o.shipperId === currentUser.id && o.status === 'Đã giao'
  );

  // Payment summary
  const collectedFee = myDoneOrders.filter(o => o.paymentReceived).reduce((s, o) => s + (o.shippingFee || 0), 0);
  const pendingFee = myDoneOrders.filter(o => !o.paymentReceived).reduce((s, o) => s + (o.shippingFee || 0), 0);

  // Auto-switch to 'mine' when I claim an order
  const handleClaim = (order) => {
    Alert.alert(
      '📦 Nhận đơn giao?',
      `Đơn #${order.id.slice(-6).toUpperCase()} của ${order.userName}\n📍 ${order.deliveryAddress}\n💰 ${formatCurrency((order.total || 0) + (order.shippingFee || 0))}`,
      [
        { text: 'Bỏ qua' },
        {
          text: 'Nhận đơn',
          onPress: async () => {
            await claimOrder(order.id, currentUser.id, currentUser.name, order);
            setTab('mine');
          },
        },
      ]
    );
  };

  const handleNextStep = (order) => {
    const action = STEP_NEXT_ACTION[order.status];
    if (!action) return;
    Alert.alert(
      action.label + '?',
      `Đơn #${order.id.slice(-6).toUpperCase()}`,
      [
        { text: 'Hủy' },
        { text: 'Xác nhận', onPress: () => updateOrderStatus(order.id, action.next, order) },
      ]
    );
  };

  const openMaps = (order) => {
    let url;
    if (order.deliveryLocation?.latitude) {
      const { latitude, longitude } = order.deliveryLocation;
      url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    } else if (order.deliveryAddress) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.deliveryAddress)}&travelmode=driving`;
    } else { Alert.alert('Không có địa chỉ'); return; }
    Linking.openURL(url);
  };

  const call = (phone) => {
    if (!phone) return Alert.alert('Không có SĐT');
    Linking.openURL(`tel:${phone}`);
  };

  const displayed = tab === 'new' ? availableOrders : tab === 'mine' ? myActiveOrders : myDoneOrders;

  const renderOrder = ({ item }) => {
    const isMine = item.shipperId === currentUser.id;
    const isDone = item.status === 'Đã giao';
    const action = STEP_NEXT_ACTION[item.status];

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderId}>Đơn #{item.id.slice(-6).toUpperCase()}</Text>
            <Text style={styles.orderTime}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: (STATUS_COLOR[item.status] || '#999') + '20' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] || '#999' }]}>{item.status}</Text>
          </View>
        </View>

        {/* Progress bar (only for my active orders) */}
        {isMine && !isDone && <StepBar status={item.status} />}

        {/* Shop badge */}
        {item.type === 'shop_order' && (
          <View style={styles.shopBadge}>
            <Ionicons name="storefront-outline" size={13} color="#2196F3" />
            <Text style={styles.shopBadgeText}>Lấy hàng tại: {item.shopName}</Text>
          </View>
        )}

        {/* Customer */}
        <View style={styles.row}>
          <Ionicons name="person-outline" size={14} color={COLORS.primary} />
          <Text style={styles.customerName}>{item.userName}</Text>
          {item.userPhone ? (
            <TouchableOpacity style={styles.callBtn} onPress={() => call(item.userPhone)}>
              <Ionicons name="call" size={13} color="#fff" />
              <Text style={styles.callBtnText}>{item.userPhone}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Address */}
        <View style={styles.row}>
          <Ionicons name="location" size={14} color={COLORS.danger} />
          <Text style={styles.addrText} numberOfLines={2}>{item.deliveryAddress}</Text>
          {item.deliveryLocation && <View style={styles.gpsBadge}><Text style={styles.gpsBadgeText}>GPS</Text></View>}
        </View>

        {item.note ? (
          <View style={styles.row}>
            <Ionicons name="document-text-outline" size={13} color={COLORS.gray} />
            <Text style={styles.noteText} numberOfLines={1}>{item.note}</Text>
          </View>
        ) : null}

        {/* Items preview (for available orders) */}
        {!isMine && item.type !== 'shop_order' && item.items?.length > 0 && (
          <View style={styles.itemsBox}>
            {item.items.slice(0, 3).map((f, i) => (
              <Text key={i} style={styles.foodItem}>{f.quantity}× {f.name}</Text>
            ))}
            {item.items.length > 3 && <Text style={styles.foodItem}>+{item.items.length - 3} món khác...</Text>}
          </View>
        )}

        {/* Total */}
        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>Tổng thu khách</Text>
            {item.distanceKm != null && (
              <Text style={styles.distText}>{item.distanceKm} km · Ship: {formatCurrency(item.shippingFee || 0)}</Text>
            )}
          </View>
          <Text style={styles.totalVal}>{formatCurrency((item.total || 0) + (item.shippingFee || 0))}</Text>
        </View>

        {/* Payment toggle (only for delivered) */}
        {isDone && (
          <TouchableOpacity
            style={[styles.payRow, item.paymentReceived ? styles.payDone : styles.payPending]}
            onPress={() => updateOrderPayment(item.id, !item.paymentReceived)}
          >
            <Ionicons name={item.paymentReceived ? 'checkmark-circle' : 'cash-outline'} size={18}
              color={item.paymentReceived ? '#2E7D32' : '#E65100'} />
            <Text style={[styles.payText, { color: item.paymentReceived ? '#2E7D32' : '#E65100' }]}>
              {item.paymentReceived ? 'Đã thu tiền' : 'Chưa thu tiền — nhấn để xác nhận'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.mapsBtn} onPress={() => openMaps(item)}>
            <Ionicons name="navigate" size={14} color="#fff" />
            <Text style={styles.mapsBtnText}>Chỉ đường</Text>
          </TouchableOpacity>

          {/* Claim button (available orders) */}
          {!isMine && (
            <TouchableOpacity style={styles.claimBtn} onPress={() => handleClaim(item)}>
              <Ionicons name="hand-right" size={14} color="#fff" />
              <Text style={styles.claimBtnText}>Nhận đơn</Text>
            </TouchableOpacity>
          )}

          {/* Next step button (my active orders) */}
          {isMine && action && (
            <TouchableOpacity style={[styles.nextBtn, { backgroundColor: action.color }]} onPress={() => handleNextStep(item)}>
              <Ionicons name={action.icon} size={14} color="#fff" />
              <Text style={styles.nextBtnText}>{action.label}</Text>
            </TouchableOpacity>
          )}
          {/* Notify customer shipper is nearby */}
          {isMine && item.status === 'Đang giao' && (
            <TouchableOpacity
              style={styles.nearbyBtn}
              onPress={() => Alert.alert('Thông báo khách hàng?', 'Gửi tin nhắn báo bạn đang đến gần nơi giao hàng', [
                { text: 'Hủy' },
                { text: 'Gửi', onPress: () => notifyShipperNearby(item) },
              ])}
            >
              <Ionicons name="notifications-outline" size={14} color="#9C27B0" />
              <Text style={styles.nearbyBtnText}>Báo đang đến</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Đơn hàng</Text>
          <Text style={styles.headerSub}>
            {availableOrders.length} đơn mới · {myActiveOrders.length} đang giao
          </Text>
        </View>
      </View>

      {/* Payment summary bar */}
      <View style={styles.paySummary}>
        <View style={styles.paySumItem}>
          <Ionicons name="checkmark-circle-outline" size={13} color="#4CAF50" />
          <Text style={styles.paySumText}>Đã thu: <Text style={{ color: '#2E7D32', fontWeight: 'bold' }}>{formatCurrency(collectedFee)}</Text></Text>
        </View>
        <View style={styles.paySumDiv} />
        <View style={styles.paySumItem}>
          <Ionicons name="time-outline" size={13} color="#FF9800" />
          <Text style={styles.paySumText}>Chưa thu: <Text style={{ color: '#E65100', fontWeight: 'bold' }}>{formatCurrency(pendingFee)}</Text></Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'new' && styles.tabActive]} onPress={() => setTab('new')}>
          <Text style={[styles.tabText, tab === 'new' && styles.tabTextActive]}>Đơn mới</Text>
          {availableOrders.length > 0 && (
            <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{availableOrders.length}</Text></View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'mine' && styles.tabActive]} onPress={() => setTab('mine')}>
          <Text style={[styles.tabText, tab === 'mine' && styles.tabTextActive]}>Đang giao</Text>
          {myActiveOrders.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: '#FF9800' }]}>
              <Text style={styles.tabBadgeText}>{myActiveOrders.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'done' && styles.tabActive]} onPress={() => setTab('done')}>
          <Text style={[styles.tabText, tab === 'done' && styles.tabTextActive]}>Đã giao ({myDoneOrders.length})</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayed}
        keyExtractor={o => o.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name={tab === 'new' ? 'notifications-outline' : tab === 'mine' ? 'bicycle-outline' : 'checkmark-circle-outline'}
              size={60} color={COLORS.lightGray}
            />
            <Text style={styles.emptyText}>
              {tab === 'new' ? 'Không có đơn mới' : tab === 'mine' ? 'Chưa nhận đơn nào' : 'Chưa có đơn hoàn thành'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 3 },
  paySummary: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  paySumItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  paySumDiv: { width: 1, height: 16, backgroundColor: COLORS.lightGray, marginHorizontal: 8 },
  paySumText: { fontSize: 12, color: COLORS.gray },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 5, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.gray },
  tabTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  tabBadge: { backgroundColor: COLORS.danger, borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  list: { padding: 12, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  orderId: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark },
  orderTime: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  shopBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E3F2FD', borderRadius: 8, padding: 7, marginBottom: 8 },
  shopBadgeText: { fontSize: 12, color: '#2196F3', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  customerName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.dark },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#4CAF50', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4 },
  callBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  addrText: { flex: 1, fontSize: 13, color: COLORS.dark },
  gpsBadge: { backgroundColor: '#E8F5E9', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  gpsBadgeText: { fontSize: 10, color: '#2E7D32', fontWeight: 'bold' },
  noteText: { flex: 1, fontSize: 12, color: COLORS.gray, fontStyle: 'italic' },
  itemsBox: { backgroundColor: COLORS.background, borderRadius: 8, padding: 8, marginBottom: 8 },
  foodItem: { fontSize: 12, color: COLORS.dark, paddingVertical: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.lightGray, marginBottom: 10 },
  totalLabel: { fontSize: 12, color: COLORS.gray },
  distText: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  totalVal: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 10, marginBottom: 8 },
  payDone: { backgroundColor: '#E8F5E9' },
  payPending: { backgroundColor: '#FFF3E0' },
  payText: { flex: 1, fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  mapsBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#1a73e8', borderRadius: 10, padding: 10 },
  mapsBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  claimBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: COLORS.primary, borderRadius: 10, padding: 10 },
  claimBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  nextBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 10, padding: 10 },
  nextBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  nearbyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 10, padding: 10, borderWidth: 1.5, borderColor: '#9C27B0' },
  nearbyBtnText: { color: '#9C27B0', fontWeight: 'bold', fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.gray, fontSize: 15, marginTop: 12 },
});
