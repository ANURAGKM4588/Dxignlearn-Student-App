import React, { useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  ScrollView,
  Linking
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { COURSE_PAYMENT_LINKS, COURSE_PRICING } from '../services/firebase';

const ALL_COURSES = ["Graphic Design", "Film Making", "Content Creation", "Vibe Coding", "Business Automation"];

// Simulated course curriculum structure
const COURSE_CURRICULUM = {
  "Graphic Design": [
    { id: "gd-1", title: "CGI Ad Video - Tender Coconut", duration: "1 min", videoUrl: "https://dxignlearn.vercel.app/public/Images/videos/CGI%20Ad%20Video%20Tender%20coconut.mp4" },
    { id: "gd-2", title: "Golden Tea Ad Commercial", duration: "1 min", videoUrl: "https://dxignlearn.vercel.app/public/Images/videos/Golden%20tea%20Ad.mp4" },
    { id: "gd-3", title: "Jewllery Advertisement Showcase", duration: "1 min", videoUrl: "https://dxignlearn.vercel.app/public/Images/videos/Jewllery%20ads.mp4" }
  ],
  "Film Making": [
    { id: "fm-1", title: "Cinematic Car Ads Project", duration: "1 min", videoUrl: "https://dxignlearn.vercel.app/public/Images/videos/Car%20Ads.mp4" },
    { id: "fm-2", title: "Grandma's Sweet Storyboard Video", duration: "2 mins", videoUrl: "https://dxignlearn.vercel.app/public/Images/videos/Grandma%27s%20Sweet.mp4" },
    { id: "fm-3", title: "Romantic Couple Short Cinematic", duration: "1 min", videoUrl: "https://dxignlearn.vercel.app/public/Images/videos/Romantic%20Couple%20Short%20video.mp4" }
  ],
  "Content Creation": [
    { id: "cc-1", title: "KOME Reel - French Edition", duration: "1 min", videoUrl: "https://dxignlearn.vercel.app/public/Images/videos/KOME%20Reel%20-2%20French.mp4" },
    { id: "cc-2", title: "Mayflower Reel 2 Project", duration: "1 min", videoUrl: "https://dxignlearn.vercel.app/public/Images/videos/Mayflower%20Reel%202.mp4" },
    { id: "cc-3", title: "Regalia Brand Reel 1", duration: "1 min", videoUrl: "https://dxignlearn.vercel.app/public/Images/videos/Regalia%20reel%201.mp4" }
  ],
  "Vibe Coding": [
    { id: "vc-1", title: "Reshma Website WebQ Reel", duration: "1 min", videoUrl: "https://dxignlearn.vercel.app/public/Images/videos/Reshma%20Website%20WebQ%20Reel%201.mp4" },
    { id: "vc-2", title: "Velox Reel System Integration", duration: "2 mins", videoUrl: "https://dxignlearn.vercel.app/public/Images/videos/Velox%20Reel%201.mp4" }
  ],
  "Business Automation": [
    { id: "ba-1", title: "Sky Bound Travel Agency Automations", duration: "1 min", videoUrl: "https://dxignlearn.vercel.app/public/Images/videos/Sky%20Bound%20Traval%20Agency.mp4" },
    { id: "ba-2", title: "OPTIC EXPO 2025 System Demo", duration: "1 min", videoUrl: "https://dxignlearn.vercel.app/public/Images/videos/OPTIC%20EXPO%202025,.mp4" }
  ]
};

export default function CoursesScreen({ user }) {
  const [selectedCourse, setSelectedCourse] = useState(user.courses[0] || "Graphic Design");
  const [currentVideo, setCurrentVideo] = useState(COURSE_CURRICULUM[selectedCourse]?.[0] || null);

  const isEnrolled = user.courses.includes(selectedCourse);

  const handleSelectVideo = (video) => {
    if (!isEnrolled) {
      alert(`Please purchase and unlock the ${selectedCourse} program to watch this lecture!`);
      return;
    }

    if (!video.videoUrl) {
      alert("This video module is locked or currently being uploaded. Check back soon!");
      return;
    }
    setCurrentVideo(video);
  };

  return (
    <View style={styles.container}>
      {/* Screen Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.screenTitle}>Curriculum Lectures</Text>
        <Text style={styles.screenSubtitle}>Select and stream course videos</Text>
      </View>

      {/* Main video area */}
      <View style={styles.videoPlayerContainer}>
        {!isEnrolled ? (
          <View style={styles.lockedPlayerOverlay}>
            <Text style={styles.lockedOverlayTitle}>🔒 COURSE LOCKED</Text>
            <Text style={styles.lockedOverlayText}>You are not currently enrolled in the {selectedCourse} course.</Text>
            <Text style={styles.lockedOverlayPrice}>Price: {COURSE_PRICING[selectedCourse] || "₹499"}</Text>
            <TouchableOpacity 
              style={styles.buyBtn} 
              onPress={() => Linking.openURL(COURSE_PAYMENT_LINKS[selectedCourse])}
              activeOpacity={0.8}
            >
              <Text style={styles.buyBtnText}>BUY & UNLOCK NOW</Text>
            </TouchableOpacity>
          </View>
        ) : currentVideo && currentVideo.videoUrl ? (
          <Video
            source={{ uri: currentVideo.videoUrl }}
            rate={1.0}
            volume={1.0}
            isMuted={false}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={false}
            useNativeControls
            style={styles.videoPlayer}
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.placeholderText}>Select a lecture from curriculum to play</Text>
          </View>
        )}
      </View>

      {/* Selected video details */}
      <View style={styles.videoDetails}>
        <Text style={styles.videoCategory}>{selectedCourse.toUpperCase()}</Text>
        <Text style={styles.videoTitle}>{currentVideo && isEnrolled ? currentVideo.title : !isEnrolled ? "Access Blocked" : "No lecture playing"}</Text>
        <Text style={styles.videoDuration}>{currentVideo && isEnrolled ? `Duration: ${currentVideo.duration}` : ""}</Text>
      </View>

      {/* Course selectors */}
      <View style={styles.courseTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {ALL_COURSES.map((course) => {
            const courseEnrolled = user.courses.includes(course);
            return (
              <TouchableOpacity 
                key={course}
                style={[styles.tab, selectedCourse === course && styles.activeTab]}
                onPress={() => {
                  setSelectedCourse(course);
                  setCurrentVideo(COURSE_CURRICULUM[course]?.[0] || null);
                }}
              >
                <Text style={[styles.tabText, selectedCourse === course && styles.activeTabText]}>
                  {course} {!courseEnrolled && "🔒"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Curriculum list */}
      <FlatList
        data={COURSE_CURRICULUM[selectedCourse] || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.curriculumList}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.lectureItem, currentVideo?.id === item.id && isEnrolled && styles.activeLectureItem]}
            onPress={() => handleSelectVideo(item)}
          >
            <View style={styles.lectureMeta}>
              <View style={[styles.playIconCircle, (!item.videoUrl || !isEnrolled) && styles.lockedCircle]}>
                <Text style={styles.playIcon}>{(item.videoUrl && isEnrolled) ? "▶" : "🔒"}</Text>
              </View>
              <View style={styles.lectureTextContainer}>
                <Text style={styles.lectureTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.lectureDuration}>{item.duration}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  screenSubtitle: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  videoPlayerContainer: {
    width: '100%',
    height: Dimensions.get('window').width * 0.56, // 16:9 ratio
    backgroundColor: '#000',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
  },
  videoDetails: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  videoCategory: {
    color: '#a855f7',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  videoDuration: {
    color: '#555',
    fontSize: 11,
    marginTop: 4,
  },
  courseTabs: {
    paddingVertical: 12,
    backgroundColor: '#0b0b0c',
  },
  tabScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  activeTab: {
    backgroundColor: '#00f0ff',
    borderColor: '#00f0ff',
  },
  tabText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#050505',
    fontWeight: 'bold',
  },
  curriculumList: {
    padding: 20,
    gap: 12,
  },
  lectureItem: {
    backgroundColor: '#0b0b0c',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 16,
  },
  activeLectureItem: {
    borderColor: 'rgba(0, 240, 255, 0.3)',
    backgroundColor: 'rgba(0, 240, 255, 0.02)',
  },
  lectureMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,240,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedCircle: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  playIcon: {
    color: '#00f0ff',
    fontSize: 10,
  },
  lectureTextContainer: {
    flex: 1,
  },
  lectureTitle: {
    color: '#eee',
    fontSize: 13,
    fontWeight: 'bold',
  },
  lectureDuration: {
    color: '#555',
    fontSize: 10,
    marginTop: 2,
  },
  lockedPlayerOverlay: {
    flex: 1,
    backgroundColor: '#0b0b0c',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  lockedOverlayTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ef4444',
    letterSpacing: 2,
    marginBottom: 8,
  },
  lockedOverlayText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  lockedOverlayPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00f0ff',
    marginBottom: 16,
  },
  buyBtn: {
    backgroundColor: '#00f0ff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buyBtnText: {
    color: '#050505',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  }
});
