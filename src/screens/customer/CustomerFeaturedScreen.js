import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, StatusBar, Alert, RefreshControl, Animated,
  TextInput, FlatList, Keyboard,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, COLORS } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';
import { scheduleDailyFoodNotifications } from '../../utils/dailyNotifications';
import AdBannerCarousel from '../../components/AdBannerCarousel';

export default function CustomerFeaturedScreen({ navigation }) {
  const { menuItems, menuLoaded, allOrders, addToCart, clearCart, getCartCount, restaurantInfo, adBanners, refreshMenuItems, subscribeNotifications } = useApp();
  const { currentUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeNotifications(currentUser.id, (notifs) => {
      setUnreadCount(notifs.filter(n => !n.read).length);
    });
    return () => unsub();
  }, [currentUser?.id]);
  const [refreshing, setRefreshing] = useState(false);
  const shimmer = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!menuLoaded) {
      Animated.loop(Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])).start();
    }
  }, [menuLoaded]);
  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  useEffect(() => {
    scheduleDailyFoodNotifications();
  }, []);

  const isGuest = !currentUser;
  const cartCount = getCartCount(currentUser?.id || '');
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 11 ? 'Buổi sáng' : hour < 14 ? 'Buổi trưa' : hour < 18 ? 'Buổi chiều' : 'Buổi tối';
  const [oh, om] = (restaurantInfo.openTime || '07:00').split(':').map(Number);
  const [ch, cm] = (restaurantInfo.closeTime || '22:00').split(':').map(Number);
  const curMin = hour * 60 + now.getMinutes();
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;
  const isOpen = curMin >= openMin && curMin < closeMin;

  // Countdown đến lúc mở cửa
  const closedCountdown = useMemo(() => {
    if (isOpen) return null;
    const minsUntilOpen = curMin < openMin
      ? openMin - curMin
      : (24 * 60 - curMin) + openMin;
    const h = Math.floor(minsUntilOpen / 60);
    const m = minsUntilOpen % 60;
    return h > 0 ? `${h} tiếng ${m} phút` : `${m} phút`;
  }, [isOpen, curMin, openMin]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refreshMenuItems(); } catch {}
    setRefreshing(false);
  }, [refreshMenuItems]);

  const deliveredCount = allOrders.filter(o => o.status === 'Đã giao').length;

  const ACTIVE_STATUSES = ['Chờ shop', 'Chờ xác nhận', 'Đã xác nhận', 'Đang lấy hàng', 'Đã lấy hàng', 'Đang giao'];
  const STATUS_COLOR = { 'Chờ shop': '#FF9800', 'Chờ xác nhận': '#2196F3', 'Đã xác nhận': '#9C27B0', 'Đang lấy hàng': '#FF5722', 'Đã lấy hàng': '#795548', 'Đang giao': '#4CAF50' };

  // Đơn đang giao (active)
  const activeOrder = useMemo(() => {
    if (isGuest) return null;
    return allOrders.find(o => o.userId === currentUser?.id && ACTIVE_STATUSES.includes(o.status)) || null;
  }, [allOrders, currentUser]);

  // 3 món gần nhất khách đã đặt (không trùng tên), mỗi món đặt lại riêng
  const recentItems = useMemo(() => {
    if (isGuest) return [];
    const delivered = allOrders
      .filter(o => o.userId === currentUser?.id && o.status === 'Đã giao')
      .sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return tb - ta;
      });
    const seen = new Set();
    const result = [];
    for (const order of delivered) {
      for (const item of (order.items || [])) {
        if (!seen.has(item.name)) {
          seen.add(item.name);
          result.push({ ...item, orderId: order.id });
          if (result.length >= 3) return result;
        }
      }
    }
    return result;
  }, [allOrders, currentUser]);

  const reorder = (order) => {
    if (!order.items?.length) return;
    Alert.alert('Đặt lại', `Thêm ${order.items.length} món vào giỏ hàng?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đặt lại', onPress: () => {
        order.items.forEach(item => {
          const menuItem = menuItems.find(m => m.id === item.id);
          if (menuItem) addToCart(currentUser.id, menuItem, item.selectedToppings || []);
        });
        navigation.navigate('CustomerCart');
      }},
    ]);
  };

  // Món bán chạy: đếm từ lịch sử đơn hàng
  const hotItems = useMemo(() => {
    const count = {};
    allOrders.forEach(o => o.items?.forEach(i => {
      count[i.id] = (count[i.id] || 0) + i.quantity;
    }));
    return menuItems
      .filter(m => m.available)
      .sort((a, b) => (count[b.id] || 0) - (count[a.id] || 0))
      .slice(0, 6);
  }, [menuItems, allOrders]);

  // Bảng xếp hạng top 5 món bán chạy kèm số lượng
  const topRankItems = useMemo(() => {
    const count = {};
    allOrders.forEach(o => o.items?.forEach(i => {
      if (!count[i.name]) count[i.name] = { name: i.name, qty: 0, price: i.price };
      count[i.name].qty += i.quantity;
    }));
    return Object.values(count).filter(i => i.qty > 0).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [allOrders]);

  // Món mới từ quán: 3 quán cập nhật menu gần nhất, mỗi quán 1 món mới nhất
  const newShopItems = useMemo(() => {
    const shopItems = menuItems.filter(m => m.shopId && m.available && m.createdAt);
    if (!shopItems.length) return [];
    // Với mỗi shopId, lấy item mới nhất
    const byShop = {};
    shopItems.forEach(m => {
      if (!byShop[m.shopId] || new Date(m.createdAt) > new Date(byShop[m.shopId].createdAt)) {
        byShop[m.shopId] = m;
      }
    });
    // Sắp xếp shop theo item mới nhất, lấy 3 shop đầu
    return Object.values(byShop)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);
  }, [menuItems]);

  // Gợi ý theo giờ
  const suggested = useMemo(() => {
    const catMap = hour < 11
      ? ['Bún', 'Phở', 'Bánh mì']
      : hour < 14
      ? ['Cơm', 'Phở', 'Bún']
      : hour < 18
      ? ['Đồ uống', 'Tráng miệng', 'Bánh mì']
      : ['Đồ ăn', 'Cơm', 'Đồ uống'];
    const byCat = menuItems.filter(m => m.available && catMap.includes(m.category));
    return byCat.length >= 3 ? byCat.slice(0, 4) : menuItems.filter(m => m.available).slice(0, 4);
  }, [menuItems, hour]);

  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef(null);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return menuItems.filter(m => m.available && (
      m.name?.toLowerCase().includes(q) ||
      m.category?.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q)
    ));
  }, [searchQuery, menuItems]);

  const goToHomeTab = (params) => {
    // Works in both GuestTabs and CustomerTabs
    const tabName = isGuest ? 'GuestHome' : 'CustomerHome';
    navigation.navigate(tabName, params);
  };

  const handleAdd = (item) => {
    if (isGuest) { navigation.navigate('Login'); return; }
    if (item.toppings?.length > 0) {
      goToHomeTab({ openItem: item });
    } else {
      addToCart(currentUser.id, item, []);
    }
  };

  const FoodCard = ({ item, wide }) => (
    <TouchableOpacity
      style={[styles.card, wide && styles.cardWide]}
      onPress={() => handleAdd(item)}
      activeOpacity={0.85}
    >
      <View style={[styles.cardImg, wide && styles.cardImgWide]}>
        {item.image
          ? <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <View style={[StyleSheet.absoluteFill, styles.imgPlaceholder]}>
              <Ionicons name="fast-food-outline" size={wide ? 44 : 32} color={COLORS.primary} />
            </View>}
        {item.toppings?.length > 0 && (
          <View style={styles.tBadge}>
            <Ionicons name="add-circle" size={10} color="#fff" />
            <Text style={styles.tBadgeText}>{item.toppings.length} kèm</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardName, wide && { fontSize: 14 }]} numberOfLines={2}>{item.name}</Text>
        <View style={styles.cardFoot}>
          <Text style={styles.cardPrice}>{formatCurrency(item.price)}</Text>
          <View style={styles.addBtn}>
            <Ionicons name="add" size={16} color="#fff" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!menuLoaded) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={[styles.header, { paddingBottom: 20 }]}>
          <View>
            <Text style={styles.greeting}>Xin chào! 👋</Text>
            <View style={styles.statusRow}><View style={[styles.dot, { backgroundColor: '#69F0AE' }]} /><Text style={styles.statusText}>Đang tải...</Text></View>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {[1,2,3].map(i => (
            <Animated.View key={i} style={[styles.skeletonCard, { opacity: shimmerOpacity }]} />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{greeting} tốt lành, {currentUser?.name || 'Khách'}! 👋</Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: isOpen ? '#69F0AE' : '#FF5252' }]} />
            <Text style={styles.statusText}>
              {isOpen
                ? `Đang mở cửa · ${restaurantInfo.openTime}–${restaurantInfo.closeTime}`
                : `Đã đóng cửa · Mở sau ${closedCountdown}`}
            </Text>
          </View>
          <Text style={styles.statsLine}>
            🛵 Đã giao {deliveredCount > 0 ? `${deliveredCount}+` : '0'} đơn · ⚡ Giao trong 30 phút · ⭐ Uy tín
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {!isGuest && (
            <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('CustomerNotifications')}>
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => isGuest ? navigation.navigate('Login') : navigation.navigate('CustomerCart')}
            style={styles.cartBtn}
          >
            <Ionicons name={isGuest ? 'log-in-outline' : 'cart-outline'} size={26} color="#fff" />
            {!isGuest && cartCount > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{cartCount}</Text></View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={COLORS.gray} />
        <TextInput
          ref={searchRef}
          style={styles.searchInput}
          placeholder="Tìm món ăn..."
          placeholderTextColor={COLORS.gray}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); Keyboard.dismiss(); }}>
            <Ionicons name="close-circle" size={18} color={COLORS.gray} />
          </TouchableOpacity>
        )}
      </View>

      {searchQuery.length > 0 ? (
        <View style={{ flex: 1 }}>
          {searchResults.length === 0 ? (
            <View style={styles.searchEmpty}>
              <Ionicons name="search-outline" size={40} color={COLORS.lightGray} />
              <Text style={styles.searchEmptyText}>Không tìm thấy món "{searchQuery}"</Text>
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >

        {/* Banner carousel quảng cáo */}
        {adBanners && <AdBannerCarousel banners={adBanners} />}

        {/* Đơn đang giao */}
        {activeOrder && (
          <TouchableOpacity style={styles.activeOrderCard} onPress={() => navigation.navigate('TrackOrder', { orderId: activeOrder.id })} activeOpacity={0.85}>
            <View style={styles.activeOrderLeft}>
              <View style={[styles.activeOrderDot, { backgroundColor: STATUS_COLOR[activeOrder.status] || COLORS.primary }]} />
              <View>
                <Text style={styles.activeOrderStatus}>{activeOrder.status}</Text>
                <Text style={styles.activeOrderSub} numberOfLines={1}>
                  {activeOrder.items?.map(i => i.name).join(', ')}
                </Text>
              </View>
            </View>
            <View style={styles.activeOrderRight}>
              <Text style={styles.activeOrderBtn}>Theo dõi</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
        )}

        {/* Đặt lại nhanh từng món */}
        {recentItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔄 Đặt lại nhanh</Text>
            {recentItems.map((item, idx) => {
              const menuItem = menuItems.find(m => m.name === item.name && m.available);
              return (
                <View key={idx} style={styles.reorderCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reorderItems} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.reorderMeta}>{formatCurrency(item.price)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.reorderBtn, !menuItem && { backgroundColor: COLORS.gray }]}
                    disabled={!menuItem}
                    onPress={() => {
                      if (!menuItem) return;
                      if (menuItem.toppings?.length > 0) goToHomeTab({ openItem: menuItem });
                      else { addToCart(currentUser.id, menuItem, []); }
                    }}>
                    <Ionicons name="refresh" size={14} color="#fff" />
                    <Text style={styles.reorderBtnText}>{menuItem ? 'Đặt lại' : 'Hết'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Danh mục nhanh */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danh mục</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            {[
              { label: 'Cơm', icon: '🍚' }, { label: 'Phở', icon: '🍜' },
              { label: 'Bún', icon: '🍝' }, { label: 'Bánh mì', icon: '🥖' },
              { label: 'Đồ uống', icon: '🧋' }, { label: 'Tráng miệng', icon: '🍮' },
              { label: 'Đồ ăn', icon: '🍽️' },
            ].map(c => (
              <TouchableOpacity
                key={c.label}
                style={styles.catChip}
                onPress={() => goToHomeTab({ filterCat: c.label })}
              >
                <Text style={styles.catEmoji}>{c.icon}</Text>
                <Text style={styles.catLabel}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Món mới từ quán */}
        {newShopItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🆕 Món mới từ quán</Text>
              <TouchableOpacity onPress={() => navigation.navigate(isGuest ? 'GuestShops' : 'CustomerShops')}>
                <Text style={styles.seeAll}>Vào quán</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
              {newShopItems.map(item => (
                <TouchableOpacity key={item.id} style={styles.card} onPress={() => handleAdd(item)} activeOpacity={0.85}>
                  <View style={styles.cardImg}>
                    {item.image
                      ? <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                      : <View style={[StyleSheet.absoluteFill, styles.imgPlaceholder]}>
                          <Ionicons name="fast-food-outline" size={32} color={COLORS.primary} />
                        </View>}
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.cardShopName} numberOfLines={1}>{item.shopName}</Text>
                    <View style={styles.cardFoot}>
                      <Text style={styles.cardPrice}>{formatCurrency(item.price)}</Text>
                      <View style={styles.addBtn}><Ionicons name="add" size={16} color="#fff" /></View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Gợi ý theo giờ */}
        {suggested.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {hour < 11 ? '🌅 Bữa sáng gợi ý' : hour < 14 ? '☀️ Bữa trưa gợi ý' : hour < 18 ? '🌤 Bữa xế gợi ý' : '🌙 Bữa tối gợi ý'}
              </Text>
            </View>
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
              <TouchableOpacity onPress={() => goToHomeTab()}>
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

        {/* Top bán chạy bảng xếp hạng */}
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
  header: {
    backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center',
  },
  greeting: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  statsLine: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 5 },
  skeletonCard: { height: 90, backgroundColor: '#E0E0E0', borderRadius: 14 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  cartBtn: { padding: 4, position: 'relative' },
  badge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: COLORS.dark, borderRadius: 9, width: 18, height: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12,
    borderRadius: 14, padding: 14, elevation: 2,
  },
  bannerName: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark },
  bannerAddr: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  menuBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary + '15', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  menuBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  activeOrderCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12,
    borderRadius: 14, padding: 14, elevation: 3,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  activeOrderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  activeOrderDot: { width: 10, height: 10, borderRadius: 5 },
  activeOrderStatus: { fontSize: 13, fontWeight: 'bold', color: COLORS.dark },
  activeOrderSub: { fontSize: 11, color: COLORS.gray, marginTop: 2, maxWidth: 200 },
  activeOrderRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  activeOrderBtn: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  reorderCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8,
    borderRadius: 14, padding: 14, elevation: 2, gap: 12,
  },
  reorderItems: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  reorderMeta: { fontSize: 11, color: COLORS.gray, marginTop: 3 },
  reorderBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  reorderBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  section: { marginTop: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.dark, paddingHorizontal: 14, marginBottom: 10 },
  cardShopName: { fontSize: 11, color: '#2196F3', fontWeight: '600', marginTop: 2 },
  rankCard: { backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 4, overflow: 'hidden', elevation: 2 },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#F5F5F5', gap: 10 },
  rankNum: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  rankNumText: { fontSize: 11, fontWeight: 'bold' },
  rankName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#222' },
  rankQty: { fontSize: 12, color: COLORS.gray, marginRight: 4 },
  rankPrice: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, marginBottom: 2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, elevation: 2, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.dark, paddingVertical: 2 },
  searchOverlay: { flex: 1, backgroundColor: COLORS.background },
  searchEmpty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  searchEmptyText: { fontSize: 14, color: COLORS.gray },
  searchResultRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 10, gap: 10, elevation: 1 },
  searchResultImg: { width: 52, height: 52, borderRadius: 10, backgroundColor: COLORS.lightGray, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  searchResultName: { fontSize: 13, fontWeight: '700', color: COLORS.dark },
  searchResultCat: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  searchResultPrice: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary, marginRight: 8 },
  seeAll: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  catRow: { paddingHorizontal: 12, gap: 10 },
  catChip: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, elevation: 2, minWidth: 68 },
  catEmoji: { fontSize: 22 },
  catLabel: { fontSize: 11, color: COLORS.dark, fontWeight: '600', marginTop: 4 },
  hList: { paddingHorizontal: 12, gap: 10 },
  gridWrap: { flexDirection: 'row', paddingHorizontal: 12, gap: 10, marginBottom: 10 },
  card: { width: 140, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', elevation: 3 },
  cardWide: { flex: 1, width: undefined },
  cardImg: { height: 110, position: 'relative', backgroundColor: COLORS.lightGray },
  cardImgWide: { height: 130 },
  imgPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightGray },
  tBadge: {
    position: 'absolute', top: 6, left: 6,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2,
  },
  tBadgeText: { color: '#fff', fontSize: 9, marginLeft: 2, fontWeight: 'bold' },
  cardBody: { padding: 10 },
  cardName: { fontSize: 12, fontWeight: 'bold', color: COLORS.dark, minHeight: 32 },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  cardPrice: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 14, width: 26, height: 26, justifyContent: 'center', alignItems: 'center' },
  promoCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary + '12', marginHorizontal: 12, marginTop: 16,
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  promoTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark },
  promoSub: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
});
