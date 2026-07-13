import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, ScrollView, Modal,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, COLORS } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';

const ToppingModal = ({ visible, item, onClose, onConfirm }) => {
  const [selected, setSelected] = useState([]);
  React.useEffect(() => { if (item) setSelected([]); }, [item]);
  if (!item) return null;
  const toggle = (t) =>
    setSelected(prev => prev.find(x => x.id === t.id) ? prev.filter(x => x.id !== t.id) : [...prev, t]);
  const total = item.price + selected.reduce((s, t) => s + t.price, 0);
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetTop}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          <View style={styles.itemRow}>
            <View style={styles.itemIcon}>
              {item.image
                ? <Image source={{ uri: item.image }} style={styles.itemImg} />
                : <Ionicons name="fast-food-outline" size={30} color={COLORS.primary} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <View style={styles.shopTag}>
                <Ionicons name="storefront-outline" size={11} color="#2196F3" />
                <Text style={styles.shopTagText}>{item.shopName}</Text>
              </View>
              <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
            </View>
          </View>
          {item.toppings?.length > 0 && (
            <>
              <Text style={styles.toppingTitle}>Chọn món kèm (tuỳ chọn)</Text>
              <ScrollView style={{ maxHeight: 200 }}>
                {item.toppings.map(t => {
                  const active = !!selected.find(x => x.id === t.id);
                  return (
                    <TouchableOpacity key={t.id} style={[styles.tRow, active && styles.tRowActive]} onPress={() => toggle(t)}>
                      <View style={[styles.check, active && styles.checkActive]}>
                        {active && <Ionicons name="checkmark" size={13} color="#fff" />}
                      </View>
                      <Text style={[styles.tName, active && { color: COLORS.primary, fontWeight: '600' }]}>{t.name}</Text>
                      <Text style={[styles.tPrice, active && { color: COLORS.primary }]}>+{formatCurrency(t.price)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tổng:</Text>
                <Text style={styles.totalVal}>{formatCurrency(total)}</Text>
              </View>
            </>
          )}
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.skipBtn} onPress={onClose}>
              <Text style={{ color: COLORS.gray, fontWeight: '600' }}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={() => { onConfirm(item, selected); onClose(); }}>
              <Ionicons name="cart-outline" size={17} color="#fff" />
              <Text style={styles.addText}>Thêm vào giỏ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const isShopOpenNow = (shop) => {
  if (!shop?.openTime || !shop?.closeTime) return true;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const parse = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
  const open = parse(shop.openTime);
  const close = parse(shop.closeTime);
  return open <= close ? (nowMins >= open && nowMins < close) : (nowMins >= open || nowMins < close);
};

export default function CustomerShopsScreen({ navigation, route }) {
  const { linkedShops, menuItems, addToCart, getCartCount, toggleFavorite, subscribeFavorites, subscribeNotifications } = useApp();
  const { currentUser } = useAuth();
  const [selectedShop, setSelectedShop] = useState(null);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState({ visible: false, item: null });
  const [selectedCat, setSelectedCat] = useState('Tất cả');
  const [favorites, setFavorites] = React.useState([]);

  React.useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeFavorites(currentUser.id, setFavorites);
    return () => unsub();
  }, [currentUser?.id]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  React.useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeNotifications(currentUser.id, n => setUnreadCount(n.filter(x => !x.read).length));
    return () => unsub();
  }, [currentUser?.id]);

  // Auto-select shop nếu điều hướng từ Search
  React.useEffect(() => {
    if (route?.params?.autoSelectShopId) {
      const shop = linkedShops.find(s => s.id === route.params.autoSelectShopId);
      if (shop) setSelectedShop(shop);
    }
  }, [route?.params?.autoSelectShopId]);

  const isGuest = !currentUser;
  const cartCount = getCartCount(currentUser?.id || '');

  // Menu của shop đang chọn
  const shopMenu = selectedShop
    ? menuItems.filter(i => i.shopId === selectedShop.userId && i.available)
    : [];

  const shopCats = ['Tất cả', ...Array.from(new Set(shopMenu.map(i => i.category).filter(Boolean)))];

  const filtered = shopMenu.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) &&
    (selectedCat === 'Tất cả' || i.category === selectedCat)
  );

  if (selectedShop) {
    return (
      <View style={styles.container}>
        {/* Header shop */}
        <View style={styles.shopHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => { setSelectedShop(null); setSearch(''); setSelectedCat('Tất cả'); }}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.shopHeaderName}>{selectedShop.name}</Text>
            <Text style={styles.shopHeaderSub} numberOfLines={1}>
              {selectedShop.address || 'Shop liên kết'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => isGuest ? navigation.navigate('Login') : navigation.navigate('CustomerCart')}
            style={styles.cartBtn}
          >
            <Ionicons name="cart-outline" size={26} color="#fff" />
            {!isGuest && cartCount > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{cartCount}</Text></View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm món trong quán..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={COLORS.gray}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category filter */}
        {shopCats.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catBar} contentContainerStyle={styles.catContent}>
            {shopCats.map(c => (
              <TouchableOpacity key={c} style={[styles.catChip, selectedCat === c && styles.catChipActive]} onPress={() => setSelectedCat(c)}>
                <Text style={[styles.catText, selectedCat === c && styles.catTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Menu list */}
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          numColumns={2}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                if (isGuest) { navigation.navigate('Login'); return; }
                setModal({ visible: true, item });
              }}
              activeOpacity={0.85}
            >
              <View style={styles.imgWrap}>
                {item.image
                  ? <Image source={{ uri: item.image }} style={styles.img} />
                  : <View style={[styles.img, styles.imgPlaceholder]}>
                      <Ionicons name="fast-food-outline" size={38} color={COLORS.primary} />
                    </View>}
                {item.toppings?.length > 0 && (
                  <View style={styles.tBadge}>
                    <Ionicons name="add-circle" size={11} color="#fff" />
                    <Text style={styles.tBadgeText}>{item.toppings.length} kèm</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                {item.category && (
                  <Text style={styles.cardCat}>{item.category}</Text>
                )}
                <View style={styles.cardFoot}>
                  <Text style={styles.cardPrice}>{formatCurrency(item.price)}</Text>
                  <View style={styles.addCircle}>
                    <Ionicons name="add" size={18} color="#fff" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="fast-food-outline" size={60} color={COLORS.lightGray} />
              <Text style={styles.emptyText}>
                {search ? 'Không tìm thấy món' : 'Quán chưa có thực đơn'}
              </Text>
            </View>
          }
        />

        <ToppingModal
          visible={modal.visible}
          item={modal.item}
          onClose={() => setModal({ visible: false, item: null })}
          onConfirm={(item, toppings) => {
            if (isGuest) { navigation.navigate('Login'); return; }
            addToCart(currentUser.id, item, toppings);
          }}
        />
      </View>
    );
  }

  // Màn hình danh sách shop
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Quán liên kết</Text>
          <Text style={styles.headerSub}>{linkedShops.length} quán đang hoạt động</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('CustomerFavorites')} style={styles.iconBtn}>
          <Ionicons name="heart" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('CustomerSearch')} style={styles.iconBtn}>
          <Ionicons name="search" size={22} color="#fff" />
        </TouchableOpacity>
        {!isGuest && (
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('CustomerNotifications')}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            {unreadCount > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => isGuest ? navigation.navigate('Login') : navigation.navigate('CustomerCart')}
          style={styles.cartBtn}
        >
          <Ionicons name="cart-outline" size={26} color="#fff" />
          {!isGuest && cartCount > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{cartCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={linkedShops}
        keyExtractor={s => s.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item: shop }) => {
          const shopItemCount = menuItems.filter(i => i.shopId === shop.userId && i.available).length;
          const isOpen = isShopOpenNow(shop);
          return (
            <TouchableOpacity style={styles.shopCard} onPress={() => setSelectedShop(shop)} activeOpacity={0.85}>
              <View style={styles.shopAvatar}>
                {shop.avatar
                  ? <Image source={{ uri: shop.avatar }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  : <Ionicons name="storefront" size={28} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.shopName}>{shop.name}</Text>
                  {!isGuest && (
                    <TouchableOpacity onPress={() => toggleFavorite(currentUser.id, shop.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons
                        name={favorites.includes(shop.id) ? 'heart' : 'heart-outline'}
                        size={16}
                        color={favorites.includes(shop.id) ? '#F44336' : COLORS.gray}
                      />
                    </TouchableOpacity>
                  )}
                  {!isOpen && (
                    <View style={styles.closedBadge}>
                      <Text style={styles.closedBadgeText}>Đóng cửa</Text>
                    </View>
                  )}
                  {isOpen && <View style={styles.openBadge}><Text style={styles.openBadgeText}>Mở cửa</Text></View>}
                </View>
                {shop.description ? <Text style={styles.shopDesc} numberOfLines={1}>{shop.description}</Text> : null}
                {shop.address ? (
                  <Text style={styles.shopAddr} numberOfLines={1}>
                    <Ionicons name="location-outline" size={12} color={COLORS.gray} /> {shop.address}
                  </Text>
                ) : null}
                <View style={styles.shopMeta}>
                  <View style={styles.shopMetaChip}>
                    <Ionicons name="fast-food-outline" size={12} color="#2196F3" />
                    <Text style={styles.shopMetaText}>{shopItemCount} món</Text>
                  </View>
                  {(shop.openTime || shop.closeTime) && (
                    <View style={styles.shopMetaChip}>
                      <Ionicons name="time-outline" size={12} color="#2196F3" />
                      <Text style={styles.shopMetaText}>{shop.openTime || '?'} – {shop.closeTime || '?'}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="storefront-outline" size={64} color={COLORS.lightGray} />
            <Text style={styles.emptyText}>Chưa có quán liên kết</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: '#2196F3', padding: 16, paddingTop: 48,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  shopHeader: {
    backgroundColor: '#2196F3', padding: 14, paddingTop: 48,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  backBtn: { padding: 4 },
  shopHeaderName: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  shopHeaderSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  iconBtn: { padding: 4, marginRight: 4 },
  cartBtn: { position: 'relative', padding: 4 },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: COLORS.dark, borderRadius: 10,
    width: 20, height: 20, justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  // Shop list card
  shopCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 14, marginBottom: 10, elevation: 2, gap: 12,
  },
  shopAvatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#2196F3',
    justifyContent: 'center', alignItems: 'center',
  },
  shopName: { fontSize: 16, fontWeight: 'bold', color: COLORS.dark },
  shopDesc: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  shopAddr: { fontSize: 12, color: COLORS.gray, marginTop: 3 },
  closedBadge: { backgroundColor: '#F443361A', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  closedBadgeText: { fontSize: 10, color: '#F44336', fontWeight: 'bold' },
  openBadge: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  openBadgeText: { fontSize: 10, color: '#4CAF50', fontWeight: 'bold' },
  catBar: { backgroundColor: '#fff', maxHeight: 46, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  catContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#F0F0F0', marginRight: 8 },
  catChipActive: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  catText: { fontSize: 13, color: COLORS.gray },
  catTextActive: { color: '#fff', fontWeight: 'bold' },
  shopMeta: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  shopMetaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  shopMetaText: { fontSize: 11, color: '#2196F3', fontWeight: '600' },
  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    margin: 12, borderRadius: 12, paddingHorizontal: 12, elevation: 2,
  },
  searchInput: { flex: 1, height: 42, marginLeft: 8, fontSize: 14, color: COLORS.dark },
  // Menu grid
  list: { padding: 8, paddingBottom: 20 },
  card: {
    flex: 1, margin: 6, backgroundColor: '#fff', borderRadius: 14,
    overflow: 'hidden', elevation: 3,
  },
  imgWrap: { position: 'relative' },
  img: { width: '100%', height: 118 },
  imgPlaceholder: { backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  tBadge: {
    position: 'absolute', top: 6, left: 6,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2,
  },
  tBadgeText: { color: '#fff', fontSize: 10, marginLeft: 2, fontWeight: 'bold' },
  cardBody: { padding: 10 },
  cardName: { fontSize: 13, fontWeight: 'bold', color: COLORS.dark },
  cardCat: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  cardPrice: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
  addCircle: {
    backgroundColor: COLORS.primary, borderRadius: 18,
    width: 30, height: 30, justifyContent: 'center', alignItems: 'center',
  },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.gray, fontSize: 15, marginTop: 10 },
  // Topping Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', paddingHorizontal: 20 },
  sheet: { backgroundColor: '#fff', borderRadius: 20, paddingBottom: 20, maxHeight: '80%' },
  sheetTop: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 12, paddingHorizontal: 14, paddingBottom: 4 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  itemIcon: { width: 56, height: 56, borderRadius: 12, backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  itemImg: { width: 56, height: 56 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: COLORS.dark },
  shopTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, marginBottom: 2 },
  shopTagText: { fontSize: 11, color: '#2196F3', fontWeight: '600' },
  itemPrice: { fontSize: 14, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  toppingTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  tRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 6, padding: 10, borderRadius: 10, backgroundColor: COLORS.lightGray, borderWidth: 1.5, borderColor: 'transparent' },
  tRowActive: { backgroundColor: COLORS.primary + '15', borderColor: COLORS.primary },
  check: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.gray, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  checkActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tName: { flex: 1, fontSize: 13, color: COLORS.dark },
  tPrice: { fontSize: 13, color: COLORS.gray },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 10, padding: 10, backgroundColor: COLORS.background, borderRadius: 10 },
  totalLabel: { color: COLORS.gray, fontSize: 14 },
  totalVal: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  modalBtns: { flexDirection: 'row', margin: 16, gap: 10 },
  skipBtn: { flex: 1, padding: 13, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.lightGray },
  addBtn: { flex: 2, flexDirection: 'row', padding: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, gap: 6 },
  addText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
