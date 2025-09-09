import React, { useState } from 'react';
import { View, Text, TextInput, Button, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [msg, setMsg] = useState('');

  async function sendEmail() {
    setMsg(''); setSending(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setSending(false);
    setMsg(error ? error.message : 'Email sent. Enter the 6-digit code.');
  }

  async function verify() {
    setMsg(''); setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    setVerifying(false);
    if (error) setMsg(error.message); else router.replace('/');
  }

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding' })} style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '600' }}>Sign in</Text>
      <TextInput placeholder="you@email.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 }} />
      <Button title={sending ? 'Sending…' : 'Send Email'} onPress={sendEmail} disabled={!email || sending} />
      <TextInput placeholder="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginTop: 8 }} />
      <Button title={verifying ? 'Verifying…' : 'Verify Code'} onPress={verify} disabled={!email || code.length < 6 || verifying} />
      {!!msg && <Text style={{ marginTop: 8 }}>{msg}</Text>}
    </KeyboardAvoidingView>
  );
}
