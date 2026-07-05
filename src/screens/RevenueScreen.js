import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { COLORS, formatCurrency } from '../utils/format';

const PERIODS = ['Ngày', 'Tuần', 'Tháng', 'Năm'];

function startOf(period, date = new Date()) {
  const d = new Date(date);
  if (period === 'Ngày') {
    d.setHours(0, 0, 0, 0);
  } else if (period === 'Tuần') {
    const day = d.getDay(); // 0=Sun
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
  } else if (period === 'Tháng') {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

function endOf(period, date = new Date()) {
  const d = new Date(date);
  if (period === 'Ngày') {
    d.setHours(23, 59, 59, 999);
  } else if (period === 'Tuần') {
    const day = d.getDay();
    d.setDate(d.getDate() + (6 - day));
    d.setHours(23, 59, 59, 999);
  } else if (period === 'Tháng') {
    d.setMonth(d.getMonth() + 1, 0);
    d.setHours(23, 59, 59, 999);
  } else {
    d.setMonth(11, 31);
    d.setHours(23, 59, 59, 999);
  }
  return d;
}

function shiftDate(period, base, delta) {
  const d = new Date(base);
  if (period === 'Ngày') d.setDate(d.getDate() + delta);
  else if (period === 'Tuần') d.setDate(d.getDate() + delta * 7);
  else if (period === 'Tháng') d.setMonth(d.getMonth() + delta);
  else d.setFullYear(d.getFullYear() + delta);
  return d;
}

function periodLabel(period, base) {
  const s = startOf(period, base);
  const e = endOf(period, base);
  const fmt = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
  if (period === 'Ngày') return `${fmt(s)}/${s.getFullYear()}`;
  if (period === 'Tuần') return `${fmt(s)} – ${fmt(e)}/${e.getFullYear()}`;
  if (period === 'Tháng') return `Tháng ${s.getMonth() + 1}/${s.getFullYear()}`;
  return `Năm ${s.getFullYear()}`;
}

const toDate = (ts) => ts?.toDate ? ts.toDate() : new Date(ts);

const calcFood = (o) => {
  if (o.items && o.items.length > 0) {
    return o.items.reduce((s, i) => s + (i.price + (i.selectedToppings || []).reduce((t, tp) => t + tp.price, 0)) * (i.quantity || 1), 0);
  }
  return o.total || 0;
};

// Chia nhỏ theo ngày/tuần để vẽ biểu đồ cột
function getChartBars(period, orders, base, shopId) {
  const s = startOf(period, base);
  const e = endOf(period, base);

  const filtered = orders.filter(o => {
    if (o.status !== 'Đã giao') return false;
    if (shopId && o.shopId !== shopId) return false;
    const t = toDate(o.createdAt);
    return t >= s && t <= e;
  });

  let bars = [];

  if (period === 'Ngày') {
    // 24 giờ
    for (let h = 0; h < 24; h += 3) {
      const label = `${String(h).padStart(2, '0')}h`;
      const total = filtered
        .filter(o => toDate(o.createdAt).getHours() >= h && toDate(o.createdAt).getHours() < h + 3)
        .reduce((s, o) => s + calcFood(o) + (o.shippingFee || 0), 0);
      bars.push({ label, total });
    }
  } else if (period === 'Tuần') {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(s);
      d.setDate(s.getDate() + i);
      const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
      const total = filtered
        .filter(o => { const t = toDate(o.createdAt); return t >= dayStart && t <= dayEnd; })
        .reduce((s, o) => s + calcFood(o) + (o.shippingFee || 0), 0);
      bars.push({ label: days[i], total });
    }
  } else if (period === 'Tháng') {
    const daysInMonth = e.getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const dayStart = new Date(s.getFullYear(), s.getMonth(), i, 0, 0, 0);
      const dayEnd = new Date(s.getFullYear(), s.getMonth(), i, 23, 59, 59);
      const total = filtered
        .filter(o => { const t = toDate(o.createdAt); return t >= dayStart && t <= dayEnd; })
        .reduce((sum, o) => sum + (o.total || 0) + (o.shippingFee || 0), 0);
      bars.push({ label: `${i}`, total });
    }
  } else {
    const months = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(s.getFullYear(), m, 1, 0, 0, 0);
      const mEnd = new Date(s.getFullYear(), m + 1, 0, 23, 59, 59);
      const total = filtered
        .filter(o => { const t = toDate(o.createdAt); return t >= mStart && t <= mEnd; })
        .reduce((sum, o) => sum + (o.total || 0) + (o.shippingFee || 0), 0);
      bars.push({ label: months[m], total });
    }
  }
  return bars;
}

