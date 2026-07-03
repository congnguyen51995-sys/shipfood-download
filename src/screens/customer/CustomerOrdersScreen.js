import React, { useState } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, COLORS } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';

const STATUS_COLOR = {
  'Chờ shop': '#FF9800',
  'Chờ xác nhận': '#FFC107',
  'Đã xác nhận': '#2196F3',
  'Đang giao': '#FF9800',
  'Đã giao': '#4CAF50',
  'Đã hủy': '#F44336',
};
const STATUS_ICON = {
  'Chờ shop': 'storefront-outline',
  'Chờ xác nhận': 'time-outline',
  'Đã xác nhận': 'checkmark-circle-outline',
  'Đang giao': 'bicycle-outline',
  'Đã giao': 'checkmark-done-circle-outline',
  'Đã hủy': 'close-circle-outline',
};
const STATUS_MESSAGE = {
  'Chờ shop': 'Đang chờ quán xác nhận còn hàng',
  'Chờ xác nhận': 'Đơn đã được quán xác nhận, chờ shipper',
};
const FINAL = ['Đã giao', 'Đã hủy'];

function StarRow({ value, onChange }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 12 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <TouchableOpacity key={s} onPress={() => onChange(s)}>
          <Ionicons name={s <= value ? 'star' : 'star-outline'} size={36} color="#FFC107" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function groupOrders(orders) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const sorted = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const active = sorted.filter(o => !FINAL.includes(o.status));
  const todayDone = sorted.filter(o => FINAL.includes(o.status) && new Date(o.createdAt) >= today);
  const older = sorted.filter(o => FINAL.includes(o.status) && new Date(o.createdAt) < today);
  const sections = [];
  if (active.length) sections.push({ title: 'Đang xử lý', dot: '#e65100', data: active });
  if (todayDone.length) sections.push({ title: 'Hôm nay', dot: '#388e3c', data: todayDone });
  if (older.length) sections.push({ title: `Đơn cũ hơn (${older.length})`, dot: '#9e9e9e', data: older, collapsible: true });
  return sections;
}

