import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ScrollView, Alert, Switch, Image, ActivityIndicator,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { formatCurrency, COLORS, CATEGORIES } from '../utils/format';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const ITEM_CATS = CATEGORIES.filter((c) => c !== 'Tất cả');

// Picker giờ:phút nhỏ gọn
const TimePicker = ({ label, value, onChange }) => {
  const [h, setH] = useState(value ? parseInt(value.split(':')[0]) : 0);
  const [m, setM] = useState(value ? parseInt(value.split(':')[1]) : 0);

  const update = (newH, newM) => {
    const hh = Math.max(0, Math.min(23, newH));
    const mm = Math.max(0, Math.min(59, newM));
    setH(hh); setM(mm);
    onChange(`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`);
  };

  return (
    <View style={tpStyles.wrap}>
      <Text style={tpStyles.label}>{label}</Text>
      <View style={tpStyles.row}>
        {/* Giờ */}
        <TouchableOpacity style={tpStyles.btn} onPress={() => update(h - 1, m)}>
          <Ionicons name="remove" size={16} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={tpStyles.val}>{String(h).padStart(2,'0')}</Text>
        <TouchableOpacity style={tpStyles.btn} onPress={() => update(h + 1, m)}>
          <Ionicons name="add" size={16} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={tpStyles.sep}>:</Text>
        {/* Phút */}
        <TouchableOpacity style={tpStyles.btn} onPress={() => update(h, m - 5)}>
          <Ionicons name="remove" size={16} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={tpStyles.val}>{String(m).padStart(2,'0')}</Text>
        <TouchableOpacity style={tpStyles.btn} onPress={() => update(h, m + 5)}>
          <Ionicons name="add" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const tpStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center' },
  label: { fontSize: 12, color: COLORS.gray, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray, borderRadius: 10, padding: 4, gap: 2 },
  btn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderRadius: 6 },
  val: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark, minWidth: 28, textAlign: 'center' },
  sep: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark, marginHorizontal: 2 },
});