const PLATFORM_FEE = 2000;
const SHIPPER_RATIO = 0.8;

export default function RevenueScreen() {
  const { allOrders } = useApp();
  const { currentUser, isAdmin } = useAuth();
  const [period, setPeriod] = useState('Tháng');
  const [base, setBase] = useState(new Date());

  const shopId = isAdmin ? null : currentUser?.id;
  const accentColor = isAdmin ? COLORS.primary : '#2196F3';

  const s = startOf(period, base);
  const e = endOf(period, base);
  const isCurrentPeriod = new Date() >= s && new Date() <= e;

  const periodOrders = useMemo(() => {
    return allOrders.filter(o => {
      if (o.status !== 'Đã giao') return false;
      if (shopId && o.shopId !== shopId) return false;
      const t = toDate(o.createdAt);
      return t >= s && t <= e;
    });
  }, [allOrders, period, base, shopId]);

  const foodRevenue = periodOrders.reduce((sum, o) => sum + calcFood(o), 0);
  const shipRevenue = periodOrders.reduce((sum, o) => sum + (o.shippingFee || 0), 0);
  const totalRevenue = foodRevenue + shipRevenue;
  const orderCount = periodOrders.length;
  const avgOrder = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;

  const collectedShip = periodOrders.filter(o => o.paymentReceived).reduce((s, o) => s + (o.shippingFee || 0), 0);
  const pendingShip = shipRevenue - collectedShip;

  // Admin: phân tích lợi nhuận nền tảng
  const platformFeeTotal = isAdmin ? orderCount * PLATFORM_FEE : 0;
  const shipProfit = isAdmin ? Math.round(shipRevenue * (1 - SHIPPER_RATIO)) : 0;
  const platformProfit = isAdmin ? platformFeeTotal + shipProfit : 0;
  const shipperSalaryTotal = isAdmin ? Math.round(shipRevenue * SHIPPER_RATIO) : 0;

  // Admin: thống kê từng shop
  const shopStats = useMemo(() => {
    if (!isAdmin) return [];
    const map = {};
    periodOrders.forEach(o => {
      const key = o.shopId || '__platform__';
      const name = o.shopName || (o.shopId ? o.shopId : 'ShipFood');
      if (!map[key]) map[key] = { id: key, name, orders: 0, foodRevenue: 0, platformRevenue: 0, shipRevenue: 0 };
      map[key].orders += 1;
      map[key].foodRevenue += calcFood(o);
      map[key].platformRevenue += PLATFORM_FEE;
      map[key].shipRevenue += (o.shippingFee || 0);
    });
    return Object.values(map).sort((a, b) => b.foodRevenue - a.foodRevenue);
  }, [periodOrders, isAdmin]);

  // Admin: thống kê từng shipper
  const shipperStats = useMemo(() => {
    if (!isAdmin) return [];
    const map = {};
    periodOrders.forEach(o => {
      if (!o.shipperId) return;
      if (!map[o.shipperId]) map[o.shipperId] = { id: o.shipperId, name: o.shipperName || 'Shipper', orders: 0, shipFee: 0 };
      map[o.shipperId].orders += 1;
      map[o.shipperId].shipFee += (o.shippingFee || 0);
    });
    return Object.values(map).sort((a, b) => b.orders - a.orders);
  }, [periodOrders, isAdmin]);

  const topItems = useMemo(() => {
    const count = {};
    periodOrders.forEach(o => o.items?.forEach(i => {
      if (!count[i.name]) count[i.name] = { name: i.name, qty: 0, revenue: 0 };
      count[i.name].qty += i.quantity;
      count[i.name].revenue += i.price * i.quantity;
    }));
    return Object.values(count).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [periodOrders]);

  const bars = useMemo(() => getChartBars(period, allOrders, base, shopId), [period, base, allOrders, shopId]);
  const maxBar = Math.max(...bars.map(b => b.total), 1);

  // Hiện nhãn thưa hơn khi nhiều cột
  const showLabel = (i) => {
    if (bars.length <= 12) return true;
    if (bars.length <= 24) return i % 2 === 0;
    return i % 5 === 0;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <Text style={styles.headerTitle}>📊 Doanh thu</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

        {/* Period selector */}
        <View style={styles.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodTab, period === p && { backgroundColor: accentColor }]}
              onPress={() => { setPeriod(p); setBase(new Date()); }}
            >
              <Text style={[styles.periodText, period === p && { color: '#fff', fontWeight: 'bold' }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Navigator */}
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setBase(shiftDate(period, base, -1))}>
            <Ionicons name="chevron-back" size={22} color={accentColor} />
          </TouchableOpacity>
          <Text style={styles.navLabel}>{periodLabel(period, base)}</Text>
          <TouchableOpacity
            style={[styles.navBtn, isCurrentPeriod && styles.navBtnDisabled]}
            onPress={() => !isCurrentPeriod && setBase(shiftDate(period, base, 1))}
          >
            <Ionicons name="chevron-forward" size={22} color={isCurrentPeriod ? COLORS.lightGray : accentColor} />
          </TouchableOpacity>
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderTopColor: accentColor }]}>
            <Text style={styles.summaryLabel}>Tổng doanh thu</Text>
            <Text style={[styles.summaryVal, { color: accentColor }]}>{formatCurrency(totalRevenue)}</Text>
          </View>
          <View style={[styles.summaryCard, { borderTopColor: '#4CAF50' }]}>
            <Text style={styles.summaryLabel}>Số đơn</Text>
            <Text style={[styles.summaryVal, { color: '#4CAF50' }]}>{orderCount} đơn</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderTopColor: '#FF9800' }]}>
            <Text style={styles.summaryLabel}>Tiền món ăn</Text>
            <Text style={[styles.summaryVal, { color: '#FF9800' }]}>{formatCurrency(foodRevenue)}</Text>
          </View>
          <View style={[styles.summaryCard, { borderTopColor: '#9C27B0' }]}>
            <Text style={styles.summaryLabel}>Phí ship</Text>
            <Text style={[styles.summaryVal, { color: '#9C27B0' }]}>{formatCurrency(shipRevenue)}</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderTopColor: '#009688', flex: 1 }]}>
            <Text style={styles.summaryLabel}>TB mỗi đơn</Text>
            <Text style={[styles.summaryVal, { color: '#009688' }]}>{formatCurrency(avgOrder)}</Text>
          </View>
        </View>

        {/* Admin: lợi nhuận nền tảng */}
        {isAdmin && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="wallet-outline" size={16} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Lợi nhuận nền tảng</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { borderTopColor: '#E91E63' }]}>
                <Text style={styles.summaryLabel}>Phí sàn (2k/đơn)</Text>
                <Text style={[styles.summaryVal, { color: '#E91E63' }]}>{formatCurrency(platformFeeTotal)}</Text>
              </View>
              <View style={[styles.summaryCard, { borderTopColor: '#673AB7' }]}>
                <Text style={styles.summaryLabel}>Lãi ship (20%)</Text>
                <Text style={[styles.summaryVal, { color: '#673AB7' }]}>{formatCurrency(shipProfit)}</Text>
              </View>
            </View>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { borderTopColor: '#4CAF50', flex: 1 }]}>
                <Text style={styles.summaryLabel}>Tổng lợi nhuận sàn</Text>
                <Text style={[styles.summaryVal, { color: '#4CAF50', fontSize: 18 }]}>{formatCurrency(platformProfit)}</Text>
              </View>
              <View style={[styles.summaryCard, { borderTopColor: '#F44336', flex: 1 }]}>
                <Text style={styles.summaryLabel}>Lương shipper (80%)</Text>
                <Text style={[styles.summaryVal, { color: '#F44336' }]}>{formatCurrency(shipperSalaryTotal)}</Text>
              </View>
            </View>

            {/* Doanh thu từng shop */}
            {shopStats.length > 0 && (
              <View style={styles.shopCard}>
                <View style={styles.topHeader}>
                  <Ionicons name="storefront-outline" size={17} color="#2196F3" />
                  <Text style={styles.topTitle}>Doanh thu theo shop</Text>
                </View>
                <View style={styles.shopTableHead}>
                  <Text style={[styles.shopCol, { flex: 3, textAlign: 'left' }]}>Tên shop</Text>
                  <Text style={styles.shopCol}>Đơn</Text>
                  <Text style={[styles.shopCol, { color: '#FF9800' }]}>Món</Text>
                  <Text style={[styles.shopCol, { color: '#E91E63' }]}>Sàn</Text>
                  <Text style={[styles.shopCol, { color: '#9C27B0' }]}>Ship</Text>
                </View>
                {shopStats.map((sh, i) => {
                  const fmt = v => v >= 1000000 ? (v/1000000).toFixed(1)+'M' : Math.round(v/1000)+'k';
                  return (
                    <View key={sh.id} style={styles.shopRow}>
                      <View style={[styles.shopRank, { backgroundColor: i < 3 ? '#2196F3' : '#E0E0E0' }]}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: i < 3 ? '#fff' : '#888' }}>#{i+1}</Text>
                      </View>
                      <Text style={[styles.shopCol, { flex: 3, color: COLORS.dark, fontWeight: '600', textAlign: 'left' }]} numberOfLines={1}>{sh.name}</Text>
                      <Text style={styles.shopCol}>{sh.orders}</Text>
                      <Text style={[styles.shopCol, { color: '#FF9800', fontWeight: '600' }]}>{fmt(sh.foodRevenue)}</Text>
                      <Text style={[styles.shopCol, { color: '#E91E63', fontWeight: '600' }]}>{fmt(sh.platformRevenue)}</Text>
                      <Text style={[styles.shopCol, { color: '#9C27B0', fontWeight: '600' }]}>{fmt(sh.shipRevenue)}</Text>
                    </View>
                  );
                })}
                <View style={styles.shopTotal}>
                  <Ionicons name="storefront-outline" size={13} color={COLORS.gray} />
                  <Text style={styles.shopTotalLabel}>  Món: </Text>
                  <Text style={[styles.shopTotalVal, { color: '#FF9800' }]}>{formatCurrency(shopStats.reduce((s,x)=>s+x.foodRevenue,0))}</Text>
                  <Text style={styles.shopTotalLabel}>  Sàn: </Text>
                  <Text style={[styles.shopTotalVal, { color: '#E91E63' }]}>{formatCurrency(shopStats.reduce((s,x)=>s+x.platformRevenue,0))}</Text>
                  <Text style={styles.shopTotalLabel}>  Ship: </Text>
                  <Text style={[styles.shopTotalVal, { color: '#9C27B0' }]}>{formatCurrency(shopStats.reduce((s,x)=>s+x.shipRevenue,0))}</Text>
                </View>
              </View>
            )}

            {/* Bảng lương từng shipper */}
            {shipperStats.length > 0 && (
              <View style={styles.shipperCard}>
                <View style={styles.topHeader}>
                  <Ionicons name="bicycle-outline" size={17} color="#FF9800" />
                  <Text style={styles.topTitle}>Lương shipper kỳ này</Text>
                </View>
                <View style={styles.shipperTableHead}>
                  <Text style={[styles.shipperCol, { flex: 2 }]}>Shipper</Text>
                  <Text style={styles.shipperCol}>Đơn</Text>
                  <Text style={styles.shipperCol}>Ship</Text>
                  <Text style={[styles.shipperCol, { color: '#F44336' }]}>Lương</Text>
                </View>
                {shipperStats.map(sh => (
                  <View key={sh.id} style={styles.shipperRow}>
                    <Text style={[styles.shipperCol, { flex: 2, color: COLORS.dark, fontWeight: '600' }]} numberOfLines={1}>{sh.name}</Text>
                    <Text style={styles.shipperCol}>{sh.orders}</Text>
                    <Text style={styles.shipperCol}>{formatCurrency(sh.shipFee)}</Text>
                    <Text style={[styles.shipperCol, { color: '#F44336', fontWeight: 'bold' }]}>{formatCurrency(Math.round(sh.shipFee * SHIPPER_RATIO))}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Bar chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Biểu đồ doanh thu</Text>
          {totalRevenue === 0 ? (
            <View style={styles.emptyChart}>
              <Ionicons name="bar-chart-outline" size={40} color={COLORS.lightGray} />
              <Text style={{ color: COLORS.gray, marginTop: 8, fontSize: 13 }}>Chưa có đơn hàng trong kỳ này</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chartArea}>
                {bars.map((b, i) => {
                  const heightPct = b.total / maxBar;
                  const barH = Math.max(heightPct * 140, b.total > 0 ? 4 : 0);
                  return (
                    <View key={i} style={styles.barWrapper}>
                      {b.total > 0 && (
                        <Text style={styles.barTopVal} numberOfLines={1}>
                          {b.total >= 1000000
                            ? (b.total / 1000000).toFixed(1) + 'M'
                            : b.total >= 1000
                            ? Math.round(b.total / 1000) + 'k'
                            : b.total}
                        </Text>
                      )}
                      <View style={styles.barTrack}>
                        <View style={[styles.bar, { height: barH, backgroundColor: accentColor }]} />
                      </View>
                      {showLabel(i) && <Text style={styles.barLabel}>{b.label}</Text>}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Top items */}
        {topItems.length > 0 && (
          <View style={styles.topCard}>
            <View style={styles.topHeader}>
              <Ionicons name="trophy-outline" size={17} color="#FF9800" />
              <Text style={styles.topTitle}>Top món bán chạy</Text>
            </View>
            {topItems.map((item, i) => (
              <View key={item.name} style={styles.topRow}>
                <View style={[styles.rankBadge, { backgroundColor: i < 3 ? '#FF9800' : '#E0E0E0' }]}>
                  <Text style={[styles.rankText, { color: i < 3 ? '#fff' : '#888' }]}>#{i + 1}</Text>
                </View>
                <Text style={styles.topItemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.topItemQty}>{item.qty} phần</Text>
                <Text style={[styles.topItemRev, { color: accentColor }]}>{formatCurrency(item.revenue)}</Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 16, paddingTop: 52 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  periodRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    margin: 12, borderRadius: 14, padding: 4, elevation: 2,
  },
  periodTab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  periodText: { fontSize: 14, color: COLORS.gray },
  navRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 10 },
  navBtn: { padding: 6 },
  navBtnDisabled: { opacity: 0.3 },
  navLabel: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 'bold', color: COLORS.dark },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderTopWidth: 3, elevation: 2,
  },
  summaryLabel: { fontSize: 11, color: COLORS.gray, marginBottom: 6 },
  summaryVal: { fontSize: 16, fontWeight: 'bold' },
  chartCard: { backgroundColor: '#fff', margin: 12, borderRadius: 14, padding: 16, elevation: 2, marginTop: 4 },
  chartTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark, marginBottom: 14 },
  emptyChart: { alignItems: 'center', paddingVertical: 24 },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 4, minHeight: 180 },
  barWrapper: { alignItems: 'center', marginHorizontal: 3, minWidth: 28 },
  barTrack: { width: 22, height: 140, justifyContent: 'flex-end' },
  bar: { width: 22, borderRadius: 6, minHeight: 0 },
  barTopVal: { fontSize: 8, color: COLORS.gray, marginBottom: 2, textAlign: 'center', width: 32 },
  barLabel: { fontSize: 9, color: COLORS.gray, marginTop: 4, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.dark },
  shipperCard: { backgroundColor: '#fff', margin: 12, borderRadius: 14, padding: 14, elevation: 2, marginTop: 0 },
  shipperTableHead: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#EEE', marginBottom: 4 },
  shipperRow: { flexDirection: 'row', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F5F5F5', alignItems: 'center' },
  shipperCol: { flex: 1, fontSize: 12, color: COLORS.gray, textAlign: 'center' },
  shopCard: { backgroundColor: '#fff', margin: 12, borderRadius: 14, padding: 14, elevation: 2, marginTop: 0 },
  shopTableHead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#EEE', marginBottom: 4 },
  shopRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F5F5F5', gap: 4 },
  shopCol: { flex: 1, fontSize: 12, color: COLORS.gray, textAlign: 'center' },
  shopRank: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  shopTotal: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, marginTop: 6, borderTopWidth: 1, borderTopColor: '#EEE' },
  shopTotalLabel: { fontSize: 12, color: COLORS.gray },
  shopTotalVal: { fontSize: 14, fontWeight: 'bold' },
  topCard: { backgroundColor: '#fff', margin: 12, borderRadius: 14, padding: 14, elevation: 2, marginTop: 0 },
  topHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  topTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  rankBadge: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 11, fontWeight: 'bold' },
  topItemName: { flex: 1, fontSize: 13, color: COLORS.dark },
  topItemQty: { fontSize: 12, color: COLORS.gray, marginRight: 4 },
  topItemRev: { fontSize: 13, fontWeight: 'bold' },
});
