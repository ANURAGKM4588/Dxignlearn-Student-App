import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Linking 
} from 'react-native';

const ACHIEVEMENTS = [
  { id: "ac-1", title: "Visual Explorer", desc: "Enrolled in active design tracks", icon: "🎨", unlocked: true },
  { id: "ac-2", title: "First Step", desc: "Played first class lecture", icon: "🎬", unlocked: true },
  { id: "ac-3", title: "Doubt Solver", desc: "Resolved doubt tickets with a mentor", icon: "💬", unlocked: false }
];

export default function ProfileScreen({ user, onLogout }) {
  const handleContactSupport = () => {
    Linking.openURL('https://wa.me/91XXXXXXXXXX?text=Hi%20Dxign.learn%20Support,%20I%20need%20help%20with%20my%20courses.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>{(user.name || "S").charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.profileName}>{user.name || "Student"}</Text>
        <Text style={styles.profileEmail}>{user.email}</Text>
        <View style={styles.badgeActive}>
          <Text style={styles.badgeActiveText}>WHITELISTED STUDENT</Text>
        </View>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsSummaryContainer}>
        <View style={styles.statsSummaryItem}>
          <Text style={styles.statsSummaryVal}>Active</Text>
          <Text style={styles.statsSummaryLbl}>Status</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statsSummaryItem}>
          <Text style={styles.statsSummaryVal}>{user.courses.length}</Text>
          <Text style={styles.statsSummaryLbl}>Courses</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statsSummaryItem}>
          <Text style={styles.statsSummaryVal}>India</Text>
          <Text style={styles.statsSummaryLbl}>Region</Text>
        </View>
      </View>

      {/* Achievements Badges */}
      <Text style={styles.sectionTitle}>Your Learning Achievements</Text>
      <View style={styles.achievementsList}>
        {ACHIEVEMENTS.map((badge) => (
          <View 
            key={badge.id} 
            style={[styles.badgeItem, !badge.unlocked && styles.badgeLocked]}
          >
            <Text style={styles.badgeIcon}>{badge.icon}</Text>
            <View style={styles.badgeMeta}>
              <Text style={[styles.badgeTitle, !badge.unlocked && styles.badgeTextLocked]}>
                {badge.title} {!badge.unlocked && "(Locked)"}
              </Text>
              <Text style={styles.badgeDesc}>{badge.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Support & Settings Panel */}
      <Text style={styles.sectionTitle}>Support & Whitelist details</Text>
      <View style={styles.settingsGroup}>
        <TouchableOpacity style={styles.settingsRow} onPress={handleContactSupport}>
          <Text style={styles.settingsRowEmoji}>💬</Text>
          <View style={styles.settingsRowTextContainer}>
            <Text style={styles.settingsRowTitle}>Chat with support</Text>
            <Text style={styles.settingsRowSub}>Direct helpline over WhatsApp</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.settingsRow}>
          <Text style={styles.settingsRowEmoji}>🔒</Text>
          <View style={styles.settingsRowTextContainer}>
            <Text style={styles.settingsRowTitle}>Student Whitelist Log</Text>
            <Text style={styles.settingsRowSub}>Verified from Google Sheets registry</Text>
          </View>
        </View>
      </View>

      {/* Logout Action */}
      <TouchableOpacity 
        style={styles.logoutBtn}
        onPress={onLogout}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutBtnText}>LOGOUT FROM PORTAL</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  contentContainer: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#0b0b0c',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 28,
    marginBottom: 24,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 2,
    borderColor: '#a855f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarLargeText: {
    color: '#a855f7',
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    color: '#666',
    fontSize: 13,
    marginBottom: 16,
  },
  badgeActive: {
    backgroundColor: 'rgba(0,240,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
  },
  badgeActiveText: {
    color: '#00f0ff',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  statsSummaryContainer: {
    flexDirection: 'row',
    backgroundColor: '#0b0b0c',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    marginBottom: 28,
  },
  statsSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  statsSummaryVal: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  statsSummaryLbl: {
    fontSize: 9,
    color: '#555',
    marginTop: 4,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  achievementsList: {
    gap: 12,
    marginBottom: 28,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b0b0c',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 16,
    gap: 16,
  },
  badgeLocked: {
    opacity: 0.4,
  },
  badgeIcon: {
    fontSize: 24,
  },
  badgeMeta: {
    flex: 1,
  },
  badgeTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  badgeTextLocked: {
    color: '#999',
  },
  badgeDesc: {
    color: '#555',
    fontSize: 11,
  },
  settingsGroup: {
    backgroundColor: '#0b0b0c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
    marginBottom: 28,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  settingsRowEmoji: {
    fontSize: 18,
  },
  settingsRowTextContainer: {
    flex: 1,
  },
  settingsRowTitle: {
    color: '#eee',
    fontSize: 13,
    fontWeight: 'bold',
  },
  settingsRowSub: {
    color: '#555',
    fontSize: 10,
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  }
});
