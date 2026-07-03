import React, { useState, useRef, useCallback, memo, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ScrollView, Alert, Switch, Image, ActivityIndicator,
  SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, COLORS, CATEGORIES } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';

const SHOP_SURCHARGE = 2000;
const ITEM_CATS = CATEGORIES.filter(c => c !== 'Tất cả');

// ── Time Picker ────────────────────────────────────────────
const TimePicker = ({ label, value, onChange }) => {
  const [h, setH] = useState(value ? parseInt(value.split(':')[0]) : 0);
  const [m, setM] = useState(value ? parseInt(value.split(':')[1]) : 0);
  const update = (nh, nm) => {
    const hh = Math.max(0, Math.min(23, nh));
    const mm = Math.max(0, Math.min(59, nm));
    setH(hh); setM(mm);
    onChange(`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`);
  };
  return (
    <View style={tp.wrap}>
      <Text style={tp.label}>{label}</Text>
      <View style={tp.row}>
        <TouchableOpacity style={tp.btn} onPress={() => update(h-1,m)}><Ionicons name="remove" size={16} color={COLORS.primary}/></TouchableOpacity>
        <Text style={tp.val}>{String(h).padStart(2,'0')}</Text>
        <TouchableOpacity style={tp.btn} onPress={() => update(h+1,m)}><Ionicons name="add" size={16} color={COLORS.primary}/></TouchableOpacity>
        <Text style={tp.sep}>:</Text>
        <TouchableOpacity style={tp.btn} onPress={() => update(h,m-5)}><Ionicons name="remove" size={16} color={COLORS.primary}/></TouchableOpacity>
        <Text style={tp.val}>{String(m).padStart(2,'0')}</Text>
        <TouchableOpacity style={tp.btn} onPress={() => update(h,m+5)}><Ionicons name="add" size={16} color={COLORS.primary}/></TouchableOpacity>
      </View>
    </View>
  );
};
const tp = StyleSheet.create({
  wrap: { flex:1, alignItems:'center' },
  label: { fontSize:12, color:COLORS.gray, marginBottom:6 },
  row: { flexDirection:'row', alignItems:'center', backgroundColor:COLORS.lightGray, borderRadius:10, padding:4, gap:2 },
  btn: { width:28, height:28, justifyContent:'center', alignItems:'center', backgroundColor:'#fff', borderRadius:6 },
  val: { fontSize:18, fontWeight:'bold', color:COLORS.dark, minWidth:28, textAlign:'center' },
  sep: { fontSize:18, fontWeight:'bold', color:COLORS.dark, marginHorizontal:2 },
});

