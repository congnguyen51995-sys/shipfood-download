import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
const SPEED = 60;

export default function MarqueeBanner({ text, backgroundColor = '#FF6B35', textColor = '#fff' }) {
  const translateX = useRef(new Animated.Value(SCREEN_W)).current;
  const contentWidthRef = useRef(SCREEN_W * 3);
  const animRef = useRef(null);

  const startAnim = (fromX) => {
    const distance = fromX + contentWidthRef.current;
    const duration = (distance / SPEED) * 1000;
    animRef.current = Animated.timing(translateX, {
      toValue: -contentWidthRef.current,
      duration,
      useNativeDriver: true,
    });
    animRef.current.start(({ finished }) => {
      if (finished) {
        translateX.setValue(SCREEN_W);
        startAnim(SCREEN_W);
      }
    });
  };

  useEffect(() => {
    translateX.setValue(SCREEN_W);
    startAnim(SCREEN_W);
    return () => animRef.current?.stop();
  }, [text]);

  return (
    <View style={[styles.wrap, { backgroundColor }]}>
      <Animated.View
        style={[styles.row, { transform: [{ translateX }] }]}
        onLayout={e => {
          contentWidthRef.current = e.nativeEvent.layout.width;
        }}
      >
        <Text style={[styles.text, { color: textColor }]}>{text}</Text>
        <Text style={[styles.sep, { color: textColor }]}>{'   ★   '}</Text>
        <Text style={[styles.text, { color: textColor }]}>{text}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 32, overflow: 'hidden', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', position: 'absolute' },
  text: { fontSize: 12, fontWeight: '600' },
  sep: { fontSize: 12 },
});
