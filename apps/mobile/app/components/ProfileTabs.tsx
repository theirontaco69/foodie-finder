
import React from 'react';
import { ScrollView, Pressable, Text, View } from 'react-native';

export default function ProfileTabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t:string)=>void }) {
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 0 }}>
        {tabs.map(t => {
          const is = active === t;
          return (
            <Pressable key={t} onPress={() => onChange(t)} style={{ paddingVertical: 12, paddingRight: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: is ? '700' : '600', color: is ? '#111' : '#6b7280' }}>{t}</Text>
              <View style={{ height: 2, marginTop: 6, backgroundColor: is ? '#1DA1F2' : 'transparent' }} />
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ height: 1, backgroundColor: '#e5e7eb' }} />
    </View>
  );
}
