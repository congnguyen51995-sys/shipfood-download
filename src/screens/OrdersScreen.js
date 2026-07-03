import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, COLORS } from '../utils/format';
import { Ionicons } from '@expo/vector-icons';

const STATUS_COLORS = {
  'Đang xử lý': '#FFC107',
  'Đang giao': '#2196F3',
  'Đã giao': '#4CAF50',
  'Đã hủy': '#F44336',
};

const STATUS_ICONS = {
  'Đang xử lý': 'time-outline',
  'Đang giao': 'bicycle-outline',
  'Đã giao': 'checkmark-circle-outline',
  'Đã hủy': 'close-circle-outline',
};

export default function OrdersScreen({ navigation }) {
  const { orders, updateOrderStatus } = useApp();

  const renderOrder = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('OrderDetail', { order: item })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.orderIdRow}>
          <Ionicons name="receipt-outline" size={16} color={COLORS.primary} />
          <Text style={styles.orderId}>#{item.id.slice(-6)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
          <Ionicons name={STATUS_ICONS[item.status]} size={14} color={STATUS_COLORS[item.status]} />
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.itemsList}>
        {item.items.slice(0, 2).map((food, idx) => (
          <Text key={idx} style={styles.foodItem}>
            • {food.name} x{food.quantity}
          </Text>
        ))}
        {item.items.length > 2 && (
          <Text style={styles.moreItems}>+{item.items.length - 2} món khác</Text>
        )}
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.gray} />
          <Text style={styles.addressText} numberOfLines={1}>{item.deliveryAddress}</Text>
        </View>
        <Text style={styles.total}>{formatCurrency(item.total + 15000)}</Text>
      </View>
      <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đơn hàng</Text>
        <Text style={styles.headerCount}>{orders.length} đơn</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={64} color={COLORS.lightGray} />
            <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>
            <Text style={styles.emptyDesc}>Đặt món ăn để xem đơn hàng tại đây</Text>
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.white },
  headerCount: { fontSize: 14, color: COLORS.secondary },
  list: { padding: 12, paddingBottom: 20 },
  card: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: 14,
    marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderIdRow: { flexDirection: 'row', alignItems: 'center' },
  orderId: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark, marginLeft: 4 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  itemsList: { marginBottom: 10 },
  foodItem: { fontSize: 13, color: COLORS.dark, marginBottom: 2 },
  moreItems: { fontSize: 12, color: COLORS.gray, fontStyle: 'italic' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addressRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  addressText: { fontSize: 12, color: COLORS.gray, marginLeft: 4, flex: 1 },
  total: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary },
  date: { fontSize: 11, color: COLORS.gray, marginTop: 6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark, marginTop: 16 },
  emptyDesc: { fontSize: 13, color: COLORS.gray, marginTop: 6, textAlign: 'center' },
});
