import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { COLORS, formatCurrency, formatDate } from '../../utils/format';

const SHIPPER_RATIO = 0.8;
const PERIODS = ['Tuần', 'Tháng', 'Năm', 'Tất cả'];

function startOf(period, date = new Date()) {
  const d = new Date(date);
  if (period === 'Tuần') {
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
  } else if (period === 'Tháng') {
    d.setDate(1); d.setHours(0, 0, 0, 0);
  } else if (period === 'Năm') {
    d.setMonth(0, 1); d.setHours(0, 0, 0, 0);
  }
  return d;
}

function endOf(period, date = new Date()) {
  const d = new Date(date);
  if (period === 'Tuần') {
    d.setDate(d.getDate() + (6 - d.getDay()));
    d.setHours(23, 59, 59, 999);
  } else if (period === 'Tháng') {
    d.setMonth(d.getMonth() + 1, 0); d.setHours(23, 59, 59, 999);
  } else if (period === 'Năm') {
    d.setMonth(11, 31); d.setHours(23, 59, 59, 999);
  }
  return d;
}

function shiftDate(period, base, delta) {
  const d = new Date(base);
  if (period === 'Tuần') d.setDate(d.getDate() + delta * 7);
  else if (period === 'Tháng') d.setMonth(d.getMonth() + delta);
  else if (period === 'Năm') d.setFullYear(d.getFullYear() + delta);
  return d;
}

function periodLabel(period, base) {
  if (period === 'Tất cả') return 'Toàn bộ thời gian';
  const s = startOf(period, base);
  const e = endOf(period, base);
  const fmt = d => `${d.getDate()}/${d.getMonth() + 1}`;
  if (period === 'Tuần') return `${fmt(s)} – ${fmt(e)}/${e.getFullYear()}`;
  if (period === 'Tháng') return `Tháng ${s.getMonth() + 1}/${s.getFullYear()}`;
  return `Năm ${s.getFullYear()}`;
}

