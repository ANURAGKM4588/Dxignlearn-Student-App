import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  StatusBar, 
  StyleSheet, 
  ActivityIndicator, 
  View 
} from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import CoursesScreen from './src/screens/CoursesScreen';
import ChatScreen from './src/screens/ChatScreen';
import { checkLocalSession, logoutUser } from './src/services/firebase';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('courses'); // 'courses' or 'chat'

  // Check if session exists on boot
  useEffect(() => {
    async function initSession() {
      const activeSession = await checkLocalSession();
      if (activeSession) {
        setUser(activeSession);
      }
      setLoading(false);
    }
    initSession();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setCurrentScreen('courses');
  };

  const handleLogout = async () => {
    setLoading(true);
    await logoutUser();
    setUser(null);
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#00f0ff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />
      
      {!user ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : currentScreen === 'courses' ? (
        <CoursesScreen 
          user={user} 
          onLogout={handleLogout} 
          onNavigateToChat={() => setCurrentScreen('chat')}
        />
      ) : (
        <ChatScreen 
          user={user} 
          onBack={() => setCurrentScreen('courses')} 
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#050505',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
