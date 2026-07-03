import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Switch,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { COLORS, formatCurrency, getDistance, getShippingFee } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';

export default function ShopCreateOrderScreen({ navigation }) {
  const { placeShopOrder, restaurantInfo } = useApp();
  const { currentUser } = useAuth();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [note, setNote] = useState('');
  const [useManualKm, setUseManualKm] = useState(false);
  const [manualKm, setManualKm] = useState('');
  const [loading, setLoading] = useState(false);

  const shopLocation = currentUser.location || null;

  const distanceKm = (() => {
    if (useManualKm) {
      const v = parseFloat(manualKm);
      return isNaN(v) ? null : v;
    }
    if (deliveryLocation && shopLocation) {
      return getDistance(
        shopLocation.latitude, shopLocation.longitude,
        deliveryLocation.latitude, deliveryLocation.longitude,
      );
    }
    return null;
  })();

  const baseShippingFee = distanceKm !== null ? getShippingFee(distanceKm) : null;
  const shippingFee = baseShippingFee !== null ? baseShippingFee + 2000 : null;
  const outOfRange = baseShippingFee === null && distanceKm !== null;
  const isNightRate = new Date().getHours() >= 17;

  const handleSubmit = async () => {
    if (!customerName.trim()) return Alert.alert('Thiếu thông tin', 'Nhập tên khách');
    if (!customerPhone.trim()) return Alert.alert('Thiếu thông tin', 'Nhập SĐT khách');
    if (!deliveryAddress.trim()) return Alert.alert('Thiếu thông tin', 'Nhập địa chỉ giao');
    if (distanceKm === null) return Alert.alert('Thiếu khoảng cách', 'Ghim GPS khách hoặc nhập km thủ công');
    if (outOfRange) return Alert.alert('Ngoài vùng giao', 'Chỉ giao trong vòng 10 km');

    Alert.alert(
      'Xác nhận tạo đơn',
      `Khách: ${customerName}\nSĐT: ${customerPhone}\nGiao đến: ${deliveryAddress}\nKhoảng cách: ${distanceKm.toFixed(1)} km\nPhí ship: ${formatCurrency(shippingFee)}`,
      [
        { text: 'Hủy' },
        {
          text: 'Tạo đơn', onPress: async () => {
            setLoading(true);
            try {
              await placeShopOrder(
                currentUser.id,
                currentUser.shopName || currentUser.name,
                customerName.trim(),
                customerPhone.trim(),
                deliveryAddress.trim(),
                deliveryLocation,
                distanceKm,
                shippingFee,
                note.trim(),
              );
              Alert.alert('Đã tạo đơn! 🛵', 'Đơn đã gửi tới shipper.', [
                { text: 'OK', onPress: () => {
                  setCustomerName(''); setCustomerPhone('');
                  setDeliveryAddress(''); setDeliveryLocation(null);
                  setNote(''); setManualKm('');
                }},
              ]);
            } catch (e) {
              Alert.alert('Lỗi', e.message);
            }
            setLoading(false);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tạo đơn giao hàng</Text>
        <Text style={styles.headerSub}>{currentUser.shopName || currentUser.name}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Thông tin khách */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Thông tin khách hàng</Text>
          <Text style={styles.label}>Tên khách</Text>
          <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName}
            placeholder="Nguyễn Văn A" placeholderTextColor={COLORS.gray} />
          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput style={styles.input} value={customerPhone} onChangeText={setCustomerPhone}
            placeholder="0912345678" keyboardType="phone-pad" placeholderTextColor={COLORS.gray} />
        </View>

        {/* Địa chỉ giao */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Địa chỉ giao hàng</Text>
          <TextInput style={[styles.input, { minHeight: 56, textAlignVertical: 'top' }]}
            value={deliveryAddress} onChangeText={setDeliveryAddress}
            placeholder="Số nhà, đường, phường..." multiline
            placeholderTextColor={COLORS.gray} />

          <TouchableOpacity style={styles.gpsBtn} onPress={() =>
            navigation.navigate('LocationPicker', {
              onSelect: (loc) => {
                setDeliveryLocation(loc.location);
                setDeliveryAddress(loc.address || deliveryAddress);
              },
            })}>
            <Ionicons name="locate" size={15} color={COLORS.primary} />
            <Text style={styles.gpsBtnText}>
              {deliveryLocation ? '📍 Đã ghim GPS — Đổi vị trí' : 'Ghim GPS khách'}
            </Text>
          </TouchableOpacity>

          {deliveryLocation && (
            <View style={styles.gpsConfirm}>
              <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
              <Text style={styles.gpsConfirmText}>
                {deliveryLocation.latitude.toFixed(5)}, {deliveryLocation.longitude.toFixed(5)}
              </Text>
            </View>
          )}
        </View>

        {/* Khoảng cách */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📏 Khoảng cách & Phí ship</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Nhập km thủ công</Text>
            <Switch value={useManualKm} onValueChange={setUseManualKm}
              trackColor={{ true: COLORS.primary }} thumbColor="#fff" />
          </View>

          {useManualKm ? (
            <View style={styles.kmRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                value={manualKm} onChangeText={setManualKm}
                placeholder="VD: 3.5" keyboardType="decimal-pad"
                placeholderTextColor={COLORS.gray}
              />
              <Text style={styles.kmUnit}>km</Text>
            </View>
          ) : (
            <Text style={styles.kmHint}>
              {!shopLocation
                ? '⚠ Quán chưa có GPS — Nhập km thủ công hoặc cập nhật GPS quán trong hồ sơ'
                : !deliveryLocation
                ? 'Ghim GPS khách để tính tự động'
                : `${distanceKm?.toFixed(2)} km (tính từ GPS quán)`}
            </Text>
          )}

          {distanceKm !== null && (
            <View style={styles.feeBox}>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Khoảng cách</Text>
                <Text style={styles.feeVal}>{distanceKm.toFixed(1)} km</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Phí ship shipper nhận</Text>
                <Text style={[styles.feeVal, outOfRange && { color: COLORS.danger }]}>
                  {outOfRange ? 'Ngoài vùng (>10km)' : formatCurrency(shippingFee)}
                </Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Phụ phí dịch vụ</Text>
                <Text style={styles.feeVal}>+2.000đ</Text>
              </View>
              {isNightRate && !outOfRange && (
                <Text style={styles.nightNote}>🌙 Đã bao gồm phụ phí sau 17h: +5.000đ</Text>
              )}
            </View>
          )}
        </View>

        {/* Ghi chú */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Ghi chú</Text>
          <TextInput style={[styles.input, { minHeight: 56, textAlignVertical: 'top' }]}
            value={note} onChangeText={setNote} multiline
            placeholder="Ghi chú cho shipper..." placeholderTextColor={COLORS.gray} />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, (outOfRange || distanceKm === null || loading) && { backgroundColor: COLORS.gray }]}
          onPress={handleSubmit}
          disabled={outOfRange || distanceKm === null || loading}
        >
          <Ionicons name="send" size={18} color="#fff" />
          <Text style={styles.submitBtnText}>
            {loading ? 'Đang gửi...' : distanceKm !== null && !outOfRange
              ? `Gửi đơn — Ship: ${formatCurrency(shippingFee)}`
              : 'Gửi đơn cho Shipper'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: '#2196F3', padding: 16, paddingTop: 52 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  section: { backgroundColor: '#fff', margin: 12, borderRadius: 14, padding: 14, elevation: 2 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 10, padding: 12, fontSize: 15, color: COLORS.dark, backgroundColor: COLORS.background },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  gpsBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  gpsConfirm: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  gpsConfirmText: { fontSize: 11, color: '#4CAF50' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  switchLabel: { fontSize: 14, color: COLORS.dark },
  kmRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  kmUnit: { fontSize: 16, color: COLORS.dark, fontWeight: '600' },
  kmHint: { fontSize: 13, color: COLORS.gray, fontStyle: 'italic', marginBottom: 8 },
  feeBox: { backgroundColor: COLORS.background, borderRadius: 10, padding: 12, marginTop: 8 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  feeLabel: { fontSize: 13, color: COLORS.gray },
  feeVal: { fontSize: 13, fontWeight: 'bold', color: COLORS.dark },
  nightNote: { fontSize: 12, color: '#FF9800', marginTop: 4 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  submitBtn: { backgroundColor: '#2196F3', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
