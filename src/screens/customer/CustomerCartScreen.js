import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, Image,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, COLORS, getDistance, getShippingFee } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';

export default function CustomerCartScreen({ navigation }) {
  const { getCart, getCartTotal, getCartCount, addToCart, removeFromCart, clearCart, placeOrder, getItemTotalPrice, restaurantInfo, bankInfo, getUserOrders } = useApp();
  const { currentUser } = useAuth();
  const [address, setAddress] = useState('');
  const [savedLocation, setSavedLocation] = useState(null);
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [qrModal, setQrModal] = useState(null); // { orderId, amount }

  const cart = getCart(currentUser.id);
  const cartTotal = getCartTotal(currentUser.id);

  const FIRST_ORDER_DISCOUNT = 5000;
  const isFirstOrder = getUserOrders(currentUser.id).filter(o => o.status !== 'Đã hủy').length === 0;
  const discount = isFirstOrder ? FIRST_ORDER_DISCOUNT : 0;

  const distanceKm = savedLocation && restaurantInfo.location
    ? getDistance(
        restaurantInfo.location.latitude, restaurantInfo.location.longitude,
        savedLocation.latitude, savedLocation.longitude
      )
    : null;
  const shippingFee = distanceKm !== null ? getShippingFee(distanceKm) : getShippingFee(1);
  const outOfRange = shippingFee === null;
  const isNightRate = new Date().getHours() >= 17;
  const totalAmount = cartTotal + shippingFee - discount;

  const getQrUrl = (amount, orderId) => {
    if (!bankInfo?.bankId || !bankInfo?.accountNo) return null;
    const info = encodeURIComponent(`SF${orderId.slice(-6).toUpperCase()}`);
    const name = encodeURIComponent(bankInfo.accountName || 'ShipFood');
    return `https://img.vietqr.io/image/${bankInfo.bankId}-${bankInfo.accountNo}-compact2.png?amount=${amount}&addInfo=${info}&accountName=${name}`;
  };

  const handleOrder = () => {
    if (cart.length === 0) return Alert.alert('Giỏ hàng trống');
    if (!address.trim()) return Alert.alert('Thiếu địa chỉ', 'Vui lòng nhập địa chỉ giao hàng');
    if (outOfRange) return Alert.alert('Ngoài vùng giao hàng', 'Xin lỗi, chúng tôi chỉ giao trong phạm vi 10 km.');

    const payLabel = paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt khi nhận hàng';
    Alert.alert(
      'Xác nhận đặt hàng',
      `Tổng: ${formatCurrency(totalAmount)}${isFirstOrder ? `\n🎉 Đã giảm ${formatCurrency(discount)} đơn đầu tiên` : ''}\nPhí ship: ${formatCurrency(shippingFee)}${distanceKm !== null ? ` (${distanceKm.toFixed(1)}km)` : ''}${isNightRate ? ' · Có phụ phí 17h' : ''}\nGiao đến: ${address}\nThanh toán: ${payLabel}`,
      [
        { text: 'Hủy' },
        {
          text: 'Đặt ngay',
          onPress: async () => {
            const order = await placeOrder(
              currentUser.id, currentUser.name, currentUser.phone || '',
              address, savedLocation, note, shippingFee, distanceKm, paymentMethod
            );
            if (paymentMethod === 'transfer' && order) {
              setQrModal({ orderId: order.id, amount: totalAmount });
            } else {
              Alert.alert('Đặt hàng thành công! 🎉', 'Đơn hàng của bạn đã được gửi.', [
                { text: 'Xem đơn hàng', onPress: () => navigation.navigate('CustomerOrders') },
                { text: 'OK' },
              ]);
            }
          },
        },
      ]
    );
  };

  if (cart.length === 0 && !qrModal) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Giỏ hàng</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyWrap}>
          <Ionicons name="cart-outline" size={72} color={COLORS.lightGray} />
          <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.shopBtnText}>Chọn món ăn</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const qrUrl = qrModal ? getQrUrl(qrModal.amount, qrModal.orderId) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Giỏ hàng</Text>
        <TouchableOpacity onPress={() => Alert.alert('Xóa tất cả?', '', [
          { text: 'Hủy' }, { text: 'Xóa', style: 'destructive', onPress: () => clearCart(currentUser.id) },
        ])}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Món đã chọn</Text>
          {cart.map(item => (
            <View key={item.cartKey} style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{item.name}</Text>
                {item.selectedToppings?.length > 0 && (
                  <View style={styles.toppingTags}>
                    {item.selectedToppings.map(t => (
                      <View key={t.id} style={styles.tag}>
                        <Text style={styles.tagText}>+{t.name.replace('Thêm ', '')}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={styles.rowUnit}>{formatCurrency(item.price + (item.selectedToppings || []).reduce((s, t) => s + t.price, 0))}/món</Text>
              </View>
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(currentUser.id, item.cartKey)}>
                  <Ionicons name="remove" size={16} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(currentUser.id, item, item.selectedToppings)}>
                  <Ionicons name="add" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.rowTotal}>{formatCurrency(getItemTotalPrice(item))}</Text>
            </View>
          ))}
        </View>

        {/* Địa chỉ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Địa chỉ giao hàng</Text>
          <TextInput
            style={styles.textArea} placeholder="Nhập địa chỉ giao hàng..."
            value={address} onChangeText={setAddress}
            multiline numberOfLines={2} placeholderTextColor={COLORS.gray}
          />
          <TouchableOpacity style={styles.mapLink} onPress={() => navigation.navigate('LocationPicker', {
            onSelect: (loc) => { setAddress(loc.address); setSavedLocation(loc.location); },
          })}>
            <Ionicons name="locate" size={15} color={COLORS.primary} />
            <Text style={styles.mapLinkText}>
              {savedLocation ? '📍 GPS đã lưu — Đổi vị trí' : 'Lấy vị trí GPS chính xác'}
            </Text>
          </TouchableOpacity>
          {savedLocation && (
            <View style={styles.gpsInfo}>
              <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
              <Text style={styles.gpsInfoText}>
                Tọa độ: {savedLocation.latitude.toFixed(5)}, {savedLocation.longitude.toFixed(5)}
              </Text>
            </View>
          )}
        </View>

        {/* Ghi chú */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Ghi chú</Text>
          <TextInput
            style={styles.textArea} placeholder="Ghi chú cho người giao hàng..."
            value={note} onChangeText={setNote} multiline numberOfLines={2}
            placeholderTextColor={COLORS.gray}
          />
        </View>

        {/* Phương thức thanh toán */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Phương thức thanh toán</Text>
          <View style={[styles.payOption, styles.payOptionActive]}>
            <Ionicons name="cash-outline" size={22} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.payOptionTitle, { color: COLORS.primary }]}>Tiền mặt</Text>
              <Text style={styles.payOptionSub}>Trả khi nhận hàng</Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
          </View>
        </View>

        {/* Tổng bill */}
        <View style={styles.section}>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Tạm tính</Text>
            <Text style={styles.billVal}>{formatCurrency(cartTotal)}</Text>
          </View>
          {isFirstOrder && (
            <View style={styles.billRow}>
              <View style={styles.discountLabelRow}>
                <Text style={styles.discountLabel}>🎉 Giảm giá đơn đầu tiên</Text>
              </View>
              <Text style={styles.discountVal}>-{formatCurrency(discount)}</Text>
            </View>
          )}
          <View style={styles.billRow}>
            <View>
              <Text style={styles.billLabel}>Phí giao hàng</Text>
              {distanceKm !== null && !outOfRange && <Text style={styles.distanceNote}>{distanceKm.toFixed(1)} km từ quán</Text>}
              {distanceKm !== null && outOfRange && <Text style={[styles.distanceNote, { color: COLORS.danger, fontWeight: '600' }]}>⚠ {distanceKm.toFixed(1)} km — Ngoài vùng giao (tối đa 10 km)</Text>}
              {distanceKm === null && <Text style={styles.distanceNote}>Chọn GPS để tính chính xác</Text>}
              {isNightRate && !outOfRange && <Text style={[styles.distanceNote, { color: '#FF9800' }]}>🌙 Phụ phí sau 17h: +5.000đ</Text>}
            </View>
            <Text style={[styles.billVal, outOfRange && { color: COLORS.danger }]}>
              {outOfRange ? 'Không giao' : formatCurrency(shippingFee)}
            </Text>
          </View>
          {!outOfRange && (
            <View style={[styles.billRow, styles.billTotalRow]}>
              <Text style={styles.billTotalLabel}>Tổng cộng</Text>
              <Text style={styles.billTotalVal}>{formatCurrency(totalAmount)}</Text>
            </View>
          )}
        </View>
        <View style={{ height: 90 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.orderBtn, outOfRange && { backgroundColor: COLORS.gray }, paymentMethod === 'transfer' && !outOfRange && { backgroundColor: '#4CAF50' }]}
          onPress={handleOrder}
          disabled={outOfRange}
        >
          <Ionicons name={outOfRange ? 'ban-outline' : paymentMethod === 'transfer' ? 'qr-code-outline' : 'checkmark-circle-outline'} size={20} color="#fff" />
          <Text style={styles.orderBtnText}>
            {outOfRange ? 'Ngoài vùng giao hàng' : `Đặt hàng • ${formatCurrency(totalAmount)}`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* QR Modal */}
      <Modal visible={!!qrModal} transparent animationType="slide">
        <View style={styles.qrOverlay}>
          <View style={styles.qrBox}>
            <View style={styles.qrHeader}>
              <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
              <Text style={styles.qrTitle}>Đặt hàng thành công!</Text>
            </View>
            <Text style={styles.qrSub}>Chuyển khoản để xác nhận đơn hàng</Text>

            {qrUrl ? (
              <Image
                source={{ uri: qrUrl }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.qrNoBank}>
                <Ionicons name="alert-circle-outline" size={40} color={COLORS.gray} />
                <Text style={styles.qrNoBankText}>Chưa cấu hình tài khoản ngân hàng</Text>
              </View>
            )}

            {bankInfo?.accountNo && (
              <View style={styles.bankInfo}>
                <Text style={styles.bankName}>{bankInfo.bankName || bankInfo.bankId}</Text>
                <Text style={styles.bankAccount}>{bankInfo.accountNo}</Text>
                <Text style={styles.bankHolder}>{bankInfo.accountName}</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Số tiền:</Text>
                  <Text style={styles.amountVal}>{formatCurrency(qrModal?.amount || 0)}</Text>
                </View>
                <View style={styles.noteRow}>
                  <Text style={styles.noteLabel}>Nội dung CK:</Text>
                  <Text style={styles.noteVal}>SF{qrModal?.orderId?.slice(-6).toUpperCase()}</Text>
                </View>
              </View>
            )}

            <Text style={styles.qrWarn}>Đơn sẽ được giao sau khi admin xác nhận đã nhận tiền</Text>

            <TouchableOpacity
              style={styles.qrDoneBtn}
              onPress={() => {
                setQrModal(null);
                navigation.navigate('CustomerOrders');
              }}
            >
              <Text style={styles.qrDoneBtnText}>Đã chuyển khoản — Xem đơn hàng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, padding: 16, paddingTop: 52,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.dark, marginTop: 12 },
  shopBtn: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  shopBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  section: { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 14, elevation: 2 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '500', color: COLORS.dark },
  toppingTags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 3, gap: 4 },
  tag: { backgroundColor: COLORS.primary + '20', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  tagText: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
  rowUnit: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray, borderRadius: 20, marginHorizontal: 8 },
  qtyBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark, paddingHorizontal: 4 },
  rowTotal: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary, minWidth: 72, textAlign: 'right' },
  textArea: { borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 10, padding: 10, fontSize: 14, color: COLORS.dark, minHeight: 60, textAlignVertical: 'top' },
  mapLink: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  mapLinkText: { color: COLORS.primary, fontSize: 13, marginLeft: 4 },
  gpsInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  gpsInfoText: { fontSize: 11, color: '#4CAF50' },
  payOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.lightGray },
  payOptionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  payOptionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  payOptionSub: { fontSize: 11, color: COLORS.gray, marginTop: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: COLORS.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  billLabel: { color: COLORS.gray, fontSize: 14 },
  billVal: { color: COLORS.dark, fontSize: 14 },
  billTotalRow: { marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  distanceNote: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  billTotalLabel: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark },
  billTotalVal: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary },
  discountLabelRow: { flex: 1 },
  discountLabel: { fontSize: 13, color: '#4CAF50', fontWeight: '600' },
  discountVal: { fontSize: 14, fontWeight: 'bold', color: '#4CAF50' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  orderBtn: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  orderBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  // QR Modal
  qrOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  qrBox: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  qrHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  qrTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark },
  qrSub: { fontSize: 13, color: COLORS.gray, marginBottom: 16 },
  qrImage: { width: 220, height: 220, alignSelf: 'center', borderRadius: 12 },
  qrNoBank: { alignItems: 'center', paddingVertical: 20 },
  qrNoBankText: { color: COLORS.gray, fontSize: 13, marginTop: 8, textAlign: 'center' },
  bankInfo: { backgroundColor: '#F9F9F9', borderRadius: 12, padding: 14, marginTop: 14, gap: 4 },
  bankName: { fontSize: 13, fontWeight: 'bold', color: COLORS.dark },
  bankAccount: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 1 },
  bankHolder: { fontSize: 13, color: COLORS.gray },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#EEE' },
  amountLabel: { fontSize: 13, color: COLORS.gray },
  amountVal: { fontSize: 16, fontWeight: 'bold', color: '#4CAF50' },
  noteRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  noteLabel: { fontSize: 13, color: COLORS.gray },
  noteVal: { fontSize: 13, fontWeight: 'bold', color: COLORS.dark },
  qrWarn: { fontSize: 12, color: '#FF9800', textAlign: 'center', marginTop: 12 },
  qrDoneBtn: { marginTop: 14, backgroundColor: '#4CAF50', borderRadius: 14, padding: 14, alignItems: 'center' },
  qrDoneBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
