import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { COLORS } from '../utils/format';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }) {
  const { restaurantInfo, setRestaurantInfo, orders, menuItems } = useApp();
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ ...restaurantInfo });

  const handleSave = () => {
    if (!form.name.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập tên nhà hàng');
    if (!form.address.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ nhà hàng');
    setRestaurantInfo(form);
    setShowEdit(false);
    Alert.alert('Thành công', 'Đã cập nhật thông tin nhà hàng');
  };

  const stats = [
    { label: 'Tổng đơn hàng', value: orders.length, icon: 'receipt-outline' },
    { label: 'Đơn hoàn thành', value: orders.filter(o => o.status === 'Đã giao').length, icon: 'checkmark-circle-outline' },
    { label: 'Tổng món ăn', value: menuItems.length, icon: 'fast-food-outline' },
    { label: 'Doanh thu', value: `${(orders.filter(o => o.status === 'Đã giao').reduce((s, o) => s + o.total, 0) / 1000).toFixed(0)}K`, icon: 'cash-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hồ sơ & Cài đặt</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Restaurant Info */}
        <View style={styles.restaurantCard}>
          <View style={styles.restaurantIcon}>
            <Ionicons name="restaurant" size={40} color={COLORS.white} />
          </View>
          <Text style={styles.restaurantName}>{restaurantInfo.name}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.secondary} />
            <Text style={styles.restaurantInfo}>{restaurantInfo.address}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={14} color={COLORS.secondary} />
            <Text style={styles.restaurantInfo}>{restaurantInfo.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={14} color={COLORS.secondary} />
            <Text style={styles.restaurantInfo}>{restaurantInfo.openTime} - {restaurantInfo.closeTime}</Text>
          </View>
          <TouchableOpacity style={styles.editInfoBtn} onPress={() => { setForm({...restaurantInfo}); setShowEdit(true); }}>
            <Ionicons name="pencil-outline" size={14} color={COLORS.primary} />
            <Text style={styles.editInfoText}>Chỉnh sửa thông tin</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <Text style={styles.sectionTitle}>Thống kê</Text>
        <View style={styles.statsGrid}>
          {stats.map((stat, idx) => (
            <View key={idx} style={styles.statCard}>
              <Ionicons name={stat.icon} size={24} color={COLORS.primary} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Truy cập nhanh</Text>
        <View style={styles.actionsCard}>
          {[
            { label: 'Quản lý Menu', icon: 'restaurant-outline', screen: 'MenuManager', tab: true },
            { label: 'Lịch sử đơn hàng', icon: 'receipt-outline', screen: 'Orders', tab: true },
            { label: 'Chọn vị trí nhà hàng', icon: 'map-outline', screen: 'LocationPicker', params: {
              onSelect: (loc) => setRestaurantInfo(prev => ({ ...prev, address: loc.address, location: loc.location }))
            }},
          ].map((action, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.actionRow, idx < 2 && styles.actionRowBorder]}
              onPress={() => navigation.navigate(action.screen, action.params)}
            >
              <View style={styles.actionIcon}>
                <Ionicons name={action.icon} size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>🍜 ShipFood</Text>
          <Text style={styles.appVersion}>Phiên bản 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowEdit(false)}>
            <Ionicons name="close" size={26} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Thông tin nhà hàng</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveText}>Lưu</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalBody}>
          {[
            { label: 'Tên nhà hàng', key: 'name', placeholder: 'ShipFood Restaurant' },
            { label: 'Địa chỉ', key: 'address', placeholder: '123 Đường ABC, Quận 1, TP.HCM' },
            { label: 'Số điện thoại', key: 'phone', placeholder: '0901234567', keyboardType: 'phone-pad' },
            { label: 'Giờ mở cửa', key: 'openTime', placeholder: '07:00' },
            { label: 'Giờ đóng cửa', key: 'closeTime', placeholder: '22:00' },
          ].map((field) => (
            <View key={field.key}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <TextInput
                style={styles.fieldInput}
                value={form[field.key]}
                onChangeText={(v) => setForm(prev => ({ ...prev, [field.key]: v }))}
                placeholder={field.placeholder}
                keyboardType={field.keyboardType}
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
  header: {
    backgroundColor: COLORS.primary, padding: 16, paddingTop: 52,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.white },
  restaurantCard: {
    margin: 12, backgroundColor: COLORS.primary,
    borderRadius: 16, padding: 20, alignItems: 'center',
  },
  restaurantIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  restaurantName: { fontSize: 20, fontWeight: 'bold', color: COLORS.white, marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  restaurantInfo: { color: COLORS.secondary, fontSize: 13, marginLeft: 4 },
  editInfoBtn: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 12, backgroundColor: COLORS.white,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  editInfoText: { color: COLORS.primary, marginLeft: 4, fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.dark, marginLeft: 16, marginTop: 8, marginBottom: 8 },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 8, marginBottom: 8,
  },
  statCard: {
    width: '46%', margin: '2%', backgroundColor: COLORS.white,
    borderRadius: 12, padding: 16, alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  statValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.dark, marginTop: 6 },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 2, textAlign: 'center' },
  actionsCard: {
    backgroundColor: COLORS.white, marginHorizontal: 12, borderRadius: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, marginBottom: 16,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  actionRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  actionIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center',
  },
  actionLabel: { flex: 1, fontSize: 14, color: COLORS.dark, marginLeft: 12, fontWeight: '500' },
  appInfo: { alignItems: 'center', paddingVertical: 24 },
  appName: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark },
  appVersion: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  // Modal
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray, paddingTop: 52,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark },
  saveText: { fontSize: 16, color: COLORS.primary, fontWeight: 'bold' },
  modalBody: { padding: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: COLORS.dark, marginTop: 14, marginBottom: 6 },
  fieldInput: {
    backgroundColor: COLORS.white, borderRadius: 10, padding: 12,
    fontSize: 15, borderWidth: 1, borderColor: COLORS.lightGray, color: COLORS.dark,
  },
});
