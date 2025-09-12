import React from 'react';
import { Animated, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';

type Props = { scrollY?: Animated.Value };

export default function NavBar({ scrollY }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const path = usePathname();

  const rowH = 50;
  const height = rowH + insets.bottom;

  const bgOpacity: any = scrollY
    ? scrollY.interpolate({ inputRange: [0, 60, 120], outputRange: [1, 0.5, 0.5], extrapolate: 'clamp' })
    : 1;

  const items = [
    { route: '/', icon: 'home-outline' as const, size: 24 },
    { route: '/search', icon: 'search-outline' as const, size: 24 },
    { route: '/compose', icon: 'add-circle' as const, size: 32 },
    { route: '/map', icon: 'map-outline' as const, size: 24 },
    { route: '/profile', icon: 'person-outline' as const, size: 24 },
  ];

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height }}>
      <Animated.View
        style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 0,
          height,
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderTopWidth: 1, borderColor: '#eee',
          opacity: bgOpacity
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0, right: 0,
          bottom: insets.bottom,
          height: rowH,
          paddingHorizontal: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        {items.map((it) => {
          const active = path === it.route || (it.route !== '/' && path?.startsWith(it.route));
          return (
            <Pressable key={it.route} onPress={() => router.push(it.route)} style={{ alignItems: 'center', flex: 1 }}>
              <Ionicons name={it.icon} size={it.size} color={active ? '#111' : '#777'} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
