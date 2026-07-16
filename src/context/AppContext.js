import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  collection, addDoc, onSnapshot, updateDoc, getDoc,
  doc, query, orderBy, serverTimestamp, deleteDoc, getDocs, setDoc, increment, where,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const AppContext = createContext();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const DEFAULT_MENU = [
  {
    name: 'Cơm tấm sườn', price: 45000, category: 'Cơm',
    description: 'Cơm tấm sườn nướng thơm ngon', image: null, available: true,
    toppings: [
      { id: 't1', name: 'Thêm trứng ốp la', price: 8000 },
      { id: 't2', name: 'Thêm chả', price: 10000 },
      { id: 't3', name: 'Thêm bì', price: 12000 },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Phở bò', price: 65000, category: 'Phở',
    description: 'Phở bò truyền thống Hà Nội', image: null, available: true,
    toppings: [
      { id: 't4', name: 'Thêm thịt bò', price: 20000 },
      { id: 't5', name: 'Thêm gân bò', price: 15000 },
      { id: 't6', name: 'Trứng cút', price: 5000 },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Bún bò Huế', price: 55000, category: 'Bún',
    description: 'Bún bò cay đặc trưng xứ Huế', image: null, available: true,
    toppings: [
      { id: 't7', name: 'Thêm chả cua', price: 15000 },
      { id: 't8', name: 'Thêm giò heo', price: 25000 },
    ],
    createdAt: new Date().toISOString(),
  },
];

export const AppProvider = ({ children }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoaded, setMenuLoaded] = useState(false);
  const [allOrders, setAllOrders] = useState([]);
  const [carts, setCarts] = useState({});
  const DEFAULT_RESTAURANT = {
    name: 'ShipFood Tiên Lục',
    address: 'Cổng trường THPT Lạng Giang số 3 - Tiên Lục - Bắc Ninh',
    phone: '0398293362',
    location: { latitude: 21.3, longitude: 106.6 },
    openTime: '07:00',
    closeTime: '22:00',
  };
  const [restaurantInfo, setRestaurantInfoState] = useState(DEFAULT_RESTAURANT);
  const [linkedShops, setLinkedShops] = useState([]);
  const DEFAULT_BANK = { bankId: '', accountNo: '', accountName: '', bankName: '' };
  const [bankInfo, setBankInfoState] = useState(DEFAULT_BANK);
  const [bannerText, setBannerTextState] = useState('🛵 Giao hàng tận nơi · Phí ship từ 5.000đ · Mở cửa 7h–22h hằng ngày · Thanh toán tiền mặt khi nhận hàng');

  const DEFAULT_AD_BANNERS = [
    { id: 'b1', title: '🛵 Giao hàng tận nơi', subtitle: 'Phí ship từ 5.000đ · Phạm vi 10km', bgColor: '#FF6B35', enabled: true },
    { id: 'b2', title: '⚡ Đặt nhanh – Nhận nhanh', subtitle: 'Giao hàng trong 30 phút', bgColor: '#E91E8C', enabled: true },
    { id: 'b3', title: '🕖 Mở cửa 7h – 22h', subtitle: 'Phục vụ mỗi ngày kể cả cuối tuần', bgColor: '#1565C0', enabled: true },
    { id: 'b4', title: '💳 Thanh toán tiền mặt', subtitle: 'Trả tiền khi nhận hàng, an toàn tiện lợi', bgColor: '#2E7D32', enabled: true },
    { id: 'b6', title: '🎟️ Voucher 5.000đ cho khách mới!', subtitle: 'Tự động áp dụng khi đặt đơn đầu tiên', bgColor: '#9C27B0', enabled: true },
    { id: 'b7', title: '🎁 Đơn trên 100k tặng món kèm', subtitle: 'Đặt đơn từ 100.000đ – nhận ngay 1 món miễn phí!', bgColor: '#E65100', enabled: true },
  ];
  const [adBanners, setAdBannersState] = useState(DEFAULT_AD_BANNERS);

  // ── Thông tin nhà hàng từ Firestore ─────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'restaurant'));
        if (snap.exists()) setRestaurantInfoState(snap.data());
      } catch {}
    };
    load();
  }, []);

  // ── Banner text từ Firestore ──────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'banner'));
        if (snap.exists() && snap.data().text) setBannerTextState(snap.data().text);
      } catch {}
    };
    load();
  }, []);

  const setBannerText = async (text) => {
    setBannerTextState(text);
    try { await setDoc(doc(db, 'settings', 'banner'), { text }); } catch {}
  };

  // ── Ad banners từ Firestore ───────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'adBanners'));
        if (snap.exists() && snap.data().list) setAdBannersState(snap.data().list);
      } catch {}
    };
    load();
  }, []);

  const setAdBanners = async (list) => {
    setAdBannersState(list);
    try { await setDoc(doc(db, 'settings', 'adBanners'), { list }); } catch {}
  };

  // ── Thông tin ngân hàng từ Firestore ─────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'bank'));
        if (snap.exists()) setBankInfoState(snap.data());
      } catch {}
    };
    load();
  }, []);

  const setBankInfo = async (info) => {
    setBankInfoState(info);
    try { await setDoc(doc(db, 'settings', 'bank'), info); } catch {}
  };

  const setRestaurantInfo = async (info) => {
    setRestaurantInfoState(info);
    try {
      await setDoc(doc(db, 'settings', 'restaurant'), info);
    } catch {}
  };

  // ── Shop liên kết ─────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'linkedShops'), (snap) => {
      setLinkedShops(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const addLinkedShop = async (shop) => {
    await addDoc(collection(db, 'linkedShops'), { ...shop, createdAt: new Date().toISOString() });
  };

  const updateLinkedShop = async (id, data) => {
    await updateDoc(doc(db, 'linkedShops', id), data);
  };

  const deleteLinkedShop = async (id) => {
    await deleteDoc(doc(db, 'linkedShops', id));
  };

  const prevOrderCount = useRef(0);
  const isFirstLoad = useRef(true);
  const isFirstMenuLoad = useRef(true);
  const currentUserRoleRef = useRef(null);
  const setCurrentUserRole = (role) => { currentUserRoleRef.current = role; };

  // ── Menu từ Firebase ──────────────────────────────────────
  const refreshMenuItems = async () => {
    try {
      const q = query(collection(db, 'menu'), orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMenuItems(items);
      setMenuLoaded(true);
    } catch (e) {
      console.error('Menu refresh error:', e);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'menu'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, async (snapshot) => {
      // Skip local pending write snapshots to avoid iOS New Architecture crash
      if (snapshot.metadata.hasPendingWrites) return;
      try {
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setMenuItems(items);
        setMenuLoaded(true);
        isFirstMenuLoad.current = false;
      } catch (e) {
        console.error('Menu snapshot error:', e);
        setMenuLoaded(true);
      }
    }, (error) => {
      console.error('Menu snapshot listener error:', error);
      setMenuLoaded(true);
    });
    return () => unsub();
  }, []);

  // ── Đơn hàng từ Firebase ──────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllOrders(orders);
      if (!isFirstLoad.current && orders.length > prevOrderCount.current) {
        const newest = orders[0];
        const role = currentUserRoleRef.current;
        const itemCount = newest.items?.length || 0;
        const amount = formatCurrencySimple(newest.totalAmount || newest.total || 0);
        const customer = newest.customerName || newest.userName || 'Khách';
        if (newest.status === 'Chờ shop' && role === 'shop') {
          sendLocalNotification(
            '📦 Đơn mới cần xác nhận!',
            `${customer} đặt ${itemCount} món • ${amount} — Nhận hoặc từ chối ngay`
          );
        } else if (role === 'admin') {
          sendLocalNotification(
            '🛵 Đơn hàng mới!',
            `${customer} vừa đặt ${itemCount} món • ${amount}`
          );
        } else if (role === 'shipper' && newest.status === 'Đã xác nhận') {
          sendLocalNotification(
            '🛵 Có đơn mới!',
            `${customer} • ${amount} — Nhận đơn ngay`
          );
        }
      }
      prevOrderCount.current = orders.length;
      isFirstLoad.current = false;
    });
    return () => unsub();
  }, []);

  // ── Tự động hủy đơn "Chờ shop" quá 15 phút ──────────────
  useEffect(() => {
    const check = async () => {
      const now = Date.now();
      const TIMEOUT_MS = 15 * 60 * 1000;
      const expired = allOrders.filter(o => {
        if (o.status !== 'Chờ shop') return false;
        const created = o.createdAt?.toDate ? o.createdAt.toDate().getTime() : new Date(o.createdAt).getTime();
        return now - created > TIMEOUT_MS;
      });
      for (const o of expired) {
        await updateDoc(doc(db, 'orders', o.id), {
          status: 'Đã hủy',
          cancelReason: 'Quán không phản hồi trong 15 phút',
        });
      }
    };
    const timer = setInterval(check, 60 * 1000);
    return () => clearInterval(timer);
  }, [allOrders]);

  // ── Thông báo ─────────────────────────────────────────────
  const sendLocalNotification = async (title, body) => {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  };

  const registerForNotifications = async () => {
    if (!Device.isDevice) return;
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Đơn hàng mới',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
        sound: true,
      });
    }
    return finalStatus === 'granted';
  };

  const savePushToken = async (userId, role) => {
    if (!Device.isDevice) return;
    try {
      const granted = await registerForNotifications();
      if (!granted) return;
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: '3939fcd4-4f69-45c6-a408-b14d27010da9' });
      if (tokenData?.data) {
        await setDoc(doc(db, 'pushTokens', userId), {
          token: tokenData.data, userId, role,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) { console.log('savePushToken error:', e); }
  };

  const sendPush = async (tokens, title, body) => {
    const valid = (Array.isArray(tokens) ? tokens : [tokens]).filter(t => t && String(t).startsWith('ExponentPushToken'));
    if (!valid.length) return;
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(valid.map(to => ({ to, title, body, sound: 'default', priority: 'high', channelId: 'orders' }))),
      });
    } catch (e) { console.log('sendPush error:', e); }
  };

  const getPushToken = async (userId) => {
    try {
      const snap = await getDoc(doc(db, 'pushTokens', userId));
      return snap.exists() ? snap.data().token : null;
    } catch { return null; }
  };

  const getTokensByRole = async (role) => {
    try {
      const snap = await getDocs(query(collection(db, 'pushTokens'), where('role', '==', role)));
      return snap.docs.map(d => d.data().token).filter(Boolean);
    } catch { return []; }
  };

  // ── MENU CRUD (Firebase) ──────────────────────────────────
  const addMenuItem = async (item) => {
    const safeItem = { ...item };
    if (safeItem.image && safeItem.image.length > 700000) {
      safeItem.image = null;
    }
    await addDoc(collection(db, 'menu'), {
      ...safeItem,
      createdAt: new Date().toISOString(),
    });
    // getDocs refresh ensures menu shows on iOS (onSnapshot pending write is skipped)
    await refreshMenuItems();
  };

  const updateMenuItem = async (id, data) => {
    const safeData = { ...data };
    if (safeData.image && safeData.image.length > 700000) {
      safeData.image = null;
    }
    await updateDoc(doc(db, 'menu', id), safeData);
    await refreshMenuItems();
  };

  const deleteMenuItem = async (id) => {
    await deleteDoc(doc(db, 'menu', id));
    await refreshMenuItems();
  };

  // ── CART ─────────────────────────────────────────────────
  const getCart = (userId) => carts[userId] || [];

  const addToCart = (userId, menuItem, selectedToppings = []) => {
    const cartKey = menuItem.id + (selectedToppings.length > 0
      ? '_' + selectedToppings.map(t => t.id).sort().join('_') : '');
    setCarts(prev => {
      const cart = prev[userId] || [];
      const existing = cart.find(c => c.cartKey === cartKey);
      const updated = existing
        ? cart.map(c => c.cartKey === cartKey ? { ...c, quantity: c.quantity + 1 } : c)
        : [...cart, { ...menuItem, cartKey, selectedToppings, quantity: 1 }];
      return { ...prev, [userId]: updated };
    });
  };

  const removeFromCart = (userId, cartKey) => {
    setCarts(prev => {
      const cart = prev[userId] || [];
      const existing = cart.find(c => c.cartKey === cartKey);
      const updated = existing && existing.quantity > 1
        ? cart.map(c => c.cartKey === cartKey ? { ...c, quantity: c.quantity - 1 } : c)
        : cart.filter(c => c.cartKey !== cartKey);
      return { ...prev, [userId]: updated };
    });
  };

  const clearCart = (userId) =>
    setCarts(prev => ({ ...prev, [userId]: [] }));

  const getItemTotalPrice = (item) => {
    const toppingSum = (item.selectedToppings || []).reduce((s, t) => s + t.price, 0);
    return (item.price + toppingSum) * item.quantity;
  };

  const getCartTotal = (userId) =>
    getCart(userId).reduce((sum, item) => sum + getItemTotalPrice(item), 0);

  const getCartCount = (userId) =>
    getCart(userId).reduce((sum, item) => sum + item.quantity, 0);

  // ── ORDERS (Firebase) ─────────────────────────────────────
  const FIRST_ORDER_DISCOUNT = 5000;

  const placeOrder = async (userId, userName, userPhone, deliveryAddress, deliveryLocation, note = '', shippingFee = 15000, distanceKm = null, paymentMethod = 'cash', pointsUsed = 0) => {
    const cart = getCart(userId);
    if (cart.length === 0) return null;
    const total = getCartTotal(userId);

    const isFirstOrder = allOrders.filter(o => o.userId === userId && o.status !== 'Đã hủy').length === 0;
    const discount = isFirstOrder ? FIRST_ORDER_DISCOUNT : 0;

    // Nếu giỏ hàng có món từ shop, tách thành shopId/shopName để shipper biết lấy ở đâu
    const shopItemInCart = cart.find(i => i.shopId);

    const orderData = {
      userId,
      userName,
      userPhone: userPhone || '',
      ...(shopItemInCart ? { shopId: shopItemInCart.shopId, shopName: shopItemInCart.shopName } : {}),
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        selectedToppings: item.selectedToppings || [],
        shopId: item.shopId || null,
        shopName: item.shopName || null,
      })),
      total,
      discount,
      shippingFee,
      distanceKm: distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null,
      deliveryAddress,
      deliveryLocation: deliveryLocation || null,
      note,
      status: shopItemInCart ? 'Chờ shop' : 'Chờ xác nhận',
      paymentMethod,
      transferStatus: paymentMethod === 'transfer' ? 'pending' : null,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'orders'), { ...orderData, pointsUsed: pointsUsed || 0 });
    clearCart(userId);
    // Award 1 loyalty point per order
    await addLoyaltyPoints(userId);
    if (pointsUsed > 0) await deductLoyaltyPoints(userId, pointsUsed);
    await checkReferralReward(userId);

    // Push notification: báo admin + shop (nếu là đơn shop)
    const itemSummary = orderData.items.slice(0, 2).map(i => i.name).join(', ') + (orderData.items.length > 2 ? '...' : '');
    const amountStr = formatCurrencySimple((total || 0) + (shippingFee || 0));
    // shopId trong đơn hàng = users UID của shop (currentUser.id) → lấy token trực tiếp
    const getShopPushToken = async (shopId) => {
      try {
        const direct = await getPushToken(shopId);
        if (direct) return direct;
        // fallback: shopId là linkedShops doc ID (đơn cũ)
        const lsSnap = await getDoc(doc(db, 'linkedShops', shopId));
        if (!lsSnap.exists()) return null;
        const shopUserId = lsSnap.data().userId;
        return shopUserId ? getPushToken(shopUserId) : null;
      } catch { return null; }
    };
    const [adminTokens, shipperTokens, shopToken] = await Promise.all([
      getTokensByRole('admin'),
      getTokensByRole('shipper'),
      orderData.shopId ? getShopPushToken(orderData.shopId) : Promise.resolve(null),
    ]);
    if (orderData.shopId) {
      await sendPush(adminTokens, '📦 Đơn mới (qua quán)', `${userName} · ${itemSummary} · ${amountStr}`);
      if (shopToken) await sendPush([shopToken], '📦 Đơn mới cần xác nhận!', `${userName} · ${itemSummary} · ${amountStr}`);
    } else {
      await sendPush([...adminTokens, ...shipperTokens], '📦 Đơn hàng mới!', `${userName} · ${itemSummary} · ${amountStr}`);
    }

    if (paymentMethod === 'transfer' && adminTokens.length) {
      await sendPush(adminTokens, '💳 Đơn chuyển khoản mới!', `${userName} · ${amountStr} · chờ xác nhận thanh toán`);
    }

    return { id: docRef.id, ...orderData };
  };

  const updateOrderStatus = async (orderId, status, order = null) => {
    await updateDoc(doc(db, 'orders', orderId), { status });
    if (status === 'Đã giao' && order?.userId) {
      const customerToken = await getPushToken(order.userId);
      if (customerToken) await sendPush([customerToken], '✅ Đơn hàng đã giao!', 'Đơn hàng của bạn đã được giao thành công. Cảm ơn bạn!');
      await saveNotification(order.userId, '✅ Đơn hàng đã giao!', 'Đơn hàng của bạn đã được giao thành công. Cảm ơn bạn!');
    }
    if (status === 'Đang giao' && order?.userId) {
      const customerToken = await getPushToken(order.userId);
      if (customerToken) await sendPush([customerToken], '🛵 Shipper đang giao hàng!', 'Đơn hàng đang trên đường đến bạn');
      await saveNotification(order.userId, '🛵 Shipper đang giao hàng!', 'Đơn hàng đang trên đường đến bạn');
    }
  };

  const rejectOrder = async (orderId, reason, order = null) => {
    await updateDoc(doc(db, 'orders', orderId), { status: 'Đã hủy', cancelReason: reason });
    if (order?.userId) {
      const customerToken = await getPushToken(order.userId);
      if (customerToken) await sendPush([customerToken], '❌ Đơn bị hủy', `Lý do: ${reason || 'Quán không thể phục vụ'}`);
      await saveNotification(order.userId, '❌ Đơn bị hủy', `Lý do: ${reason || 'Quán không thể phục vụ'}`);
    }
  };

  const confirmShopOrder = async (orderId, order = null) => {
    await updateDoc(doc(db, 'orders', orderId), { status: 'Chờ xác nhận' });
    const [shipperTokens, customerToken] = await Promise.all([
      getTokensByRole('shipper'),
      order?.userId ? getPushToken(order.userId) : Promise.resolve(null),
    ]);
    await sendPush(shipperTokens, '🛵 Có đơn mới cần giao!', 'Quán đã xác nhận — vào app nhận đơn ngay');
    if (customerToken) await sendPush([customerToken], '✅ Quán đã xác nhận!', 'Đơn của bạn đã được xác nhận, đang chờ shipper');
    if (order?.userId) await saveNotification(order.userId, '✅ Quán đã xác nhận!', 'Đơn của bạn đã được xác nhận, đang chờ shipper');
  };

  const confirmTransferPayment = async (orderId) => {
    await updateDoc(doc(db, 'orders', orderId), { transferStatus: 'confirmed' });
    const role = currentUserRoleRef.current;
    if (role === 'admin') {
      sendLocalNotification('💰 Thanh toán xác nhận', 'Admin đã xác nhận chuyển khoản — đơn sẵn sàng giao');
    }
  };

  const claimOrder = async (orderId, shipperId, shipperName, order = null) => {
    await updateDoc(doc(db, 'orders', orderId), {
      shipperId,
      shipperName,
      status: 'Đang lấy hàng',
    });
    if (order?.userId) {
      const customerToken = await getPushToken(order.userId);
      if (customerToken) await sendPush([customerToken], '🛵 Shipper đang đến lấy hàng!', `${shipperName} đang trên đường lấy đơn của bạn`);
      await saveNotification(order.userId, '🛵 Shipper đang đến lấy hàng!', `${shipperName} đang trên đường lấy đơn của bạn`);
    }
  };

  const updateOrderPayment = async (orderId, received) => {
    await updateDoc(doc(db, 'orders', orderId), { paymentReceived: received });
  };

  const resetAllOrders = async () => {
    const snapshot = await getDocs(collection(db, 'orders'));
    const deletes = snapshot.docs.map(d => deleteDoc(doc(db, 'orders', d.id)));
    await Promise.all(deletes);
  };

  const getUserOrders = (userId) => allOrders.filter(o => o.userId === userId);

  const placeShopOrder = async (shopId, shopName, customerName, customerPhone, deliveryAddress, deliveryLocation, distanceKm, shippingFee, note) => {
    const orderData = {
      type: 'shop_order',
      shopId,
      shopName,
      userId: shopId,
      userName: customerName,
      userPhone: customerPhone,
      items: [],
      total: 0,
      shippingFee,
      distanceKm: distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null,
      deliveryAddress,
      deliveryLocation: deliveryLocation || null,
      note: note || '',
      status: 'Đã xác nhận',
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, 'orders'), orderData);
    return { id: ref.id, ...orderData };
  };

  const getShopOrders = (shopId) => allOrders.filter(o => o.shopId === shopId);

  const rateOrder = async (orderId, stars, comment) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        rating: { stars, comment: comment || '', ratedAt: new Date().toISOString() },
      });
    } catch (e) { console.log('rateOrder error:', e); }
  };

  // ── LOYALTY POINTS ────────────────────────────────────────
  const getLoyaltyPoints = async (userId) => {
    try {
      const snap = await getDoc(doc(db, 'loyaltyPoints', userId));
      return snap.exists() ? snap.data() : { points: 0, totalEarned: 0 };
    } catch { return { points: 0, totalEarned: 0 }; }
  };

  const addLoyaltyPoints = async (userId) => {
    try {
      await setDoc(doc(db, 'loyaltyPoints', userId),
        { points: increment(1), totalEarned: increment(1) },
        { merge: true });
      const snap = await getDoc(doc(db, 'loyaltyPoints', userId));
      const newPoints = snap.exists() ? (snap.data().points || 0) : 0;
      if (newPoints > 0 && newPoints % 10 === 0) {
        const discount = Math.floor(newPoints / 10) * 1000;
        await saveNotification(userId, '🎁 Đủ điểm giảm giá!', `Bạn có ${newPoints} điểm, có thể giảm ${formatCurrencySimple(discount)} cho đơn tiếp theo`);
      }
    } catch {}
  };

  const deductLoyaltyPoints = async (userId, points) => {
    if (!points) return;
    try {
      await setDoc(doc(db, 'loyaltyPoints', userId),
        { points: increment(-points) },
        { merge: true });
    } catch {}
  };

  // ── CHAT ──────────────────────────────────────────────────
  const sendChatMessage = async (roomId, text, senderRole, senderName, userDisplayName) => {
    await addDoc(collection(db, 'chats', roomId, 'messages'), {
      text, senderRole, senderName, createdAt: serverTimestamp(),
    });
    const unreadKey = senderRole === 'admin' ? 'unread_user' : 'unread_admin';
    await setDoc(doc(db, 'chats', roomId), {
      roomId,
      ...(userDisplayName ? { userName: userDisplayName } : {}),
      lastMessage: text, lastAt: serverTimestamp(),
      [unreadKey]: increment(1),
    }, { merge: true });
  };

  const subscribeToChatMessages = (roomId, callback) => {
    const q = query(collection(db, 'chats', roomId, 'messages'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  };

  const markChatRead = async (roomId, role) => {
    try {
      await setDoc(doc(db, 'chats', roomId), { [`unread_${role}`]: 0 }, { merge: true });
    } catch {}
  };

  const subscribeToChatList = (callback) => {
    const q = query(collection(db, 'chats'), orderBy('lastAt', 'desc'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  };

  const notifyShipperNearby = async (order) => {
    if (!order?.userId) return;
    const token = await getPushToken(order.userId);
    if (token) {
      await sendPush([token], '🛵 Shipper đang đến gần!', `${order.shipperName || 'Shipper'} sắp đến nơi, vui lòng ra nhận hàng`);
      await saveNotification(order.userId, '🛵 Shipper đang đến gần!', `${order.shipperName || 'Shipper'} sắp đến nơi, vui lòng ra nhận hàng`);
    }
  };

  // ── FAVORITES ─────────────────────────────────────────────
  const toggleFavorite = async (userId, shopId) => {
    try {
      const ref = doc(db, 'favorites', userId);
      const snap = await getDoc(ref);
      const current = snap.exists() ? (snap.data().shopIds || []) : [];
      const next = current.includes(shopId)
        ? current.filter(id => id !== shopId)
        : [...current, shopId];
      await setDoc(ref, { shopIds: next });
    } catch {}
  };

  const subscribeFavorites = (userId, cb) => {
    return onSnapshot(doc(db, 'favorites', userId), snap => {
      cb(snap.exists() ? (snap.data().shopIds || []) : []);
    });
  };

  // ── NOTIFICATION HISTORY ───────────────────────────────────
  const saveNotification = async (userId, title, body) => {
    try {
      await addDoc(collection(db, 'notifications', userId, 'items'), {
        title, body, createdAt: serverTimestamp(), read: false,
      });
    } catch {}
  };

  const subscribeNotifications = (userId, cb) => {
    const q = query(collection(db, 'notifications', userId, 'items'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  };

  const markAllNotificationsRead = async (userId) => {
    try {
      const snap = await getDocs(query(collection(db, 'notifications', userId, 'items'), where('read', '==', false)));
      await Promise.all(snap.docs.map(d => updateDoc(d.ref, { read: true })));
    } catch {}
  };

  // ── CANCEL ORDER BY CUSTOMER ──────────────────────────────
  const cancelOrderByCustomer = async (orderId, order = null) => {
    await updateDoc(doc(db, 'orders', orderId), { status: 'Đã hủy', cancelReason: 'Khách hủy đơn' });
    if (order?.userId) {
      const adminTokens = await getTokensByRole('admin');
      if (adminTokens.length) await sendPush(adminTokens, '❌ Khách hủy đơn', `${order.userName || 'Khách'} đã hủy đơn hàng`);
    }
  };

  // ── BROADCAST PUSH TO ALL CUSTOMERS ───────────────────────
  const broadcastPushToCustomers = async (title, body) => {
    try {
      const snap = await getDocs(collection(db, 'pushTokens'));
      const items = snap.docs.map(d => ({ userId: d.id, token: d.data().token }));
      const tokens = items.map(i => i.token).filter(Boolean);
      if (tokens.length) await sendPush(tokens, title, body);
      await Promise.all(items.map(({ userId }) => saveNotification(userId, title, body)));
    } catch {}
  };

  // ── BROADCAST QUEUE LISTENER (admin processes web-triggered broadcasts) ──
  useEffect(() => {
    const q = query(collection(db, 'broadcastQueue'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, async (snap) => {
      if (currentUserRoleRef.current !== 'admin') return;
      for (const d of snap.docs) {
        const { title, body } = d.data();
        try {
          await updateDoc(d.ref, { status: 'processing' });
          await broadcastPushToCustomers(title, body);
          await updateDoc(d.ref, { status: 'done' });
        } catch {
          await updateDoc(d.ref, { status: 'error' }).catch(() => {});
        }
      }
    });
    return () => unsub();
  }, []);

  // ── UPDATE USER NAME ──────────────────────────────────────
  const updateUserName = async (userId, name) => {
    await updateDoc(doc(db, 'users', userId), { name });
  };

  // ── REFERRAL ──────────────────────────────────────────────
  const generateReferralCode = (userId) => userId.slice(-6).toUpperCase();

  const applyReferralCode = async (newUserId, code) => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const referrer = snap.docs.find(d => d.id.slice(-6).toUpperCase() === code.toUpperCase() && d.id !== newUserId);
      if (!referrer) return false;
      // Reward referrer +5 points when new user places their first order
      await setDoc(doc(db, 'referrals', newUserId), { referrerId: referrer.id, rewarded: false });
      return true;
    } catch { return false; }
  };

  // Called in placeOrder to check & reward referral on first order
  const checkReferralReward = async (userId) => {
    try {
      const refSnap = await getDoc(doc(db, 'referrals', userId));
      if (!refSnap.exists() || refSnap.data().rewarded) return;
      const { referrerId } = refSnap.data();
      await setDoc(doc(db, 'loyaltyPoints', referrerId),
        { points: increment(10), totalEarned: increment(10) }, { merge: true });
      await setDoc(doc(db, 'loyaltyPoints', userId),
        { points: increment(5), totalEarned: increment(5) }, { merge: true });
      await updateDoc(doc(db, 'referrals', userId), { rewarded: true });
      await saveNotification(referrerId, '🎉 Bạn bè đặt đơn đầu tiên!', 'Bạn nhận được +10 điểm thưởng từ chương trình giới thiệu');
      await saveNotification(userId, '🎁 Điểm chào mừng!', 'Bạn nhận +5 điểm từ mã giới thiệu');
    } catch {}
  };

  // ── SHOP MIN ORDER & AVG RATING ───────────────────────────
  const getShopAvgRating = (shopUserId) => {
    const shopOrders = allOrders.filter(o => o.shopId === shopUserId && o.rating?.stars);
    if (!shopOrders.length) return null;
    const avg = shopOrders.reduce((s, o) => s + o.rating.stars, 0) / shopOrders.length;
    return { avg: Math.round(avg * 10) / 10, count: shopOrders.length };
  };

  return (
    <AppContext.Provider value={{
      menuItems, menuLoaded, restaurantInfo, allOrders,
      setRestaurantInfo, setRestaurantInfoState, registerForNotifications, setCurrentUserRole,
      addMenuItem, updateMenuItem, deleteMenuItem, refreshMenuItems,
      savePushToken,
      getCart, addToCart, removeFromCart, clearCart,
      getCartTotal, getCartCount, getItemTotalPrice,
      placeOrder, updateOrderStatus, rejectOrder, confirmShopOrder, confirmTransferPayment, claimOrder, updateOrderPayment, getUserOrders, resetAllOrders,
      bankInfo, setBankInfo,
      bannerText, setBannerText,
      adBanners, setAdBanners,
      linkedShops, addLinkedShop, updateLinkedShop, deleteLinkedShop,
      placeShopOrder, getShopOrders, rateOrder,
      getLoyaltyPoints, addLoyaltyPoints, deductLoyaltyPoints,
      sendChatMessage, subscribeToChatMessages, markChatRead, subscribeToChatList,
      notifyShipperNearby,
      toggleFavorite, subscribeFavorites,
      saveNotification, subscribeNotifications, markAllNotificationsRead,
      cancelOrderByCustomer, broadcastPushToCustomers, updateUserName,
      generateReferralCode, applyReferralCode,
      getShopAvgRating,
    }}>
      {children}
    </AppContext.Provider>
  );
};

const formatCurrencySimple = (n) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

export const useApp = () => useContext(AppContext);
