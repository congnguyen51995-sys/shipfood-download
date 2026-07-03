export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export const formatDate = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleString('vi-VN');
};

export const COLORS = {
  primary: '#FF6B35',
  secondary: '#F7C59F',
  background: '#FFF8F0',
  white: '#FFFFFF',
  dark: '#1A1A2E',
  gray: '#9E9E9E',
  lightGray: '#F5F5F5',
  success: '#4CAF50',
  warning: '#FFC107',
  danger: '#F44336',
  accent: '#16213E',
};

export const CATEGORIES = ['Tất cả', 'Cơm', 'Phở', 'Bún', 'Bánh mì', 'Lẩu', 'Đồ uống', 'Tráng miệng', 'Đồ ăn'];

export const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const getShippingFee = (distanceKm) => {
  const now = new Date();
  const nightSurcharge = now.getHours() >= 17 ? 5000 : 0; // sau 17h +5000
  let base;
  if (distanceKm <= 2) base = 5000;
  else if (distanceKm <= 5) base = 10000;
  else if (distanceKm <= 7) base = 15000;
  else if (distanceKm <= 10) base = 20000;
  else return null; // ngoài vùng giao hàng (>10km)
  return base + nightSurcharge;
};
