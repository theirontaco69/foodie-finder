import React from 'react';
import { View, Text, Pressable } from 'react-native';

export default function Banner({ text, onPress }: { text: string; onPress?: () => void }) {
  if (!text) return null;
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: '#fffbe6', borderColor: '#ffe58f', borderWidth: 1, padding: 8, borderRadius: 8, marginBottom: 10 }}>
      <Text style={{ color: '#8d6b00' }}>{text}</Text>
    </Pressable>
  );
}
