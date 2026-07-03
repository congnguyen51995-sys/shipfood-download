import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ScrollView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { formatCurrency, COLORS } from '../utils/format';
import { Ionicons } from '@expo/vector-icons';

export default function CartScreen({ navigation }) {
  const { cart, cartTotal, addToCart, removeFromCart, clearCart, placeOrder, restaurantInfo, getItemTotalPrice } = useApp();
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');

  const handleOrder = () => {
    if (cart.length === 0) return Alert.alert('Giỏ hàng trống', 'Vui lòng thêm món ăn');
    if (!address.trim()) return Alert.alert('Thiếu địa chỉ', 'Vui lòng nhập địa chỉ giao hàng');

    Alert.alert(
      'Xác nhận đặt hàng',
      `Tổng tiền: ${formatCurrency(cartTotal + 15000)}\nGiao đến: ${address}`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đặt hàng',
          onPress: () => {
            const order = placeOrder(address, null);
            navigation.navigate('OrderDetail', { order });
          },
        },
      ]
    );
  };

  if (cart.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Giỏ hàng</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContent}>
          <Ionicons name="cart-outline" size={80} color={COLORS.lightGray} />
          <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
          <Text style={styles.emptyDesc}>Hãy thêm món ăn vào giỏ hàng</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.shopBtnText}>Tiếp tục mua sắm</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Giỏ hàng</Text>
        <TouchableOpacity onPress={() => Alert.alert('Xóa tất cả', 'Bạn có chắc?', [
          { text: 'Hủy' },
          { text: 'Xóa', style: 'destructive', onPress: clearCart },
        ])}>
          <Ionicons name="trash-outline" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cart Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Món đã chọn</Text>
          {cart.map((item) => (
            <View key={item.cartKey} style={styles.cartItem}>
              <View style={styles.cartItemInfo}>
                <Text style={styles.cartItemName}>{item.name}</Text>
                {item.selectedToppings && item.selectedToppings.length > 0 ? (
                  <View style={styles.toppingTags}>
                    {item.selectedToppings.map((t) => (
                      <View key={t.id} style={styles.toppingTag}>
                        <Text style={styles.toppingTagText}>+{t.name.replace('Thêm ', '')}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <Text style={styles.cartItemPrice}>{formatCurrency(item.price + (item.selectedToppings || []).reduce((s,t)=>s+t.price,0))}/món</Text>
              </View>
              <View style={styles.qtyControls}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.cartKey)}>
                  <Ionicons name="remove" size={16} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(item, item.selectedToppings)}>
                  <Ionicons name="add" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.cartItemTotal}>{formatCurrency(getItemTotalPrice(item))}</Text>
            </View>
          ))}
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="location-outline" size={16} color={COLORS.primary} /> Địa chỉ giao hàng
          </Text>
          <TextInput
            style={styles.addressInput}
            placeholder="Nhập địa chỉ giao hàng..."
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={2}
            placeholderTextColor={COLORS.gray}
          />
          <TouchableOpacity
            style={styles.mapBtn}
            onPress={() => navigation.navigate('LocationPicker', {
              onSelect: (loc) => setAddress(loc.address),
            })}
          >
            <Ionicons name="map-outline" size={16} color={COLORS.primary} />
            <Text style={styles.mapBtnText}>Chọn trên bản đồ</Text>
          </TouchableOpacity>
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ghi chú</Text>
          <TextInput
            style={styles.addressInput}
            placeholder="Ghi chú cho người giao hàng..."
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={2}
            placeholderTextColor={COLORS.gray}
          />
        </View>

        {/* Bill Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tóm tắt đơn hàng</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Tạm tính</Text>
            <Text style={styles.billValue}>{formatCurrency(cartTotal)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Phí giao hàng</Text>
            <Text style={styles.billValue}>{formatCurrency(15000)}</Text>
          </View>
          <View style={[styles.billRow, styles.billTotal]}>
            <Text style={styles.billTotalLabel}>Tổng cộng</Text>
            <Text style={styles.billTotalValue}>{formatCurrency(cartTotal + 15000)}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Order Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.orderBtn} onPress={handleOrder}>
          <Text style={styles.orderBtnText}>Đặt hàng • {formatCurrency(cartTotal + 15000)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  emptyContainer: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, padding: 16, paddingTop: 52,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.dark, marginTop: 16 },
  emptyDesc: { fontSize: 14, color: COLORS.gray, marginTop: 8 },
  shopBtn: {
    marginTop: 24, backgroundColor: COLORS.primary,
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24,
  },
  shopBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 15 },
  section: {
    backgroundColor: COLORS.white, margin: 12, borderRadius: 12, padding: 14,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark, marginBottom: 12 },
  cartItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 14, color: COLORS.dark, fontWeight: '500' },
  toppingTags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 3, gap: 4 },
  toppingTag: {
    backgroundColor: COLORS.primary + '20', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  toppingTagText: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
  cartItemPrice: { fontSize: 12, color: COLORS.gray, marginTop: 3 },
  qtyControls: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.lightGray, borderRadius: 20, marginHorizontal: 8,
  },
  qtyBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark, paddingHorizontal: 4 },
  cartItemTotal: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary, minWidth: 72, textAlign: 'right' },
  addressInput: {
    borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 10,
    padding: 10, fontSize: 14, color: COLORS.dark, minHeight: 60, textAlignVertical: 'top',
  },
  mapBtn: {
    flexDirection: 'row', alignItems: 'center', marginTop: 10,
    alignSelf: 'flex-start',
  },
  mapBtnText: { color: COLORS.primary, marginLeft: 4, fontSize: 13 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  billLabel: { color: COLORS.gray, fontSize: 14 },
  billValue: { color: COLORS.dark, fontSize: 14 },
  billTotal: {
    marginTop: 8, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: COLORS.lightGray,
  },
  billTotalLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.dark },
  billTotalValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: COLORS.white,
    borderTopWidth: 1, borderTopColor: COLORS.lightGray,
  },
  orderBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  orderBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
});
