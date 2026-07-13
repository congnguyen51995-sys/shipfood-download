import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

// Auth
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Admin
import MenuManagerScreen from '../screens/MenuManagerScreen';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';

// Customer
import CustomerFeaturedScreen from '../screens/customer/CustomerFeaturedScreen';
import CustomerHomeScreen from '../screens/customer/CustomerHomeScreen';
import CustomerCartScreen from '../screens/customer/CustomerCartScreen';
import CustomerOrdersScreen from '../screens/customer/CustomerOrdersScreen';
import CustomerProfileScreen from '../screens/customer/CustomerProfileScreen';

// Shipper
import ShipperOrdersScreen from '../screens/shipper/ShipperOrdersScreen';
import ShipperProfileScreen from '../screens/shipper/ShipperProfileScreen';
import ShipperSalaryScreen from '../screens/shipper/ShipperSalaryScreen';

// Shop
import ShopHomeScreen from '../screens/shop/ShopHomeScreen';
import ShopCreateOrderScreen from '../screens/shop/ShopCreateOrderScreen';
import ShopOrdersScreen from '../screens/shop/ShopOrdersScreen';
import ShopProfileScreen from '../screens/shop/ShopProfileScreen';
import ShopMenuScreen from '../screens/shop/ShopMenuScreen';

