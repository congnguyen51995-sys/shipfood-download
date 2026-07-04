import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';

const SCREEN_W = Dimensions.get('window').width - 24;
const INTERVAL = 2800;

export default function AdBannerCarousel({ banners }) {
  const active = banners.filter(b => b.enabled);
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active.length <= 1) return;
    const timer = setInterval(() => {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      setIndex(i => {
        let next;
        do { next = Math.floor(Math.random() * active.length); } while (active.length > 1 && next === i);
        return next;
      });
    }, INTERVAL);
    return () => clearInterval(timer);
  }, [active.length]);

  if (!active.length) return null;

  const current = active[index % active.length];

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.card, { backgroundColor: current.bgColor, opacity }]}>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.subtitle}>{current.subtitle}</Text>
      </Animated.View>
      {active.length > 1 && (
        <View style={styles.dots}>
          {active.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => setIndex(i)}>
              <View style={[styles.dot, i === index % active.length && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 12, marginTop: 12 },
  card: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    minHeight: 80,
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.88)' },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ccc' },
  dotActive: { backgroundColor: '#FF6B35', width: 16 },
});
