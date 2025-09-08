import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Pressable, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = { open: boolean; onClose: () => void; onNavigate: (route: string) => void; };

export default function BMenu({ open, onClose, onNavigate }: Props) {
  const width = Math.min(300, Math.round(Dimensions.get('window').width * 0.8));
  const x = useRef(new Animated.Value(-width)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(x, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(x, { toValue: -width, duration: 200, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [open, width, x, fade]);

  return (
    <View pointerEvents={open ? 'auto' : 'none'} style={{ position: 'absolute', inset: 0 }}>
      <Animated.View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', opacity: fade }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width, transform: [{ translateX: x }], backgroundColor: '#fff', paddingTop: 48, paddingHorizontal: 16, gap: 8 }}
      >
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>B Menu</Text>
        <Item icon="home-outline" label="Home" onPress={() => onNavigate('/')} />
        <Item icon="search-outline" label="Search" onPress={() => onNavigate('/search')} />
        <Item icon="add-circle-outline" label="Post" onPress={() => onNavigate('/compose')} />
        <Item icon="map-outline" label="Map" onPress={() => onNavigate('/map')} />
        <Item icon="person-outline" label="Profile" onPress={() => onNavigate('/profile')} />
      </Animated.View>
    </View>
  );
}
function Item({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Ionicons name={icon} size={22} color="#111" />
      <Text style={{ fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}
