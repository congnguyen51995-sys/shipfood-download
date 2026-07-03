import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Modal, TextInput, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { COLORS } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';

export default function CustomerProfileScreen() {
  const { currentUser, logout, deleteUser, changePassword } = useAuth();
  const [passModal, setPassModal] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
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
  const { getUserOrders, restaurantInfo } = useApp();
  const orders = getUserOrders(currentUser.id);
  const delivered = orders.filter(o => o.status === 'Đã giao').length;

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Xóa tài khoản',
      'Toàn bộ dữ liệu tài khoản của bạn sẽ bị xóa vĩnh viễn. Bạn có chắc chắn muốn tiếp tục?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa tài khoản', style: 'destructive', onPress: async () => {
          try {
            await deleteUser(currentUser.id);
            await logout();
          } catch (e) {
            Alert.alert('Lỗi', 'Không thể xóa tài khoản. Vui lòng thử lại.');
          }
        }},
      ]
    );
  };

  const callRestaurant = () => {
    Linking.openURL(`tel:${restaurantInfo.phone}`);
  };

  const openRestaurantMap = () => {
    const encoded = encodeURIComponent(restaurantInfo.address);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tài khoản</Text>
      </View>

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

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{currentUser.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{currentUser.name}</Text>
          <Text style={styles.email}>{currentUser.phone || ''}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="person-outline" size={13} color={COLORS.primary} />
            <Text style={styles.roleText}>Khách hàng</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{orders.length}</Text>
            <Text style={styles.statLabel}>Đơn đã đặt</Text>
          </View>
          <View style={[styles.statCard, { borderLeftWidth: 1, borderLeftColor: COLORS.lightGray }]}>
            <Text style={styles.statNum}>{delivered}</Text>
            <Text style={styles.statLabel}>Đã nhận</Text>
          </View>
          <View style={[styles.statCard, { borderLeftWidth: 1, borderLeftColor: COLORS.lightGray }]}>
            <Text style={styles.statNum}>{orders.filter(o => o.status === 'Chờ xác nhận' || o.status === 'Đang giao').length}</Text>
            <Text style={styles.statLabel}>Đang giao</Text>
          </View>
        </View>

        {/* Thông tin nhà hàng */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="storefront-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Thông tin nhà hàng</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="restaurant-outline" size={16} color={COLORS.primary} />
            <Text style={styles.infoText}>{restaurantInfo.name}</Text>
          </View>

          <TouchableOpacity style={styles.infoRow} onPress={openRestaurantMap}>
            <Ionicons name="location-outline" size={16} color={COLORS.primary} />
            <Text style={[styles.infoText, styles.infoLink]}>{restaurantInfo.address}</Text>
            <Ionicons name="open-outline" size={13} color={COLORS.primary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.infoRow} onPress={callRestaurant}>
            <Ionicons name="call-outline" size={16} color={COLORS.primary} />
            <Text style={[styles.infoText, styles.infoLink]}>{restaurantInfo.phone}</Text>
          </TouchableOpacity>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={COLORS.primary} />
            <Text style={styles.infoText}>Mở cửa: {restaurantInfo.openTime} - {restaurantInfo.closeTime}</Text>
          </View>
        </View>

        {/* Tham gia */}
        <View style={styles.infoCard}>
          {currentUser.phone ? (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color={COLORS.primary} />
              <Text style={styles.infoText}>{currentUser.phone}</Text>
            </View>
          ) : null}
          <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: COLORS.lightGray }]}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Tham gia: {new Date(currentUser.createdAt).toLocaleDateString('vi-VN')}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.changePassBtn} onPress={() => { setOldPass(''); setNewPass(''); setConfirmPass(''); setPassModal(true); }}>
          <Ionicons name="key-outline" size={16} color={COLORS.primary} />
          <Text style={styles.changePassText}>Đổi mật khẩu</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.updateBtn} onPress={handleCheckUpdate} disabled={checkingUpdate}>
          {checkingUpdate
            ? <ActivityIndicator size="small" color="#FF6B35" />
            : <Ionicons name="cloud-download-outline" size={16} color="#FF6B35" />}
          <Text style={styles.updateBtnText}>{checkingUpdate ? 'Đang kiểm tra...' : 'Kiểm tra cập nhật'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
          <Text style={styles.deleteText}>Xóa tài khoản</Text>
        </TouchableOpacity>

        <View style={styles.versionBox}>
          <Text style={styles.versionText}>ShipFood Tiên Lục • v1.0.2</Text>
          {Updates.createdAt ? (
            <Text style={styles.versionSub}>
              OTA: {new Date(Updates.createdAt).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
            </Text>
          ) : null}
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, padding: 16, paddingTop: 52 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  avatarCard: { alignItems: 'center', padding: 24, backgroundColor: '#fff', margin: 12, borderRadius: 16, elevation: 3 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  name: { fontSize: 20, fontWeight: 'bold', color: COLORS.dark },
  email: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: COLORS.primary + '15', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleText: { color: COLORS.primary, fontSize: 13, fontWeight: '600', marginLeft: 4 },
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 12, borderRadius: 14, elevation: 2, marginBottom: 12 },
  statCard: { flex: 1, alignItems: 'center', padding: 16 },
  statNum: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  section: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 12, borderRadius: 14, elevation: 2, padding: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray, paddingBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark },
  infoCard: { backgroundColor: '#fff', marginHorizontal: 12, borderRadius: 14, elevation: 2, overflow: 'hidden', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  infoText: { fontSize: 14, color: COLORS.dark, flex: 1 },
  infoLink: { color: COLORS.primary, textDecorationLine: 'underline' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.danger, marginHorizontal: 16, marginTop: 4,
    padding: 15, borderRadius: 14, gap: 8,
  },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  changePassBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 16, marginTop: 10, paddingVertical: 10 },
  changePassText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  updateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 16, marginTop: 4, paddingVertical: 10 },
  updateBtnText: { color: '#FF6B35', fontSize: 13, fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 16, marginTop: 4, paddingVertical: 10 },
  deleteText: { color: COLORS.danger, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '88%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark, marginBottom: 16, textAlign: 'center' },
  modalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 6, marginTop: 10 },
  modalInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.lightGray, borderRadius: 12, paddingHorizontal: 12 },
  modalInput: { flex: 1, height: 46, fontSize: 15, color: COLORS.dark },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancel: { flex: 1, alignItems: 'center', padding: 13, borderRadius: 12, borderWidth: 1, borderColor: COLORS.lightGray },
  modalSave: { flex: 1, alignItems: 'center', padding: 13, borderRadius: 12, backgroundColor: COLORS.primary },
  versionBox: { alignItems: 'center', paddingVertical: 12 },
  versionText: { fontSize: 12, color: COLORS.gray },
  versionSub: { fontSize: 11, color: COLORS.lightGray, marginTop: 2 },
});