export default function ShipperSalaryScreen() {
  const { allOrders } = useApp();
  const { currentUser } = useAuth();
  const [period, setPeriod] = useState('Tháng');
  const [base, setBase] = useState(new Date());
  const [showOrders, setShowOrders] = useState(false);

  const isCurrentPeriod = period === 'Tất cả' || (() => {
    const s = startOf(period, base);
    const e = endOf(period, base);
    const now = new Date();
    return now >= s && now <= e;
  })();

  const periodOrders = useMemo(() => {
    return allOrders.filter(o => {
      if (o.shipperId !== currentUser.id) return false;
      if (o.status !== 'Đã giao') return false;
      if (period === 'Tất cả') return true;
      const s = startOf(period, base);
      const e = endOf(period, base);
      return new Date(o.createdAt) >= s && new Date(o.createdAt) <= e;
    });
  }, [allOrders, period, base, currentUser.id]);

  const totalShipFee = periodOrders.reduce((s, o) => s + (o.shippingFee || 0), 0);
  const mySalary = Math.round(totalShipFee * SHIPPER_RATIO);
  const orderCount = periodOrders.length;

  // Tất cả đơn đã giao (mọi thời gian) để tính tổng sự nghiệp
  const allMyDone = allOrders.filter(o => o.shipperId === currentUser.id && o.status === 'Đã giao');
  const allTimeShip = allMyDone.reduce((s, o) => s + (o.shippingFee || 0), 0);
  const allTimeSalary = Math.round(allTimeShip * SHIPPER_RATIO);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lương của tôi</Text>
        <Text style={styles.headerSub}>Tổng cộng: {allMyDone.length} đơn · {formatCurrency(allTimeSalary)}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

        {/* Period tabs */}
        <View style={styles.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodTab, period === p && styles.periodTabActive]}
              onPress={() => { setPeriod(p); setBase(new Date()); }}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Navigator */}
        {period !== 'Tất cả' && (
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navBtn} onPress={() => setBase(shiftDate(period, base, -1))}>
              <Ionicons name="chevron-back" size={22} color="#FF9800" />
            </TouchableOpacity>
            <Text style={styles.navLabel}>{periodLabel(period, base)}</Text>
            <TouchableOpacity
              style={[styles.navBtn, isCurrentPeriod && { opacity: 0.3 }]}
              onPress={() => !isCurrentPeriod && setBase(shiftDate(period, base, 1))}
            >
              <Ionicons name="chevron-forward" size={22} color="#FF9800" />
            </TouchableOpacity>
          </View>
        )}
        {period === 'Tất cả' && (
          <Text style={styles.allTimeLabel}>Toàn bộ thời gian làm việc</Text>
        )}

        {/* Salary card chính */}
        <View style={styles.salaryCard}>
          <Text style={styles.salaryLabel}>Lương nhận được</Text>
          <Text style={styles.salaryAmount}>{formatCurrency(mySalary)}</Text>
          <Text style={styles.salaryNote}>= {formatCurrency(totalShipFee)} phí ship × 80%</Text>
          <View style={styles.salaryDivider} />
          <View style={styles.salaryRow}>
            <View style={styles.salaryItem}>
              <Text style={styles.salaryItemVal}>{orderCount}</Text>
              <Text style={styles.salaryItemLabel}>Đơn hoàn thành</Text>
            </View>
            <View style={[styles.salaryItem, { borderLeftWidth: 1, borderLeftColor: '#FFE0B2' }]}>
              <Text style={styles.salaryItemVal}>{formatCurrency(totalShipFee)}</Text>
              <Text style={styles.salaryItemLabel}>Tổng phí ship</Text>
            </View>
            <View style={[styles.salaryItem, { borderLeftWidth: 1, borderLeftColor: '#FFE0B2' }]}>
              <Text style={[styles.salaryItemVal, { color: '#E65100' }]}>20%</Text>
              <Text style={styles.salaryItemLabel}>Sàn giữ lại</Text>
            </View>
          </View>
        </View>

        {/* Giải thích cách tính */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={16} color="#FF9800" />
            <Text style={styles.infoTitle}>Cách tính lương</Text>
          </View>
          <Text style={styles.infoText}>• Mỗi đơn giao xong bạn nhận <Text style={styles.bold}>80%</Text> phí ship</Text>
          <Text style={styles.infoText}>• Sàn giữ lại <Text style={styles.bold}>20%</Text> phí ship + 2.000đ/đơn phí sàn</Text>
          <Text style={styles.infoText}>• Lương được thanh toán cuối tháng bằng tiền mặt</Text>
        </View>

        {/* Danh sách đơn */}
        {orderCount > 0 && (
          <View style={styles.ordersCard}>
            <TouchableOpacity style={styles.ordersToggle} onPress={() => setShowOrders(!showOrders)}>
              <Ionicons name="receipt-outline" size={16} color={COLORS.dark} />
              <Text style={styles.ordersToggleText}>Chi tiết {orderCount} đơn hàng</Text>
              <Ionicons name={showOrders ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.gray} />
            </TouchableOpacity>

            {showOrders && periodOrders.map(o => (
              <View key={o.id} style={styles.orderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderIdText}>#{o.id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.orderDate}>{formatDate(o.createdAt)}</Text>
                  <Text style={styles.orderAddr} numberOfLines={1}>{o.deliveryAddress}</Text>
                </View>
                <View style={styles.orderFeeCol}>
                  <Text style={styles.orderShipFee}>{formatCurrency(o.shippingFee || 0)}</Text>
                  <Text style={styles.orderMySalary}>+{formatCurrency(Math.round((o.shippingFee || 0) * SHIPPER_RATIO))}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {orderCount === 0 && (
          <View style={styles.empty}>
            <Ionicons name="bicycle-outline" size={60} color={COLORS.lightGray} />
            <Text style={styles.emptyText}>Chưa có đơn nào trong kỳ này</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: '#FF9800', padding: 16, paddingTop: 52 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  periodRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    margin: 12, borderRadius: 14, padding: 4, elevation: 2,
  },
  periodTab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  periodTabActive: { backgroundColor: '#FF9800' },
  periodText: { fontSize: 13, color: COLORS.gray },
  periodTextActive: { color: '#fff', fontWeight: 'bold' },
  navRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 10 },
  navBtn: { padding: 6 },
  navLabel: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 'bold', color: COLORS.dark },
  allTimeLabel: { textAlign: 'center', fontSize: 13, color: COLORS.gray, marginBottom: 10 },
  salaryCard: {
    backgroundColor: '#FF9800', margin: 12, marginTop: 0,
    borderRadius: 18, padding: 20, elevation: 4,
  },
  salaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  salaryAmount: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  salaryNote: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  salaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 16 },
  salaryRow: { flexDirection: 'row' },
  salaryItem: { flex: 1, alignItems: 'center' },
  salaryItemVal: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  salaryItemLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  infoCard: { backgroundColor: '#FFF8E1', marginHorizontal: 12, marginBottom: 12, borderRadius: 14, padding: 14, borderLeftWidth: 3, borderLeftColor: '#FF9800' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  infoTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.dark },
  infoText: { fontSize: 12, color: COLORS.dark, marginBottom: 4, lineHeight: 18 },
  bold: { fontWeight: 'bold' },
  ordersCard: { backgroundColor: '#fff', marginHorizontal: 12, borderRadius: 14, overflow: 'hidden', elevation: 2, marginBottom: 12 },
  ordersToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  ordersToggleText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.dark },
  orderRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#F5F5F5',
  },
  orderIdText: { fontSize: 13, fontWeight: 'bold', color: COLORS.dark },
  orderDate: { fontSize: 11, color: COLORS.gray, marginTop: 1 },
  orderAddr: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  orderFeeCol: { alignItems: 'flex-end' },
  orderShipFee: { fontSize: 12, color: COLORS.gray },
  orderMySalary: { fontSize: 14, fontWeight: 'bold', color: '#4CAF50', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: COLORS.gray, fontSize: 14, marginTop: 12 },
});