const FormModal = ({ visible, onClose, onSave, initial }) => {
  const [name, setName] = useState(initial?.name || '');
  const [price, setPrice] = useState(initial?.price?.toString() || '');
  const [category, setCategory] = useState(initial?.category || ITEM_CATS[0]);
  const [description, setDescription] = useState(initial?.description || '');
  const [image, setImage] = useState(initial?.image || null);
  const [available, setAvailable] = useState(initial?.available !== false);
  const [toppings, setToppings] = useState(initial?.toppings || []);
  const [toppingName, setToppingName] = useState('');
  const [toppingPrice, setToppingPrice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [limitTime, setLimitTime] = useState(!!(initial?.saleStart || initial?.saleEnd));
  const [saleStart, setSaleStart] = useState(initial?.saleStart || '06:00');
  const [saleEnd, setSaleEnd] = useState(initial?.saleEnd || '22:00');

  const addTopping = () => {
    if (!toppingName.trim()) return;
    const p = parseFloat(toppingPrice);
    if (!toppingPrice || isNaN(p) || p < 0) return;
    setToppings(prev => [...prev, { id: Date.now().toString(), name: toppingName.trim(), price: p }]);
    setToppingName('');
    setToppingPrice('');
  };

  const removeTopping = (id) => setToppings(prev => prev.filter(t => t.id !== id));

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true, // lấy base64 trực tiếp, không cần đọc file
    });
    if (!result.canceled && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập tên món');
    const p = parseFloat(price);
    if (!price || isNaN(p) || p <= 0) return Alert.alert('Lỗi', 'Vui lòng nhập giá hợp lệ');

    setUploading(true);
    let imageUrl = image;

    // image đã là base64 (data:image/jpeg;base64,...) hoặc null — không cần convert

    onSave({
      name: name.trim(), price: p, category,
      description: description.trim(), image: imageUrl, available, toppings,
      saleStart: limitTime ? saleStart : null,
      saleEnd: limitTime ? saleEnd : null,
    });
    setUploading(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose} disabled={uploading}>
          <Ionicons name="close" size={26} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>{initial ? 'Sửa món ăn' : 'Thêm món ăn'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={uploading}>
          {uploading
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Text style={styles.saveText}>Lưu</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.modalBody}>
        {/* Image Picker */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {image ? (
            <View>
              <Image source={{ uri: image }} style={styles.pickedImage} />
              <TouchableOpacity style={styles.removeImgBtn} onPress={() => setImage(null)}>
                <Ionicons name="close-circle" size={24} color="#F44336" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePickerPlaceholder}>
              <Ionicons name="camera-outline" size={40} color={COLORS.primary} />
              <Text style={styles.imagePickerText}>Chọn ảnh món ăn</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Tên món *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="VD: Cơm tấm sườn" placeholderTextColor={COLORS.gray} />

        <Text style={styles.label}>Giá tiền (VNĐ) *</Text>
        <TextInput
          style={styles.input} value={price} onChangeText={setPrice}
          placeholder="VD: 45000" keyboardType="numeric" placeholderTextColor={COLORS.gray}
        />

        <Text style={styles.label}>Danh mục</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
          {ITEM_CATS.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, category === cat && styles.catChipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Mô tả</Text>
        <TextInput
          style={[styles.input, styles.textArea]} value={description}
          onChangeText={setDescription} placeholder="Mô tả món ăn..." multiline numberOfLines={3}
          placeholderTextColor={COLORS.gray}
        />

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>Trạng thái</Text>
            <Text style={{ fontSize: 12, color: available ? '#4CAF50' : COLORS.danger, marginBottom: 4 }}>
              {available ? 'Còn hàng' : 'Hết hàng'}
            </Text>
          </View>
          <Switch
            value={available} onValueChange={setAvailable}
            trackColor={{ false: '#ffcdd2', true: '#c8e6c9' }}
            thumbColor={available ? '#4CAF50' : COLORS.danger}
          />
        </View>

        {/* Giờ bán */}
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>Giới hạn giờ bán</Text>
            <Text style={{ fontSize: 12, color: limitTime ? COLORS.primary : COLORS.gray, marginBottom: 4 }}>
              {limitTime ? `${saleStart} – ${saleEnd}` : 'Bán cả ngày'}
            </Text>
          </View>
          <Switch
            value={limitTime} onValueChange={setLimitTime}
            trackColor={{ false: COLORS.lightGray, true: COLORS.primary + '80' }}
            thumbColor={limitTime ? COLORS.primary : COLORS.gray}
          />
        </View>
        {limitTime && (
          <View style={styles.timeRow}>
            <TimePicker label="Bắt đầu bán" value={saleStart} onChange={setSaleStart} />
            <View style={{ width: 16 }} />
            <TimePicker label="Kết thúc bán" value={saleEnd} onChange={setSaleEnd} />
          </View>
        )}

        <Text style={[styles.label, { marginTop: 20 }]}>
          Món kèm / Topping
        </Text>

        {toppings.map((t) => (
          <View key={t.id} style={styles.toppingItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
            <Text style={styles.toppingItemName}>{t.name}</Text>
            <Text style={styles.toppingItemPrice}>+{formatCurrency(t.price)}</Text>
            <TouchableOpacity onPress={() => removeTopping(t.id)} style={styles.toppingRemove}>
              <Ionicons name="close-circle" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.toppingAdd}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder="Tên topping (VD: Thêm trứng)"
            value={toppingName} onChangeText={setToppingName}
            placeholderTextColor={COLORS.gray}
          />
          <TextInput
            style={[styles.input, { width: 90 }]}
            placeholder="Giá" value={toppingPrice}
            onChangeText={setToppingPrice} keyboardType="numeric"
            placeholderTextColor={COLORS.gray}
          />
          <TouchableOpacity style={styles.toppingAddBtn} onPress={addTopping}>
            <Ionicons name="add" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Modal>
  );
};

export default function MenuManagerScreen() {
  const { menuItems, addMenuItem, updateMenuItem, deleteMenuItem } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const handleEdit = (item) => { setEditItem(item); setShowForm(true); };

  const handleDelete = (item) => {
    Alert.alert('Xóa món ăn', `Bạn có chắc muốn xóa "${item.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => deleteMenuItem(item.id) },
    ]);
  };

  const handleSave = (data) => {
    if (editItem) updateMenuItem(editItem.id, data);
    else addMenuItem(data);
    setEditItem(null);
  };

  const toggleAvailable = (item) => {
    updateMenuItem(item.id, { available: !item.available });
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View style={styles.itemImageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
            <Ionicons name="fast-food-outline" size={28} color={COLORS.primary} />
          </View>
        )}
        {!item.available && (
          <View style={styles.soldOutOverlay}>
            <Text style={styles.soldOutOverlayText}>Hết hàng</Text>
          </View>
        )}
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemCat}>{item.category}</Text>
        <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
        {/* Toggle còn/hết hàng nhanh */}
        <TouchableOpacity
          style={[styles.availBtn, { backgroundColor: item.available ? '#E8F5E9' : '#FFEBEE' }]}
          onPress={() => toggleAvailable(item)}
        >
          <Ionicons
            name={item.available ? 'checkmark-circle' : 'close-circle'}
            size={14}
            color={item.available ? '#4CAF50' : COLORS.danger}
          />
          <Text style={[styles.availBtnText, { color: item.available ? '#4CAF50' : COLORS.danger }]}>
            {item.available ? 'Còn hàng' : 'Hết hàng'}
          </Text>
        </TouchableOpacity>
        {item.saleStart && (
          <View style={styles.timeBadge}>
            <Ionicons name="time-outline" size={11} color="#FF9800" />
            <Text style={styles.timeBadgeText}>{item.saleStart}–{item.saleEnd}</Text>
          </View>
        )}
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(item)}>
          <Ionicons name="pencil" size={18} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash" size={18} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý Menu</Text>
        <Text style={styles.headerCount}>{menuItems.length} món</Text>
      </View>

      <FlatList
        data={menuItems} keyExtractor={(item) => item.id}
        renderItem={renderItem} contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="restaurant-outline" size={64} color={COLORS.lightGray} />
            <Text style={styles.emptyText}>Chưa có món ăn nào</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => { setEditItem(null); setShowForm(true); }}>
        <Ionicons name="add" size={30} color={COLORS.white} />
      </TouchableOpacity>

      {showForm && (
        <FormModal
          visible={showForm}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSave={handleSave}
          initial={editItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, padding: 16, paddingTop: 52,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.white },
  headerCount: { fontSize: 14, color: COLORS.secondary },
  list: { padding: 12, paddingBottom: 80 },
  item: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    borderRadius: 12, marginBottom: 10, overflow: 'hidden',
    elevation: 2,
  },
  itemImageContainer: { width: 90, height: 100, position: 'relative' },
  itemImage: { width: 90, height: 100 },
  itemImagePlaceholder: { backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  soldOutOverlay: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center',
  },
  soldOutOverlayText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  itemInfo: { flex: 1, padding: 10, justifyContent: 'center' },
  itemName: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark },
  itemCat: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  itemPrice: { fontSize: 14, color: COLORS.primary, fontWeight: 'bold', marginTop: 4 },
  availBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginTop: 6,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  availBtnText: { fontSize: 11, fontWeight: '600' },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4, backgroundColor: '#FFF3E0', alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  timeBadgeText: { fontSize: 10, color: '#FF9800', fontWeight: '600' },
  itemActions: { justifyContent: 'space-around', padding: 10 },
  editBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center',
  },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center',
  },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    elevation: 6,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.gray, fontSize: 16, marginTop: 12 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray, paddingTop: 52,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark },
  saveText: { fontSize: 16, color: COLORS.primary, fontWeight: 'bold' },
  modalBody: { padding: 16 },
  imagePicker: { borderRadius: 12, overflow: 'hidden', marginBottom: 16, height: 180 },
  pickedImage: { width: '100%', height: '100%' },
  removeImgBtn: { position: 'absolute', top: 8, right: 8 },
  imagePickerPlaceholder: {
    flex: 1, backgroundColor: COLORS.lightGray,
    justifyContent: 'center', alignItems: 'center',
  },
  imagePickerText: { color: COLORS.primary, marginTop: 8, fontSize: 14 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.dark, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: COLORS.white, borderRadius: 10, padding: 12,
    fontSize: 15, borderWidth: 1, borderColor: COLORS.lightGray, color: COLORS.dark,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  catRow: { marginBottom: 4 },
  catChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.lightGray, marginRight: 8 },
  catChipActive: { backgroundColor: COLORS.primary },
  catChipText: { color: COLORS.gray, fontSize: 13 },
  catChipTextActive: { color: COLORS.white, fontWeight: 'bold' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  timeRow: { flexDirection: 'row', marginTop: 12, paddingHorizontal: 4 },
  toppingItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.lightGray, borderRadius: 10, padding: 10, marginBottom: 6,
  },
  toppingItemName: { flex: 1, fontSize: 13, color: COLORS.dark, marginLeft: 8 },
  toppingItemPrice: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginRight: 6 },
  toppingRemove: { padding: 2 },
  toppingAdd: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  toppingAddBtn: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
});
