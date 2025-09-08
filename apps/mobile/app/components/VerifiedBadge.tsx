import React from 'react';
import { Ionicons } from '@expo/vector-icons';
export default function VerifiedBadge({ size = 14 }: { size?: number }) {
  return <Ionicons name="checkmark-circle" size={size} color="#1DA1F2" style={{ marginLeft: 4 }} />;
}