export default function CustomerOrdersScreen({ navigation }) {
  const { getUserOrders, updateOrderStatus, rateOrder } = useApp();
  const { currentUser } = useAuth();
  const [ratingModal, setRatingModal] = useState(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [olderOpen, setOlderOpen] = useState(false);

  const allOrders = getUserOrders(currentUser.id);
  const sections = groupOrders(allOrders);
  const LABEL = ['', 'Tệ', 'Không ổn', 'Bình thường', 'Tốt', 'Tuyệt vời!'];

  const openRating = (orderId) => { setStars(5); setComment(''); setRatingModal(orderId); };
  const submitRating = async () => {
    if (!ratingModal) return;
    await rateOrder(ratingModal, stars, comment.trim());
    setRatingModal(null);
    Alert.alert('Cảm ơn bạn!', 'Đánh giá của bạn đã được ghi nhận.');
  };

  const renderCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.orderId}>#{item.id.slice(-6).toUpperCase()}</Text>
        <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[item.status] || '#999') + '20' }]}>
          <Ionicons name={STATUS_ICON[item.status] || 'help-circle-outline'} size={13} color={STATUS_COLOR[item.status] || '#999'} />
          <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] || '#999' }]}>{item.status}</Text>
        </View>
      </View>
      {item.items.slice(0, 2).map((f, i) => (
        <Text key={i} style={styles.foodText}>• {f.name} x{f.quantity}{f.selectedToppings?.length > 0 ? ` (+${f.selectedToppings.length} kèm)` : ''}</Text>
      ))}
      {item.items.length > 2 && <Text style={styles.more}>+{item.items.length - 2} món khác</Text>}
      <View style={styles.cardBottom}>
        <View style={styles.addrRow}>
          <Ionicons name="location-outline" size={13} color={COLORS.gray} />
          <Text style={styles.addrText} numberOfLines={1}>{item.deliveryAddress}</Text>
        </View>
        <Text style={styles.totalText}>{formatCurrency((item.total || 0) + (item.shippingFee ?? 15000))}</Text>
      </View>
      <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
      {STATUS_MESSAGE[item.status] && (
        <View style={styles.statusMsgBox}>
          <Ionicons name="information-circle-outline" size={13} color={STATUS_COLOR[item.status]} />
          <Text style={[styles.statusMsg, { color: STATUS_COLOR[item.status] }]}>{STATUS_MESSAGE[item.status]}</Text>
        </View>
      )}
      {item.status === 'Đã hủy' && item.cancelReason && (
        <View style={styles.cancelReasonBox}>
          <Ionicons name="close-circle-outline" size={13} color='#F44336' />
          <Text style={styles.cancelReasonText}>Lý do: {item.cancelReason}</Text>
        </View>
      )}
      {item.status !== 'Đã hủy' && (
        <TouchableOpacity style={styles.trackBtn} onPress={() => navigation.navigate('TrackOrder', { orderId: item.id })}>
          <Ionicons name="navigate-circle-outline" size={15} color={COLORS.primary} />
          <Text style={styles.trackBtnText}>Theo dõi đơn hàng</Text>
        </TouchableOpacity>
      )}
      {(item.status === 'Chờ xác nhận' || item.status === 'Chờ shop') && (
        <TouchableOpacity style={styles.cancelBtn} onPress={() => updateOrderStatus(item.id, 'Đã hủy')}>
          <Text style={styles.cancelBtnText}>Hủy đơn hàng</Text>
        </TouchableOpacity>
      )}
      {item.status === 'Đã giao' && (
        item.rating ? (
          <View style={styles.ratedBox}>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {[1,2,3,4,5].map(s => (
                <Ionicons key={s} name={s <= item.rating.stars ? 'star' : 'star-outline'} size={14} color="#FFC107" />
              ))}
            </View>
            {item.rating.comment ? <Text style={styles.ratedComment}>"{item.rating.comment}"</Text> : null}
          </View>
        ) : (
          <TouchableOpacity style={styles.rateBtn} onPress={() => openRating(item.id)}>
            <Ionicons name="star-outline" size={15} color="#FFC107" />
            <Text style={styles.rateBtnText}>Đánh giá đơn hàng</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );

  const renderSectionHeader = ({ section }) => {
    if (section.collapsible) {
      return (
        <TouchableOpacity style={styles.sectionHeader} onPress={() => setOlderOpen(v => !v)}>
          <View style={[styles.sectionDot, { backgroundColor: section.dot }]} />
          <Text style={[styles.sectionTitle, { color: section.dot }]}>{section.title}</Text>
          <Ionicons name={olderOpen ? 'chevron-up' : 'chevron-down'} size={16} color={section.dot} />
        </TouchableOpacity>
      );
    }
    return (
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionDot, { backgroundColor: section.dot }]} />
        <Text style={[styles.sectionTitle, { color: section.dot }]}>{section.title}</Text>
      </View>
    );
  };

  // For collapsible older section, filter data
  const displayedSections = sections.map(s =>
    s.collapsible ? { ...s, data: olderOpen ? s.data : [] } : s
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
        <Text style={styles.headerCount}>{allOrders.length} đơn</Text>
      </View>
      <SectionList
        sections={displayedSections}
        keyExtractor={o => o.id}
        contentContainerStyle={styles.list}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderCard}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={60} color={COLORS.lightGray} />
            <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>
            <Text style={styles.emptyDesc}>Đặt món ăn để xem đơn hàng tại đây</Text>
          </View>
        }
      />
      <Modal visible={!!ratingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Đánh giá đơn hàng</Text>
            <Text style={styles.modalSub}>Chia sẻ trải nghiệm của bạn</Text>
            <StarRow value={stars} onChange={setStars} />
            {stars > 0 && <Text style={styles.starLabel}>{LABEL[stars]}</Text>}
            <TextInput
              style={styles.commentInput}
              placeholder="Nhận xét thêm (tùy chọn)..."
              placeholderTextColor={COLORS.gray}
              value={comment}
              onChangeText={setComment}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRatingModal(null)}>
                <Text style={styles.modalCancelText}>Bỏ qua</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={submitRating}>
                <Text style={styles.modalConfirmText}>Gửi đánh giá</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, padding: 16, paddingTop: 52,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerCount: { fontSize: 14, color: COLORS.secondary },
  list: { padding: 12, paddingBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 4 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  foodText: { fontSize: 13, color: COLORS.dark, marginBottom: 2 },
  more: { fontSize: 12, color: COLORS.gray, fontStyle: 'italic' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  addrRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  addrText: { fontSize: 12, color: COLORS.gray, marginLeft: 4, flex: 1 },
  totalText: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary },
  dateText: { fontSize: 11, color: COLORS.gray, marginTop: 4 },
  statusMsgBox: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF8E1', borderRadius: 8, padding: 8, marginTop: 6 },
  statusMsg: { fontSize: 12, flex: 1 },
  cancelReasonBox: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF3F3', borderRadius: 8, padding: 8, marginTop: 6 },
  cancelReasonText: { fontSize: 12, color: '#F44336', flex: 1 },
  trackBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, padding: 9, borderRadius: 10, backgroundColor: COLORS.primary + '15', borderWidth: 1, borderColor: COLORS.primary },
  trackBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  cancelBtn: { marginTop: 8, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#F44336', alignItems: 'center' },
  cancelBtnText: { color: '#F44336', fontSize: 13, fontWeight: '600' },
  rateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, padding: 9, borderRadius: 10, backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#FFC107' },
  rateBtnText: { color: '#E65100', fontSize: 13, fontWeight: '600' },
  ratedBox: { marginTop: 10, padding: 8, borderRadius: 10, backgroundColor: '#FFFDE7', gap: 4 },
  ratedComment: { fontSize: 12, color: COLORS.gray, fontStyle: 'italic' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark, marginTop: 12 },
  emptyDesc: { fontSize: 13, color: COLORS.gray, marginTop: 6, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark, textAlign: 'center' },
  modalSub: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginTop: 4 },
  starLabel: { fontSize: 16, fontWeight: 'bold', color: '#E65100', textAlign: 'center', marginBottom: 4 },
  commentInput: { borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.dark, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: COLORS.lightGray, alignItems: 'center' },
  modalCancelText: { fontSize: 14, color: COLORS.gray, fontWeight: '600' },
  modalConfirm: { flex: 2, padding: 13, borderRadius: 12, backgroundColor: '#FFC107', alignItems: 'center' },
  modalConfirmText: { fontSize: 14, color: '#fff', fontWeight: 'bold' },
});
