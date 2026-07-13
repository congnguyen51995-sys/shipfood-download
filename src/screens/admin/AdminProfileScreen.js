import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { COLORS, formatCurrency } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';

const PERIOD_OPTIONS = [
  { key: 'day', label: 'Ngày' },
  { key: 'month', label: 'Tháng' },
  { key: 'year', label: 'Năm' },
];

function isSamePeriod(orderDate, period) {
  if (!orderDate) return false;
  const d = orderDate.toDate ? orderDate.toDate() : new Date(orderDate);
  const now = new Date();
  if (period === 'day') {
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  if (period === 'month') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  return d.getFullYear() === now.getFullYear();
}

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function AdminProfileScreen({ navigation }) {
  const { currentUser, logout, getCustomers, getShipperCodes, addShipperCode, deleteShipperCode, getShopCodes, addShopCode, deleteShopCode } = useAuth();
  const { restaurantInfo, setRestaurantInfo, setRestaurantInfoState, allOrders, menuItems, resetAllOrders, linkedShops, addLinkedShop, updateLinkedShop, deleteLinkedShop, bankInfo, setBankInfo, bannerText, setBannerText, adBanners, setAdBanners } = useApp();
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ ...restaurantInfo });
  const [showBankEdit, setShowBankEdit] = useState(false);
  const [bankForm, setBankForm] = useState({ bankId: '', accountNo: '', accountName: '', bankName: '' });
  const [showBannerEdit, setShowBannerEdit] = useState(false);
  const [bannerDraft, setBannerDraft] = useState('');
  const [showAdBannerModal, setShowAdBannerModal] = useState(false);
  const [adBannerForm, setAdBannerForm] = useState({ title: '', subtitle: '', bgColor: '#FF6B35' });
  const AD_COLORS = ['#FF6B35', '#E91E8C', '#1565C0', '#2E7D32', '#6A1B9A', '#E65100'];
  const [period, setPeriod] = useState('day');
  const [customerCount, setCustomerCount] = useState(0);
  const [checking, setChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [shipperCodes, setShipperCodes] = useState([]);
  const [shopCodes, setShopCodes] = useState([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [editingShop, setEditingShop] = useState(null); // null = thêm mới
  const [shopForm, setShopForm] = useState({ name: '', phone: '', address: '', location: null });

  useEffect(() => {
    getCustomers().then(list => setCustomerCount(list.filter(u => u.role === 'customer').length));
    loadCodes();
  }, []);

  const loadCodes = async () => {
    setCodesLoading(true);
    const [sc, shc] = await Promise.all([getShipperCodes(), getShopCodes()]);
    setShipperCodes(sc);
    setShopCodes(shc);
    setCodesLoading(false);
  };

  const handleGenCode = async () => {
    const code = genCode();
    const next = await addShipperCode(code);
    setShipperCodes(next);
    Alert.alert('Mã mới đã tạo', `Mã: ${code}\n\nGửi mã này cho shipper khi đăng ký tài khoản.`);
  };

  const handleDeleteCode = (code) => {
    Alert.alert('Xóa mã?', `Mã "${code}" sẽ không còn hoạt động.`, [
      { text: 'Hủy' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          const next = await deleteShipperCode(code);
          setShipperCodes(next);
        },
      },
    ]);
  };

  const handleGenShopCode = async () => {
    const code = genCode();
    const next = await addShopCode(code);
    setShopCodes(next);
    Alert.alert('Mã Shop mới', `Mã: ${code}\n\nGửi mã này cho shop liên kết khi đăng ký tài khoản.`);
  };

  const handleDeleteShopCode = (code) => {
    Alert.alert('Xóa mã shop?', `Mã "${code}" sẽ không còn hoạt động.`, [
      { text: 'Hủy' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          const next = await deleteShopCode(code);
          setShopCodes(next);
        },
      },
    ]);
  };

  const openAddShop = () => {
    setEditingShop(null);
    setShopForm({ name: '', phone: '', address: '', location: null });
    setShowShopModal(true);
  };

  const openEditShop = (shop) => {
    setEditingShop(shop);
    setShopForm({ name: shop.name, phone: shop.phone || '', address: shop.address || '', location: shop.location || null });
    setShowShopModal(true);
  };

  const handleSaveShop = async () => {
    if (!shopForm.name.trim()) return Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên quán');
    if (editingShop) {
      await updateLinkedShop(editingShop.id, shopForm);
    } else {
      await addLinkedShop(shopForm);
    }
    setShowShopModal(false);
  };

  const handleDeleteShop = (shop) => {
    Alert.alert('Xóa shop?', `Xóa "${shop.name}" khỏi danh sách liên kết?`, [
      { text: 'Hủy' },
      { text: 'Xóa', style: 'destructive', onPress: () => deleteLinkedShop(shop.id) },
    ]);
  };

  const handlePinShopGPS = () => {
    navigation.navigate('LocationPicker', {
      onSelect: (loc) => {
        setShopForm(f => ({ ...f, location: loc.location, address: loc.address || f.address }));
      },
    });
  };

  const checkUpdate = async () => {
    setChecking(true);
    setUpdateStatus(null);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        setUpdateStatus('available');
        Alert.alert('Có bản cập nhật mới!', 'Tải về và áp dụng ngay?', [
          { text: 'Để sau' },
          {
            text: 'Cập nhật ngay', onPress: async () => {
              await Updates.fetchUpdateAsync();
              await Updates.reloadAsync();
            }
          },
        ]);
      } else {
        setUpdateStatus('latest');
      }
    } catch (e) {
      setUpdateStatus('error');
    }
    setChecking(false);
  };

  const updateId = Updates.updateId;
  const channel = Updates.channel;
  const createdAt = Updates.createdAt;

  const deliveredOrders = allOrders.filter(o => o.status === 'Đã giao');
  const periodDelivered = deliveredOrders.filter(o => isSamePeriod(o.createdAt, period));
  const revenue = periodDelivered.reduce((s, o) => s + (o.total || 0), 0);
  const shipProfit = periodDelivered.reduce((s, o) => s + (o.shippingFee || 0), 0);

  const periodLabel = period === 'day' ? 'hôm nay' : period === 'month' ? 'tháng này' : 'năm nay';

  const handleSave = () => {
    if (!form.name.trim() || !form.address.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
    setRestaurantInfo(form);
    setShowEdit(false);
  };

  const stats = [
    { label: 'Tổng đơn', value: allOrders.length, icon: 'receipt-outline', color: '#2196F3' },
    { label: 'Đã giao', value: deliveredOrders.length, icon: 'checkmark-circle-outline', color: '#4CAF50' },
    { label: 'Món ăn', value: menuItems.length, icon: 'fast-food-outline', color: COLORS.primary },
    { label: 'Khách hàng', value: customerCount, icon: 'people-outline', color: '#9C27B0' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản trị viên</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Admin card */}
        <View style={styles.adminCard}>
          <View style={styles.adminAvatar}>
            <Ionicons name="shield-checkmark" size={36} color="#fff" />
          </View>
          <Text style={styles.adminName}>{currentUser.name}</Text>
          <Text style={styles.adminEmail}>{currentUser.email}</Text>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark-outline" size={13} color={COLORS.primary} />
            <Text style={styles.adminBadgeText}>Administrator</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {stats.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '20' }]}>
                <Ionicons name={s.icon} size={22} color={s.color} />
              </View>
              <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Revenue */}
        <View style={styles.revenueCard}>
          <View style={styles.revenueTop}>
            <Ionicons name="cash-outline" size={20} color="#4CAF50" />
            <Text style={styles.revenueLabel}>Doanh thu {periodLabel}</Text>
          </View>
          <Text style={styles.revenueVal}>{formatCurrency(revenue)}</Text>
          <View style={styles.shipProfitRow}>
            <Ionicons name="bicycle-outline" size={13} color="#388E3C" />
            <Text style={styles.shipProfitText}>Lợi nhuận ship {periodLabel}: {formatCurrency(shipProfit)}</Text>
          </View>
          {/* Period tabs */}
          <View style={styles.periodRow}>
            {PERIOD_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.periodBtn, period === opt.key && styles.periodBtnActive]}
                onPress={() => setPeriod(opt.key)}
              >
                <Text style={[styles.periodText, period === opt.key && styles.periodTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Reset toàn bộ đơn hàng */}
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() =>
              Alert.alert(
                'Xóa toàn bộ đơn hàng?',
                `Sẽ xóa tất cả ${allOrders.length} đơn hàng và doanh thu về 0. Không thể hoàn tác!`,
                [
                  { text: 'Hủy', style: 'cancel' },
                  {
                    text: 'Xóa tất cả', style: 'destructive',
                    onPress: async () => {
                      await resetAllOrders();
                      Alert.alert('Đã xóa', 'Toàn bộ đơn hàng đã được reset về 0.');
                    },
                  },
                ]
              )
            }
          >
            <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
            <Text style={styles.resetBtnText}>Reset toàn bộ đơn hàng & doanh thu</Text>
          </TouchableOpacity>
        </View>

        {/* Nhà hàng */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Thông tin nhà hàng</Text>
            <TouchableOpacity onPress={() => { setForm({...restaurantInfo}); setShowEdit(true); }}>
              <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          {[
            { icon: 'restaurant-outline', val: restaurantInfo.name },
            { icon: 'location-outline', val: restaurantInfo.address },
            { icon: 'call-outline', val: restaurantInfo.phone },
            { icon: 'time-outline', val: `${restaurantInfo.openTime} - ${restaurantInfo.closeTime}` },
          ].map((row, i) => (
            <View key={i} style={styles.infoRow}>
              <Ionicons name={row.icon} size={16} color={COLORS.primary} />
              <Text style={styles.infoText}>{row.val}</Text>
            </View>
          ))}

          {/* GPS quán */}
          <View style={styles.gpsBlock}>
            <View style={styles.gpsRow}>
              <Ionicons name="pin" size={16} color={restaurantInfo.location ? '#4CAF50' : COLORS.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.gpsLabel}>Vị trí GPS quán</Text>
                {restaurantInfo.location ? (
                  <Text style={styles.gpsCoords}>
                    {restaurantInfo.location.latitude.toFixed(5)}, {restaurantInfo.location.longitude.toFixed(5)}
                  </Text>
                ) : (
                  <Text style={styles.gpsMissing}>Chưa ghim vị trí GPS</Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.gpsPinBtn}
              onPress={() => navigation.navigate('LocationPicker', {
                onSelect: (loc) => {
                  const updated = { ...restaurantInfo, location: loc.location };
                  setRestaurantInfo(updated);
                },
              })}
            >
              <Ionicons name="locate" size={15} color="#fff" />
              <Text style={styles.gpsPinBtnText}>
                {restaurantInfo.location ? 'Cập nhật GPS quán' : 'Ghim vị trí GPS quán'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Banner quảng cáo slideshow */}
        <View style={styles.bannerCard}>
          <View style={styles.bankHeader}>
            <Ionicons name="images-outline" size={18} color="#E91E8C" />
            <Text style={[styles.bankTitle, { flex: 1 }]}>Banner quảng cáo</Text>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E91E8C', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}
              onPress={() => { setAdBannerForm({ title: '', subtitle: '', bgColor: '#FF6B35' }); setShowAdBannerModal(true); }}
            >
              <Ionicons name="add" size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Thêm</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.bannerPreview}>Hiện {(adBanners || []).filter(b => b.enabled).length}/{(adBanners || []).length} banner đang bật · Tự lướt 5 giây</Text>
          {(adBanners || []).map((b, i) => (
            <View key={b.id} style={styles.adBannerRow}>
              <View style={[styles.adBannerDot, { backgroundColor: b.bgColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.adBannerTitle} numberOfLines={1}>{b.title}</Text>
                <Text style={styles.adBannerSub} numberOfLines={1}>{b.subtitle}</Text>
              </View>
              <TouchableOpacity onPress={() => {
                const updated = adBanners.map((x, j) => j === i ? { ...x, enabled: !x.enabled } : x);
                setAdBanners(updated);
              }}>
                <Ionicons name={b.enabled ? 'eye-outline' : 'eye-off-outline'} size={20} color={b.enabled ? COLORS.primary : COLORS.gray} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                const updated = adBanners.filter((_, j) => j !== i);
                setAdBanners(updated);
              }} style={{ marginLeft: 8 }}>
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <Modal visible={showAdBannerModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Thêm banner quảng cáo</Text>
              <Text style={[styles.modalLabel, { marginBottom: 4, marginTop: 12 }]}>Tiêu đề (có thể dùng emoji)</Text>
              <TextInput
                style={styles.modalInput}
                value={adBannerForm.title}
                onChangeText={v => setAdBannerForm(f => ({ ...f, title: v }))}
                placeholder="VD: 🎉 Khuyến mãi cuối tuần"
                placeholderTextColor={COLORS.gray}
              />
              <Text style={[styles.modalLabel, { marginBottom: 4, marginTop: 10 }]}>Mô tả ngắn</Text>
              <TextInput
                style={styles.modalInput}
                value={adBannerForm.subtitle}
                onChangeText={v => setAdBannerForm(f => ({ ...f, subtitle: v }))}
                placeholder="VD: Giảm 10% cho đơn từ 50.000đ"
                placeholderTextColor={COLORS.gray}
              />
              <Text style={[styles.modalLabel, { marginBottom: 8, marginTop: 10 }]}>Màu nền</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {AD_COLORS.map(c => (
                  <TouchableOpacity key={c} onPress={() => setAdBannerForm(f => ({ ...f, bgColor: c }))}
                    style={[styles.colorDot, { backgroundColor: c }, adBannerForm.bgColor === c && styles.colorDotActive]} />
                ))}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAdBannerModal(false)}>
                  <Text style={styles.modalCancelText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSave} onPress={async () => {
                  if (!adBannerForm.title.trim()) return;
                  const newBanner = { id: Date.now().toString(), title: adBannerForm.title.trim(), subtitle: adBannerForm.subtitle.trim(), bgColor: adBannerForm.bgColor, enabled: true };
                  await setAdBanners([...(adBanners || []), newBanner]);
                  setShowAdBannerModal(false);
                }}>
                  <Text style={styles.modalSaveText}>Thêm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Shop liên kết */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="storefront" size={18} color="#2196F3" />
              <Text style={styles.sectionTitle}>Shop liên kết</Text>
            </View>
            <TouchableOpacity style={[styles.genBtn, { backgroundColor: '#2196F3' }]} onPress={openAddShop}>
              <Ionicons name="add-circle-outline" size={15} color="#fff" />
              <Text style={styles.genBtnText}>Thêm</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.codeHint}>Quán lấy hàng để shipper đến nhận và giao</Text>
          {linkedShops.length === 0 ? (
            <Text style={[styles.codeHint, { marginTop: 6 }]}>Chưa có shop nào. Nhấn "Thêm" để thêm.</Text>
          ) : linkedShops.map(shop => (
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
                    <Text style={styles.shopInfo} numberOfLines={1}>{shop.address}</Text>
                  </View>
                )}
                <View style={styles.shopRow}>
                  <Ionicons name="pin" size={12} color={shop.location ? '#4CAF50' : COLORS.warning} />
                  <Text style={[styles.shopInfo, { color: shop.location ? '#4CAF50' : COLORS.warning }]}>
                    {shop.location
                      ? `GPS: ${shop.location.latitude.toFixed(4)}, ${shop.location.longitude.toFixed(4)}`
                      : 'Chưa ghim GPS'}
                  </Text>
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <TouchableOpacity onPress={() => openEditShop(shop)} style={styles.shopActionBtn}>
                  <Ionicons name="pencil-outline" size={16} color="#2196F3" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteShop(shop)} style={styles.shopActionBtn}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Mã Shipper */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="bicycle" size={18} color="#FF9800" />
              <Text style={styles.sectionTitle}>Mã tuyển Shipper</Text>
            </View>
            <TouchableOpacity style={styles.genBtn} onPress={handleGenCode}>
              <Ionicons name="add-circle-outline" size={15} color="#fff" />
              <Text style={styles.genBtnText}>Tạo mã</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.codeHint}>Cấp mã này cho shipper khi đăng ký tài khoản</Text>
          {codesLoading ? (
            <Text style={[styles.codeHint, { marginTop: 8 }]}>Đang tải...</Text>
          ) : shipperCodes.length === 0 ? (
            <Text style={[styles.codeHint, { marginTop: 8 }]}>Chưa có mã nào. Nhấn "Tạo mã" để tạo.</Text>
          ) : (
            shipperCodes.map(code => (
              <View key={code} style={styles.codeRow}>
                <Ionicons name="key-outline" size={16} color="#FF9800" />
                <Text style={styles.codeText}>{code}</Text>
                <TouchableOpacity onPress={() => handleDeleteCode(code)} style={styles.codeDelBtn}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Mã Shop */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="storefront-outline" size={18} color="#2196F3" />
              <Text style={styles.sectionTitle}>Mã đăng ký Shop liên kết</Text>
            </View>
            <TouchableOpacity style={[styles.genBtn, { backgroundColor: '#2196F3' }]} onPress={handleGenShopCode}>
              <Ionicons name="add-circle-outline" size={15} color="#fff" />
              <Text style={styles.genBtnText}>Tạo mã</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.codeHint}>Cấp mã này cho shop liên kết khi đăng ký tài khoản</Text>
          {codesLoading ? (
            <Text style={[styles.codeHint, { marginTop: 8 }]}>Đang tải...</Text>
          ) : shopCodes.length === 0 ? (
            <Text style={[styles.codeHint, { marginTop: 8 }]}>Chưa có mã nào.</Text>
          ) : shopCodes.map(code => (
            <View key={code} style={[styles.codeRow, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="key-outline" size={16} color="#2196F3" />
              <Text style={[styles.codeText, { color: '#1565C0' }]}>{code}</Text>
              <TouchableOpacity onPress={() => handleDeleteShopCode(code)} style={styles.codeDelBtn}>
                <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Tài khoản ngân hàng - tạm ẩn */}
        {false && <View style={styles.bankCard}>
          <View style={styles.bankHeader}>
            <Ionicons name="qr-code-outline" size={18} color="#4CAF50" />
            <Text style={styles.bankTitle}>Tài khoản nhận chuyển khoản</Text>
            <TouchableOpacity onPress={() => { setBankForm({ ...bankInfo }); setShowBankEdit(true); }}>
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          {bankInfo?.accountNo ? (
            <>
              <Text style={styles.bankAccountNo}>{bankInfo.accountNo}</Text>
              <Text style={styles.bankAccountName}>{bankInfo.accountName}</Text>
              <Text style={styles.bankBankName}>{bankInfo.bankName || bankInfo.bankId}</Text>
            </>
          ) : (
            <TouchableOpacity onPress={() => { setBankForm({ bankId: '', accountNo: '', accountName: '', bankName: '' }); setShowBankEdit(true); }} style={styles.bankAddBtn}>
              <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
              <Text style={styles.bankAddText}>Thêm tài khoản ngân hàng</Text>
            </TouchableOpacity>
          )}
        </View>}

        {/* Modal sửa ngân hàng - tạm ẩn */}
        <Modal visible={false && showBankEdit} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Tài khoản ngân hàng</Text>
              {[
                { key: 'bankName', label: 'Tên ngân hàng', placeholder: 'VD: Vietcombank, MB Bank...' },
                { key: 'bankId', label: 'Mã ngân hàng (VietQR)', placeholder: 'VD: VCB, MBB, TCB...' },
                { key: 'accountNo', label: 'Số tài khoản', placeholder: 'Nhập số tài khoản' },
                { key: 'accountName', label: 'Tên chủ tài khoản', placeholder: 'NGUYEN VAN A' },
              ].map(f => (
                <View key={f.key} style={{ marginBottom: 10 }}>
                  <Text style={styles.modalLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={bankForm[f.key]}
                    onChangeText={v => setBankForm(p => ({ ...p, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor={COLORS.gray}
                    autoCapitalize={f.key === 'accountName' || f.key === 'bankId' ? 'characters' : 'none'}
                  />
                </View>
              ))}
              <Text style={styles.bankHint}>Mã VietQR tra tại vietqr.io/danh-sach-ngan-hang</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setShowBankEdit(false)}>
                  <Text style={styles.modalCancelText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSave} onPress={async () => {
                  await setBankInfo(bankForm);
                  setShowBankEdit(false);
                  Alert.alert('Đã lưu tài khoản ngân hàng');
                }}>
                  <Text style={styles.modalSaveText}>Lưu</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Version */}
        <View style={styles.versionCard}>
          <View style={styles.versionRow}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.gray} />
            <Text style={styles.versionLabel}>Phiên bản</Text>
            <Text style={styles.versionVal}>1.0.1</Text>
          </View>
          {updateId ? (
            <View style={styles.versionRow}>
              <Ionicons name="cloud-done-outline" size={16} color="#4CAF50" />
              <Text style={styles.versionLabel}>Cập nhật</Text>
              <Text style={styles.versionVal} numberOfLines={1}>
                {createdAt ? new Date(createdAt).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : updateId?.slice(0,8)}
              </Text>
            </View>
          ) : null}
          <TouchableOpacity style={styles.checkUpdateBtn} onPress={checkUpdate} disabled={checking}>
            <Ionicons
              name={checking ? 'sync' : updateStatus === 'latest' ? 'checkmark-circle' : 'refresh-circle-outline'}
              size={16}
              color={updateStatus === 'latest' ? '#4CAF50' : COLORS.primary}
            />
            <Text style={[styles.checkUpdateText, updateStatus === 'latest' && { color: '#4CAF50' }]}>
              {checking ? 'Đang kiểm tra...' : updateStatus === 'latest' ? 'Đang dùng bản mới nhất' : updateStatus === 'available' ? 'Có bản mới!' : 'Kiểm tra cập nhật'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.chatAdminBtn} onPress={() => navigation.navigate('AdminChat')}>
          <Ionicons name="chatbubbles-outline" size={20} color={COLORS.primary} />
          <Text style={styles.chatAdminBtnText}>Hỗ trợ khách hàng</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.gray} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={() =>
          Alert.alert('Đăng xuất', 'Xác nhận đăng xuất?', [
            { text: 'Hủy' },
            { text: 'Đăng xuất', style: 'destructive', onPress: logout },
          ])}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Shop Modal */}
      <Modal visible={showShopModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowShopModal(false)}>
            <Ionicons name="close" size={26} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{editingShop ? 'Sửa shop liên kết' : 'Thêm shop liên kết'}</Text>
          <TouchableOpacity onPress={handleSaveShop}>
            <Text style={styles.saveText}>Lưu</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ padding: 16 }}>
          {[
            { label: 'Tên quán *', key: 'name', placeholder: 'VD: Quán cơm Bà Năm' },
            { label: 'Số điện thoại', key: 'phone', placeholder: '0912345678', type: 'phone-pad' },
            { label: 'Địa chỉ', key: 'address', placeholder: 'Số nhà, đường, phường...' },
          ].map(f => (
            <View key={f.key}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <TextInput
                style={styles.fieldInput}
                value={shopForm[f.key]}
                onChangeText={v => setShopForm(p => ({ ...p, [f.key]: v }))}
                placeholder={f.placeholder}
                keyboardType={f.type}
                placeholderTextColor={COLORS.gray}
              />
            </View>
          ))}

          <Text style={styles.fieldLabel}>GPS quán</Text>
          <View style={styles.gpsBlock}>
            <View style={styles.gpsRow}>
              <Ionicons name="pin" size={16} color={shopForm.location ? '#4CAF50' : COLORS.warning} />
              <View style={{ flex: 1 }}>
                {shopForm.location ? (
                  <Text style={styles.gpsCoords}>
                    {shopForm.location.latitude.toFixed(5)}, {shopForm.location.longitude.toFixed(5)}
                  </Text>
                ) : (
                  <Text style={styles.gpsMissing}>Chưa ghim — Admin đến trực tiếp quán để ghim</Text>
                )}
              </View>
            </View>
            <TouchableOpacity style={styles.gpsPinBtn} onPress={handlePinShopGPS}>
              <Ionicons name="locate" size={15} color="#fff" />
              <Text style={styles.gpsPinBtnText}>
                {shopForm.location ? 'Cập nhật GPS' : 'Ghim GPS quán'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowEdit(false)}>
            <Ionicons name="close" size={26} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Sửa thông tin nhà hàng</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveText}>Lưu</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ padding: 16 }}>
          {[
            { label: 'Tên nhà hàng', key: 'name' },
            { label: 'Địa chỉ', key: 'address' },
            { label: 'Số điện thoại', key: 'phone', type: 'phone-pad' },
            { label: 'Giờ mở cửa', key: 'openTime' },
            { label: 'Giờ đóng cửa', key: 'closeTime' },
          ].map(f => (
            <View key={f.key}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <TextInput
                style={styles.fieldInput}
                value={form[f.key]}
                onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                keyboardType={f.type}
                placeholderTextColor={COLORS.gray}
              />
            </View>
          ))}
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, padding: 16, paddingTop: 52 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  adminCard: { alignItems: 'center', backgroundColor: '#fff', margin: 12, borderRadius: 16, padding: 20, elevation: 3 },
  adminAvatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  adminName: { fontSize: 20, fontWeight: 'bold', color: COLORS.dark },
  adminEmail: { fontSize: 13, color: COLORS.gray, marginTop: 3 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: COLORS.primary + '15', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  adminBadgeText: { color: COLORS.primary, fontSize: 13, fontWeight: '600', marginLeft: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 4, gap: 10 },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', elevation: 2 },
  statIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statVal: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  revenueCard: { backgroundColor: '#E8F5E9', marginHorizontal: 12, borderRadius: 14, padding: 16, marginBottom: 4 },
  revenueTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  revenueLabel: { fontSize: 14, color: '#388E3C', fontWeight: '500' },
  revenueVal: { fontSize: 22, fontWeight: 'bold', color: '#2E7D32', marginBottom: 12 },
  periodRow: { flexDirection: 'row', gap: 8 },
  shipProfitRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 8 },
  shipProfitText: { fontSize: 13, color: '#388E3C', fontWeight: '500' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#A5D6A7' },
  resetBtnText: { fontSize: 13, color: COLORS.danger, fontWeight: '600' },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#A5D6A7' },
  periodBtnActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  periodText: { fontSize: 13, color: '#388E3C', fontWeight: '600' },
  periodTextActive: { color: '#fff' },
  section: { backgroundColor: '#fff', margin: 12, borderRadius: 14, padding: 14, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  infoText: { fontSize: 14, color: COLORS.dark, marginLeft: 10, flex: 1 },
  gpsBlock: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  gpsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  gpsLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  gpsCoords: { fontSize: 12, color: '#4CAF50', marginTop: 2 },
  gpsMissing: { fontSize: 12, color: COLORS.warning, marginTop: 2 },
  gpsPinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: 10, padding: 10 },
  gpsPinBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  shopCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F3F8FF', borderRadius: 12, padding: 12, marginTop: 8, gap: 8 },
  shopName: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark, marginBottom: 4 },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  shopInfo: { fontSize: 12, color: COLORS.gray, flex: 1 },
  shopActionBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, elevation: 1 },
  genBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF9800', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  genBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  codeHint: { fontSize: 12, color: COLORS.gray, marginBottom: 8 },
  codeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', borderRadius: 10, padding: 10, marginTop: 6, gap: 8 },
  codeText: { flex: 1, fontSize: 17, fontWeight: 'bold', color: '#E65100', letterSpacing: 2, fontFamily: 'monospace' },
  codeDelBtn: { padding: 4 },
  bannerCard: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 12, borderRadius: 14, padding: 14, elevation: 2 },
  bannerPreview: { fontSize: 12, color: COLORS.gray, fontStyle: 'italic', marginTop: 2, marginBottom: 8 },
  adBannerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.lightGray, gap: 10 },
  adBannerDot: { width: 12, height: 12, borderRadius: 6 },
  adBannerTitle: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  adBannerSub: { fontSize: 11, color: COLORS.gray, marginTop: 1 },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  colorDotActive: { borderWidth: 3, borderColor: COLORS.dark },
  bankCard: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 12, borderRadius: 14, padding: 14, elevation: 2 },
  bankHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  bankTitle: { flex: 1, fontSize: 14, fontWeight: 'bold', color: COLORS.dark },
  bankAccountNo: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 1 },
  bankAccountName: { fontSize: 13, color: COLORS.dark, marginTop: 2 },
  bankBankName: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  bankAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bankAddText: { color: COLORS.primary, fontSize: 13 },
  bankHint: { fontSize: 11, color: COLORS.gray, marginBottom: 12, fontStyle: 'italic' },
  versionCard: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, borderRadius: 14, padding: 14, elevation: 2 },
  versionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  versionLabel: { flex: 1, fontSize: 13, color: COLORS.gray },
  versionVal: { fontSize: 13, color: COLORS.dark, fontWeight: '500', maxWidth: 200 },
  checkUpdateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  checkUpdateText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  chatAdminBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 10, borderRadius: 14, padding: 14, elevation: 2 },
  chatAdminBtnText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.dark },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.danger, margin: 16, padding: 15, borderRadius: 14, gap: 8 },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 52, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark },
  saveText: { fontSize: 16, color: COLORS.primary, fontWeight: 'bold' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginTop: 14, marginBottom: 6 },
  fieldInput: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: COLORS.lightGray, color: COLORS.dark },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%' },
  modalLabel: { fontSize: 12, color: COLORS.gray },
  modalInput: { backgroundColor: COLORS.lightGray, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.dark, marginTop: 4 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancel: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.lightGray, alignItems: 'center' },
  modalCancelText: { color: COLORS.gray, fontWeight: '600' },
  modalSave: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontWeight: 'bold' },
});
