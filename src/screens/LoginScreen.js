import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  Image 
} from 'react-native';
import { requestOTP, verifyOTP } from '../services/firebase';

export default function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = Enter Email, 2 = Enter OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSendOTP = async () => {
    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }
    setError('');
    setLoading(true);
    const res = await requestOTP(email);
    setLoading(false);
    
    if (res.success) {
      setStep(2);
      setMessage(`OTP sent successfully to ${email}`);
    } else {
      setError(res.error);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    setError('');
    setLoading(true);
    const res = await verifyOTP(email, otp);
    setLoading(false);
    
    if (res.success) {
      onLoginSuccess(res.user);
    } else {
      setError(res.error);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={styles.card}>
        {/* Brand logo & header */}
        <View style={styles.logoContainer}>
          <Image 
            source={{ uri: 'https://dxignlearn.vercel.app/public/Images/logo/Dxign%20logo.png' }} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>STUDENT MOBILE PORTAL</Text>
        </View>

        <Text style={styles.title}>
          {step === 1 ? "Enter Registered Email" : "Enter Verification Code"}
        </Text>
        
        {message ? <Text style={styles.successText}>{message}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {step === 1 ? (
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="e.g., student@example.com"
              placeholderTextColor="#555"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
            
            <TouchableOpacity 
              style={styles.button} 
              onPress={handleSendOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#050505" />
              ) : (
                <Text style={styles.buttonText}>REQUEST VERIFICATION CODE</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="------"
              placeholderTextColor="#555"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus={true}
              value={otp}
              onChangeText={setOtp}
            />
            
            <TouchableOpacity 
              style={styles.button} 
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#050505" />
              ) : (
                <Text style={styles.buttonText}>VERIFY & ENTER PORTAL</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.textButton} 
              onPress={() => { setStep(1); setOtp(''); setError(''); setMessage(''); }}
            >
              <Text style={styles.textButtonText}>Use a different email address</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0b0b0c',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 32,
    alignItems: 'stretch',
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 140,
    height: 40,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#00f0ff',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  inputGroup: {
    gap: 16,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    color: '#fff',
    fontSize: 14,
    padding: 16,
    textAlign: 'center',
    letterSpacing: 1,
  },
  button: {
    backgroundColor: '#00f0ff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#050505',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  textButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  textButtonText: {
    color: '#a855f7',
    fontSize: 12,
    fontWeight: '500',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  successText: {
    color: '#10b981',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  }
});
