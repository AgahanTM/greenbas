import React, { useState } from 'react';
import {
  ActivityIndicator, 
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text, 
  TextInput,
  View, 
} from 'react-native';
import { supabase } from '../services/supabase';

// Change the argument type for the React Native handler
const handleLogin = async (
  email: string,
  password: string,
  isSignUp: boolean,
  setLoading: (b: boolean) => void,
  setError: (s: string | null) => void,
  setMessage: (s: string | null) => void
) => {
  setLoading(true);
  setError(null);
  setMessage(null);

  try {
    if (isSignUp) {
      // --- Sign Up ---
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) throw error;

      if (data.user && data.user.identities?.length === 0) {
        setMessage("Agzalyk basaryly! Mail ini barla.");
      } else if (data.user) {
        setMessage("Agzalyk basaryly! Link ucin mail ini barla.");
      }
    } else {
      // --- Log In ---
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (error) throw error;
      // Login success will be handled by App.tsx detecting the session change
    }
  } catch (error: any) {
    setError(error.message || "Garasylmadyk nasazlyk.");
  } finally {
    setLoading(false);
  }
};


export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = () => {
    // Basic validation
    if (!email.trim() || !password.trim()) {
      setError('Email we parol gerekli.');
      return;
    }
    if (password.length < 6) {
      setError('Parol in az 6 soz bolmaly.');
      return;
    }
    // The handler no longer takes a form event, so we call the login function directly
    handleLogin(email, password, isSignUp, setLoading, setError, setMessage);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.form}>
        <Text style={styles.title}>
          {isSignUp ? 'Akkaunt doret' : 'giris'}
        </Text>
        <Text style={styles.subtitle}>
          {isSignUp
            ? 'Basla!'
            : 'Bellap goyan naharlaryny gor.'}
        </Text>

        {/* Email Input */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          onChangeText={setEmail}
          value={email}
          placeholder="seninmailin@gmail.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        {/* Password Input */}
        <Text style={styles.label}>Parol(acar sozi)</Text>
        <TextInput
          style={styles.input}
          onChangeText={setPassword}
          value={password}
          secureTextEntry={true}
          placeholder="Parolyn"
          autoCapitalize="none"
        />
        
        {error && <Text style={styles.errorText}>{error}</Text>}
        {message && <Text style={styles.messageText}>{message}</Text>}

        {/* Replaces the <button type="submit"> */}
        <Pressable 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleSubmit} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isSignUp ? 'Agza bol' : 'Giris'}
            </Text>
          )}
        </Pressable>

        {/* Toggle Sign Up/Log In */}
        <Pressable 
          style={styles.toggleContainer} 
          onPress={() => {
            setIsSignUp(!isSignUp);
            setError(null);
            setMessage(null);
          }}
        >
          <Text style={styles.toggleText}>
            {isSignUp
              ? 'Agzalygyn bar bolsa giris et'
              : "Agza bolmadynmy?, Agza bol"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// --- React Native StyleSheet for Styling ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    color: '#555',
    marginBottom: 24,
  },
  label: {
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  button: {
    height: 48,
    backgroundColor: '#007bff',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  toggleText: {
    color: '#007bff',
    textDecorationLine: 'underline',
  },
  errorText: {
    color: 'red',
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: 'red',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
    textAlign: 'center',
  },
  messageText: {
    color: 'green',
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: 'green',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
    textAlign: 'center',
  },
});