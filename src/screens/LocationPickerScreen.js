import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, ScrollView, Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/format';

export default function LocationPickerScreen({ navigation, route }) {
  const { onSelect } = route.params || {};
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Tự động lấy GPS khi mở màn hình
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền vị trí', 'Cần cho phép truy cập vị trí trong Cài đặt');
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = loc.coords;
      setCoords({ latitude, longitude });

      // Đổi tọa độ → địa chỉ
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result.length > 0) {
        const r = result[0];
        const parts = [r.streetNumber, r.street, r.subregion || r.district, r.city].filter(Boolean);
        setAddress(parts.join(', '));
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lấy vị trí. Kiểm tra GPS đã bật chưa.');
    } finally {
      setLoading(false);
    }
  };

  const searchAddress = async () => {
    if (!searchText.trim()) return;
    setLoading(true);
    try {
      const results = await Location.geocodeAsync(searchText.trim());
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        setCoords({ latitude, longitude });
        // Reverse để lấy địa chỉ chuẩn
        const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (rev.length > 0) {
          const r = rev[0];
          const parts = [r.streetNumber, r.street, r.subregion || r.district, r.city].filter(Boolean);
          setAddress(parts.join(', ') || searchText.trim());
        } else {
          setAddress(searchText.trim());
        }
      } else {
        Alert.alert('Không tìm thấy', 'Thử nhập địa chỉ chi tiết hơn');
      }
    } catch {
      Alert.alert('Lỗi tìm kiếm', 'Không thể tìm địa chỉ này');
    } finally {
      setLoading(false);
    }
  };

  const previewOnMaps = () => {
    if (!coords) return Alert.alert('Chưa có vị trí', 'Hãy lấy vị trí GPS trước');
    const url = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
    Linking.openURL(url);
  };

  const handleConfirm = () => {
    if (!address.trim()) return Alert.alert('Chưa có địa chỉ', 'Vui lòng lấy vị trí hoặc nhập địa chỉ');
    if (onSelect) onSelect({ address: address.trim(), location: coords });
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chọn địa chỉ giao hàng</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Lấy vị trí GPS */}
        <TouchableOpacity style={styles.gpsBtn} onPress={getCurrentLocation} disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Ionicons name="locate" size={22} color={COLORS.primary} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.gpsBtnTitle}>📍 Dùng vị trí hiện tại (GPS)</Text>
            <Text style={styles.gpsBtnSub}>Lấy tọa độ chính xác từ điện thoại</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Tìm kiếm địa chỉ */}
        <Text style={styles.label}>Hoặc tìm kiếm địa chỉ</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="VD: 123 Nguyễn Huệ, Quận 1, HCM"
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor={COLORS.gray}
            onSubmitEditing={searchAddress}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={searchAddress} disabled={loading}>
            <Ionicons name="search" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Nhập địa chỉ thủ công */}
        <Text style={styles.label}>Địa chỉ giao hàng chi tiết</Text>
        <TextInput
          style={styles.addressInput}
          placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành..."
          value={address}
          onChangeText={(v) => { setAddress(v); }}
          multiline
          numberOfLines={3}
          placeholderTextColor={COLORS.gray}
        />

        {/* Hiển thị tọa độ đã lưu */}
        {coords && (
          <View style={styles.coordsCard}>
            <View style={styles.coordsRow}>
              <Ionicons name="pin" size={18} color={COLORS.primary} />
              <Text style={styles.coordsTitle}>Tọa độ GPS đã lưu</Text>
            </View>
            <Text style={styles.coordsText}>
              Vĩ độ: {coords.latitude.toFixed(6)}{'\n'}
              Kinh độ: {coords.longitude.toFixed(6)}
            </Text>
            <TouchableOpacity style={styles.previewBtn} onPress={previewOnMaps}>
              <Ionicons name="map" size={15} color={COLORS.primary} />
              <Text style={styles.previewBtnText}>Xem trên Google Maps</Text>
            </TouchableOpacity>
          </View>
        )}

        {!coords && (
          <View style={styles.noCoords}>
            <Ionicons name="warning-outline" size={18} color={COLORS.warning} />
            <Text style={styles.noCoordsText}>
              Chưa có tọa độ GPS. Nhấn "Dùng vị trí hiện tại" để lưu tọa độ chính xác cho người giao hàng.
            </Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Footer xác nhận */}
      <View style={styles.footer}>
        {address.trim().length > 0 && (
          <View style={styles.selectedBox}>
            <Ionicons name="location" size={16} color={COLORS.primary} />
            <Text style={styles.selectedText} numberOfLines={2}>{address}</Text>
            {coords && (
              <View style={styles.gpsDot}>
                <Text style={styles.gpsDotText}>GPS ✓</Text>
              </View>
            )}
          </View>
        )}
        <TouchableOpacity
          style={[styles.confirmBtn, !address.trim() && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!address.trim()}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.confirmBtnText}>Xác nhận địa chỉ này</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, padding: 16, paddingTop: 52,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  body: { flex: 1, padding: 16 },
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 2, borderColor: COLORS.primary,
    marginBottom: 16, gap: 12,
    elevation: 2,
  },
  gpsBtnTitle: { fontSize: 15, color: COLORS.primary, fontWeight: 'bold' },
  gpsBtnSub: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 8, marginTop: 4 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  searchInput: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10,
    paddingHorizontal: 12, height: 46,
    borderWidth: 1, borderColor: COLORS.lightGray,
    fontSize: 14, color: COLORS.dark,
  },
  searchBtn: {
    width: 46, height: 46, borderRadius: 10,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  addressInput: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.lightGray,
    fontSize: 14, color: COLORS.dark,
    minHeight: 80, textAlignVertical: 'top',
    marginBottom: 16,
  },
  coordsCard: {
    backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#A5D6A7', marginBottom: 12,
  },
  coordsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  coordsTitle: { fontSize: 14, fontWeight: 'bold', color: '#2E7D32' },
  coordsText: { fontSize: 13, color: '#388E3C', lineHeight: 20, marginBottom: 10 },
  previewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#fff', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.primary,
  },
  previewBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  noCoords: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFF8E1', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FFE082', gap: 8,
  },
  noCoordsText: { flex: 1, fontSize: 13, color: '#F57F17', lineHeight: 18 },
  footer: {
    backgroundColor: '#fff', padding: 16,
    borderTopWidth: 1, borderTopColor: COLORS.lightGray,
  },
  selectedBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: 10,
    padding: 10, marginBottom: 10, gap: 6,
  },
  selectedText: { flex: 1, fontSize: 13, color: COLORS.dark },
  gpsDot: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  gpsDotText: { fontSize: 11, color: '#2E7D32', fontWeight: 'bold' },
  confirmBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    padding: 15, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  confirmBtnDisabled: { backgroundColor: COLORS.gray },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
