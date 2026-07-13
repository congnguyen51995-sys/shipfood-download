import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity,
  Image, SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { COLORS, formatCurrency } from '../../utils/format';

export default function CustomerSearchScreen({ navigation }) {
  const { menuItems, linkedShops, addToCart } = useApp();
  const { currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const q = query.trim().toLowerCase();

  const shopResults = q
    ? linkedShops.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
      )
    : [];

  const menuResults = q
    ? menuItems.filter(i =>
        i.available !== false && (
          i.name?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q)
        )
      )
    : [];

  const sections = [
    ...(shopResults.length > 0 ? [{ title: 'Quán ăn', data: shopResults, type: 'shop' }] : []),
    ...(menuResults.length > 0 ? [{ title: 'Món ăn', data: menuResults, type: 'menu' }] : []),
  ];

  const noResults = q && shopResults.length === 0 && menuResults.length === 0;

  const handleShopPress = (shop) => {
    navigation.navigate('CustomerShops', { autoSelectShopId: shop.id });
  };

  const handleMenuPress = (item) => {
    if (!currentUser) { navigation.navigate('Login'); return; }
    addToCart(currentUser.id, item, []);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.dark} />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.gray} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Tìm món ăn, quán..."
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholderTextColor={COLORS.gray}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!q && (
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={64} color={COLORS.lightGray} />
          <Text style={styles.emptyTitle}>Tìm kiếm</Text>
          <Text style={styles.emptyDesc}>Nhập tên món ăn hoặc quán bạn muốn tìm</Text>
        </View>
      )}

      {noResults && (
        <View style={styles.empty}>
          <Ionicons name="sad-outline" size={64} color={COLORS.lightGray} />
          <Text style={styles.emptyTitle}>Không tìm thấy</Text>
          <Text style={styles.emptyDesc}>Thử từ khoá khác nhé</Text>
        </View>
      )}

      {sections.length > 0 && (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Ionicons
                name={section.type === 'shop' ? 'storefront-outline' : 'fast-food-outline'}
                size={15} color={COLORS.primary}
              />
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>{section.data.length} kết quả</Text>
            </View>
          )}
          renderItem={({ item, section }) => {
            if (section.type === 'shop') {
              return (
                <TouchableOpacity style={styles.shopRow} onPress={() => handleShopPress(item)} activeOpacity={0.8}>
                  <View style={styles.shopAvatar}>
                    {item.avatar
                      ? <Image source={{ uri: item.avatar }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                      : <Ionicons name="storefront" size={22} color="#fff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shopName}>{item.name}</Text>
                    {item.description ? <Text style={styles.shopDesc} numberOfLines={1}>{item.description}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity style={styles.menuRow} onPress={() => handleMenuPress(item)} activeOpacity={0.8}>
                <View style={styles.menuImg}>
                  {item.image
                    ? <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    : <Ionicons name="fast-food-outline" size={22} color={COLORS.primary} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuName}>{item.name}</Text>
                  {item.shopName && <Text style={styles.menuShop}>{item.shopName}</Text>}
                  {item.category && <Text style={styles.menuCat}>{item.category}</Text>}
                </View>
                <View style={styles.menuRight}>
                  <Text style={styles.menuPrice}>{formatCurrency(item.price)}</Text>
                  <View style={styles.addBtn}>
                    <Ionicons name="add" size={16} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: 52, paddingBottom: 10, paddingHorizontal: 12,
    backgroundColor: '#fff', elevation: 3,
  },
  back: { padding: 4 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.background, borderRadius: 12,
    paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: COLORS.lightGray,
  },
  input: { flex: 1, fontSize: 15, color: COLORS.dark },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark, marginTop: 12 },
  emptyDesc: { fontSize: 13, color: COLORS.gray, marginTop: 6, textAlign: 'center' },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.background, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: 'bold', color: COLORS.dark },
  sectionCount: { fontSize: 12, color: COLORS.gray },
  shopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  shopAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#2196F3',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  shopName: { fontSize: 15, fontWeight: '600', color: COLORS.dark },
  shopDesc: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  menuImg: {
    width: 56, height: 56, borderRadius: 10, backgroundColor: COLORS.lightGray,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  menuName: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  menuShop: { fontSize: 11, color: '#2196F3', marginTop: 2 },
  menuCat: { fontSize: 11, color: COLORS.gray },
  menuRight: { alignItems: 'flex-end', gap: 6 },
  menuPrice: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
  addBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    width: 28, height: 28, justifyContent: 'center', alignItems: 'center',
  },
});
