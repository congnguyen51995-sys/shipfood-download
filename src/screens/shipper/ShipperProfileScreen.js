import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Linking, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { COLORS, formatCurrency } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';

export default function ShipperProfileScreen() {
  const { currentUser, logout, deleteUser, changePassword } = useAuth();
  const [passModal, setPassModal] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleChangePassword = async () => {
    if (!oldPass || !newPass || !confirmPass) return Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ');
    if (newPass.length < 6) return Alert.alert('Mật khẩu yếu', 'Mật khẩu mới phải ít nhất 6 ký tự');
    if (newPass !== confirmPass) return Alert.alert('Không khớp', 'Mật khẩu xác nhận không khớp');
    setPassLoading(true);
    try {
      await changePassword(currentUser.id, oldPass, newPass);
      setPassModal(false);
      setOldPass(''); setNewPass(''); setConfirmPass('');
      Alert.alert('Thành công', 'Mật khẩu đã được cập nhật');
    } catch (e) {
      Alert.alert('Lỗi', e.message);
    } finally { setPassLoading(false); }
  };
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const handleCheckUpdate = async () => {
    if (__DEV__) { Alert.alert('Thông báo', 'Không kiểm tra cập nhật trong chế độ dev.'); return; }
    setCheckingUpdate(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        Alert.alert('Có bản cập nhật mới!', 'Đang tải về và cài đặt...', [], { cancelable: false });
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } else {
        Alert.alert('Đã cập nhật', 'Bạn đang dùng phiên bản mới nhất.');
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể kiểm tra cập nhật. Vui lòng thử lại.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const { allOrders, linkedShops } = useApp();

  const myDelivered = allOrders.filter(o => o.status === 'Đã giao').length;
  const myDelivering = allOrders.filter(o => o.status === 'Đang giao').length;

  const openMaps = (shop) => {
    if (!shop.location) return Alert.alert('Chưa có GPS', 'Shop này chưa được ghim vị trí GPS.');
    const { latitude, longitude } = shop.location;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <Modal visible={passModal} transparent animationType="fade" onRequestClose={() => setPassModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPassModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
            {[
              { label: 'Mật khẩu hiện tại', val: oldPass, set: setOldPass, show: showOld, toggle: () => setShowOld(v => !v) },
              { label: 'Mật khẩu mới', val: newPass, set: setNewPass, show: showNew, toggle: () => setShowNew(v => !v) },
              { label: 'Xác nhận mật khẩu mới', val: confirmPass, set: setConfirmPass, show: showNew, toggle: () => setShowNew(v => !v) },
            ].map(f => (
              <View key={f.label}>
                <Text style={styles.modalLabel}>{f.label}</Text>
                <View style={styles.modalInputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color={COLORS.gray} style={{ marginRight: 8 }} />
                  <TextInput style={styles.modalInput} value={f.val} onChangeText={f.set} secureTextEntry={!f.show} placeholderTextColor={COLORS.gray} placeholder="••••••" />
                  <TouchableOpacity onPress={f.toggle}>
                    <Ionicons name={f.show ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.gray} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setPassModal(false)}>
                <Text style={{ color: COLORS.gray, fontWeight: '600' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleChangePassword} disabled={passLoading}>
                {passLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Lưu</Text>}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tài khoản Shipper</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>

      {/* Avatar */}
      <View style={styles.avatarCard}>
        <View style={styles.avatar}>
          <Ionicons name="bicycle" size={40} color="#fff" />
        </View>
        <Text style={styles.name}>{currentUser.name}</Text>
        <Text style={styles.phone}>{currentUser.phone}</Text>
        <View style={styles.badge}>
          <Ionicons name="bicycle-outline" size={13} color="#FF9800" />
          <Text style={styles.badgeText}>Shipper</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{myDelivering}</Text>
          <Text style={styles.statLabel}>Đang giao</Text>
        </View>
        <View style={[styles.statCard, { borderLeftWidth: 1, borderLeftColor: COLORS.lightGray }]}>
          <Text style={styles.statNum}>{myDelivered}</Text>
          <Text style={styles.statLabel}>Đã giao</Text>
        </View>
      </View>

      {/* Shop liên kết */}
      {linkedShops.length > 0 && (
        <View style={styles.shopSection}>
          <View style={styles.shopSectionHeader}>
            <Ionicons name="storefront" size={18} color="#2196F3" />
            <Text style={styles.shopSectionTitle}>Shop liên kết</Text>
          </View>
          <Text style={styles.shopSectionHint}>Đến đây lấy đồ ăn trước khi giao</Text>
          {linkedShops.map(shop => (
            <View key={shop.id} style={styles.shopCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.shopName}>{shop.name}</Text>
                {!!shop.phone && (
                  <View style={styles.shopRow}>
                    <Ionicons name="call-outline" size={12} color={COLORS.gray} />
                    <Text style={styles.shopInfo}>{shop.phone}</Text>
                  </View>
                )}
                {!!shop.address && (
                  <View style={styles.shopRow}>
                    <Ionicons name="location-outline" size={12} color={COLORS.gray} />
                    <Text style={styles.shopInfo} numberOfLines={2}>{shop.address}</Text>
                  </View>
                )}
                <View style={styles.shopRow}>
                  <Ionicons name="pin" size={12} color={shop.location ? '#4CAF50' : COLORS.warning} />
                  <Text style={[styles.shopInfo, { color: shop.location ? '#4CAF50' : COLORS.warning }]}>
                    {shop.location ? 'Đã có GPS' : 'Chưa có GPS'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.navBtn} onPress={() => openMaps(shop)}>
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={styles.navBtnText}>Đường đi</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Version */}
      <View style={styles.versionCard}>
        <Ionicons name="information-circle-outline" size={14} color={COLORS.gray} />
        <Text style={styles.versionText}>ShipFood Tiên Lục • v1.0.0</Text>
        {Updates.createdAt ? (
          <Text style={styles.versionSub}>
            Cập nhật: {new Date(Updates.createdAt).toLocaleDateString('vi-VN')}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={() =>
        Alert.alert('Đăng xuất', 'Xác nhận đăng xuất?', [
          { text: 'Hủy' },
          { text: 'Đăng xuất', style: 'destructive', onPress: logout },
        ])}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.changePassBtn} onPress={() => { setOldPass(''); setNewPass(''); setConfirmPass(''); setPassModal(true); }}>
        <Ionicons name="key-outline" size={16} color="#FF9800" />
        <Text style={styles.changePassText}>Đổi mật khẩu</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.updateBtn} onPress={handleCheckUpdate} disabled={checkingUpdate}>
        {checkingUpdate
          ? <ActivityIndicator size="small" color="#FF6B35" />
          : <Ionicons name="cloud-download-outline" size={16} color="#FF6B35" />}
        <Text style={styles.updateBtnText}>{checkingUpdate ? 'Đang kiểm tra...' : 'Kiểm tra cập nhật'}</Text>
      </TouchableOpacity>

      <View style={styles.versionBox}>
        <Text style={styles.versionText}>ShipFood v1.0.2</Text>
        {Updates.createdAt ? (
          <Text style={styles.versionSub}>
            OTA: {new Date(Updates.createdAt).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
          </Text>
        ) : (
          <Text style={styles.versionSub}>Chưa có OTA</Text>
        )}
      </View>

      <TouchableOpacity style={styles.deleteBtn} onPress={() =>
        Alert.alert('Xóa tài khoản', 'Toàn bộ dữ liệu tài khoản sẽ bị xóa vĩnh viễn. Bạn có chắc chắn?', [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Xóa tài khoản', style: 'destructive', onPress: async () => {
            try { await deleteUser(currentUser.id); await logout(); }
            catch { Alert.alert('Lỗi', 'Không thể xóa tài khoản. Vui lòng thử lại.'); }
          }},
        ])}>
        <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
        <Text style={styles.deleteText}>Xóa tài khoản</Text>
      </TouchableOpacity>
      <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: '#FF9800', padding: 16, paddingTop: 52 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  avatarCard: { alignItems: 'center', padding: 24, backgroundColor: '#fff', margin: 12, borderRadius: 16, elevation: 3 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FF9800', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  name: { fontSize: 20, fontWeight: 'bold', color: COLORS.dark },
  phone: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, gap: 4 },
  badgeText: { color: '#FF9800', fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 12, borderRadius: 14, elevation: 2, marginBottom: 12 },
  statCard: { flex: 1, alignItems: 'center', padding: 20 },
  statNum: { fontSize: 26, fontWeight: 'bold', color: '#FF9800' },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  versionCard: { alignItems: 'center', paddingVertical: 10, gap: 2 },
  versionText: { fontSize: 12, color: COLORS.gray },
  versionSub: { fontSize: 11, color: COLORS.lightGray },
  shopSection: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 12, borderRadius: 14, padding: 14, elevation: 2 },
  shopSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  shopSectionTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark },
  shopSectionHint: { fontSize: 12, color: COLORS.gray, marginBottom: 10 },
  shopCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F8FF', borderRadius: 12, padding: 12, marginTop: 6, gap: 10 },
  shopName: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark, marginBottom: 4 },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  shopInfo: { fontSize: 12, color: COLORS.gray, flex: 1 },
  navBtn: { backgroundColor: '#2196F3', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', gap: 4 },
  navBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.danger, margin: 16, padding: 15, borderRadius: 14, gap: 8 },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  changePassBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 16, marginTop: 4, paddingVertical: 10 },
  changePassText: { color: '#FF9800', fontSize: 13, fontWeight: '600' },
  updateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 16, marginTop: 4, paddingVertical: 10 },
  updateBtnText: { color: '#FF6B35', fontSize: 13, fontWeight: '600' },
  versionBox: { alignItems: 'center', paddingVertical: 12 },
  versionText: { fontSize: 12, color: '#999' },
  versionSub: { fontSize: 11, color: '#bbb', marginTop: 2 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 16, paddingVertical: 8 },
  deleteText: { color: COLORS.danger, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '88%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark, marginBottom: 16, textAlign: 'center' },
  modalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 6, marginTop: 10 },
  modalInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.lightGray, borderRadius: 12, paddingHorizontal: 12 },
  modalInput: { flex: 1, height: 46, fontSize: 15, color: COLORS.dark },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancel: { flex: 1, alignItems: 'center', padding: 13, borderRadius: 12, borderWidth: 1, borderColor: COLORS.lightGray },
  modalSave: { flex: 1, alignItems: 'center', padding: 13, borderRadius: 12, backgroundColor: '#FF9800' },
});
