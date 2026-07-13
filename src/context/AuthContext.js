import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  collection, addDoc, getDocs, query, where, doc, getDoc, setDoc, deleteDoc, updateDoc,
} from 'firebase/firestore';
import { db } from '../services/firebase';

const AuthContext = createContext();

const ADMIN_ACCOUNT = {
  id: 'admin_001',
  name: 'Admin ShipFood',
  email: 'thanhcong07195@gmail.com',
  password: 'Dung@1906',
  role: 'admin',
  createdAt: new Date().toISOString(),
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const stored = await AsyncStorage.getItem('current_user');
      if (stored) setCurrentUser(JSON.parse(stored));
    } catch (e) {}
    setLoading(false);
  };

  // Đăng nhập: admin dùng email, khách dùng SĐT
  const login = async (phoneOrEmail, password) => {
    const input = phoneOrEmail.trim();

    // Admin đăng nhập bằng email
    if (input.includes('@')) {
      if (
        input.toLowerCase() === ADMIN_ACCOUNT.email.toLowerCase() &&
        password === ADMIN_ACCOUNT.password
      ) {
        const user = { ...ADMIN_ACCOUNT };
        setCurrentUser(user);
        await AsyncStorage.setItem('current_user', JSON.stringify(user));
        return user;
      }
      throw new Error('Email hoặc mật khẩu không đúng');
    }

    // Khách đăng nhập bằng SĐT
    const q = query(collection(db, 'users'), where('phone', '==', input));
    const snapshot = await getDocs(q);

    if (snapshot.empty) throw new Error('Số điện thoại hoặc mật khẩu không đúng');

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    if (userData.password !== password) throw new Error('Số điện thoại hoặc mật khẩu không đúng');

    const lastLoginAt = new Date().toISOString();
    const lastLoginPlatform = Platform.OS; // 'ios' | 'android' | 'web'
    await updateDoc(doc(db, 'users', userDoc.id), { lastLoginAt, lastLoginPlatform });
    const user = { id: userDoc.id, ...userData, lastLoginAt, lastLoginPlatform };
    setCurrentUser(user);
    await AsyncStorage.setItem('current_user', JSON.stringify(user));
    return user;
  };

  // Lấy tất cả mã đăng ký (shipper + shop)
  const getRegistrationCodes = async () => {
    const snap = await getDocs(collection(db, 'registrationCodes'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  // Admin tạo mã mới
  const addRegistrationCode = async (code, type) => {
    const code_upper = code.trim().toUpperCase();
    // Kiểm tra trùng
    const q = query(collection(db, 'registrationCodes'), where('code', '==', code_upper));
    const snap = await getDocs(q);
    if (!snap.empty) throw new Error('Mã này đã tồn tại');
    const docRef = await addDoc(collection(db, 'registrationCodes'), {
      code: code_upper,
      type, // 'shipper' hoặc 'shop'
      usedBy: null,
      usedByName: null,
      usedAt: null,
      createdAt: new Date().toISOString(),
    });
    return { id: docRef.id, code: code_upper, type, usedBy: null, usedByName: null };
  };

  // Admin xóa mã (chỉ xóa mã chưa dùng)
  const deleteRegistrationCode = async (codeId) => {
    await deleteDoc(doc(db, 'registrationCodes', codeId));
  };

  // Legacy helpers cho phần còn lại của code (không dùng nữa nhưng giữ để tránh lỗi)
  const getShipperCodes = async () => {
    const all = await getRegistrationCodes();
    return all.filter(c => c.type === 'shipper').map(c => c.code);
  };
  const getShopCodes = async () => {
    const all = await getRegistrationCodes();
    return all.filter(c => c.type === 'shop').map(c => c.code);
  };
  const addShipperCode = async (code) => addRegistrationCode(code, 'shipper');
  const addShopCode = async (code) => addRegistrationCode(code, 'shop');
  const deleteShipperCode = async () => {};
  const deleteShopCode = async () => {};

  // Đăng ký: tên + SĐT + mật khẩu (+ mã nếu là shipper/shop)
  const register = async (name, phone, password, regCode = '', shopName = '') => {
    const phoneTrim = phone.trim();

    const q = query(collection(db, 'users'), where('phone', '==', phoneTrim));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) throw new Error('Số điện thoại này đã được đăng ký');

    let role = 'customer';
    let matchedCodeDoc = null;
    if (regCode.trim()) {
      const code = regCode.trim().toUpperCase();
      const q = query(collection(db, 'registrationCodes'), where('code', '==', code));
      const snap = await getDocs(q);
      if (snap.empty) throw new Error('Mã đăng ký không đúng hoặc đã hết hạn');
      const codeData = { id: snap.docs[0].id, ...snap.docs[0].data() };
      if (codeData.usedBy) throw new Error('Mã đăng ký này đã được sử dụng');
      if (codeData.type === 'shipper') {
        role = 'shipper';
      } else if (codeData.type === 'shop') {
        role = 'shop';
        if (!shopName.trim()) throw new Error('Vui lòng nhập tên quán');
      }
      matchedCodeDoc = codeData;
    }

    const isShipper = role === 'shipper';
    const isShopRole = role === 'shop';

    const newUser = {
      name: name.trim(),
      phone: phoneTrim,
      password,
      role,
      ...(isShopRole ? { shopName: shopName.trim() } : {}),
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'users'), newUser);
    const user = { id: docRef.id, ...newUser };

    // Đánh dấu mã đã được dùng
    if (matchedCodeDoc) {
      await updateDoc(doc(db, 'registrationCodes', matchedCodeDoc.id), {
        usedBy: docRef.id,
        usedByName: name.trim(),
        usedAt: new Date().toISOString(),
      });
    }

    // Tự động thêm vào linkedShops khi đăng ký shop
    if (isShopRole) {
      await addDoc(collection(db, 'linkedShops'), {
        name: shopName.trim(),
        phone: phoneTrim,
        address: '',
        location: null,
        userId: docRef.id,
        createdAt: new Date().toISOString(),
      });
    }

    setCurrentUser(user);
    await AsyncStorage.setItem('current_user', JSON.stringify(user));
    return user;
  };

  const logout = async () => {
    setCurrentUser(null);
    await AsyncStorage.removeItem('current_user');
  };

  const getCustomers = async () => {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  const deleteUser = async (userId) => {
    await deleteDoc(doc(db, 'users', userId));
  };

  const checkPhoneExists = async (phone) => {
    const q = query(collection(db, 'users'), where('phone', '==', phone.trim()));
    const snap = await getDocs(q);
    return !snap.empty;
  };

  const resetPassword = async (userId, newPassword) => {
    await updateDoc(doc(db, 'users', userId), { password: newPassword });
  };

  const changePassword = async (userId, oldPassword, newPassword) => {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) throw new Error('Tài khoản không tồn tại');
    if (snap.data().password !== oldPassword) throw new Error('Mật khẩu hiện tại không đúng');
    await updateDoc(doc(db, 'users', userId), { password: newPassword });
  };

  const isAdmin = currentUser?.role === 'admin';
  const isShipper = currentUser?.role === 'shipper';
  const isShop = currentUser?.role === 'shop';
  const isLoggedIn = !!currentUser;

  return (
    <AuthContext.Provider value={{
      currentUser, loading,
      login, register, logout,
      isAdmin, isShipper, isShop, isLoggedIn, getCustomers, deleteUser,
      checkPhoneExists, resetPassword, changePassword,
      getRegistrationCodes, addRegistrationCode, deleteRegistrationCode,
      getShipperCodes, addShipperCode, deleteShipperCode,
      getShopCodes, addShopCode, deleteShopCode,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
