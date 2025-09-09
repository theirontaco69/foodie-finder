import React, { useRef, useState } from 'react';
import { View, Animated, Dimensions, PanResponder, Pressable } from 'react-native';
import { Slot } from 'expo-router';
import SideMenu from './components/SideMenu';

export default function RootLayout() {
  const w = Dimensions.get('window').width;
  const panel = Math.min(0.9 * w, 320);
  const [open, setOpen] = useState(false);
  const tx = useRef(new Animated.Value(-panel)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  function animate(toOpen: boolean) {
    setOpen(toOpen);
    Animated.parallel([
      Animated.timing(tx, { toValue: toOpen ? 0 : -panel, duration: 220, useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: toOpen ? 1 : 0, duration: 220, useNativeDriver: true })
    ]).start();
  }

  const edge = useRef(PanResponder.create({
    onStartShouldSetPanResponder: e => e.nativeEvent.pageX <= 18,
    onMoveShouldSetPanResponder: (e, g) => e.nativeEvent.pageX <= 18 && g.dx > 6,
    onPanResponderMove: (e, g) => {
      const dx = Math.min(panel, Math.max(0, g.dx));
      tx.setValue(-panel + dx);
      backdrop.setValue(dx / panel);
    },
    onPanResponderRelease: (e, g) => {
      const dx = Math.min(panel, Math.max(0, g.dx));
      if (dx > panel * 0.35) animate(true); else animate(false);
    }
  })).current;

  const close = () => animate(false);

  useEffect(()=>{ setReady(true); },[]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 18, zIndex: 20 }} {...edge.panHandlers} />
      <View style={{ flex: 1 }}><Slot /></View>
      <<Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          left: 0, right: 0, top: 0, bottom: 0,
          backgroundColor: '#000',
          opacity: backdrop.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
          zIndex: 15
        }}>
        <Pressable onPress={close} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: panel,
          transform: [{ translateX: tx }],
          backgroundColor: '#fff',
          zIndex: 16
        }}>
        <SideMenu open={open} onClose={close} />
      </Animated.View>
    </View>
  )}
    </View>
  );
}
