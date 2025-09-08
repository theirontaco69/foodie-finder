import React from 'react';
import { View, Text } from 'react-native';
import { Link } from 'expo-router';
import NavBar from '../components/NavBar';

export default function CreateScreen() {
  return (
    <View style={{ flex: 1, padding: 16, paddingBottom: 96 }}>
      <Text style={{ fontSize: 22, fontWeight: '600' }}>Create</Text>
      <Text style={{ marginTop: 8, color: '#666' }}>Use the Post composer to create a new post.</Text>
      <Link href="/compose" style={{ marginTop: 12, color: '#007aff' }}>Open composer</Link>
      <NavBar />
    </View>
  );
}
