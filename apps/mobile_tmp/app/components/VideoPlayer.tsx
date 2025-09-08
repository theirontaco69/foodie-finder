import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

export default function VideoPlayer({
  uri,
  height = 320,
  autoPlay = false,
  loop = false
}: { uri: string; height?: number; autoPlay?: boolean; loop?: boolean }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = loop; });

  useEffect(() => {
    if (autoPlay) player.play();
    return () => { player.pause(); };
  }, [autoPlay, player]);

  return (
    <VideoView
      player={player}
      style={[styles.video, { height }]}
      contentFit="cover"
      allowsFullscreen
      nativeControls
    />
  );
}

const styles = StyleSheet.create({
  video: { width: '100%', borderRadius: 8, overflow: 'hidden' }
});
