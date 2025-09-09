import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function Login() {
  const router=useRouter();
  const [email,setEmail]=useState('');
  const [sending,setSending]=useState(false);
  const [loading,setLoading]=useState(true);
  const [me,setMe]=useState<{id:string; email:string|null} | null>(null);

  useEffect(()=>{(async()=>{ const a=await supabase.auth.getUser(); setMe(a?.data?.user ? { id:a.data.user.id, email:a.data.user.email??null } : null); setLoading(false); })();},[]);

  async function sendMagic() {
    if(!email) return;
    setSending(true);
    try{
      const { error } = await supabase.auth.signInWithOtp({ email, options:{ emailRedirectTo: '' } });
      if(error) throw error;
      Alert.alert('Check your email','We sent you a sign-in link.');
    }catch(e:any){
      Alert.alert('Sign-in error', e?.message || 'Failed to send link');
    }finally{ setSending(false); }
  }

  async function logout() {
    await supabase.auth.signOut();
    const a=await supabase.auth.getUser();
    setMe(a?.data?.user ? { id:a.data.user.id, email:a.data.user.email??null } : null);
  }

  if(loading){
    return (
      <View style={{ flex:1, paddingTop: 52, alignItems:'center', justifyContent:'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if(me){
    return (
      <View style={{ flex:1, paddingTop: 52, paddingHorizontal:16 }}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <Pressable onPress={()=>router.back()} style={{ padding:6 }}>
            <Ionicons name="chevron-back" size={24} color="#111" />
          </Pressable>
          <Text style={{ fontSize:18, fontWeight:'700' }}>Account</Text>
          <View style={{ width:30 }} />
        </View>

        <Text style={{ fontSize:16, marginBottom:12 }}>You are signed in.</Text>
        <View style={{ gap:12 }}>
          <Pressable onPress={()=>router.replace('/')} style={{ paddingVertical:12 }}>
            <Text style={{ fontSize:16 }}>Go Home</Text>
          </Pressable>
          <Pressable onPress={()=>router.replace('/profile')} style={{ paddingVertical:12 }}>
            <Text style={{ fontSize:16 }}>Open Profile</Text>
          </Pressable>
          <Pressable onPress={logout} style={{ paddingVertical:12 }}>
            <Text style={{ color:'#d00', fontSize:16, fontWeight:'700' }}>Log out</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{ flex:1 }}>
      <View style={{ flex:1, paddingTop: 52, paddingHorizontal:16 }}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <Pressable onPress={()=>router.back()} style={{ padding:6 }}>
            <Ionicons name="chevron-back" size={24} color="#111" />
          </Pressable>
          <Text style={{ fontSize:18, fontWeight:'700' }}>Sign in</Text>
          <View style={{ width:30 }} />
        </View>

        <View style={{ gap:12 }}>
          <View>
            <Text style={{ fontSize:13, color:'#666', marginBottom:6 }}>Email</Text>
            <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" style={{ borderWidth:1, borderColor:'#ddd', borderRadius:10, paddingHorizontal:12, paddingVertical:10, fontSize:16, backgroundColor:'#fff' }} />
          </View>
          <Pressable disabled={!email || sending} onPress={sendMagic} style={{ backgroundColor: (!email||sending)?'#9cc':'#06f', paddingVertical:12, borderRadius:10, alignItems:'center' }}>
            <Text style={{ color:'#fff', fontSize:16, fontWeight:'700' }}>{sending?'Sending…':'Send magic link'}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