// ── Form Modal ─────────────────────────────────────────────
// Uses a View overlay instead of native Modal to avoid iOS New Architecture crashes
const FormModal = memo(({ onClose, onSave, initial, shopId, shopName }) => {
  const { menuItems } = useApp();
  const [name, setName] = useState(initial?.name || '');
  const [sourcePrice, setSourcePrice] = useState(
    initial ? String(initial.sourcePrice || initial.price - SHOP_SURCHARGE) : ''
  );
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
  const [showSuggest, setShowSuggest] = useState(false);
  const savingRef = useRef(false);

  const nameSuggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return menuItems.filter(m => m.name.toLowerCase().includes(q)).slice(0, 5);
  }, [name, menuItems]);

  const fillFromSuggestion = (item) => {
    setName(item.name);
    setCategory(item.category || ITEM_CATS[0]);
    setDescription(item.description || '');
    setImage(item.image || null);
    setToppings(item.toppings || []);
    const sp = Math.max(0, (item.price || 0) - SHOP_SURCHARGE);
    setSourcePrice(String(sp));
    setShowSuggest(false);
  };

  const sp = parseInt(sourcePrice);
  const displayPrice = !isNaN(sp) && sp > 0 ? sp + SHOP_SURCHARGE : null;

  const addTopping = () => {
    if (!toppingName.trim()) return;
    const p = parseFloat(toppingPrice);
    if (!toppingPrice || isNaN(p) || p < 0) return;
    setToppings(prev => [...prev, { id: Date.now().toString(), name: toppingName.trim(), price: p }]);
    setToppingName(''); setToppingPrice('');
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Cần quyền truy cập thư viện ảnh');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [4, 3],
      quality: 0.1,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      const b64 = result.assets[0].base64;
      if (b64.length > 250000) {
        Alert.alert('Ảnh quá lớn', 'Vui lòng chọn ảnh khác có dung lượng nhỏ hơn.');
        return;
      }
      setImage(`data:image/jpeg;base64,${b64}`);
    }
  };

  const handleSave = async () => {
    if (savingRef.current) return; // prevent double-tap crash on iOS
    if (!name.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập tên món');
    if (isNaN(sp) || sp <= 0) return Alert.alert('Lỗi', 'Vui lòng nhập giá gốc hợp lệ');
    savingRef.current = true;
    setUploading(true);
    try {
      await onSave({
        name: name.trim(),
        sourcePrice: sp,
        price: sp + SHOP_SURCHARGE,
        category, description: description.trim(),
        image, available, toppings,
        shopId, shopName,
        saleStart: limitTime ? saleStart : null,
        saleEnd: limitTime ? saleEnd : null,
      });
      // parent unmounts this component via setShowForm(false) — no state reset needed
    } catch (e) {
      savingRef.current = false;
      setUploading(false);
      Alert.alert('Lỗi lưu món', e.message || 'Không thể lưu. Thử lại hoặc bỏ ảnh nếu ảnh quá lớn.');
    }
  };

  return (
    <View style={s.overlay}>
      <SafeAreaView style={{flex:1}}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
      <View style={s.modalHeader}>
        <TouchableOpacity onPress={onClose} disabled={uploading}>
          <Ionicons name="close" size={26} color={COLORS.dark}/>
        </TouchableOpacity>
        <Text style={s.modalTitle}>{initial ? 'Sửa món' : 'Thêm món mới'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={uploading}>
          {uploading
            ? <ActivityIndicator size="small" color="#2196F3"/>
            : <Text style={s.saveText}>Lưu</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView style={s.modalBody}>
        {/* Ảnh */}
        <TouchableOpacity style={s.imgPicker} onPress={pickImage}>
          {image
            ? <>
                <Image source={{uri:image}} style={s.pickedImg}/>
                <TouchableOpacity style={s.removeImg} onPress={() => setImage(null)}>
                  <Ionicons name="close-circle" size={24} color="#F44336"/>
                </TouchableOpacity>
              </>
            : <View style={s.imgPlaceholder}>
                <Ionicons name="camera-outline" size={40} color="#2196F3"/>
                <Text style={s.imgPlaceholderText}>Chọn ảnh món ăn</Text>
              </View>}
        </TouchableOpacity>

        <Text style={s.label}>Tên món *</Text>
        <TextInput style={s.input} value={name}
          onChangeText={v => { setName(v); setShowSuggest(true); }}
          onFocus={() => setShowSuggest(true)}
          placeholder="VD: Cơm tấm sườn" placeholderTextColor={COLORS.gray}/>
        {showSuggest && nameSuggestions.length > 0 && (
          <View style={s.suggestBox}>
            {nameSuggestions.map(item => (
              <TouchableOpacity key={item.id} style={s.suggestRow} onPress={() => fillFromSuggestion(item)}>
                <View style={{ flex: 1 }}>
                  <Text style={s.suggestName}>{item.name}</Text>
                  <Text style={s.suggestMeta}>{item.category} · {formatCurrency(item.price)}</Text>
                </View>
                {item.shopId
                  ? <View style={s.suggestBadgeShop}><Text style={s.suggestBadgeText}>Quán</Text></View>
                  : <View style={s.suggestBadgeMain}><Text style={s.suggestBadgeText}>Menu chính</Text></View>}
                <Ionicons name="chevron-forward" size={14} color={COLORS.gray}/>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.suggestDismiss} onPress={() => setShowSuggest(false)}>
              <Text style={s.suggestDismissText}>Đóng gợi ý</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={s.label}>Giá gốc tại quán * (đ)</Text>
        <TextInput style={s.input} value={sourcePrice} onChangeText={setSourcePrice}
          placeholder="VD: 45000" keyboardType="numeric" placeholderTextColor={COLORS.gray}/>
        {displayPrice && (
          <View style={s.pricePreview}>
            <Ionicons name="information-circle-outline" size={14} color="#2196F3"/>
            <Text style={s.pricePreviewText}>
              Giá khách thấy trên app: {formatCurrency(displayPrice)} (đã cộng +{formatCurrency(SHOP_SURCHARGE)})
            </Text>
          </View>
        )}

        <Text style={s.label}>Danh mục</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:4}}>
          <View style={{flexDirection:'row', gap:8}}>
            {ITEM_CATS.map(c => (
              <TouchableOpacity key={c}
                style={[s.catChip, category===c && s.catChipActive]}
                onPress={() => setCategory(c)}>
                <Text style={[s.catChipText, category===c && s.catChipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={s.label}>Mô tả</Text>
        <TextInput style={[s.input,{height:70,textAlignVertical:'top'}]}
          value={description} onChangeText={setDescription}
          placeholder="Mô tả món..." multiline placeholderTextColor={COLORS.gray}/>

        <View style={s.switchRow}>
          <View>
            <Text style={s.label}>Trạng thái</Text>
            <Text style={{fontSize:12, color: available?'#4CAF50':COLORS.danger, marginBottom:4}}>
              {available ? 'Còn hàng' : 'Hết hàng'}
            </Text>
          </View>
          <Switch value={available} onValueChange={setAvailable}
            trackColor={{false:'#ffcdd2', true:'#c8e6c9'}}
            thumbColor={available?'#4CAF50':COLORS.danger}/>
        </View>

        <View style={s.switchRow}>
          <View>
            <Text style={s.label}>Giới hạn giờ bán</Text>
            <Text style={{fontSize:12, color: limitTime?COLORS.primary:COLORS.gray, marginBottom:4}}>
              {limitTime ? `${saleStart} – ${saleEnd}` : 'Bán cả ngày'}
            </Text>
          </View>
          <Switch value={limitTime} onValueChange={setLimitTime}
            trackColor={{false:COLORS.lightGray, true:COLORS.primary+'80'}}
            thumbColor={limitTime?COLORS.primary:COLORS.gray}/>
        </View>
        {limitTime && (
          <View style={{flexDirection:'row', marginTop:12}}>
            <TimePicker label="Bắt đầu bán" value={saleStart} onChange={setSaleStart}/>
            <View style={{width:16}}/>
            <TimePicker label="Kết thúc bán" value={saleEnd} onChange={setSaleEnd}/>
          </View>
        )}

        <Text style={[s.label, {marginTop:20}]}>Món kèm / Topping</Text>
        {toppings.map(t => (
          <View key={t.id} style={s.toppingItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.primary}/>
            <Text style={s.toppingName}>{t.name}</Text>
            <Text style={s.toppingPrice}>+{formatCurrency(t.price)}</Text>
            <TouchableOpacity onPress={() => setToppings(p=>p.filter(x=>x.id!==t.id))}>
              <Ionicons name="close-circle" size={18} color={COLORS.danger}/>
            </TouchableOpacity>
          </View>
        ))}
        <View style={s.toppingAdd}>
          <TextInput style={[s.input,{flex:1}]} placeholder="Tên topping"
            value={toppingName} onChangeText={setToppingName} placeholderTextColor={COLORS.gray}/>
          <TextInput style={[s.input,{width:80}]} placeholder="Giá"
            value={toppingPrice} onChangeText={setToppingPrice}
            keyboardType="numeric" placeholderTextColor={COLORS.gray}/>
          <TouchableOpacity style={s.toppingAddBtn} onPress={addTopping}>
            <Ionicons name="add" size={22} color="#fff"/>
          </TouchableOpacity>
        </View>
        <View style={{height:40}}/>
      </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
});

// ── Pick from main menu overlay ─────────────────────────────
const PickMenuModal = memo(({ onClose, onPick, shopItems }) => {
  const { menuItems } = useApp();
  const [q, setQ] = useState('');
  // Main menu items (no shopId) not already in shop menu
  const shopItemNames = new Set(shopItems.map(i => i.name));
  const mainItems = menuItems.filter(i => !i.shopId);
  const filtered = q.trim()
    ? mainItems.filter(i => i.name.toLowerCase().includes(q.trim().toLowerCase()) || i.category?.toLowerCase().includes(q.trim().toLowerCase()))
    : mainItems;

  return (
    <View style={s.overlay}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={26} color={COLORS.dark} /></TouchableOpacity>
          <Text style={s.modalTitle}>Chọn từ thực đơn chung</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.lightGray, gap: 8 }}>
          <Ionicons name="search-outline" size={18} color={COLORS.gray} />
          <TextInput
            style={{ flex: 1, fontSize: 14, color: COLORS.dark }}
            placeholder="Tìm tên món hoặc danh mục..."
            placeholderTextColor={COLORS.gray}
            value={q}
            onChangeText={setQ}
            autoFocus
          />
          {q.length > 0 && <TouchableOpacity onPress={() => setQ('')}><Ionicons name="close-circle" size={18} color={COLORS.gray} /></TouchableOpacity>}
        </View>
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20, gap: 8 }}
          renderItem={({ item }) => {
            const alreadyAdded = shopItemNames.has(item.name);
            return (
              <TouchableOpacity
                style={[s.pickRow, alreadyAdded && { opacity: 0.5 }]}
                onPress={() => !alreadyAdded && onPick(item)}
                activeOpacity={alreadyAdded ? 1 : 0.8}
              >
                <View style={s.pickImg}>
                  {item.image
                    ? <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    : <Ionicons name="fast-food-outline" size={22} color="#2196F3" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.pickName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.pickCat}>{item.category}</Text>
                </View>
                <Text style={s.pickPrice}>{formatCurrency(item.price)}</Text>
                {alreadyAdded
                  ? <View style={s.addedBadge}><Text style={s.addedText}>Đã có</Text></View>
                  : <View style={s.pickAddBtn}><Ionicons name="add" size={18} color="#fff" /></View>}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="search-outline" size={40} color={COLORS.lightGray} />
              <Text style={{ color: COLORS.gray, marginTop: 10 }}>Không tìm thấy món</Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
});

// ── Main Screen ────────────────────────────────────────────
export default function ShopMenuScreen() {
  const { menuItems, addMenuItem, updateMenuItem, deleteMenuItem } = useApp();
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showPick, setShowPick] = useState(false);

  const shopItems = menuItems.filter(i => i.shopId === currentUser.id);

  const handlePick = useCallback((item) => {
    setShowPick(false);
    const sourcePrice = Math.max(0, (item.price || 0) - SHOP_SURCHARGE);
    setEditItem({
      _isNew: true,
      name: item.name,
      sourcePrice,
      price: item.price,
      category: item.category,
      description: item.description || '',
      image: item.image || null,
      toppings: item.toppings || [],
      available: true,
    });
    setShowForm(true);
  }, []);

  // useCallback keeps stable references so React.memo on FormModal
  // prevents re-renders when menuItems changes (avoids native iOS crash
  // caused by re-rendering inside a dismissing Modal)
  const handleSave = useCallback(async (data) => {
    if (editItem && !editItem._isNew) await updateMenuItem(editItem.id, data);
    else await addMenuItem(data);
    setShowForm(false);
    setEditItem(null);
  }, [editItem, updateMenuItem, addMenuItem]);

  const handleClose = useCallback(() => {
    setShowForm(false);
    setEditItem(null);
  }, []);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Menu quán</Text>
          <Text style={s.headerSub}>{shopItems.length} món · Giá app = giá gốc +{formatCurrency(SHOP_SURCHARGE)}</Text>
        </View>
        <TouchableOpacity style={s.pickBtn} onPress={() => setShowPick(true)}>
          <Ionicons name="search" size={15} color="#fff" />
          <Text style={s.pickBtnText}>Chọn từ menu chung</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={shopItems} keyExtractor={i => i.id}
        contentContainerStyle={s.list}
        renderItem={({item}) => (
          <View style={s.card}>
            <View style={s.cardImgWrap}>
              {item.image
                ? <Image source={{uri:item.image}} style={s.cardImg}/>
                : <View style={[s.cardImg,s.cardImgPlaceholder]}>
                    <Ionicons name="fast-food-outline" size={28} color="#2196F3"/>
                  </View>}
              {!item.available && (
                <View style={s.soldOut}><Text style={s.soldOutText}>Hết hàng</Text></View>
              )}
            </View>
            <View style={s.cardInfo}>
              <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
              <Text style={s.cardCat}>{item.category}</Text>
              <View style={s.priceRow}>
                <Text style={s.cardSourcePrice}>Gốc: {formatCurrency(item.sourcePrice || item.price - SHOP_SURCHARGE)}</Text>
                <Text style={s.cardAppPrice}>App: {formatCurrency(item.price)}</Text>
              </View>
              <TouchableOpacity
                style={[s.availBtn,{backgroundColor:item.available?'#E8F5E9':'#FFEBEE'}]}
                onPress={() => updateMenuItem(item.id,{available:!item.available})}>
                <Ionicons name={item.available?'checkmark-circle':'close-circle'} size={13}
                  color={item.available?'#4CAF50':COLORS.danger}/>
                <Text style={[s.availBtnText,{color:item.available?'#4CAF50':COLORS.danger}]}>
                  {item.available ? 'Còn hàng' : 'Hết hàng'}
                </Text>
              </TouchableOpacity>
              {item.saleStart && (
                <View style={s.timeBadge}>
                  <Ionicons name="time-outline" size={10} color="#FF9800"/>
                  <Text style={s.timeBadgeText}>{item.saleStart}–{item.saleEnd}</Text>
                </View>
              )}
            </View>
            <View style={s.cardActions}>
              <TouchableOpacity style={s.editBtn} onPress={() => { setEditItem(item); setShowForm(true); }}>
                <Ionicons name="pencil" size={17} color="#2196F3"/>
              </TouchableOpacity>
              <TouchableOpacity style={s.delBtn} onPress={() =>
                Alert.alert('Xóa món?', `Xóa "${item.name}"?`, [
                  {text:'Hủy'}, {text:'Xóa', style:'destructive', onPress:()=>deleteMenuItem(item.id)}
                ])}>
                <Ionicons name="trash" size={17} color={COLORS.danger}/>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="restaurant-outline" size={64} color={COLORS.lightGray}/>
            <Text style={s.emptyText}>Chưa có món nào</Text>
            <Text style={s.emptyHint}>Nhấn + để thêm món đầu tiên</Text>
          </View>
        }
      />

      <TouchableOpacity style={s.fab} onPress={() => { setEditItem(null); setShowForm(true); }}>
        <Ionicons name="add" size={30} color="#fff"/>
      </TouchableOpacity>

      {showForm && (
        <FormModal
          onClose={handleClose}
          onSave={handleSave}
          initial={editItem}
          shopId={currentUser.id}
          shopName={currentUser.shopName || currentUser.name}
        />
      )}

      {showPick && (
        <PickMenuModal
          onClose={() => setShowPick(false)}
          onPick={handlePick}
          shopItems={shopItems}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:COLORS.background },
  header: { backgroundColor:'#2196F3', padding:16, paddingTop:52, flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' },
  headerTitle: { fontSize:22, fontWeight:'bold', color:'#fff' },
  headerSub: { fontSize:11, color:'rgba(255,255,255,0.8)', marginTop:3 },
  list: { padding:12, paddingBottom:90 },
  card: { flexDirection:'row', backgroundColor:'#fff', borderRadius:12, marginBottom:10, overflow:'hidden', elevation:2 },
  cardImgWrap: { width:88, height:96, position:'relative' },
  cardImg: { width:88, height:96 },
  cardImgPlaceholder: { backgroundColor:COLORS.lightGray, justifyContent:'center', alignItems:'center' },
  soldOut: { position:'absolute', inset:0, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'center', alignItems:'center' },
  soldOutText: { color:'#fff', fontSize:11, fontWeight:'bold' },
  cardInfo: { flex:1, padding:10 },
  cardName: { fontSize:14, fontWeight:'bold', color:COLORS.dark },
  cardCat: { fontSize:11, color:COLORS.gray, marginTop:2 },
  priceRow: { flexDirection:'row', gap:10, marginTop:4 },
  cardSourcePrice: { fontSize:11, color:COLORS.gray },
  cardAppPrice: { fontSize:12, fontWeight:'bold', color:'#2196F3' },
  availBtn: { flexDirection:'row', alignItems:'center', gap:4, alignSelf:'flex-start', marginTop:6, paddingHorizontal:8, paddingVertical:3, borderRadius:10 },
  availBtnText: { fontSize:11, fontWeight:'600' },
  timeBadge: { flexDirection:'row', alignItems:'center', gap:3, marginTop:4, backgroundColor:'#FFF3E0', alignSelf:'flex-start', paddingHorizontal:7, paddingVertical:2, borderRadius:8 },
  timeBadgeText: { fontSize:10, color:'#FF9800', fontWeight:'600' },
  cardActions: { justifyContent:'space-around', padding:10 },
  editBtn: { width:34, height:34, borderRadius:17, backgroundColor:'#E3F2FD', justifyContent:'center', alignItems:'center' },
  delBtn: { width:34, height:34, borderRadius:17, backgroundColor:'#FFEBEE', justifyContent:'center', alignItems:'center' },
  fab: { position:'absolute', bottom:24, right:24, width:58, height:58, borderRadius:29, backgroundColor:'#2196F3', justifyContent:'center', alignItems:'center', elevation:6 },
  empty: { alignItems:'center', paddingTop:80 },
  emptyText: { fontSize:16, color:COLORS.gray, marginTop:12, fontWeight:'600' },
  emptyHint: { fontSize:13, color:COLORS.gray, marginTop:4 },
  // Form overlay (replaces native Modal to avoid iOS New Architecture crashes)
  overlay: { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'#fff', zIndex:9999 },
  modalHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16, borderBottomWidth:1, borderBottomColor:COLORS.lightGray },
  modalTitle: { fontSize:18, fontWeight:'bold', color:COLORS.dark },
  saveText: { fontSize:16, color:'#2196F3', fontWeight:'bold' },
  modalBody: { padding:16 },
  imgPicker: { borderRadius:12, overflow:'hidden', marginBottom:16, height:180 },
  pickedImg: { width:'100%', height:'100%' },
  removeImg: { position:'absolute', top:8, right:8 },
  imgPlaceholder: { flex:1, backgroundColor:COLORS.lightGray, justifyContent:'center', alignItems:'center' },
  imgPlaceholderText: { color:'#2196F3', marginTop:8, fontSize:14 },
  label: { fontSize:14, fontWeight:'600', color:COLORS.dark, marginBottom:6, marginTop:12 },
  input: { backgroundColor:'#fff', borderRadius:10, padding:12, fontSize:15, borderWidth:1, borderColor:COLORS.lightGray, color:COLORS.dark },
  pricePreview: { flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#E3F2FD', borderRadius:8, padding:10, marginTop:6 },
  pricePreviewText: { fontSize:12, color:'#1565C0', flex:1 },
  catChip: { paddingHorizontal:14, paddingVertical:6, borderRadius:20, backgroundColor:COLORS.lightGray, marginRight:8 },
  catChipActive: { backgroundColor:'#2196F3' },
  catChipText: { color:COLORS.gray, fontSize:13 },
  catChipTextActive: { color:'#fff', fontWeight:'bold' },
  switchRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:16 },
  toppingItem: { flexDirection:'row', alignItems:'center', backgroundColor:COLORS.lightGray, borderRadius:10, padding:10, marginBottom:6 },
  toppingName: { flex:1, fontSize:13, color:COLORS.dark, marginLeft:8 },
  toppingPrice: { fontSize:13, color:COLORS.primary, fontWeight:'600', marginRight:6 },
  toppingAdd: { flexDirection:'row', alignItems:'center', marginTop:8, gap:6 },
  toppingAddBtn: { width:44, height:44, borderRadius:10, backgroundColor:'#2196F3', justifyContent:'center', alignItems:'center' },
  suggestBox: { backgroundColor:'#fff', borderWidth:1, borderColor:COLORS.lightGray, borderRadius:10, marginTop:4, overflow:'hidden', elevation:4 },
  suggestRow: { flexDirection:'row', alignItems:'center', padding:10, borderBottomWidth:1, borderBottomColor:COLORS.lightGray, gap:8 },
  suggestName: { fontSize:13, fontWeight:'700', color:COLORS.dark },
  suggestMeta: { fontSize:11, color:COLORS.gray, marginTop:2 },
  suggestBadgeMain: { backgroundColor:'#E3F2FD', borderRadius:8, paddingHorizontal:6, paddingVertical:2 },
  suggestBadgeShop: { backgroundColor:'#E8F5E9', borderRadius:8, paddingHorizontal:6, paddingVertical:2 },
  suggestBadgeText: { fontSize:10, fontWeight:'bold', color:COLORS.dark },
  suggestDismiss: { padding:8, alignItems:'center', backgroundColor:'#FAFAFA' },
  suggestDismissText: { fontSize:12, color:COLORS.gray },
  pickBtn: { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:'rgba(255,255,255,0.2)', borderRadius:10, paddingHorizontal:10, paddingVertical:6, borderWidth:1, borderColor:'rgba(255,255,255,0.4)' },
  pickBtnText: { color:'#fff', fontSize:12, fontWeight:'bold' },
  pickRow: { flexDirection:'row', alignItems:'center', backgroundColor:'#fff', borderRadius:12, padding:10, elevation:1, gap:10 },
  pickImg: { width:50, height:50, borderRadius:10, backgroundColor:COLORS.lightGray, overflow:'hidden', justifyContent:'center', alignItems:'center' },
  pickName: { fontSize:13, fontWeight:'700', color:COLORS.dark },
  pickCat: { fontSize:11, color:COLORS.gray, marginTop:2 },
  pickPrice: { fontSize:13, fontWeight:'bold', color:'#2196F3', marginRight:4 },
  pickAddBtn: { width:30, height:30, borderRadius:15, backgroundColor:'#2196F3', justifyContent:'center', alignItems:'center' },
  addedBadge: { paddingHorizontal:8, paddingVertical:4, backgroundColor:'#E8F5E9', borderRadius:10 },
  addedText: { fontSize:11, color:'#4CAF50', fontWeight:'600' },
});
