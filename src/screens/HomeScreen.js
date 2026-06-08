import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COURSE_PAYMENT_LINKS, COURSE_PRICING } from '../services/firebase';

const ALL_COURSES = ["Graphic Design", "Film Making", "Content Creation", "Vibe Coding", "Business Automation"];

const UPCOMING_COURSES = [
  {
    id: "up-1",
    title: "AI Cinema & Runway Gen-3 Mastery",
    launchDate: "July 15, 2026",
    instructor: "Anurag KM",
    description: "Learn advanced cinematic camera prompting, consistent character generation, and post-production."
  },
  {
    id: "up-2",
    title: "Advanced Vibe Coding & Claude 3.5",
    launchDate: "August 02, 2026",
    instructor: "Dxign.learn Team",
    description: "Build production-ready web apps purely through prompt engineering, code synthesis, and API integration."
  }
];

export default function HomeScreen({ user, onNavigateToTab }) {
  const [notifiedCourses, setNotifiedCourses] = useState({});

  useEffect(() => {
    async function loadNotifications() {
      try {
        const stored = await AsyncStorage.getItem('notified_upcoming');
        if (stored) {
          setNotifiedCourses(JSON.parse(stored));
        }
      } catch (error) {
        console.error("Error loading notifications status:", error);
      }
    }
    loadNotifications();
  }, []);

  const handleToggleNotification = async (courseId) => {
    try {
      const updated = { 
        ...notifiedCourses, 
        [courseId]: !notifiedCourses[courseId] 
      };
      setNotifiedCourses(updated);
      await AsyncStorage.setItem('notified_upcoming', JSON.stringify(updated));
    } catch (error) {
      console.error("Error storing notification status:", error);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Welcome Row */}
      <View style={styles.welcomeContainer}>
        <View>
          <Text style={styles.greetingText}>Welcome back,</Text>
          <Text style={styles.studentName}>{user.name || "Student"}</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{(user.name || "S").charAt(0).toUpperCase()}</Text>
        </View>
      </View>

      {/* Mentor Online Status Card */}
      <TouchableOpacity 
        style={styles.mentorStatusCard}
        onPress={() => onNavigateToTab('chat')}
        activeOpacity={0.85}
      >
        <View style={styles.mentorStatusHeader}>
          <View style={styles.pulseContainer}>
            <View style={styles.pulseCircle} />
            <View style={styles.pulseIndicator} />
          </View>
          <Text style={styles.mentorStatusTitle}>MENTOR ONLINE SUPPORT</Text>
        </View>
        <Text style={styles.mentorStatusText}>Stuck on a lesson? Anurag KM is available online to resolve your doubts right now.</Text>
        <View style={styles.mentorStatusFooter}>
          <Text style={styles.avgResponseText}>Average response time: ~4 mins</Text>
          <Text style={styles.mentorStatusLinkText}>Start Chat →</Text>
        </View>
      </TouchableOpacity>

      {/* Last Played Class Hero Card */}
      <TouchableOpacity 
        style={styles.heroCard}
        onPress={() => onNavigateToTab('courses')}
        activeOpacity={0.9}
      >
        <View style={styles.heroGradientOverlay}>
          <Text style={styles.heroTag}>CONTINUE LEARNING</Text>
          <Text style={styles.heroTitle}>CGI Ad Video - Tender Coconut</Text>
          <Text style={styles.heroSubtitle}>Graphic Design • Lecture 1 of 3</Text>
          
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarActive, { width: '45%' }]} />
          </View>
          
          <View style={styles.heroFooter}>
            <Text style={styles.heroProgressText}>45% Completed (1:30 left)</Text>
            <View style={styles.resumeBtn}>
              <Text style={styles.resumeBtnText}>RESUME ▶</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Quick Statistics Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{user.courses.length}</Text>
          <Text style={styles.statLabel}>Active Programs</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>18.5</Text>
          <Text style={styles.statLabel}>Hours Learned</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Doubts Solved</Text>
        </View>
      </View>

      {/* List of Enrolled Courses */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Enrolled Courses</Text>
        <TouchableOpacity onPress={() => onNavigateToTab('courses')}>
          <Text style={styles.seeAllText}>Watch Lectures</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.coursesList}>
        {user.courses.map((course, index) => (
          <TouchableOpacity 
            key={course}
            style={styles.enrolledCourseCard}
            onPress={() => onNavigateToTab('courses')}
            activeOpacity={0.8}
          >
            <View style={styles.courseColorIndicator} />
            <View style={styles.courseInfoContainer}>
              <Text style={styles.courseTitleText}>{course}</Text>
              <Text style={styles.courseModulesCount}>
                {course === "Graphic Design" ? "3 Video Lectures" : 
                 course === "Film Making" ? "3 Video Lectures" : 
                 course === "Content Creation" ? "3 Video Lectures" : "2 Video Lectures"}
              </Text>
              {/* Fake progress bar */}
              <View style={styles.courseProgressOutline}>
                <View style={[
                  styles.courseProgressFill, 
                  { width: index === 0 ? '100%' : index === 1 ? '60%' : '10%' }
                ]} />
              </View>
            </View>
            <View style={styles.arrowIcon}>
              <Text style={styles.arrowIconText}>→</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Explore Catalog Section */}
      {ALL_COURSES.some(c => !user.courses.includes(c)) && (
        <View style={styles.catalogSection}>
          <Text style={styles.sectionTitle}>Explore & Unlock Programs</Text>
          <View style={styles.catalogList}>
            {ALL_COURSES.filter(c => !user.courses.includes(c)).map((course) => (
              <View key={course} style={styles.catalogCard}>
                <View style={styles.catalogCardBody}>
                  <Text style={styles.catalogCardTitle}>{course}</Text>
                  <Text style={styles.catalogCardPrice}>
                    Lifetime access: {COURSE_PRICING[course] || "₹499"}
                  </Text>
                  <Text style={styles.catalogCardBenefit}>
                    {course === "Graphic Design" ? "✓ 3 Lectures • CGI Ad, Golden Tea, Jewelry Ads" : 
                     course === "Film Making" ? "✓ 3 Lectures • Car Ads, Grandma Story, Cinematic Romantic" :
                     course === "Content Creation" ? "✓ 3 Lectures • KOME Reel, Mayflower Reel, Regalia Brand" :
                     course === "Vibe Coding" ? "✓ 2 Lectures • Reshma WebQ, Velox Integration" :
                     "✓ 2 Lectures • Sky Bound Travel, Optic Expo 2025"}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.catalogBuyBtn}
                  onPress={() => Linking.openURL(COURSE_PAYMENT_LINKS[course])}
                  activeOpacity={0.8}
                >
                  <Text style={styles.catalogBuyBtnText}>BUY NOW</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Upcoming Courses Section */}
      <Text style={styles.sectionTitleUpcoming}>Upcoming Programs & Webinars</Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        snapToInterval={Dimensions.get('window').width - 48}
        decelerationRate="fast"
        contentContainerStyle={styles.upcomingCarouselContainer}
      >
        {UPCOMING_COURSES.map((course) => {
          const isNotified = notifiedCourses[course.id];
          return (
            <View key={course.id} style={styles.upcomingCard}>
              <View style={styles.upcomingImageHeader}>
                <View style={styles.upcomingBadge}>
                  <Text style={styles.upcomingBadgeText}>COMING SOON</Text>
                </View>
                <Text style={styles.upcomingDate}>{course.launchDate}</Text>
              </View>
              
              <View style={styles.upcomingBody}>
                <Text style={styles.upcomingTitle}>{course.title}</Text>
                <Text style={styles.upcomingDesc}>{course.description}</Text>
                <Text style={styles.upcomingInstructor}>By: {course.instructor}</Text>
                
                <TouchableOpacity 
                  style={[styles.notifyBtn, isNotified && styles.notifyBtnActive]}
                  onPress={() => handleToggleNotification(course.id)}
                >
                  <Text style={[styles.notifyBtnText, isNotified && styles.notifyBtnTextActive]}>
                    {isNotified ? "✓ REGISTERED FOR LAUNCH ALERTS" : "🔔 NOTIFY ME ON LAUNCH"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
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
  welcomeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greetingText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  studentName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#00f0ff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mentorStatusCard: {
    backgroundColor: '#0b0b0c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.15)',
    padding: 16,
    marginBottom: 24,
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  mentorStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  pulseContainer: {
    width: 8,
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  pulseIndicator: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    opacity: 0.4,
  },
  mentorStatusTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#10b981',
    letterSpacing: 1.5,
  },
  mentorStatusText: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
    marginBottom: 10,
  },
  mentorStatusFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avgResponseText: {
    fontSize: 10,
    color: '#555',
    fontWeight: '600',
  },
  mentorStatusLinkText: {
    fontSize: 11,
    color: '#00f0ff',
    fontWeight: 'bold',
  },
  heroCard: {
    backgroundColor: '#0b0b0c',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.25)', // neon purple border glow
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  heroGradientOverlay: {
    padding: 20,
    backgroundColor: 'rgba(11, 11, 12, 0.75)',
  },
  heroTag: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#a855f7',
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 16,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    marginBottom: 12,
  },
  progressBarActive: {
    height: '100%',
    backgroundColor: '#a855f7',
    borderRadius: 2,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroProgressText: {
    fontSize: 11,
    color: '#555',
  },
  resumeBtn: {
    backgroundColor: '#00f0ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resumeBtnText: {
    color: '#050505',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#0b0b0c',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 9,
    color: '#666',
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  seeAllText: {
    fontSize: 12,
    color: '#00f0ff',
    fontWeight: '600',
  },
  coursesList: {
    gap: 12,
    marginBottom: 28,
  },
  enrolledCourseCard: {
    flexDirection: 'row',
    backgroundColor: '#0b0b0c',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 16,
    alignItems: 'center',
  },
  courseColorIndicator: {
    width: 4,
    height: 40,
    backgroundColor: '#00f0ff',
    borderRadius: 2,
    marginRight: 16,
  },
  courseInfoContainer: {
    flex: 1,
  },
  courseTitleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  courseModulesCount: {
    fontSize: 11,
    color: '#666',
    marginBottom: 8,
  },
  courseProgressOutline: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 1.5,
    width: '90%',
  },
  courseProgressFill: {
    height: '100%',
    backgroundColor: '#00f0ff',
    borderRadius: 1.5,
  },
  arrowIcon: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  arrowIconText: {
    color: '#444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  catalogSection: {
    marginBottom: 28,
  },
  catalogList: {
    gap: 12,
    marginTop: 12,
  },
  catalogCard: {
    flexDirection: 'row',
    backgroundColor: '#0b0b0c',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    alignItems: 'center',
  },
  catalogCardBody: {
    flex: 1,
  },
  catalogCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  catalogCardPrice: {
    fontSize: 12,
    color: '#00f0ff',
    fontWeight: '600',
    marginBottom: 6,
  },
  catalogCardBenefit: {
    fontSize: 10,
    color: '#666',
  },
  catalogBuyBtn: {
    backgroundColor: '#a855f7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  catalogBuyBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionTitleUpcoming: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  upcomingCarouselContainer: {
    gap: 16,
    paddingRight: 24,
  },
  upcomingCard: {
    width: Dimensions.get('window').width - 48,
    backgroundColor: '#0b0b0c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  upcomingImageHeader: {
    height: 80,
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    padding: 16,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  upcomingBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#a855f7',
  },
  upcomingBadgeText: {
    color: '#a855f7',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  upcomingDate: {
    color: '#888',
    fontSize: 11,
    fontWeight: '500',
  },
  upcomingBody: {
    padding: 20,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  upcomingDesc: {
    fontSize: 12,
    color: '#777',
    lineHeight: 18,
    marginBottom: 12,
  },
  upcomingInstructor: {
    fontSize: 11,
    color: '#555',
    fontWeight: '600',
    marginBottom: 16,
  },
  notifyBtn: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  notifyBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
  },
  notifyBtnText: {
    color: '#999',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  notifyBtnTextActive: {
    color: '#10b981',
  }
});
