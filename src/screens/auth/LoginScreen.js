import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Modal, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../utils/format';
import { useApp } from '../../context/AppContext';

export default function LoginScreen({ navigation }) {
  const { login, checkPhoneExists } = useAuth();
  const { restaurantInfo } = useApp();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotChecking, setForgotChecking] = useState(false);
  const [forgotFound, setForgotFound] = useState(false);

  const handleForgot = async () => {
    if (!forgotPhone.trim()) return Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại');
    setForgotChecking(true);
    try {
      const exists = await checkPhoneExists(forgotPhone);
      setForgotFound(exists);
      if (!exists) Alert.alert('Không tìm thấy', 'Số điện thoại này chưa đăng ký tài khoản');
    } catch { Alert.alert('Lỗi', 'Vui lòng thử lại'); }
    setForgotChecking(false);
  };

  const handleLogin = async () => {
    if (!phone.trim()) return Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại');
    if (!password) return Alert.alert('Thiếu thông tin', 'Vui lòng nhập mật khẩu');
    setLoading(true);
    try {
      await login(phone, password);
    } catch (e) {
      Alert.alert('Đăng nhập thất bại', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Modal quên mật khẩu */}
      <Modal visible={forgotModal} transparent animationType="fade" onRequestClose={() => { setForgotModal(false); setForgotFound(false); setForgotPhone(''); }}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => { setForgotModal(false); setForgotFound(false); setForgotPhone(''); }}>
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <Ionicons name="lock-open-outline" size={32} color={COLORS.primary} style={{ alignSelf: 'center', marginBottom: 8 }} />
            <Text style={styles.modalTitle}>Quên mật khẩu</Text>

            {!forgotFound ? (
              <>
                <Text style={styles.modalHint}>Nhập số điện thoại đã đăng ký để xác nhận</Text>
                <View style={styles.modalInputRow}>
                  <Ionicons name="call-outline" size={18} color={COLORS.gray} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Số điện thoại"
                    value={forgotPhone}
                    onChangeText={setForgotPhone}
                    keyboardType="phone-pad"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                <TouchableOpacity style={styles.modalBtn} onPress={handleForgot} disabled={forgotChecking}>
                  {forgotChecking
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.modalBtnText}>Kiểm tra</Text>
                  }
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.foundBox}>
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  <Text style={styles.foundText}>Tìm thấy tài khoản!</Text>
                </View>
                <Text style={styles.modalHint}>Liên hệ Admin để được đặt lại mật khẩu:</Text>
                <TouchableOpacity style={styles.adminContactBtn} onPress={() => Linking.openURL(`tel:${restaurantInfo.phone}`)}>
                  <Ionicons name="call" size={18} color="#fff" />
                  <Text style={styles.adminContactText}>Gọi Admin: {restaurantInfo.phone}</Text>
                </TouchableOpacity>
                <Text style={styles.modalNote}>Admin sẽ đặt lại mật khẩu tạm thời và thông báo cho bạn</Text>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🍜</Text>
          </View>
          <Text style={styles.appName}>ShipFood</Text>
          <Text style={styles.tagline}>Đặt món ngon, giao tận nơi</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Đăng nhập</Text>

          <Text style={styles.label}>Số điện thoại</Text>
          <View style={styles.inputRow}>
            <Ionicons name="call-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="0912345678"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor={COLORS.gray}
            />
          </View>

          <Text style={styles.label}>Mật khẩu</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nhập mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              placeholderTextColor={COLORS.gray}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotLink} onPress={() => { setForgotFound(false); setForgotPhone(''); setForgotModal(true); }}>
            <Text style={styles.forgotLinkText}>Quên mật khẩu?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.loginBtnText}>Đăng nhập</Text>}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>hoặc</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.registerBtn} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerBtnText}>Tạo tài khoản mới</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingTop: 60 },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 10,
    marginBottom: 12,
  },
  logoEmoji: { fontSize: 44 },
  appName: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary },
  tagline: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  card: {
    backgroundColor: COLORS.white, borderRadius: 20, padding: 24,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.dark, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 6, marginTop: 12 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.lightGray,
    borderRadius: 12, paddingHorizontal: 12, backgroundColor: COLORS.background,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 48, fontSize: 15, color: COLORS.dark },
  loginBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    padding: 16, alignItems: 'center', marginTop: 24,
    elevation: 3, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 6,
  },
  loginBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.lightGray },
  dividerText: { color: COLORS.gray, fontSize: 13, marginHorizontal: 10 },
  registerBtn: {
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 14,
    padding: 14, alignItems: 'center',
  },
  registerBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 15 },
  hint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  hintText: { fontSize: 12, color: COLORS.gray },
  forgotLink: { alignSelf: 'flex-end', marginTop: 8 },
  forgotLinkText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '88%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark, textAlign: 'center', marginBottom: 6 },
  modalHint: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  modalInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.lightGray, borderRadius: 12, paddingHorizontal: 12, marginBottom: 16 },
  modalInput: { flex: 1, height: 48, fontSize: 15, color: COLORS.dark },
  modalBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  foundBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  foundText: { fontSize: 15, fontWeight: 'bold', color: '#4CAF50' },
  adminContactBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4CAF50', borderRadius: 12, padding: 14, marginBottom: 12 },
  adminContactText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalNote: { fontSize: 12, color: COLORS.gray, textAlign: 'center', lineHeight: 18 },
});
