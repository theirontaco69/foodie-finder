import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function Login() {
  const router = useRouter();
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [loading,setLoading]=useState(false);
  const [session,setSession]=useState(null);

  useEffect(()=>{ (async()=>{ const s=await supabase.auth.getSession(); setSession(s.data.session||null); })(); 
    const sub=supabase.auth.onAuthStateChange((_e,s)=>{ setSession(s?.session||null); if(s?.session) router.replace('/'); });
    return ()=>sub.data.subscription.unsubscribe();
  },[]);

  async function signIn(){ setLoading(true); try{ await supabase.auth.signInWithPassword({ email, password }); } finally{ setLoading(false); } }
  async function signUp(){ setLoading(true); try{ await supabase.auth.signUp({ email, password }); } finally{ setLoading(false); } }
  async function logOut(){ await supabase.auth.signOut(); }

  if(session){
    return (
      <SafeAreaView style={{ flex:1 }}>
        <View style={{ padding:16, gap:12 }}>
          <Text style={{ fontSize:20, fontWeight:'700' }}>You are signed in</Text>
          <Pressable onPress={()=>router.replace('/')} style={{ paddingVertical:12 }}><Text style={{ fontSize:16 }}>Go to Home</Text></Pressable>
          <Pressable onPress={logOut} style={{ paddingVertical:12 }}><Text style={{ fontSize:16, color:'#d00', fontWeight:'700' }}>Log out</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex:1 }}>
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{ flex:1 }}>
        <View style={{ padding:16, gap:12 }}>
          <Text style={{ fontSize:22, fontWeight:'700' }}>Sign in</Text>
          <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" style={{ borderWidth:1, borderColor:'#ccc', borderRadius:10, padding:12 }} />
          <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry style={{ borderWidth:1, borderColor:'#ccc', borderRadius:10, padding:12 }} />
          <Pressable disabled={loading} onPress={signIn} style={{ backgroundColor:'#111', borderRadius:10, padding:14, alignItems:'center' }}>
            <Text style={{ color:'#fff', fontWeight:'700' }}>{loading?'Loading…':'Sign in'}</Text>
          </Pressable>
          <Pressable disabled={loading} onPress={signUp} style={{ borderRadius:10, padding:14, alignItems:'center', borderWidth:1, borderColor:'#ddd' }}>
            <Text style={{ fontWeight:'700' }}>{loading?'Loading…':'Create account'}</Text>
          </Pressable>
          <Pressable onPress={()=>router.replace('/')} style={{ paddingVertical:10, alignItems:'center' }}>
            <Text>Back to Home</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
