import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { COLORS, formatCurrency, formatDate } from '../../utils/format';

const STEPS = [
  { status: 'Chờ shop',      icon: 'storefront-outline',       label: 'Chờ quán xác nhận',   color: '#FF9800' },
  { status: 'Chờ xác nhận', icon: 'checkmark-circle-outline',  label: 'Quán đã xác nhận',    color: '#2196F3' },
  { status: 'Đã xác nhận',  icon: 'bicycle-outline',           label: 'Chờ shipper nhận',    color: '#9C27B0' },
  { status: 'Đang lấy hàng',icon: 'bag-outline',               label: 'Shipper đang lấy đồ', color: '#FF5722' },
  { status: 'Đã lấy hàng',  icon: 'bag-check-outline',         label: 'Đã lấy hàng xong',   color: '#00BCD4' },
  { status: 'Đang giao',    icon: 'bicycle',                   label: 'Đang giao đến bạn',   color: '#FF9800' },
  { status: 'Đã giao',      icon: 'checkmark-done-circle',     label: 'Đã giao thành công',  color: '#4CAF50' },
];

function getStepIndex(status) {
  return STEPS.findIndex(s => s.status === status);
}

export default function CustomerTrackOrderScreen({ route, navigation }) {
  const { orderId } = route.params;
  const { allOrders } = useApp();

  const order = useMemo(() => allOrders.find(o => o.id === orderId), [allOrders, orderId]);

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Theo dõi đơn</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={60} color={COLORS.lightGray} />
          <Text style={styles.emptyText}>Không tìm thấy đơn hàng</Text>
        </View>
      </View>
    );
  }

  const isCancelled = order.status === 'Đã hủy';
  const isDone = order.status === 'Đã giao';
  const curIdx = getStepIndex(order.status);
  const steps = order.shopId ? STEPS : STEPS.filter(s => s.status !== 'Chờ shop');

  const call = (phone) => phone && Linking.openURL(`tel:${phone}`);

  return (
    <View style={styles.container}>
      <View style={[styles.header, isCancelled && { backgroundColor: '#9E9E9E' }, isDone && { backgroundColor: '#4CAF50' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Đơn #{order.id.slice(-6).toUpperCase()}</Text>
          <Text style={styles.headerSub}>{formatDate(order.createdAt)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Trạng thái hiện tại nổi bật */}
        {isCancelled ? (
          <View style={styles.cancelCard}>
            <Ionicons name="close-circle" size={40} color="#F44336" />
            <Text style={styles.cancelTitle}>Đơn đã bị hủy</Text>
            {order.cancelReason ? (
              <Text style={styles.cancelReason}>Lý do: {order.cancelReason}</Text>
            ) : null}
          </View>
        ) : (
          <View style={[styles.currentCard, { borderColor: STEPS[curIdx]?.color || COLORS.primary }]}>
            <Ionicons name={STEPS[curIdx]?.icon || 'time-outline'} size={32} color={STEPS[curIdx]?.color || COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.currentStatus, { color: STEPS[curIdx]?.color || COLORS.primary }]}>
                {STEPS[curIdx]?.label || order.status}
              </Text>
              {!isDone && order.distanceKm && (
                <Text style={styles.etaText}>
                  ⏱ Dự kiến {Math.max(5, 15 + Math.round(order.distanceKm * 4))} phút
                </Text>
              )}
              {isDone && <Text style={styles.doneNote}>Cảm ơn bạn đã đặt hàng!</Text>}
            </View>
          </View>
        )}

        {/* Thanh tiến trình */}
        {!isCancelled && (
          <View style={styles.progressCard}>
            <Text style={styles.sectionTitle}>Tiến trình đơn hàng</Text>
            {steps.map((step, i) => {
              const realIdx = getStepIndex(step.status);
              const done = curIdx >= realIdx;
              const active = curIdx === realIdx;
              return (
                <View key={step.status} style={styles.stepRow}>
                  <View style={styles.stepLeft}>
                    <View style={[
                      styles.stepDot,
                      done && { backgroundColor: step.color, borderColor: step.color },
                      active && styles.stepDotActive,
                    ]}>
                      {done && !active
                        ? <Ionicons name="checkmark" size={12} color="#fff" />
                        : active
                        ? <View style={styles.stepDotInner} />
                        : null}
                    </View>
                    {i < steps.length - 1 && (
                      <View style={[styles.stepLine, done && curIdx > realIdx && { backgroundColor: step.color }]} />
                    )}
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepLabel, done && { color: COLORS.dark, fontWeight: active ? 'bold' : '500' }]}>
                      {step.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Thông tin shipper */}
        {order.shipperName && !isCancelled && (
          <View style={styles.shipperCard}>
            <View style={styles.shipperLeft}>
              <View style={styles.shipperAvatar}>
                <Ionicons name="bicycle" size={22} color="#fff" />
              </View>
              <View>
                <Text style={styles.shipperName}>{order.shipperName}</Text>
                <Text style={styles.shipperLabel}>Shipper của bạn</Text>
              </View>
            </View>
          </View>
        )}

        {/* Địa chỉ giao */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={COLORS.danger} />
            <Text style={styles.infoText}>{order.deliveryAddress}</Text>
          </View>
          {order.shopName && (
            <View style={styles.infoRow}>
              <Ionicons name="storefront-outline" size={16} color="#2196F3" />
              <Text style={styles.infoText}>Lấy tại: {order.shopName}</Text>
            </View>
          )}
          {order.note ? (
            <View style={styles.infoRow}>
              <Ionicons name="document-text-outline" size={16} color={COLORS.gray} />
              <Text style={styles.infoText}>{order.note}</Text>
            </View>
          ) : null}
        </View>

        {/* Danh sách món */}
        <View style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Món đặt</Text>
          {order.items?.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity}×</Text>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.itemPrice}>{formatCurrency(item.price * item.quantity)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Phí ship</Text>
            <Text style={styles.totalVal}>{formatCurrency(order.shippingFee || 0)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandRow]}>
            <Text style={styles.grandLabel}>Tổng thanh toán</Text>
            <Text style={styles.grandVal}>{formatCurrency((order.total || 0) + (order.shippingFee || 0))}</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, paddingHorizontal: 16,
    paddingTop: 52, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: COLORS.gray, fontSize: 15, marginTop: 12 },
  cancelCard: { alignItems: 'center', backgroundColor: '#FFF3F3', margin: 12, borderRadius: 16, padding: 24, gap: 8 },
  cancelTitle: { fontSize: 18, fontWeight: 'bold', color: '#F44336' },
  cancelReason: { fontSize: 13, color: '#F44336', textAlign: 'center' },
  currentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', margin: 12, borderRadius: 16, padding: 18,
    borderLeftWidth: 4, elevation: 3,
  },
  currentStatus: { fontSize: 17, fontWeight: 'bold', flex: 1 },
  doneNote: { fontSize: 12, color: '#4CAF50', marginTop: 2 },
  etaText: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  progressCard: { backgroundColor: '#fff', margin: 12, marginTop: 0, borderRadius: 16, padding: 16, elevation: 2 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark, marginBottom: 14 },
  stepRow: { flexDirection: 'row', minHeight: 44 },
  stepLeft: { width: 32, alignItems: 'center' },
  stepDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#E0E0E0', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { borderWidth: 3 },
  stepDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  stepLine: { flex: 1, width: 2, backgroundColor: '#E0E0E0', marginVertical: 2 },
  stepContent: { flex: 1, paddingLeft: 10, paddingBottom: 16, justifyContent: 'center' },
  stepLabel: { fontSize: 13, color: COLORS.gray },
  shipperCard: { backgroundColor: '#FFF8E1', marginHorizontal: 12, marginBottom: 12, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shipperLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shipperAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF9800', justifyContent: 'center', alignItems: 'center' },
  shipperName: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark },
  shipperLabel: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  infoCard: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 12, borderRadius: 14, padding: 14, elevation: 2 },
  infoRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8 },
  infoText: { fontSize: 13, color: COLORS.dark, flex: 1 },
  itemsCard: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 12, borderRadius: 14, padding: 14, elevation: 2 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5 },
  itemQty: { fontSize: 13, color: COLORS.gray, width: 24 },
  itemName: { flex: 1, fontSize: 13, color: COLORS.dark },
  itemPrice: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  totalLabel: { fontSize: 13, color: COLORS.gray },
  totalVal: { fontSize: 13, color: COLORS.gray },
  grandRow: { marginTop: 4, borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  grandLabel: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark },
  grandVal: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
});
