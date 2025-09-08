import React, { useRef } from 'react';
import { View, Text, PanResponder } from 'react-native';
import { useRouter } from 'expo-router';
import NavBar from '../components/NavBar';
import TopBar from '../components/TopBar';

export default function Search() {
  const router = useRouter();
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dy) < 20,
      onPanResponderRelease: (_, g) => { if (g.vx < -0.3 || g.dx < -60) router.back(); },
    })
  ).current;

  return (
    <View {...pan.panHandlers} style={{ flex: 1, paddingBottom: 96 }}>
      <TopBar />
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>Search</Text>
        <View style={{ marginTop: 12 }}><Text>Coming soon.</Text></View>
      </View>
      <NavBar />
    </View>
  );
}
