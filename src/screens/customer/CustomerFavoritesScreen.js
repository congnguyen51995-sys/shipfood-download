import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../utils/format';

const isShopOpenNow = (shop) => {
  if (!shop?.openTime || !shop?.closeTime) return true;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const parse = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
  const open = parse(shop.openTime);
  const close = parse(shop.closeTime);
  return open <= close ? (nowMins >= open && nowMins < close) : (nowMins >= open || nowMins < close);
};

export default function CustomerFavoritesScreen({ navigation }) {
  const { linkedShops, menuItems, subscribeFavorites, toggleFavorite } = useApp();
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const unsub = subscribeFavorites(currentUser.id, setFavorites);
    return () => unsub();
  }, []);

  const favoriteShops = linkedShops.filter(s => favorites.includes(s.id));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quán yêu thích</Text>
        <Text style={styles.headerCount}>{favoriteShops.length}</Text>
      </View>

      <FlatList
        data={favoriteShops}
        keyExtractor={s => s.id}
        contentContainerStyle={{ padding: 12, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={64} color={COLORS.lightGray} />
            <Text style={styles.emptyTitle}>Chưa có quán yêu thích</Text>
            <Text style={styles.emptyDesc}>Nhấn ❤️ trên danh sách quán để lưu lại</Text>
            <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.navigate('CustomerShops')}>
              <Ionicons name="storefront-outline" size={16} color="#fff" />
              <Text style={styles.exploreBtnText}>Khám phá quán</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item: shop }) => {
          const isOpen = isShopOpenNow(shop);
          const itemCount = menuItems.filter(i => i.shopId === shop.userId && i.available).length;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('CustomerShops', { autoSelectShopId: shop.id })}
              activeOpacity={0.85}
            >
              <View style={styles.avatar}>
                {shop.avatar
                  ? <Image source={{ uri: shop.avatar }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  : <Ionicons name="storefront" size={28} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.shopName}>{shop.name}</Text>
                  <View style={[styles.badge, isOpen ? styles.openBadge : styles.closedBadge]}>
                    <Text style={[styles.badgeText, isOpen ? styles.openText : styles.closedText]}>
                      {isOpen ? 'Mở cửa' : 'Đóng cửa'}
                    </Text>
                  </View>
                </View>
                {shop.description ? <Text style={styles.desc} numberOfLines={1}>{shop.description}</Text> : null}
                <View style={styles.meta}>
                  <Ionicons name="fast-food-outline" size={12} color="#2196F3" />
                  <Text style={styles.metaText}>{itemCount} món</Text>
                  {shop.openTime ? (
                    <>
                      <Ionicons name="time-outline" size={12} color="#2196F3" style={{ marginLeft: 8 }} />
                      <Text style={styles.metaText}>{shop.openTime} – {shop.closeTime}</Text>
                    </>
                  ) : null}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => toggleFavorite(currentUser.id, shop.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="heart" size={22} color="#F44336" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, paddingTop: 52, paddingBottom: 14,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  back: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerCount: {
    fontSize: 13, color: '#fff', backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, fontWeight: 'bold',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark, marginTop: 12 },
  emptyDesc: { fontSize: 13, color: COLORS.gray, marginTop: 6, textAlign: 'center' },
  exploreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, marginTop: 20,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
  },
  exploreBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, elevation: 2,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#2196F3',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  shopName: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark },
  badge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  openBadge: { backgroundColor: '#E8F5E9' },
  closedBadge: { backgroundColor: '#FFEBEE' },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  openText: { color: '#4CAF50' },
  closedText: { color: '#F44336' },
  desc: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  metaText: { fontSize: 11, color: '#2196F3', fontWeight: '600', marginLeft: 3 },
});
