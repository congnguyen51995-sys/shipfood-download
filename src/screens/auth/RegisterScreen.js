import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../utils/format';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [regCode, setRegCode] = useState('');
  const [shopName, setShopName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Detect nếu mã bắt đầu bằng 'S' có thể là shop code — hiển thị field tên quán
  const looksLikeShopCode = regCode.trim().length >= 4;

  const handleRegister = async () => {
    if (!name.trim()) return Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ tên / tên đại diện');
    if (!phone.trim()) return Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại');
    if (password.length < 6) return Alert.alert('Mật khẩu yếu', 'Mật khẩu phải ít nhất 6 ký tự');
    if (password !== confirm) return Alert.alert('Không khớp', 'Mật khẩu xác nhận không đúng');
    setLoading(true);
    try {
      await register(name, phone, password, regCode, shopName);
    } catch (e) {
      Alert.alert('Đăng ký thất bại', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
        </View>

        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🍜</Text>
          </View>
          <Text style={styles.appName}>Tạo tài khoản</Text>
          <Text style={styles.tagline}>Chỉ cần họ tên và số điện thoại</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Họ và tên</Text>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input} placeholder="Nguyễn Văn A"
              value={name} onChangeText={setName}
              autoCapitalize="words" placeholderTextColor={COLORS.gray}
            />
          </View>

          <Text style={styles.label}>Số điện thoại</Text>
          <View style={styles.inputRow}>
            <Ionicons name="call-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input} placeholder="0912345678"
              value={phone} onChangeText={setPhone}
              keyboardType="phone-pad" placeholderTextColor={COLORS.gray}
            />
          </View>

          <Text style={styles.label}>Mật khẩu</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input} placeholder="Ít nhất 6 ký tự"
              value={password} onChangeText={setPassword}
              secureTextEntry={!showPass} placeholderTextColor={COLORS.gray}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Xác nhận mật khẩu</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input} placeholder="Nhập lại mật khẩu"
              value={confirm} onChangeText={setConfirm}
              secureTextEntry={!showPass} placeholderTextColor={COLORS.gray}
            />
          </View>

          {/* Mã đăng ký (shipper / shop) */}
          <Text style={styles.label}>Mã đăng ký <Text style={{ color: COLORS.gray, fontWeight: '400' }}>(Shipper hoặc Shop — nếu có)</Text></Text>
          <View style={styles.inputRow}>
            <Ionicons name="key-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input} placeholder="Nhập mã nếu là shipper hoặc shop"
              value={regCode} onChangeText={setRegCode}
              autoCapitalize="characters" placeholderTextColor={COLORS.gray}
            />
          </View>

          {/* Hướng dẫn đăng ký shop liên kết */}
          <TouchableOpacity style={styles.shopContactBox} onPress={() => Linking.openURL('tel:0866680795')}>
            <Ionicons name="storefront-outline" size={18} color="#FF6B35" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.shopContactTitle}>Muốn đăng ký Shop liên kết?</Text>
              <Text style={styles.shopContactDesc}>Liên hệ Admin để nhận mã đăng ký</Text>
              <Text style={styles.shopContactPhone}>📞 0866 680 795</Text>
            </View>
            <Ionicons name="call" size={18} color="#FF6B35" />
          </TouchableOpacity>

          {/* Tên quán — hiện khi có mã */}
          {looksLikeShopCode && (
            <>
              <Text style={styles.label}>Tên quán <Text style={{ color: COLORS.gray, fontWeight: '400' }}>(nếu đăng ký Shop)</Text></Text>
              <View style={styles.inputRow}>
                <Ionicons name="storefront-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input} placeholder="Tên quán của bạn"
                  value={shopName} onChangeText={setShopName}
                  placeholderTextColor={COLORS.gray}
                />
              </View>
            </>
          )}

          <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.registerBtnText}>Tạo tài khoản</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.goBack()}>
            <Text style={styles.loginLinkText}>Đã có tài khoản? <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Đăng nhập</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, padding: 20, paddingTop: 50 },
  header: { marginBottom: 8 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  logoArea: { alignItems: 'center', marginBottom: 24 },
  logoCircle: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  logoEmoji: { fontSize: 36 },
  appName: { fontSize: 26, fontWeight: 'bold', color: COLORS.dark },
  tagline: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 24, elevation: 4 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 6, marginTop: 12 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.lightGray,
    borderRadius: 12, paddingHorizontal: 12, backgroundColor: COLORS.background,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 48, fontSize: 15, color: COLORS.dark },
  registerBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    padding: 16, alignItems: 'center', marginTop: 24, elevation: 3,
  },
  registerBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  loginLink: { alignItems: 'center', marginTop: 16 },
  loginLinkText: { fontSize: 14, color: COLORS.gray },
  shopContactBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF3EE', borderRadius: 12, padding: 12,
    marginTop: 16, borderWidth: 1.5, borderColor: '#FF6B35' + '40',
  },
  shopContactTitle: { fontSize: 13, fontWeight: '700', color: COLORS.dark },
  shopContactDesc: { fontSize: 12, color: COLORS.gray, marginTop: 1 },
  shopContactPhone: { fontSize: 14, fontWeight: 'bold', color: '#FF6B35', marginTop: 3 },
});
