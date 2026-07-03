import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Modal, ActivityIndicator, Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { COLORS } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import * as ImagePicker from 'expo-image-picker';

export default function ShopProfileScreen({ navigation }) {
  const { currentUser, logout, changePassword } = useAuth();
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
  const { linkedShops, updateLinkedShop } = useApp();
  const shopDoc = linkedShops.find(s => s.userId === currentUser.id);
  const [showEdit, setShowEdit] = useState(false);
  const [shopName, setShopName] = useState(currentUser.shopName || currentUser.name);
  const [shopPhone, setShopPhone] = useState(currentUser.phone || '');
  const [shopDescription, setShopDescription] = useState(shopDoc?.description || '');
  const [shopAvatar, setShopAvatar] = useState(shopDoc?.avatar || null);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép truy cập ảnh.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setShopAvatar('data:image/jpeg;base64,' + result.assets[0].base64);
    }
  };

  const handleSaveProfile = async () => {
    const updated = { ...currentUser, shopName, phone: shopPhone };
    await AsyncStorage.setItem('current_user', JSON.stringify(updated));
    if (shopDoc) {
      await updateLinkedShop(shopDoc.id, { name: shopName, phone: shopPhone, description: shopDescription, avatar: shopAvatar || null });
    }
    Alert.alert('Đã lưu', 'Thông tin quán đã được cập nhật.');
    setShowEdit(false);
  };

  const handlePinGPS = () => {
    navigation.navigate('LocationPicker', {
      onSelect: async (loc) => {
        const updated = { ...currentUser, location: loc.location, address: loc.address };
        await AsyncStorage.setItem('current_user', JSON.stringify(updated));
        // Đồng bộ lên linkedShops trong Firestore
        const shopDoc = linkedShops.find(s => s.userId === currentUser.id);
        if (shopDoc) {
          await updateLinkedShop(shopDoc.id, { location: loc.location, address: loc.address || shopDoc.address });
        }
        Alert.alert('Đã ghim GPS', 'Vị trí quán đã được lưu và đồng bộ.');
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hồ sơ Quán</Text>
      </View>
      <ScrollView>
        <View style={styles.card}>
          <View style={styles.avatar}>
            {shopDoc?.avatar
              ? <Image source={{ uri: shopDoc.avatar }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              : <Ionicons name="storefront" size={38} color="#fff" />}
          </View>
          <Text style={styles.shopName}>{currentUser.shopName || currentUser.name}</Text>
          {shopDoc?.description ? <Text style={styles.shopDesc}>{shopDoc.description}</Text> : null}
          <Text style={styles.shopPhone}>{currentUser.phone}</Text>
          <View style={styles.badge}>
            <Ionicons name="storefront-outline" size={13} color="#2196F3" />
            <Text style={styles.badgeText}>Shop liên kết</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Thông tin quán</Text>
            <TouchableOpacity onPress={() => setShowEdit(true)}>
              <Ionicons name="pencil-outline" size={18} color="#2196F3" />
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="storefront-outline" size={15} color="#2196F3" />
            <Text style={styles.infoText}>{currentUser.shopName || currentUser.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={15} color="#2196F3" />
            <Text style={styles.infoText}>{currentUser.phone}</Text>
          </View>

          {/* GPS quán */}
          <View style={styles.gpsBlock}>
            <View style={styles.gpsRow}>
              <Ionicons name="pin" size={15} color={currentUser.location ? '#4CAF50' : COLORS.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.gpsLabel}>GPS quán</Text>
                {currentUser.location ? (
                  <Text style={styles.gpsCoords}>
                    {currentUser.location.latitude.toFixed(5)}, {currentUser.location.longitude.toFixed(5)}
                  </Text>
                ) : (
                  <Text style={styles.gpsMissing}>Chưa ghim — cần ghim để tự tính km</Text>
                )}
              </View>
            </View>
            <TouchableOpacity style={styles.gpsPinBtn} onPress={handlePinGPS}>
              <Ionicons name="locate" size={14} color="#fff" />
              <Text style={styles.gpsPinBtnText}>
                {currentUser.location ? 'Cập nhật GPS' : 'Ghim GPS quán'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={() =>
          Alert.alert('Đăng xuất?', '', [
            { text: 'Hủy' },
            { text: 'Đăng xuất', style: 'destructive', onPress: logout },
          ])}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.changePassBtn} onPress={() => { setOldPass(''); setNewPass(''); setConfirmPass(''); setPassModal(true); }}>
          <Ionicons name="key-outline" size={16} color="#2196F3" />
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
      </ScrollView>

      <Modal visible={passModal} transparent animationType="fade" onRequestClose={() => setPassModal(false)}>
        <TouchableOpacity style={styles.passOverlay} activeOpacity={1} onPress={() => setPassModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.passBox}>
            <Text style={styles.passTitle}>Đổi mật khẩu</Text>
            {[
              { label: 'Mật khẩu hiện tại', val: oldPass, set: setOldPass, show: showOld, toggle: () => setShowOld(v => !v) },
              { label: 'Mật khẩu mới', val: newPass, set: setNewPass, show: showNew, toggle: () => setShowNew(v => !v) },
              { label: 'Xác nhận mật khẩu mới', val: confirmPass, set: setConfirmPass, show: showNew, toggle: () => setShowNew(v => !v) },
            ].map(f => (
              <View key={f.label}>
                <Text style={styles.passLabel}>{f.label}</Text>
                <View style={styles.passInputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color={COLORS.gray} style={{ marginRight: 8 }} />
                  <TextInput style={styles.passInput} value={f.val} onChangeText={f.set} secureTextEntry={!f.show} placeholderTextColor={COLORS.gray} placeholder="••••••" />
                  <TouchableOpacity onPress={f.toggle}>
                    <Ionicons name={f.show ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.gray} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <View style={styles.passBtns}>
              <TouchableOpacity style={styles.passCancel} onPress={() => setPassModal(false)}>
                <Text style={{ color: COLORS.gray, fontWeight: '600' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.passSave} onPress={handleChangePassword} disabled={passLoading}>
                {passLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Lưu</Text>}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowEdit(false)}>
            <Ionicons name="close" size={26} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Sửa thông tin quán</Text>
          <TouchableOpacity onPress={handleSaveProfile}>
            <Text style={styles.saveText}>Lưu</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* Avatar picker */}
          <TouchableOpacity style={styles.avatarPicker} onPress={pickAvatar}>
            {shopAvatar
              ? <Image source={{ uri: shopAvatar }} style={styles.avatarPickerImg} />
              : <View style={styles.avatarPickerPlaceholder}>
                  <Ionicons name="camera-outline" size={28} color={COLORS.gray} />
                  <Text style={{ color: COLORS.gray, fontSize: 12, marginTop: 4 }}>Chọn ảnh đại diện</Text>
                </View>}
            <View style={styles.avatarPickerBtn}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Tên quán</Text>
          <TextInput style={styles.fieldInput} value={shopName} onChangeText={setShopName} placeholderTextColor={COLORS.gray} />
          <Text style={styles.fieldLabel}>SĐT quán</Text>
          <TextInput style={styles.fieldInput} value={shopPhone} onChangeText={setShopPhone} keyboardType="phone-pad" placeholderTextColor={COLORS.gray} />
          <Text style={styles.fieldLabel}>Mô tả quán</Text>
          <TextInput
            style={[styles.fieldInput, { minHeight: 80, textAlignVertical: 'top' }]}
            value={shopDescription}
            onChangeText={setShopDescription}
            placeholder="Giới thiệu quán, món ngon, giờ mở cửa..."
            placeholderTextColor={COLORS.gray}
            multiline
          />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: '#2196F3', padding: 16, paddingTop: 52 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  card: { alignItems: 'center', backgroundColor: '#fff', margin: 12, borderRadius: 16, padding: 20, elevation: 3 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#2196F3', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  shopName: { fontSize: 20, fontWeight: 'bold', color: COLORS.dark },
  shopDesc: { fontSize: 13, color: COLORS.gray, marginTop: 4, textAlign: 'center', paddingHorizontal: 12 },
  shopPhone: { fontSize: 13, color: COLORS.gray, marginTop: 3 },
  badge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, gap: 4 },
  badgeText: { color: '#2196F3', fontSize: 13, fontWeight: '600' },
  section: { backgroundColor: '#fff', margin: 12, borderRadius: 14, padding: 14, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  infoText: { fontSize: 14, color: COLORS.dark },
  gpsBlock: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  gpsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  gpsLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  gpsCoords: { fontSize: 12, color: '#4CAF50', marginTop: 2 },
  gpsMissing: { fontSize: 12, color: COLORS.warning, marginTop: 2 },
  gpsPinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2196F3', borderRadius: 10, padding: 10 },
  gpsPinBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.danger, margin: 16, marginTop: 8, padding: 15, borderRadius: 14, gap: 8 },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  changePassBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 16, marginTop: 4, paddingVertical: 10 },
  changePassText: { color: '#2196F3', fontSize: 13, fontWeight: '600' },
  updateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 16, marginTop: 4, paddingVertical: 10 },
  updateBtnText: { color: '#FF6B35', fontSize: 13, fontWeight: '600' },
  versionBox: { alignItems: 'center', paddingVertical: 12, marginBottom: 16 },
  versionText: { fontSize: 12, color: '#999' },
  versionSub: { fontSize: 11, color: '#bbb', marginTop: 2 },
  passOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  passBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '88%' },
  passTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark, marginBottom: 16, textAlign: 'center' },
  passLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 6, marginTop: 10 },
  passInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.lightGray, borderRadius: 12, paddingHorizontal: 12 },
  passInput: { flex: 1, height: 46, fontSize: 15, color: COLORS.dark },
  passBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  passCancel: { flex: 1, alignItems: 'center', padding: 13, borderRadius: 12, borderWidth: 1, borderColor: COLORS.lightGray },
  passSave: { flex: 1, alignItems: 'center', padding: 13, borderRadius: 12, backgroundColor: '#2196F3' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 52, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark },
  saveText: { fontSize: 16, color: '#2196F3', fontWeight: 'bold' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginTop: 14, marginBottom: 6 },
  fieldInput: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: COLORS.lightGray, color: COLORS.dark },
  avatarPicker: { alignSelf: 'center', marginBottom: 8, position: 'relative' },
  avatarPickerImg: { width: 90, height: 90, borderRadius: 45 },
  avatarPickerPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  avatarPickerBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#2196F3', borderRadius: 12, padding: 5, borderWidth: 2, borderColor: '#fff' },
});
