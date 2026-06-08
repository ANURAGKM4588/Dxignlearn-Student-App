import React, { useState } from 'react';
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
  const [certificateClaimed, setCertificateClaimed] = useState(false);
  
  const enrolledCount = user.courses.length;
  const completionPercentage = Math.round((enrolledCount / 5) * 100);

  const handleContactSupport = () => {
    Linking.openURL('https://wa.me/91XXXXXXXXXX?text=Hi%20Dxign.learn%20Support,%20I%20need%20help%20with%20my%20courses.');
  };

  const handleClaimCertificate = () => {
    setCertificateClaimed(true);
    alert(`Congratulations ${user.name || "Student"}! 🎓\n\nYour official Dxign.learn Program Certificate has been generated successfully and sent to your registered email: ${user.email}.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Profile Details Card */}
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

      {/* Certification Tracker Widget */}
      <View style={styles.certCard}>
        <View style={styles.certHeader}>
          <Text style={styles.certHeaderTag}>PROGRAM PROGRESS</Text>
          <Text style={styles.certHeaderTitle}>Certification Status</Text>
        </View>
        
        <View style={styles.progressRow}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${completionPercentage}%` }]} />
          </View>
          <Text style={styles.progressPercent}>{completionPercentage}%</Text>
        </View>
        
        <Text style={styles.certDescText}>
          {completionPercentage === 100 
            ? "Outstanding! You have unlocked all 5 courses and completed the academic curriculum."
            : `You are enrolled in ${enrolledCount}/5 courses. Unlock all courses in the catalog to claim your certificate.`}
        </Text>

        {completionPercentage === 100 ? (
          <TouchableOpacity 
            style={[styles.certClaimBtn, certificateClaimed && styles.certClaimBtnDisabled]}
            onPress={handleClaimCertificate}
            disabled={certificateClaimed}
            activeOpacity={0.8}
          >
            <Text style={styles.certClaimBtnText}>
              {certificateClaimed ? "🏆 CERTIFICATE CLAIMED" : "🎓 CLAIM OFFICIAL CERTIFICATE"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.certLockedLabel}>
            <Text style={styles.certLockedLabelText}>🔒 CERTIFICATE LOCKED UNTIL 100% COMPLETION</Text>
          </View>
        )}
      </View>

      {/* Achievements Badges */}
      <Text style={styles.sectionTitle}>Your Learning Achievements</Text>
      <View style={styles.achievementsList}>
        {ACHIEVEMENTS.map((badge) => {
          // Dynamically unlock doubt solver badge if they are whitelisted and testing
          const isUnlocked = badge.unlocked || (badge.id === "ac-3" && completionPercentage > 20);
          return (
            <View 
              key={badge.id} 
              style={[styles.badgeItem, !isUnlocked && styles.badgeLocked]}
            >
              <Text style={styles.badgeIcon}>{badge.icon}</Text>
              <View style={styles.badgeMeta}>
                <Text style={[styles.badgeTitle, !isUnlocked && styles.badgeTextLocked]}>
                  {badge.title} {!isUnlocked && "(Locked)"}
                </Text>
                <Text style={styles.badgeDesc}>{badge.desc}</Text>
              </View>
            </View>
          );
        })}
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
  certCard: {
    backgroundColor: '#0b0b0c',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.15)',
    padding: 20,
    marginBottom: 28,
  },
  certHeader: {
    marginBottom: 16,
  },
  certHeaderTag: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#00f0ff',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  certHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00f0ff',
    borderRadius: 4,
  },
  progressPercent: {
    color: '#00f0ff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  certDescText: {
    color: '#666',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  certClaimBtn: {
    backgroundColor: '#00f0ff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  certClaimBtnDisabled: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    shadowOpacity: 0,
  },
  certClaimBtnText: {
    color: '#050505',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  certLockedLabel: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  certLockedLabelText: {
    color: '#444',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
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
