import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, ScrollView, StatusBar, Modal,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { formatCurrency, COLORS, CATEGORIES } from '../utils/format';
import { Ionicons } from '@expo/vector-icons';

// Modal chọn topping trước khi thêm vào giỏ
const ToppingModal = ({ visible, item, onClose, onConfirm }) => {
  const [selected, setSelected] = useState([]);

  if (!item) return null;

  const toggleTopping = (topping) => {
    setSelected((prev) =>
      prev.find((t) => t.id === topping.id)
        ? prev.filter((t) => t.id !== topping.id)
        : [...prev, topping]
    );
  };

  const toppingTotal = selected.reduce((s, t) => s + t.price, 0);
  const hasTopping = item.toppings && item.toppings.length > 0;

  const handleConfirm = () => {
    onConfirm(item, selected);
    setSelected([]);
    onClose();
  };

  const handleSkip = () => {
    onConfirm(item, []);
    setSelected([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Item info */}
          <View style={styles.modalItemRow}>
            <View style={styles.modalItemIcon}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.modalItemImage} />
              ) : (
                <Ionicons name="fast-food-outline" size={32} color={COLORS.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalItemName}>{item.name}</Text>
              <Text style={styles.modalItemPrice}>{formatCurrency(item.price)}</Text>
            </View>
          </View>

          {hasTopping ? (
            <>
              <Text style={styles.toppingTitle}>
                <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
                {'  '}Chọn món kèm (tuỳ chọn)
              </Text>

              <ScrollView style={styles.toppingList} showsVerticalScrollIndicator={false}>
                {item.toppings.map((topping) => {
                  const isSelected = !!selected.find((t) => t.id === topping.id);
                  return (
                    <TouchableOpacity
                      key={topping.id}
                      style={[styles.toppingRow, isSelected && styles.toppingRowActive]}
                      onPress={() => toggleTopping(topping)}
                    >
                      <View style={[styles.toppingCheck, isSelected && styles.toppingCheckActive]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                      </View>
                      <Text style={[styles.toppingName, isSelected && styles.toppingNameActive]}>
                        {topping.name}
                      </Text>
                      <Text style={[styles.toppingPrice, isSelected && styles.toppingPriceActive]}>
                        +{formatCurrency(topping.price)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Tổng tiền preview */}
              <View style={styles.totalPreview}>
                <Text style={styles.totalPreviewLabel}>Tổng:</Text>
                <Text style={styles.totalPreviewValue}>
                  {formatCurrency(item.price + toppingTotal)}
                </Text>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                  <Text style={styles.skipBtnText}>Bỏ qua</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                  <Ionicons name="cart-outline" size={18} color={COLORS.white} />
                  <Text style={styles.confirmBtnText}>Thêm vào giỏ</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.noToppingText}>Món này không có topping</Text>
              <TouchableOpacity style={[styles.confirmBtn, { margin: 16 }]} onPress={handleSkip}>
                <Ionicons name="cart-outline" size={18} color={COLORS.white} />
                <Text style={styles.confirmBtnText}>Thêm vào giỏ</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const MenuCard = ({ item, onPress }) => (
  <View style={styles.card}>
    <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.9}>
      <View style={styles.cardImageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Ionicons name="fast-food-outline" size={40} color={COLORS.primary} />
          </View>
        )}
        {!item.available && (
          <View style={styles.unavailableOverlay}>
            <Text style={styles.unavailableText}>Hết hàng</Text>
          </View>
        )}
        {item.toppings && item.toppings.length > 0 && (
          <View style={styles.toppingBadge}>
            <Ionicons name="add-circle" size={12} color={COLORS.white} />
            <Text style={styles.toppingBadgeText}>{item.toppings.length} topping</Text>
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
        {/* Hiện danh sách topping ngắn gọn */}
        {item.toppings && item.toppings.length > 0 && (
          <View style={styles.toppingPreview}>
            <Text style={styles.toppingPreviewLabel}>Kèm: </Text>
            <Text style={styles.toppingPreviewText} numberOfLines={1}>
              {item.toppings.slice(0, 2).map(t => t.name.replace('Thêm ', '')).join(', ')}
              {item.toppings.length > 2 ? '...' : ''}
            </Text>
          </View>
        )}
        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>{formatCurrency(item.price)}</Text>
          <TouchableOpacity
            style={[styles.addBtn, !item.available && styles.addBtnDisabled]}
            onPress={() => item.available && onPress(item)}
            disabled={!item.available}
          >
            <Ionicons name="add" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  </View>
);

export default function HomeScreen({ navigation }) {
  const { menuItems, addToCart, cartCount, restaurantInfo } = useApp();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [toppingModal, setToppingModal] = useState({ visible: false, item: null });

  const filtered = menuItems.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === 'Tất cả' || item.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const handleCardPress = (item) => {
    if (!item.available) return;
    setToppingModal({ visible: true, item });
  };

  const handleConfirmAdd = (item, toppings) => {
    addToCart(item, toppings);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🍜 ShipFood</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            <Ionicons name="location" size={12} color={COLORS.secondary} />
            {' '}{restaurantInfo.name}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={styles.cartBtn}>
          <Ionicons name="cart-outline" size={28} color={COLORS.white} />
          {cartCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm món ăn..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={COLORS.gray}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categories}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Menu List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item }) => (
          <MenuCard item={item} onPress={handleCardPress} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="fast-food-outline" size={64} color={COLORS.lightGray} />
            <Text style={styles.emptyText}>Không tìm thấy món ăn</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Topping Modal */}
      <ToppingModal
        visible={toppingModal.visible}
        item={toppingModal.item}
        onClose={() => setToppingModal({ visible: false, item: null })}
        onConfirm={handleConfirmAdd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, padding: 16, paddingTop: 48,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  headerSub: { fontSize: 12, color: COLORS.secondary, marginTop: 2 },
  cartBtn: { position: 'relative', padding: 4 },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: COLORS.dark, borderRadius: 10,
    width: 20, height: 20, justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: COLORS.white, fontSize: 11, fontWeight: 'bold' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, margin: 12,
    borderRadius: 12, paddingHorizontal: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, color: COLORS.dark, fontSize: 15 },
  categories: { maxHeight: 50 },
  categoriesContent: { paddingHorizontal: 12, alignItems: 'center' },
  catChip: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.white, marginRight: 8,
    borderWidth: 1, borderColor: COLORS.lightGray,
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { color: COLORS.gray, fontSize: 13 },
  catChipTextActive: { color: COLORS.white, fontWeight: 'bold' },
  list: { padding: 8, paddingBottom: 20 },
  card: {
    flex: 1, margin: 6, backgroundColor: COLORS.white,
    borderRadius: 14, overflow: 'hidden',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6,
  },
  cardImageContainer: { position: 'relative' },
  cardImage: { width: '100%', height: 120 },
  cardImagePlaceholder: {
    backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center',
  },
  unavailableOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  unavailableText: { color: COLORS.white, fontWeight: 'bold', fontSize: 14 },
  toppingBadge: {
    position: 'absolute', top: 6, left: 6,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  toppingBadgeText: { color: COLORS.white, fontSize: 10, marginLeft: 2, fontWeight: 'bold' },
  cardContent: { padding: 10 },
  cardName: { fontSize: 13, fontWeight: 'bold', color: COLORS.dark, marginBottom: 2 },
  cardDesc: { fontSize: 11, color: COLORS.gray, marginBottom: 4 },
  toppingPreview: { flexDirection: 'row', marginBottom: 6 },
  toppingPreviewLabel: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  toppingPreviewText: { fontSize: 11, color: COLORS.gray, flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
  addBtn: {
    backgroundColor: COLORS.primary, borderRadius: 20,
    width: 32, height: 32, justifyContent: 'center', alignItems: 'center',
  },
  addBtnDisabled: { backgroundColor: COLORS.gray },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.gray, fontSize: 16, marginTop: 12 },

  // Topping Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 32, maxHeight: '80%',
  },
  handleBar: {
    width: 40, height: 4, backgroundColor: COLORS.lightGray,
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8,
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 16,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center', alignItems: 'center',
  },
  modalItemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  modalItemIcon: {
    width: 60, height: 60, borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden',
  },
  modalItemImage: { width: 60, height: 60 },
  modalItemName: { fontSize: 16, fontWeight: 'bold', color: COLORS.dark },
  modalItemPrice: { fontSize: 14, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  toppingTitle: {
    fontSize: 14, fontWeight: 'bold', color: COLORS.dark,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  },
  toppingList: { maxHeight: 260, paddingHorizontal: 16 },
  toppingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 12, marginBottom: 6,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  toppingRowActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  toppingCheck: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: COLORS.gray,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  toppingCheckActive: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primary,
  },
  toppingName: { flex: 1, fontSize: 14, color: COLORS.dark },
  toppingNameActive: { color: COLORS.primary, fontWeight: '600' },
  toppingPrice: { fontSize: 13, color: COLORS.gray, fontWeight: '500' },
  toppingPriceActive: { color: COLORS.primary },
  totalPreview: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 10, marginBottom: 4,
    padding: 10, backgroundColor: COLORS.background, borderRadius: 10,
  },
  totalPreviewLabel: { fontSize: 14, color: COLORS.gray },
  totalPreviewValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  noToppingText: {
    textAlign: 'center', color: COLORS.gray, fontSize: 14,
    paddingVertical: 20,
  },
  modalButtons: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, gap: 10,
  },
  skipBtn: {
    flex: 1, padding: 14, borderRadius: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.lightGray,
  },
  skipBtnText: { color: COLORS.gray, fontWeight: '600', fontSize: 14 },
  confirmBtn: {
    flex: 2, flexDirection: 'row', padding: 14, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, gap: 6,
  },
  confirmBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 15 },
});
