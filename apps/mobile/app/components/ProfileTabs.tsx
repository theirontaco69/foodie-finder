import React from 'react';
import { ScrollView, Pressable, Text, View } from 'react-native';

export default function ProfileTabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t:string)=>void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }} style={{ borderBottomWidth: 1, borderColor: '#eee', backgroundColor: '#fff' }}>
      {tabs.map(t => (
        <Pressable key={t} onPress={() => onChange(t)} style={{ paddingVertical: 12, paddingRight: 20 }}>
          <Text style={{ fontWeight: active===t ? '700' : '500' }}>{t}</Text>
          <View style={{ height: 2, marginTop: 6, backgroundColor: active===t ? '#111' : 'transparent' }} />
        </Pressable>
      ))}
    </ScrollView>
  );
}
