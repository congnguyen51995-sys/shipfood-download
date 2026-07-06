import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, StatusBar, TextInput, FlatList, Keyboard, Modal, Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, COLORS } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';
import AdBannerCarousel from '../../components/AdBannerCarousel';

const STATUS_COLOR = {
  'Chờ shop': '#FF9800',
  'Chờ xác nhận': '#2196F3',
  'Đang giao': '#FF9800',
  'Đã giao': '#4CAF50',
  'Đã hủy': '#9E9E9E',
};

export default function ShopHomeScreen({ navigation }) {
  const { menuItems, allOrders, addToCart, getCartCount, restaurantInfo, getShopOrders, adBanners, linkedShops, updateLinkedShop } = useApp();
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [locationModal, setLocationModal] = useState(false);
  const [pinning, setPinning] = useState(false);
  const checkedRef = useRef(false);

  const shopDoc = linkedShops.find(s => s.userId === currentUser.id);
  const shopIsOpen = shopDoc?.shopOpen !== false;

  // Nhắc ghim vị trí nếu shop chưa có GPS
  useEffect(() => {
    if (checkedRef.current || !shopDoc) return;
    if (!shopDoc.location) {
      checkedRef.current = true;
      setLocationModal(true);
    }
  }, [shopDoc]);

  const handlePinLocation = async () => {
    setPinning(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền vị trí', 'Vui lòng cấp quyền GPS để ghim vị trí quán.');
        setPinning(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      await updateLinkedShop(shopDoc.id, { location: { latitude, longitude } });
      setLocationModal(false);
      Alert.alert('✅ Đã ghim vị trí quán', `Tọa độ: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}\n\nNếu vị trí này chưa đúng, vào Hồ sơ → Cập nhật GPS để sửa lại.`);
    } catch (e) {
      Alert.alert('Lỗi', 'Không lấy được vị trí GPS. Vui lòng thử lại.');
    }
    setPinning(false);
  };

  const handleSkipLocation = () => {
    setLocationModal(false);
    Alert.alert(
      '⚠️ Chưa có vị trí quán',
      'Nếu không ghim vị trí:\n\n• Khách sẽ không đặt được đơn từ quán bạn\n• Shipper không biết đến lấy hàng ở đâu\n\nVui lòng vào Hồ sơ → Ghim GPS quán để cập nhật.',
      [{ text: 'Đã hiểu' }]
    );
  };

  const toggleShopOpen = async () => {
    if (!shopDoc) return;
    await updateLinkedShop(shopDoc.id, { shopOpen: !shopIsOpen });
  };

  const todayOrders = useMemo(() => {
    const now = new Date();
    return getShopOrders(currentUser.id).filter(o => {
      const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [allOrders, currentUser.id]);

  const cartCount = getCartCount(currentUser.id);
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 11 ? 'Buổi sáng' : hour < 14 ? 'Buổi trưa' : hour < 18 ? 'Buổi chiều' : 'Buổi tối';

  const isOpen = (() => {
    const [oh, om] = (restaurantInfo.openTime || '07:00').split(':').map(Number);
    const [ch, cm] = (restaurantInfo.closeTime || '22:00').split(':').map(Number);
    const cur = hour * 60 + now.getMinutes();
    return cur >= oh * 60 + om && cur < ch * 60 + cm;
  })();

  const shopOrders = getShopOrders(currentUser.id).slice(0, 3);
  const shopItems = menuItems.filter(i => i.shopId === currentUser.id);
  const shopItemsActive = shopItems.filter(i => i.available);

  const hotItems = useMemo(() => {
    const count = {};
    allOrders.forEach(o => o.items?.forEach(i => { count[i.id] = (count[i.id] || 0) + i.quantity; }));
    return menuItems.filter(m => m.available).sort((a, b) => (count[b.id] || 0) - (count[a.id] || 0)).slice(0, 6);
  }, [menuItems, allOrders]);

  const topRankItems = useMemo(() => {
    const count = {};
    allOrders.forEach(o => o.items?.forEach(i => {
      if (!count[i.name]) count[i.name] = { name: i.name, qty: 0 };
      count[i.name].qty += i.quantity;
    }));
    return Object.values(count).filter(i => i.qty > 0).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [allOrders]);

  const suggested = useMemo(() => {
    const catMap = hour < 11 ? ['Bún', 'Phở', 'Bánh mì']
      : hour < 14 ? ['Cơm', 'Phở', 'Bún']
      : hour < 18 ? ['Đồ uống', 'Tráng miệng', 'Bánh mì']
      : ['Đồ ăn', 'Cơm', 'Đồ uống'];
    const byCat = menuItems.filter(m => m.available && catMap.includes(m.category));
    return byCat.length >= 3 ? byCat.slice(0, 4) : menuItems.filter(m => m.available).slice(0, 4);
  }, [menuItems, hour]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return menuItems.filter(m => m.available && (
      m.name?.toLowerCase().includes(q) ||
      m.category?.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q)
    ));
  }, [searchQuery, menuItems]);

  const handleAdd = (item) => {
    if (item.toppings?.length > 0) {
      navigation.navigate('ShopThucDon', { openItem: item });
    } else {
      addToCart(currentUser.id, item, []);
    }
  };

  const FoodCard = ({ item, wide }) => (
    <TouchableOpacity style={[styles.card, wide && styles.cardWide]} onPress={() => handleAdd(item)} activeOpacity={0.85}>
      <View style={[styles.cardImg, wide && styles.cardImgWide]}>
        {item.image
          ? <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <View style={[StyleSheet.absoluteFill, styles.imgPlaceholder]}>
              <Ionicons name="fast-food-outline" size={wide ? 44 : 32} color={COLORS.primary} />
            </View>}
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardName, wide && { fontSize: 14 }]} numberOfLines={2}>{item.name}</Text>
        <View style={styles.cardFoot}>
          <Text style={styles.cardPrice}>{formatCurrency(item.price)}</Text>
          <View style={styles.addBtn}><Ionicons name="add" size={16} color="#fff" /></View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const CATS = [
    { label: 'Cơm', icon: '🍚' }, { label: 'Phở', icon: '🍜' },
    { label: 'Bún', icon: '🍝' }, { label: 'Bánh mì', icon: '🥖' },
    { label: 'Đồ uống', icon: '🧋' }, { label: 'Tráng miệng', icon: '🍮' },
    { label: 'Đồ ăn', icon: '🍽️' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2196F3" />

      {/* Modal bắt buộc ghim vị trí quán */}
      <Modal visible={locationModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIcon}>
              <Ionicons name="location" size={36} color="#fff" />
            </View>
            <Text style={styles.modalTitle}>Ghim vị trí quán</Text>
            <Text style={styles.modalDesc}>
              Để khách đặt hàng và shipper đến lấy hàng đúng nơi, bạn cần ghim vị trí GPS của quán.
            </Text>
            <View style={styles.modalNote}>
              <Ionicons name="warning-outline" size={15} color="#FF9800" />
              <Text style={styles.modalNoteText}>
                Hãy đứng tại quán khi bấm ghim. Nếu đang ở nhà hoặc nơi khác, vị trí sẽ không chính xác — shipper sẽ đến sai địa điểm.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.modalPinBtn, pinning && { opacity: 0.7 }]}
              onPress={handlePinLocation}
              disabled={pinning}
            >
              <Ionicons name="locate" size={18} color="#fff" />
              <Text style={styles.modalPinBtnText}>{pinning ? 'Đang lấy GPS...' : 'Ghim vị trí hiện tại làm vị trí quán'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSkipBtn} onPress={handleSkipLocation}>
              <Text style={styles.modalSkipText}>Bỏ qua (khách không đặt được)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{greeting}! {currentUser.shopName || currentUser.name} 🏪</Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: isOpen ? '#69F0AE' : '#FF5252' }]} />
            <Text style={styles.statusText}>
              {isOpen ? `Nhà hàng đang mở · ${restaurantInfo.openTime}–${restaurantInfo.closeTime}` : 'Nhà hàng đã đóng cửa'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.openToggle, { backgroundColor: shopIsOpen ? '#4CAF50' : '#F44336' }]} onPress={toggleShopOpen}>
          <Ionicons name={shopIsOpen ? 'storefront' : 'storefront-outline'} size={14} color="#fff" />
          <Text style={styles.openToggleText}>{shopIsOpen ? 'Đang mở' : 'Đóng cửa'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ShopCart')} style={styles.cartBtn}>
          <Ionicons name="cart-outline" size={26} color="#fff" />
          {cartCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{cartCount}</Text></View>}
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={COLORS.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm món ăn..."
          placeholderTextColor={COLORS.gray}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); Keyboard.dismiss(); }}>
            <Ionicons name="close-circle" size={18} color={COLORS.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search results */}
      {searchQuery.length > 0 ? (
        <View style={{ flex: 1 }}>
          {searchResults.length === 0 ? (
            <View style={styles.searchEmpty}>
              <Ionicons name="search-outline" size={40} color={COLORS.lightGray} />
              <Text style={{ color: COLORS.gray, marginTop: 10 }}>Không tìm thấy món "{searchQuery}"</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={i => i.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 12, gap: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.searchResultRow} onPress={() => { handleAdd(item); setSearchQuery(''); Keyboard.dismiss(); }} activeOpacity={0.8}>
                  <View style={styles.searchResultImg}>
                    {item.image
                      ? <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                      : <Ionicons name="fast-food-outline" size={22} color={COLORS.primary} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.searchResultName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.searchResultCat}>{item.category}</Text>
                  </View>
                  <Text style={styles.searchResultPrice}>{formatCurrency(item.price)}</Text>
                  <View style={styles.addBtn}><Ionicons name="add" size={16} color="#fff" /></View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      ) : (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

        {/* Banner */}
        {adBanners && <AdBannerCarousel banners={adBanners} />}

        {/* Shop quick stats */}
        <View style={styles.shopStats}>
          <View style={styles.statCard}>
            <Ionicons name="restaurant-outline" size={20} color="#2196F3" />
            <Text style={styles.statNum}>{shopItemsActive.length}</Text>
            <Text style={styles.statLabel}>Món đang bán</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={20} color="#FF9800" />
            <Text style={styles.statNum}>{getShopOrders(currentUser.id).filter(o => o.status === 'Chờ shop').length}</Text>
            <Text style={styles.statLabel}>Chờ xác nhận</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
            <Text style={styles.statNum}>{getShopOrders(currentUser.id).filter(o => o.status === 'Đã giao').length}</Text>
            <Text style={styles.statLabel}>Đã giao</Text>
          </View>
        </View>

        {/* Thống kê hôm nay */}
        <View style={styles.todayCard}>
          <Text style={styles.todayTitle}>📊 Hôm nay</Text>
          <View style={styles.todayRow}>
            <View style={styles.todayStat}>
              <Text style={styles.todayNum}>{todayOrders.length}</Text>
              <Text style={styles.todayLabel}>Tổng đơn</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayStat}>
              <Text style={[styles.todayNum, { color: '#4CAF50' }]}>{todayOrders.filter(o => o.status === 'Đã giao').length}</Text>
              <Text style={styles.todayLabel}>Đã giao</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayStat}>
              <Text style={[styles.todayNum, { color: '#FF9800' }]}>{todayOrders.filter(o => o.status === 'Chờ shop' || o.status === 'Chờ xác nhận').length}</Text>
              <Text style={styles.todayLabel}>Đang chờ</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayStat}>
              <Text style={[styles.todayNum, { color: COLORS.primary, fontSize: 13 }]}>
                {formatCurrency(todayOrders.filter(o => o.status === 'Đã giao').reduce((s, o) => s + (o.shippingFee || 0), 0))}
              </Text>
              <Text style={styles.todayLabel}>Ship nhận</Text>
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('ShopCreate')}>
            <View style={[styles.quickIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="add-circle-outline" size={24} color="#2196F3" />
            </View>
            <Text style={styles.quickLabel}>Tạo đơn ship</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('ShopMenuTab')}>
            <View style={[styles.quickIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="restaurant-outline" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.quickLabel}>Menu quán</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('ShopOrdersTab')}>
            <View style={[styles.quickIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="receipt-outline" size={24} color="#FF9800" />
            </View>
            <Text style={styles.quickLabel}>Đơn hàng</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('ShopThucDon')}>
            <View style={[styles.quickIcon, { backgroundColor: '#FCE4EC' }]}>
              <Ionicons name="fast-food-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.quickLabel}>Thực đơn</Text>
          </TouchableOpacity>
        </View>

        {/* Danh mục nhanh */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danh mục</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            {CATS.map(c => (
              <TouchableOpacity key={c.label} style={styles.catChip} onPress={() => navigation.navigate('ShopThucDon', { filterCat: c.label })}>
                <Text style={styles.catEmoji}>{c.icon}</Text>
                <Text style={styles.catLabel}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Đơn gần đây của quán */}
        {shopOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📦 Đơn gần đây</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ShopOrdersTab')}>
                <Text style={styles.seeAll}>Xem tất cả</Text>
              </TouchableOpacity>
            </View>
            {shopOrders.map(order => (
              <View key={order.id} style={styles.orderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderName}>{order.userName}</Text>
                  <Text style={styles.orderAddr} numberOfLines={1}>{order.deliveryAddress}</Text>
                </View>
                <View style={[styles.orderStatus, { backgroundColor: (STATUS_COLOR[order.status] || '#999') + '20' }]}>
                  <Text style={[styles.orderStatusText, { color: STATUS_COLOR[order.status] || '#999' }]}>{order.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Gợi ý theo giờ */}
        {suggested.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {hour < 11 ? '🌅 Bữa sáng gợi ý' : hour < 14 ? '☀️ Bữa trưa gợi ý' : hour < 18 ? '🌤 Bữa xế gợi ý' : '🌙 Bữa tối gợi ý'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
              {suggested.map(item => <FoodCard key={item.id} item={item} />)}
            </ScrollView>
          </View>
        )}

        {/* Món bán chạy */}
        {hotItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔥 Món bán chạy</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ShopThucDon')}>
                <Text style={styles.seeAll}>Xem tất cả</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.gridWrap}>
              {hotItems.slice(0, 2).map(item => <FoodCard key={item.id} item={item} wide />)}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
              {hotItems.slice(2).map(item => <FoodCard key={item.id} item={item} />)}
            </ScrollView>
          </View>
        )}

        {/* Bảng xếp hạng */}
        {topRankItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 Bảng xếp hạng món</Text>
            <View style={styles.rankCard}>
              {topRankItems.map((item, i) => (
                <TouchableOpacity key={item.name} style={styles.rankRow} onPress={() => {
                  const menuItem = menuItems.find(m => m.name === item.name && m.available);
                  if (menuItem) handleAdd(menuItem);
                }} activeOpacity={0.7}>
                  <View style={[styles.rankNum, { backgroundColor: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#E0E0E0' }]}>
                    <Text style={[styles.rankNumText, { color: i < 3 ? '#fff' : '#888' }]}>#{i + 1}</Text>
                  </View>
                  <Text style={styles.rankName} numberOfLines={1}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: '#2196F3', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  greeting: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  openToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8 },
  openToggleText: { fontSize: 12, color: '#fff', fontWeight: 'bold' },
  cartBtn: { padding: 4, position: 'relative' },
  badge: { position: 'absolute', top: -2, right: -2, backgroundColor: COLORS.dark, borderRadius: 9, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, marginBottom: 2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, elevation: 2, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.dark, paddingVertical: 2 },
  searchEmpty: { alignItems: 'center', paddingTop: 60 },
  searchResultRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 10, gap: 10, elevation: 1 },
  searchResultImg: { width: 52, height: 52, borderRadius: 10, backgroundColor: COLORS.lightGray, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  searchResultName: { fontSize: 13, fontWeight: '700', color: COLORS.dark },
  searchResultCat: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  searchResultPrice: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary, marginRight: 8 },
  shopStats: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12, borderRadius: 14, elevation: 2 },
  statCard: { flex: 1, alignItems: 'center', padding: 14 },
  statNum: { fontSize: 22, fontWeight: 'bold', color: '#2196F3', marginTop: 4 },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  quickRow: { flexDirection: 'row', paddingHorizontal: 12, marginTop: 12, gap: 8 },
  quickBtn: { flex: 1, alignItems: 'center' },
  quickIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  quickLabel: { fontSize: 11, color: COLORS.dark, fontWeight: '600', textAlign: 'center' },
  section: { marginTop: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark, paddingHorizontal: 14, marginBottom: 10 },
  seeAll: { fontSize: 13, color: '#2196F3', fontWeight: '600' },
  catRow: { paddingHorizontal: 12, gap: 10 },
  catChip: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, elevation: 2, minWidth: 68 },
  catEmoji: { fontSize: 22 },
  catLabel: { fontSize: 11, color: COLORS.dark, fontWeight: '600', marginTop: 4 },
  orderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  orderName: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  orderAddr: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  orderStatus: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  orderStatusText: { fontSize: 11, fontWeight: 'bold' },
  hList: { paddingHorizontal: 12, gap: 10 },
  gridWrap: { flexDirection: 'row', paddingHorizontal: 12, gap: 10, marginBottom: 10 },
  card: { width: 140, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', elevation: 3 },
  cardWide: { flex: 1, width: undefined },
  cardImg: { height: 110, position: 'relative', backgroundColor: COLORS.lightGray },
  cardImgWide: { height: 130 },
  imgPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightGray },
  cardBody: { padding: 10 },
  cardName: { fontSize: 12, fontWeight: 'bold', color: COLORS.dark, minHeight: 32 },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  cardPrice: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 14, width: 26, height: 26, justifyContent: 'center', alignItems: 'center' },
  todayCard: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12, borderRadius: 14, padding: 14, elevation: 2 },
  todayTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.dark, marginBottom: 10 },
  todayRow: { flexDirection: 'row', alignItems: 'center' },
  todayStat: { flex: 1, alignItems: 'center' },
  todayNum: { fontSize: 18, fontWeight: 'bold', color: '#2196F3' },
  todayLabel: { fontSize: 10, color: COLORS.gray, marginTop: 2 },
  todayDivider: { width: 1, height: 32, backgroundColor: COLORS.lightGray },
  rankCard: { backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 4, overflow: 'hidden', elevation: 2 },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#F5F5F5', gap: 10 },
  rankNum: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  rankNumText: { fontSize: 11, fontWeight: 'bold' },
  rankName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#222' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', alignItems: 'center' },
  modalIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark, marginBottom: 10, textAlign: 'center' },
  modalDesc: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 14 },
  modalNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF3E0', borderRadius: 10, padding: 12, marginBottom: 20 },
  modalNoteText: { flex: 1, fontSize: 13, color: '#E65100', lineHeight: 20 },
  modalPinBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, width: '100%', justifyContent: 'center', marginBottom: 10 },
  modalPinBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  modalSkipBtn: { paddingVertical: 10 },
  modalSkipText: { fontSize: 13, color: COLORS.gray, textDecorationLine: 'underline' },
});
