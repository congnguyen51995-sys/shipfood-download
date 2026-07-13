import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ScrollView, TextInput, Modal,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { COLORS, formatCurrency, formatDate } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';

const ROLE_LABEL = { customer: 'Khách hàng', shipper: 'Shipper', shop: 'Shop' };
const ROLE_COLOR = { customer: '#9C27B0', shipper: '#FF9800', shop: '#2196F3' };
const ROLE_ICON = { customer: 'person-outline', shipper: 'bicycle-outline', shop: 'storefront-outline' };

const STATUS_COLOR = {
  'Chờ xác nhận': '#FFC107',
  'Đã xác nhận': '#2196F3',
  'Đang lấy hàng': '#9C27B0',
  'Đã lấy hàng': '#00BCD4',
  'Đang giao': '#FF9800',
  'Đã giao': '#4CAF50',
  'Đã hủy': '#9E9E9E',
};

export default function AdminUsersScreen() {
  const { getCustomers, deleteUser, resetPassword, getRegistrationCodes, addRegistrationCode, deleteRegistrationCode } = useAuth();
  const { allOrders } = useApp();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Tất cả');
  const [codes, setCodes] = useState([]);
  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newCodeType, setNewCodeType] = useState('shipper');
  const [resetModal, setResetModal] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPass, setNewPass] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [list, codeList] = await Promise.all([getCustomers(), getRegistrationCodes()]);
    setUsers(list.filter(u => u.role !== 'admin').sort((a, b) =>
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    ));
    setCodes(codeList.sort((a, b) => (a.type > b.type ? 1 : -1)));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  const handleAddCode = async () => {
    if (!newCode.trim()) return Alert.alert('Thiếu thông tin', 'Vui lòng nhập mã');
    try {
      const added = await addRegistrationCode(newCode, newCodeType);
      setCodes(prev => [...prev, added].sort((a, b) => (a.type > b.type ? 1 : -1)));
      setNewCode('');
      setCodeModalVisible(false);
    } catch (e) {
      Alert.alert('Lỗi', e.message);
    }
  };

  const handleDeleteCode = (item) => {
    if (item.usedBy) return Alert.alert('Không thể xóa', 'Mã này đã được sử dụng bởi ' + item.usedByName);
    Alert.alert('Xóa mã?', `Xóa mã "${item.code}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        await deleteRegistrationCode(item.id);
        setCodes(prev => prev.filter(c => c.id !== item.id));
      }},
    ]);
  };

  const handleReset = (user) => {
    setResetTarget(user);
    setNewPass('');
    setResetModal(true);
  };

  const confirmReset = async () => {
    if (!newPass.trim() || newPass.length < 6) return Alert.alert('Thiếu thông tin', 'Mật khẩu phải ít nhất 6 ký tự');
    try {
      await resetPassword(resetTarget.id, newPass.trim());
      setResetModal(false);
      Alert.alert('Thành công', `Đã đặt lại mật khẩu cho ${resetTarget.name}`);
    } catch { Alert.alert('Lỗi', 'Không thể đặt lại mật khẩu'); }
  };

  const handleDelete = (user) => {
    Alert.alert(
      'Xóa tài khoản?',
      `Xóa tài khoản "${user.name}"?\n\nHành động này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa', style: 'destructive',
          onPress: async () => {
            await deleteUser(user.id);
            setUsers(prev => prev.filter(u => u.id !== user.id));
          },
        },
      ]
    );
  };

  const filters = ['Tất cả', 'Khách hàng', 'Shipper', 'Shop'];
  const filterKey = { 'Khách hàng': 'customer', 'Shipper': 'shipper', 'Shop': 'shop' };

  const displayed = filter === 'Tất cả'
    ? users
    : users.filter(u => u.role === filterKey[filter]);

  // User stats
  const customerCount = users.filter(u => u.role === 'customer').length;
  const shipperCount = users.filter(u => u.role === 'shipper').length;
  const shopCount = users.filter(u => u.role === 'shop').length;

  // Platform stats (chỉ khách hàng đã đăng nhập ít nhất 1 lần)
  const customers = users.filter(u => u.role === 'customer');
  const iosCount = customers.filter(u => u.lastLoginPlatform === 'ios').length;
  const androidCount = customers.filter(u => u.lastLoginPlatform === 'android').length;
  const webCount = customers.filter(u => u.lastLoginPlatform === 'web').length;
  const unknownCount = customers.filter(u => !u.lastLoginPlatform).length;

  // Order stats
  const statusCounts = {};
  allOrders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });

  // Payment stats
  const deliveredOrders = allOrders.filter(o => o.status === 'Đã giao');
  const collectedOrders = deliveredOrders.filter(o => o.paymentReceived === true);
  const pendingOrders = deliveredOrders.filter(o => !o.paymentReceived);
  const collectedFee = collectedOrders.reduce((s, o) => s + (o.shippingFee || 0), 0);
  const pendingFee = pendingOrders.reduce((s, o) => s + (o.shippingFee || 0), 0);
  const totalRevenue = deliveredOrders.reduce((s, o) => s + (o.total || 0), 0);
  const totalShip = deliveredOrders.reduce((s, o) => s + (o.shippingFee || 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tài khoản & Báo cáo</Text>
        <TouchableOpacity onPress={load} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Modal đặt lại mật khẩu */}
      <Modal visible={resetModal} transparent animationType="fade" onRequestClose={() => setResetModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setResetModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <Text style={styles.modalTitle}>Đặt lại mật khẩu</Text>
            <Text style={styles.modalLabel}>{resetTarget?.name} — {resetTarget?.phone}</Text>
            <Text style={[styles.modalLabel, { color: COLORS.gray, fontWeight: '400', marginTop: 4 }]}>Mật khẩu mới</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ít nhất 6 ký tự"
              value={newPass}
              onChangeText={setNewPass}
              secureTextEntry
              placeholderTextColor={COLORS.gray}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setResetModal(false)}>
                <Text style={{ color: COLORS.gray, fontWeight: '600' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: '#FF9800' }]} onPress={confirmReset}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Đặt lại</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal tạo mã mới */}
      <Modal visible={codeModalVisible} transparent animationType="fade" onRequestClose={() => setCodeModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCodeModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <Text style={styles.modalTitle}>Tạo mã đăng ký mới</Text>

            <Text style={styles.modalLabel}>Loại tài khoản</Text>
            <View style={styles.typeRow}>
              {[{ key: 'shipper', label: 'Shipper', icon: 'bicycle-outline', color: '#FF9800' },
                { key: 'shop', label: 'Shop liên kết', icon: 'storefront-outline', color: '#2196F3' }]
                .map(t => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.typeBtn, newCodeType === t.key && { backgroundColor: t.color, borderColor: t.color }]}
                    onPress={() => setNewCodeType(t.key)}
                  >
                    <Ionicons name={t.icon} size={16} color={newCodeType === t.key ? '#fff' : t.color} />
                    <Text style={[styles.typeBtnText, newCodeType === t.key && { color: '#fff' }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.modalLabel}>Mã đăng ký</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="VD: SHIP001, SHOP2025..."
              value={newCode}
              onChangeText={t => setNewCode(t.toUpperCase())}
              autoCapitalize="characters"
              placeholderTextColor={COLORS.gray}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setCodeModalVisible(false)}>
                <Text style={{ color: COLORS.gray, fontWeight: '600' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleAddCode}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Tạo mã</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <FlatList
        data={displayed}
        keyExtractor={u => u.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={() => (
          <>
            {/* User count stats */}
            <View style={styles.statsRow}>
              {[
                { label: 'Khách hàng', count: customerCount, color: '#9C27B0', icon: 'people-outline' },
                { label: 'Shipper', count: shipperCount, color: '#FF9800', icon: 'bicycle-outline' },
                { label: 'Shop', count: shopCount, color: '#2196F3', icon: 'storefront-outline' },
              ].map(s => (
                <View key={s.label} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: s.color + '20' }]}>
                    <Ionicons name={s.icon} size={20} color={s.color} />
                  </View>
                  <Text style={[styles.statNum, { color: s.color }]}>{s.count}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Order breakdown */}
            <View style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Ionicons name="receipt-outline" size={17} color={COLORS.primary} />
                <Text style={styles.reportTitle}>Tổng quan đơn hàng</Text>
                <Text style={styles.reportTotal}>{allOrders.length} đơn</Text>
              </View>
              <View style={styles.statusGrid}>
                {['Chờ xác nhận', 'Đã xác nhận', 'Đang lấy hàng', 'Đã lấy hàng', 'Đang giao', 'Đã giao', 'Đã hủy'].map(st => (
                  <View key={st} style={styles.statusChip}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[st] }]} />
                    <Text style={styles.statusChipLabel}>{st}</Text>
                    <Text style={[styles.statusChipCount, { color: STATUS_COLOR[st] }]}>
                      {statusCounts[st] || 0}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Revenue breakdown */}
            <View style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Ionicons name="cash-outline" size={17} color="#4CAF50" />
                <Text style={styles.reportTitle}>Doanh thu (đơn đã giao)</Text>
              </View>
              <View style={styles.revenueRow}>
                <View style={styles.revenueItem}>
                  <Text style={styles.revenueItemLabel}>Tiền món ăn</Text>
                  <Text style={styles.revenueItemVal}>{formatCurrency(totalRevenue)}</Text>
                </View>
                <View style={styles.revenueDivider} />
                <View style={styles.revenueItem}>
                  <Text style={styles.revenueItemLabel}>Phí ship</Text>
                  <Text style={[styles.revenueItemVal, { color: '#1565C0' }]}>{formatCurrency(totalShip)}</Text>
                </View>
                <View style={styles.revenueDivider} />
                <View style={styles.revenueItem}>
                  <Text style={styles.revenueItemLabel}>Tổng cộng</Text>
                  <Text style={[styles.revenueItemVal, { color: '#2E7D32' }]}>{formatCurrency(totalRevenue + totalShip)}</Text>
                </View>
              </View>
            </View>

            {/* Payment tracking */}
            <View style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Ionicons name="wallet-outline" size={17} color="#FF9800" />
                <Text style={styles.reportTitle}>Thu tiền Ship từ Shipper</Text>
              </View>
              <View style={styles.paymentGrid}>
                <View style={[styles.paymentBlock, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="checkmark-circle-outline" size={22} color="#4CAF50" />
                  <Text style={styles.paymentBlockLabel}>Đã thu</Text>
                  <Text style={[styles.paymentBlockVal, { color: '#2E7D32' }]}>{formatCurrency(collectedFee)}</Text>
                  <Text style={styles.paymentBlockCount}>{collectedOrders.length} đơn</Text>
                </View>
                <View style={[styles.paymentBlock, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="time-outline" size={22} color="#FF9800" />
                  <Text style={styles.paymentBlockLabel}>Chưa thu</Text>
                  <Text style={[styles.paymentBlockVal, { color: '#E65100' }]}>{formatCurrency(pendingFee)}</Text>
                  <Text style={styles.paymentBlockCount}>{pendingOrders.length} đơn</Text>
                </View>
              </View>
            </View>

            {/* Nền tảng đăng nhập */}
            <View style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Ionicons name="phone-portrait-outline" size={17} color="#00BCD4" />
                <Text style={styles.reportTitle}>Nền tảng đăng nhập (khách)</Text>
              </View>
              <View style={styles.platformGrid}>
                {[
                  { label: 'iOS', count: iosCount, icon: 'logo-apple', color: '#333' },
                  { label: 'Android', count: androidCount, icon: 'logo-android', color: '#4CAF50' },
                  { label: 'Web', count: webCount, icon: 'globe-outline', color: '#2196F3' },
                  { label: 'Chưa rõ', count: unknownCount, icon: 'help-circle-outline', color: '#9E9E9E' },
                ].filter(p => p.count > 0 || p.label !== 'Chưa rõ').map(p => (
                  <View key={p.label} style={styles.platformItem}>
                    <View style={[styles.platformIcon, { backgroundColor: p.color + '20' }]}>
                      <Ionicons name={p.icon} size={20} color={p.color} />
                    </View>
                    <Text style={[styles.platformCount, { color: p.color }]}>{p.count}</Text>
                    <Text style={styles.platformLabel}>{p.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Mã đăng ký */}
            <View style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Ionicons name="key-outline" size={17} color="#9C27B0" />
                <Text style={styles.reportTitle}>Mã đăng ký Shipper / Shop</Text>
                <TouchableOpacity
                  style={styles.addCodeBtn}
                  onPress={() => setCodeModalVisible(true)}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.addCodeBtnText}>Tạo mã</Text>
                </TouchableOpacity>
              </View>
              {codes.length === 0 ? (
                <Text style={{ color: COLORS.gray, fontSize: 13, textAlign: 'center', paddingVertical: 10 }}>
                  Chưa có mã nào. Nhấn "Tạo mã" để thêm.
                </Text>
              ) : (
                codes.map(item => {
                  const isShipper = item.type === 'shipper';
                  const color = isShipper ? '#FF9800' : '#2196F3';
                  const used = !!item.usedBy;
                  return (
                    <View key={item.id} style={styles.codeRow}>
                      <View style={[styles.codeTypeBadge, { backgroundColor: color + '20' }]}>
                        <Ionicons name={isShipper ? 'bicycle-outline' : 'storefront-outline'} size={14} color={color} />
                        <Text style={[styles.codeTypeText, { color }]}>{isShipper ? 'Shipper' : 'Shop'}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.codeText}>{item.code}</Text>
                        {used ? (
                          <Text style={styles.codeUsedBy}>✅ {item.usedByName}</Text>
                        ) : (
                          <Text style={styles.codeUnused}>Chưa sử dụng</Text>
                        )}
                      </View>
                      {!used && (
                        <TouchableOpacity onPress={() => handleDeleteCode(item)} style={styles.deleteBtn}>
                          <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </View>

            {/* Filter tabs */}
            <View style={styles.sectionTitle}>
              <Text style={styles.sectionTitleText}>Danh sách tài khoản</Text>
            </View>
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              style={styles.filterWrap} contentContainerStyle={styles.filterContent}
            >
              {filters.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterTab, filter === f && styles.filterTabActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <View style={[styles.userAvatar, { backgroundColor: (ROLE_COLOR[item.role] || '#999') + '20' }]}>
              <Ionicons name={ROLE_ICON[item.role] || 'person-outline'} size={20} color={ROLE_COLOR[item.role] || '#999'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userPhone}>{item.phone}</Text>
              {item.role === 'shop' && item.shopName ? (
                <Text style={styles.userExtra}>🏪 {item.shopName}</Text>
              ) : null}
              {item.createdAt ? (
                <Text style={styles.userDate}>Đăng ký: {formatDate(item.createdAt)}</Text>
              ) : null}
              {item.lastLoginAt ? (
                <View style={styles.loginRow}>
                  {item.lastLoginPlatform === 'ios' && <Ionicons name="logo-apple" size={12} color="#333" />}
                  {item.lastLoginPlatform === 'android' && <Ionicons name="logo-android" size={12} color="#4CAF50" />}
                  {item.lastLoginPlatform === 'web' && <Ionicons name="globe-outline" size={12} color="#2196F3" />}
                  <Text style={styles.userDate}>
                    {item.lastLoginPlatform ? item.lastLoginPlatform.toUpperCase() + ' · ' : ''}
                    {formatDate(item.lastLoginAt)}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLOR[item.role] || '#999') + '20' }]}>
                <Text style={[styles.roleText, { color: ROLE_COLOR[item.role] || '#999' }]}>
                  {ROLE_LABEL[item.role] || item.role}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity onPress={() => handleReset(item)} style={styles.resetBtn}>
                  <Ionicons name="key-outline" size={16} color="#FF9800" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Ionicons name="people-outline" size={48} color={COLORS.lightGray} />
            <Text style={{ color: COLORS.gray, marginTop: 10, fontSize: 14 }}>
              {loading ? 'Đang tải...' : 'Không có tài khoản nào'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, padding: 16, paddingTop: 52, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: 'bold', color: '#fff' },
  refreshBtn: { padding: 4 },
  statsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', elevation: 2 },
  statIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  statNum: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2, textAlign: 'center' },
  reportCard: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 10, borderRadius: 14, padding: 14, elevation: 2 },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  reportTitle: { flex: 1, fontSize: 14, fontWeight: 'bold', color: COLORS.dark },
  reportTotal: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
  statusGrid: { gap: 6 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusChipLabel: { flex: 1, fontSize: 13, color: COLORS.dark },
  statusChipCount: { fontSize: 14, fontWeight: 'bold' },
  revenueRow: { flexDirection: 'row', alignItems: 'center' },
  revenueItem: { flex: 1, alignItems: 'center' },
  revenueItemLabel: { fontSize: 11, color: COLORS.gray, marginBottom: 4 },
  revenueItemVal: { fontSize: 13, fontWeight: 'bold', color: COLORS.dark },
  revenueDivider: { width: 1, height: 32, backgroundColor: COLORS.lightGray },
  paymentGrid: { flexDirection: 'row', gap: 10 },
  paymentBlock: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', gap: 4 },
  paymentBlockLabel: { fontSize: 12, color: COLORS.gray, fontWeight: '600' },
  paymentBlockVal: { fontSize: 16, fontWeight: 'bold' },
  paymentBlockCount: { fontSize: 11, color: COLORS.gray },
  sectionTitle: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 2 },
  sectionTitleText: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark },
  filterWrap: { maxHeight: 46, backgroundColor: '#fff', marginBottom: 2 },
  filterContent: { paddingHorizontal: 12, alignItems: 'center', gap: 6 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  filterTabActive: { backgroundColor: COLORS.primary },
  filterText: { fontSize: 13, color: COLORS.gray },
  filterTextActive: { color: '#fff', fontWeight: 'bold' },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 14, padding: 12, elevation: 2, gap: 10 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark },
  userPhone: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  userExtra: { fontSize: 12, color: '#2196F3', marginTop: 2 },
  userDate: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  roleText: { fontSize: 12, fontWeight: 'bold' },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.danger + '15', justifyContent: 'center', alignItems: 'center' },
  resetBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FF980020', justifyContent: 'center', alignItems: 'center' },
  addCodeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#9C27B0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  addCodeBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  codeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  codeTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  codeTypeText: { fontSize: 11, fontWeight: 'bold' },
  codeText: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark, letterSpacing: 1 },
  codeUsedBy: { fontSize: 12, color: '#4CAF50', marginTop: 2 },
  codeUnused: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  platformGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 4 },
  platformItem: { alignItems: 'center', gap: 4 },
  platformIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  platformCount: { fontSize: 20, fontWeight: 'bold' },
  platformLabel: { fontSize: 11, color: COLORS.gray },
  loginRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '88%' },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.dark, marginBottom: 16, textAlign: 'center' },
  modalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 8, marginTop: 8 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORS.lightGray, borderRadius: 12, padding: 10 },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  modalInput: { borderWidth: 1.5, borderColor: COLORS.lightGray, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 16, color: COLORS.dark, letterSpacing: 1, marginTop: 4 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancelBtn: { flex: 1, alignItems: 'center', padding: 13, borderRadius: 12, borderWidth: 1, borderColor: COLORS.lightGray },
  modalConfirmBtn: { flex: 1, alignItems: 'center', padding: 13, borderRadius: 12, backgroundColor: '#9C27B0' },
});
