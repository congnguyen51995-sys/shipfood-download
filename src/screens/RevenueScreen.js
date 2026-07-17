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
        .reduce((sum, o) => sum + calcFood(o) + (o.shippingFee || o.shipFee || 0), 0);
      bars.push({ label: `${i}`, total });
    }
  } else {
    const months = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(s.getFullYear(), m, 1, 0, 0, 0);
      const mEnd = new Date(s.getFullYear(), m + 1, 0, 23, 59, 59);
      const total = filtered
        .filter(o => { const t = toDate(o.createdAt); return t >= mStart && t <= mEnd; })
        .reduce((sum, o) => sum + calcFood(o) + (o.shippingFee || o.shipFee || 0), 0);
      bars.push({ label: months[m], total });
    }
  }
  return bars;
}

const PLATFORM_FEE = 2000;
const SHIPPER_RATIO = 0.8;

export default function RevenueScreen() {
  const { allOrders, linkedShops } = useApp();
  const { currentUser, isAdmin } = useAuth();
  const [period, setPeriod] = useState('Tháng');
  const [base, setBase] = useState(new Date());

  const shopId = isAdmin ? null : currentUser?.id;
  const accentColor = isAdmin ? COLORS.primary : '#2196F3';

  const s = useMemo(() => startOf(period, base), [period, base]);
  const e = useMemo(() => endOf(period, base), [period, base]);
  const isCurrentPeriod = new Date() >= s && new Date() <= e;

  const periodOrders = useMemo(() => {
    return allOrders.filter(o => {
      if (o.status !== 'Đã giao') return false;
      if (shopId) {
        // Tính cả đơn nhiều quán: kiểm tra order-level shopId hoặc items có shopId khớp
        const inItems = (o.items || []).some(i => i.shopId === shopId);
        if (o.shopId !== shopId && !inItems) return false;
      }
      const t = toDate(o.createdAt);
      return t >= s && t <= e;
    });
  }, [allOrders, shopId, s, e]);

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

  // Admin: thống kê từng shop — tính theo item.shopId để tránh gộp nhiều shop 1 đơn
  const calcItemsByShop = (items, targetShopId) => {
    if (!items || !items.length) return 0;
    return items
      .filter(i => targetShopId === '__platform__' ? !i.shopId : i.shopId === targetShopId)
      .reduce((s, i) => s + (i.price + (i.selectedToppings || []).reduce((t, tp) => t + tp.price, 0)) * (i.quantity || 1), 0);
  };

  const shopStats = useMemo(() => {
    if (!isAdmin) return [];
    const map = {};
    periodOrders.forEach(o => {
      const allItems = o.items || [];
      const shopIds = [...new Set(allItems.map(i => i.shopId || '__platform__'))];
      if (shopIds.length === 0) shopIds.push(o.shopId || '__platform__');
      shopIds.forEach(key => {
        const ls = key !== '__platform__' ? (linkedShops.find(s => s.userId === key) || linkedShops.find(s => s.id === key)) : null;
        const lsName = ls?.name || ls?.shopName || null;
        const name = key === '__platform__' ? 'ShipFood' : (lsName || allItems.find(i => i.shopId === key)?.shopName || key);
        if (!map[key]) map[key] = { id: key, name, orders: 0, foodRevenue: 0, platformRevenue: 0, shipRevenue: 0 };
        const itemFood = calcItemsByShop(allItems, key);
        if (itemFood > 0 || allItems.length === 0) {
          map[key].orders += 1;
          map[key].foodRevenue += itemFood || calcFood(o);
          map[key].platformRevenue += PLATFORM_FEE;
        }
      });
      // ship tính vào shop chính của đơn
      const shipKey = o.shopId || '__platform__';
      if (!map[shipKey]) { const lsShip = shipKey !== '__platform__' ? (linkedShops.find(s => s.userId === shipKey) || linkedShops.find(s => s.id === shipKey)) : null; const lsNShip = lsShip?.name || lsShip?.shopName || null; map[shipKey] = { id: shipKey, name: shipKey === '__platform__' ? 'ShipFood' : (lsNShip || o.shopName || shipKey), orders: 0, foodRevenue: 0, platformRevenue: 0, shipRevenue: 0 }; }
      map[shipKey].shipRevenue += (o.shippingFee || 0);
    });
    return Object.values(map).sort((a, b) => b.foodRevenue - a.foodRevenue);
  }, [periodOrders, isAdmin, linkedShops]);

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
      const qty = i.quantity || i.qty || 1;
      count[i.name].qty += qty;
      count[i.name].revenue += (i.price || 0) * qty;
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

  const fmtK = v => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : Math.round(v / 1000) + 'k';

  return (
    <View style={styles.container}>
      {/* Header + period + navigator */}
      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <Text style={styles.headerTitle}>📊 Doanh thu</Text>
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
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => setBase(shiftDate(period, base, -1))} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <Text style={styles.navLabel}>{periodLabel(period, base)}</Text>
          <TouchableOpacity
            style={[styles.navBtn, isCurrentPeriod && { opacity: 0.3 }]}
            onPress={() => !isCurrentPeriod && setBase(shiftDate(period, base, 1))}
          >
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

        {/* 4 số tổng quan */}
        <View style={styles.statsBlock}>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { borderLeftColor: accentColor }]}>
              <Text style={styles.statBoxLabel}>Tổng doanh thu</Text>
              <Text style={[styles.statBoxVal, { color: accentColor }]}>{formatCurrency(totalRevenue)}</Text>
            </View>
            <View style={[styles.statBox, { borderLeftColor: '#4CAF50' }]}>
              <Text style={styles.statBoxLabel}>Số đơn hoàn thành</Text>
              <Text style={[styles.statBoxVal, { color: '#4CAF50' }]}>{orderCount} đơn</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { borderLeftColor: '#FF9800' }]}>
              <Text style={styles.statBoxLabel}>Tiền món ăn</Text>
              <Text style={[styles.statBoxVal, { color: '#FF9800' }]}>{formatCurrency(foodRevenue)}</Text>
            </View>
            <View style={[styles.statBox, { borderLeftColor: '#9C27B0' }]}>
              <Text style={styles.statBoxLabel}>Phí ship thu</Text>
              <Text style={[styles.statBoxVal, { color: '#9C27B0' }]}>{formatCurrency(shipRevenue)}</Text>
            </View>
          </View>
        </View>

        {/* Biểu đồ */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>📈 Biểu đồ doanh thu</Text>
          {totalRevenue === 0 ? (
            <View style={styles.emptyChart}>
              <Ionicons name="bar-chart-outline" size={40} color={COLORS.lightGray} />
              <Text style={{ color: COLORS.gray, marginTop: 8, fontSize: 13 }}>Chưa có đơn hàng trong kỳ này</Text>
              <Text style={{ color: COLORS.gray, marginTop: 4, fontSize: 11 }}>
                (Tổng tất cả: {allOrders.filter(o => o.status === 'Đã giao').length} đơn đã giao / {allOrders.length} đơn)
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chartArea}>
                {bars.map((b, i) => {
                  const barH = Math.max((b.total / maxBar) * 140, b.total > 0 ? 4 : 0);
                  return (
                    <View key={i} style={styles.barWrapper}>
                      {b.total > 0 && (
                        <Text style={styles.barTopVal} numberOfLines={1}>
                          {b.total >= 1000000 ? (b.total/1000000).toFixed(1)+'M' : b.total >= 1000 ? Math.round(b.total/1000)+'k' : b.total}
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

        {/* Admin: lợi nhuận gọn */}
        {isAdmin && (
          <>
            <View style={styles.profitCard}>
              <View style={styles.profitHeader}>
                <Ionicons name="wallet-outline" size={17} color="#4CAF50" />
                <Text style={styles.profitTitle}>💰 Lợi nhuận của bạn</Text>
              </View>
              <View style={styles.profitRow}>
                <Text style={styles.profitLabel}>Phí sàn (2.000đ × {orderCount} đơn)</Text>
                <Text style={[styles.profitVal, { color: '#E91E63' }]}>{formatCurrency(platformFeeTotal)}</Text>
              </View>
              <View style={styles.profitRow}>
                <Text style={styles.profitLabel}>Ship thu được</Text>
                <Text style={[styles.profitVal, { color: '#9C27B0' }]}>{formatCurrency(shipRevenue)}</Text>
              </View>
              <View style={[styles.profitRow, styles.profitTotalRow]}>
                <Text style={styles.profitTotalLabel}>Tổng lãi kỳ này</Text>
                <Text style={styles.profitTotalVal}>{formatCurrency(platformFeeTotal + shipRevenue)}</Text>
              </View>
            </View>

            {/* Doanh thu từng shop */}
            {shopStats.length > 0 && (
              <View style={styles.tableCard}>
                <View style={styles.tableHeader}>
                  <Ionicons name="storefront-outline" size={17} color="#2196F3" />
                  <Text style={styles.tableTitle}>🏪 Doanh thu theo shop</Text>
                </View>
                <View style={styles.tableHead}>
                  <Text style={[styles.tc, { flex: 3, textAlign: 'left' }]}>Shop</Text>
                  <Text style={styles.tc}>Đơn</Text>
                  <Text style={[styles.tc, { color: '#FF9800' }]}>Món</Text>
                  <Text style={[styles.tc, { color: '#E91E63' }]}>Sàn</Text>
                  <Text style={[styles.tc, { color: '#9C27B0' }]}>Ship</Text>
                </View>
                {shopStats.map((sh, i) => (
                  <View key={sh.id} style={styles.tableRow}>
                    <View style={[styles.rankDot, { backgroundColor: i < 3 ? '#2196F3' : '#E0E0E0' }]}>
                      <Text style={{ fontSize: 9, fontWeight: 'bold', color: i < 3 ? '#fff' : '#999' }}>{i+1}</Text>
                    </View>
                    <Text style={[styles.tc, { flex: 3, color: COLORS.dark, fontWeight: '600', textAlign: 'left' }]} numberOfLines={1}>{sh.name}</Text>
                    <Text style={styles.tc}>{sh.orders}</Text>
                    <Text style={[styles.tc, { color: '#FF9800', fontWeight: '600' }]}>{fmtK(sh.foodRevenue)}</Text>
                    <Text style={[styles.tc, { color: '#E91E63', fontWeight: '600' }]}>{fmtK(sh.platformRevenue)}</Text>
                    <Text style={[styles.tc, { color: '#9C27B0', fontWeight: '600' }]}>{fmtK(sh.shipRevenue)}</Text>
                  </View>
                ))}
                <View style={styles.tableFoot}>
                  <Text style={[styles.tc, { flex: 3, textAlign: 'left', color: COLORS.dark, fontWeight: '700' }]}>Tổng</Text>
                  <Text style={styles.tc}>{shopStats.reduce((s,x)=>s+x.orders,0)}</Text>
                  <Text style={[styles.tc, { color: '#FF9800', fontWeight: '700' }]}>{fmtK(shopStats.reduce((s,x)=>s+x.foodRevenue,0))}</Text>
                  <Text style={[styles.tc, { color: '#E91E63', fontWeight: '700' }]}>{fmtK(shopStats.reduce((s,x)=>s+x.platformRevenue,0))}</Text>
                  <Text style={[styles.tc, { color: '#9C27B0', fontWeight: '700' }]}>{fmtK(shopStats.reduce((s,x)=>s+x.shipRevenue,0))}</Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* Top items */}
        {topItems.length > 0 && (
          <View style={styles.topCard}>
            <View style={styles.topHeader}>
              <Ionicons name="trophy-outline" size={17} color="#FF9800" />
              <Text style={styles.topTitle}>🏆 Top món bán chạy</Text>
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
  header: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  periodRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, padding: 3, marginBottom: 10 },
  periodTab: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 9 },
  periodTabActive: { backgroundColor: '#fff' },
  periodText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  periodTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  navRow: { flexDirection: 'row', alignItems: 'center' },
  navBtn: { padding: 4 },
  navLabel: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 'bold', color: '#fff' },
  statsBlock: { margin: 12, marginBottom: 4 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderLeftWidth: 4, elevation: 2,
  },
  statBoxLabel: { fontSize: 11, color: COLORS.gray, marginBottom: 6 },
  statBoxVal: { fontSize: 15, fontWeight: 'bold' },
  chartCard: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, borderRadius: 14, padding: 16, elevation: 2 },
  chartTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark, marginBottom: 14 },
  emptyChart: { alignItems: 'center', paddingVertical: 24 },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 4, minHeight: 180 },
  barWrapper: { alignItems: 'center', marginHorizontal: 3, minWidth: 28 },
  barTrack: { width: 22, height: 140, justifyContent: 'flex-end' },
  bar: { width: 22, borderRadius: 6 },
  barTopVal: { fontSize: 8, color: COLORS.gray, marginBottom: 2, textAlign: 'center', width: 32 },
  barLabel: { fontSize: 9, color: COLORS.gray, marginTop: 4, textAlign: 'center' },
  profitCard: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, borderRadius: 14, padding: 16, elevation: 2 },
  profitHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  profitTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark },
  profitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  profitLabel: { fontSize: 13, color: COLORS.gray },
  profitVal: { fontSize: 14, fontWeight: '600' },
  profitTotalRow: { backgroundColor: '#F8FFF8', borderRadius: 10, paddingHorizontal: 10, marginTop: 4 },
  profitTotalLabel: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark },
  profitTotalVal: { fontSize: 16, fontWeight: 'bold', color: '#4CAF50' },
  tableCard: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, borderRadius: 14, padding: 14, elevation: 2 },
  tableHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  tableTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#EEE', marginBottom: 2 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  tableFoot: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1.5, borderTopColor: '#DDD', marginTop: 2 },
  tc: { flex: 1, fontSize: 12, color: COLORS.gray, textAlign: 'center' },
  rankDot: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  topCard: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, borderRadius: 14, padding: 14, elevation: 2 },
  topHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  topTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  rankBadge: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 11, fontWeight: 'bold' },
  topItemName: { flex: 1, fontSize: 13, color: COLORS.dark },
  topItemQty: { fontSize: 12, color: COLORS.gray, marginRight: 4 },
  topItemRev: { fontSize: 13, fontWeight: 'bold' },
});
