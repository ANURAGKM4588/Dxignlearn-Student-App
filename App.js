import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  StatusBar, 
  StyleSheet, 
  ActivityIndicator, 
  View,
  Text,
  TouchableOpacity,
  Platform
} from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import CoursesScreen from './src/screens/CoursesScreen';
import ChatScreen from './src/screens/ChatScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { checkLocalSession, logoutUser } from './src/services/firebase';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home', 'courses', 'chat', 'profile'

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
    setCurrentScreen('home');
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

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen user={user} onNavigateToTab={setCurrentScreen} />;
      case 'courses':
        return <CoursesScreen user={user} />;
      case 'chat':
        return <ChatScreen user={user} onBack={() => setCurrentScreen('home')} />;
      case 'profile':
        return <ProfileScreen user={user} onLogout={handleLogout} />;
      default:
        return <HomeScreen user={user} onNavigateToTab={setCurrentScreen} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />
      
      {!user ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <View style={styles.mainWrapper}>
          {/* Main Screen Content */}
          <View style={styles.contentWrapper}>
            {renderScreen()}
          </View>
          
          {/* Floating Bottom Navigation Bar */}
          <View style={styles.tabBar}>
            <TouchableOpacity 
              style={styles.tabItem} 
              onPress={() => setCurrentScreen('home')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabIcon, currentScreen === 'home' && styles.activeTabIcon]}>
                🏠
              </Text>
              <Text style={[styles.tabLabel, currentScreen === 'home' && styles.activeTabLabel]}>
                Home
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.tabItem} 
              onPress={() => setCurrentScreen('courses')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabIcon, currentScreen === 'courses' && styles.activeTabIcon]}>
                🎓
              </Text>
              <Text style={[styles.tabLabel, currentScreen === 'courses' && styles.activeTabLabel]}>
                Courses
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.tabItem} 
              onPress={() => setCurrentScreen('chat')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabIcon, currentScreen === 'chat' && styles.activeTabIcon]}>
                💬
              </Text>
              <Text style={[styles.tabLabel, currentScreen === 'chat' && styles.activeTabLabel]}>
                Doubt Chat
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.tabItem} 
              onPress={() => setCurrentScreen('profile')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabIcon, currentScreen === 'profile' && styles.activeTabIcon]}>
                👤
              </Text>
              <Text style={[styles.tabLabel, currentScreen === 'profile' && styles.activeTabLabel]}>
                Profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  },
  mainWrapper: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    paddingBottom: 72, // Make room for floating tab bar
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: '#0b0b0c',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 12 : 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.4,
  },
  activeTabIcon: {
    opacity: 1.0,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#555',
    marginTop: 4,
  },
  activeTabLabel: {
    color: '#00f0ff',
    fontWeight: 'bold',
  }
});
