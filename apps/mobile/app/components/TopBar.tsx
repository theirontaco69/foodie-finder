import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TopBar() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: '#fff', paddingTop: insets.top, borderBottomWidth: 1, borderColor: '#eee' }}>
      <View style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>Foodie Finder</Text>
      </View>
    </View>
  );
}