// Shared
import LocationPickerScreen from '../screens/LocationPickerScreen';
import CustomerShopsScreen from '../screens/customer/CustomerShopsScreen';
import CustomerTrackOrderScreen from '../screens/customer/CustomerTrackOrderScreen';
import RevenueScreen from '../screens/RevenueScreen';
import CustomerChatScreen from '../screens/customer/CustomerChatScreen';
import CustomerSearchScreen from '../screens/customer/CustomerSearchScreen';
import CustomerNotificationsScreen from '../screens/customer/CustomerNotificationsScreen';
import CustomerFavoritesScreen from '../screens/customer/CustomerFavoritesScreen';
import AdminChatScreen from '../screens/admin/AdminChatScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Auth Stack ────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// ── Guest Tabs (browse without login) ────────────────────
function GuestTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#F0F0F0', height: 60, paddingBottom: 8, paddingTop: 4 },
        tabBarIcon: ({ focused, color, size }) => {
          const map = {
            GuestFeatured: focused ? 'home' : 'home-outline',
            GuestHome: focused ? 'restaurant' : 'restaurant-outline',
            GuestShops: focused ? 'storefront' : 'storefront-outline',
            GuestLogin: focused ? 'log-in' : 'log-in-outline',
          };
          return <Ionicons name={map[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="GuestFeatured" component={CustomerFeaturedScreen} options={{ tabBarLabel: 'Trang chủ' }} />
      <Tab.Screen name="GuestHome" component={CustomerHomeScreen} options={{ tabBarLabel: 'Thực đơn' }} />
      <Tab.Screen name="GuestShops" component={CustomerShopsScreen} options={{ tabBarLabel: 'Quán' }} />
      <Tab.Screen name="GuestLogin" component={LoginScreen} options={{ tabBarLabel: 'Đăng nhập' }} />
    </Tab.Navigator>
  );
}

function GuestStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GuestMain" component={GuestTabs} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// ── Admin Tabs ────────────────────────────────────────────
function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#F0F0F0', height: 60, paddingBottom: 8, paddingTop: 4 },
        tabBarIcon: ({ focused, color, size }) => {
          const map = {
            AdminMenu: focused ? 'restaurant' : 'restaurant-outline',
            AdminOrders: focused ? 'receipt' : 'receipt-outline',
            AdminRevenue: focused ? 'bar-chart' : 'bar-chart-outline',
            AdminUsers: focused ? 'people' : 'people-outline',
            AdminProfile: focused ? 'shield-checkmark' : 'shield-checkmark-outline',
          };
          return <Ionicons name={map[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="AdminMenu" component={MenuManagerScreen} options={{ tabBarLabel: 'Menu' }} />
      <Tab.Screen name="AdminOrders" component={AdminOrdersScreen} options={{ tabBarLabel: 'Đơn hàng' }} />
      <Tab.Screen name="AdminRevenue" component={RevenueScreen} options={{ tabBarLabel: 'Doanh thu' }} />
      <Tab.Screen name="AdminUsers" component={AdminUsersScreen} options={{ tabBarLabel: 'Tài khoản' }} />
      <Tab.Screen name="AdminProfile" component={AdminProfileScreen} options={{ tabBarLabel: 'Quản trị' }} />
    </Tab.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminMain" component={AdminTabs} />
      <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
      <Stack.Screen name="AdminChat" component={AdminChatScreen} />
    </Stack.Navigator>
  );
}

// ── Customer Tabs ─────────────────────────────────────────
function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#F0F0F0', height: 60, paddingBottom: 8, paddingTop: 4 },
        tabBarIcon: ({ focused, color, size }) => {
          const map = {
            CustomerFeatured: focused ? 'home' : 'home-outline',
            CustomerHome: focused ? 'restaurant' : 'restaurant-outline',
            CustomerShops: focused ? 'storefront' : 'storefront-outline',
            CustomerOrders: focused ? 'receipt' : 'receipt-outline',
            CustomerProfile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={map[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="CustomerFeatured" component={CustomerFeaturedScreen} options={{ tabBarLabel: 'Trang chủ' }} />
      <Tab.Screen name="CustomerHome" component={CustomerHomeScreen} options={{ tabBarLabel: 'Thực đơn' }} />
      <Tab.Screen name="CustomerShops" component={CustomerShopsScreen} options={{ tabBarLabel: 'Quán' }} />
      <Tab.Screen name="CustomerOrders" component={CustomerOrdersScreen} options={{ tabBarLabel: 'Đơn hàng' }} />
      <Tab.Screen name="CustomerProfile" component={CustomerProfileScreen} options={{ tabBarLabel: 'Tài khoản' }} />
    </Tab.Navigator>
  );
}

function CustomerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerMain" component={CustomerTabs} />
      <Stack.Screen name="CustomerCart" component={CustomerCartScreen} />
      <Stack.Screen name="TrackOrder" component={CustomerTrackOrderScreen} />
      <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
      <Stack.Screen name="CustomerChat" component={CustomerChatScreen} />
      <Stack.Screen name="CustomerSearch" component={CustomerSearchScreen} />
      <Stack.Screen name="CustomerNotifications" component={CustomerNotificationsScreen} />
      <Stack.Screen name="CustomerFavorites" component={CustomerFavoritesScreen} />
    </Stack.Navigator>
  );
}

// ── Shipper Tabs ──────────────────────────────────────────
function ShipperTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FF9800',
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#F0F0F0', height: 60, paddingBottom: 8, paddingTop: 4 },
        tabBarIcon: ({ focused, color, size }) => {
          const map = {
            ShipperOrders: focused ? 'bicycle' : 'bicycle-outline',
            ShipperSalary: focused ? 'cash' : 'cash-outline',
            ShipperProfile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={map[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="ShipperOrders" component={ShipperOrdersScreen} options={{ tabBarLabel: 'Đơn giao' }} />
      <Tab.Screen name="ShipperSalary" component={ShipperSalaryScreen} options={{ tabBarLabel: 'Lương' }} />
      <Tab.Screen name="ShipperProfile" component={ShipperProfileScreen} options={{ tabBarLabel: 'Tài khoản' }} />
    </Tab.Navigator>
  );
}

function ShipperStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ShipperMain" component={ShipperTabs} />
    </Stack.Navigator>
  );
}

// ── Shop Tabs ─────────────────────────────────────────────
function ShopTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#F0F0F0', height: 60, paddingBottom: 8, paddingTop: 4 },
        tabBarIcon: ({ focused, color, size }) => {
          const map = {
            ShopHome: focused ? 'home' : 'home-outline',
            ShopThucDon: focused ? 'fast-food' : 'fast-food-outline',
            ShopMenuTab: focused ? 'restaurant' : 'restaurant-outline',
            ShopOrdersTab: focused ? 'receipt' : 'receipt-outline',
            ShopRevenueTab: focused ? 'bar-chart' : 'bar-chart-outline',
            ShopProfileTab: focused ? 'storefront' : 'storefront-outline',
          };
          return <Ionicons name={map[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="ShopHome" component={ShopHomeScreen} options={{ tabBarLabel: 'Trang chủ' }} />
      <Tab.Screen name="ShopThucDon" component={CustomerHomeScreen} options={{ tabBarLabel: 'Thực đơn' }} />
      <Tab.Screen name="ShopMenuTab" component={ShopMenuScreen} options={{ tabBarLabel: 'Menu quán' }} />
      <Tab.Screen name="ShopOrdersTab" component={ShopOrdersScreen} options={{ tabBarLabel: 'Đơn hàng' }} />
      <Tab.Screen name="ShopRevenueTab" component={RevenueScreen} options={{ tabBarLabel: 'Doanh thu' }} />
      <Tab.Screen name="ShopProfileTab" component={ShopProfileScreen} options={{ tabBarLabel: 'Quán' }} />
    </Tab.Navigator>
  );
}

function ShopStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ShopMain" component={ShopTabs} />
      <Stack.Screen name="ShopCreate" component={ShopCreateOrderScreen} />
      <Stack.Screen name="ShopCart" component={CustomerCartScreen} />
      <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
    </Stack.Navigator>
  );
}

// ── Root ──────────────────────────────────────────────────
export default function AppNavigator() {
  const { isLoggedIn, isAdmin, isShipper, isShop, loading, currentUser } = useAuth();
  const { setCurrentUserRole, savePushToken } = useApp();

  useEffect(() => {
    setCurrentUserRole(currentUser?.role || null);
    if (currentUser?.id) {
      savePushToken(currentUser.id, currentUser.role || 'customer');
    }
  }, [currentUser?.id]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!isLoggedIn ? <GuestStack /> : isAdmin ? <AdminStack /> : isShipper ? <ShipperStack /> : isShop ? <ShopStack /> : <CustomerStack />}
    </NavigationContainer>
  );
}
