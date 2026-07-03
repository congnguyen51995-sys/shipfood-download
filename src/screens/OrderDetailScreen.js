import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, COLORS } from '../utils/format';
import { Ionicons } from '@expo/vector-icons';

const STATUSES = ['Đang xử lý', 'Đang giao', 'Đã giao'];

export default function OrderDetailScreen({ navigation, route }) {
  const { order: initialOrder } = route.params;
  const { orders, updateOrderStatus } = useApp();
  const order = orders.find((o) => o.id === initialOrder.id) || initialOrder;

  const currentIdx = STATUSES.indexOf(order.status);

  const handleNextStatus = () => {
    if (currentIdx < STATUSES.length - 1) {
      const next = STATUSES[currentIdx + 1];
      Alert.alert('Cập nhật trạng thái', `Chuyển sang: ${next}?`, [
        { text: 'Hủy' },
        { text: 'Xác nhận', onPress: () => updateOrderStatus(order.id, next) },
      ]);
    }
  };

  const handleCancel = () => {
    Alert.alert('Hủy đơn hàng', 'Bạn có chắc muốn hủy đơn hàng này?', [
      { text: 'Không' },
      { text: 'Hủy đơn', style: 'destructive', onPress: () => {
        updateOrderStatus(order.id, 'Đã hủy');
        navigation.goBack();
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Status Track */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trạng thái đơn hàng</Text>
          <View style={styles.statusTrack}>
            {STATUSES.map((s, idx) => (
              <React.Fragment key={s}>
                <View style={styles.statusStep}>
                  <View style={[
                    styles.statusDot,
                    idx <= currentIdx && styles.statusDotActive,
                    order.status === 'Đã hủy' && styles.statusDotCancelled,
                  ]}>
                    {idx <= currentIdx && order.status !== 'Đã hủy' && (
                      <Ionicons name="checkmark" size={14} color={COLORS.white} />
                    )}
                  </View>
                  <Text style={[styles.statusLabel, idx <= currentIdx && styles.statusLabelActive]}>{s}</Text>
                </View>
                {idx < STATUSES.length - 1 && (
                  <View style={[styles.statusLine, idx < currentIdx && styles.statusLineActive]} />
                )}
              </React.Fragment>
            ))}
          </View>
          {order.status === 'Đã hủy' && (
            <View style={styles.cancelledBanner}>
              <Ionicons name="close-circle" size={16} color={COLORS.danger} />
              <Text style={styles.cancelledText}>Đơn hàng đã bị hủy</Text>
            </View>
          )}
        </View>

        {/* Order Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mã đơn</Text>
            <Text style={styles.infoValue}>#{order.id.slice(-8).toUpperCase()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Thời gian đặt</Text>
            <Text style={styles.infoValue}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Địa chỉ giao</Text>
            <Text style={[styles.infoValue, { flex: 1, textAlign: 'right' }]}>{order.deliveryAddress}</Text>
          </View>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Món đã đặt</Text>
          {order.items.map((item, idx) => (
            <View key={idx} style={styles.orderItem}>
              <View style={styles.orderItemQty}>
                <Text style={styles.orderItemQtyText}>{item.quantity}x</Text>
              </View>
              <Text style={styles.orderItemName}>{item.name}</Text>
              <Text style={styles.orderItemPrice}>{formatCurrency(item.price * item.quantity)}</Text>
            </View>
          ))}
        </View>

        {/* Bill */}
        <View style={styles.section}>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Tạm tính</Text>
            <Text style={styles.billValue}>{formatCurrency(order.total)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Phí giao hàng</Text>
            <Text style={styles.billValue}>{formatCurrency(15000)}</Text>
          </View>
          <View style={[styles.billRow, styles.billTotal]}>
            <Text style={styles.billTotalLabel}>Tổng cộng</Text>
            <Text style={styles.billTotalValue}>{formatCurrency(order.total + 15000)}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Actions */}
      {order.status !== 'Đã giao' && order.status !== 'Đã hủy' && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>Hủy đơn</Text>
          </TouchableOpacity>
          {currentIdx < STATUSES.length - 1 && (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNextStatus}>
              <Text style={styles.nextBtnText}>
                → {STATUSES[currentIdx + 1]}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, padding: 16, paddingTop: 52,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
  section: {
    backgroundColor: COLORS.white, margin: 12, borderRadius: 12, padding: 14,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark, marginBottom: 12 },
  statusTrack: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  statusStep: { alignItems: 'center', flex: 1 },
  statusDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  statusDotActive: { backgroundColor: COLORS.primary },
  statusDotCancelled: { backgroundColor: COLORS.danger },
  statusLabel: { fontSize: 11, color: COLORS.gray, textAlign: 'center' },
  statusLabelActive: { color: COLORS.primary, fontWeight: 'bold' },
  statusLine: { height: 2, flex: 1, backgroundColor: COLORS.lightGray, marginBottom: 18 },
  statusLineActive: { backgroundColor: COLORS.primary },
  cancelledBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 12, padding: 8, backgroundColor: '#FFEBEE', borderRadius: 8,
  },
  cancelledText: { color: COLORS.danger, marginLeft: 4, fontWeight: '600' },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  infoLabel: { color: COLORS.gray, fontSize: 13 },
  infoValue: { color: COLORS.dark, fontSize: 13, fontWeight: '500' },
  orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  orderItemQty: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center',
  },
  orderItemQtyText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 13 },
  orderItemName: { flex: 1, fontSize: 14, color: COLORS.dark, marginLeft: 10 },
  orderItemPrice: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  billLabel: { color: COLORS.gray, fontSize: 14 },
  billValue: { color: COLORS.dark, fontSize: 14 },
  billTotal: { marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  billTotalLabel: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark },
  billTotalValue: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary },
  footer: {
    flexDirection: 'row', padding: 16, gap: 10,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.lightGray,
  },
  cancelBtn: {
    flex: 1, borderRadius: 12, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.danger,
  },
  cancelBtnText: { color: COLORS.danger, fontWeight: 'bold', fontSize: 14 },
  nextBtn: {
    flex: 2, borderRadius: 12, padding: 14, alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  nextBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 14 },
});
