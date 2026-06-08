import React, { useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  ScrollView 
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';

// Simulated course curriculum structure
const COURSE_CURRICULUM = {
  "Graphic Design": [
    { id: "gd-1", title: "Introduction to generative AI design tools", duration: "18 mins", videoUrl: "https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4" },
    { id: "gd-2", title: "Midjourney prompts and composition mastery", duration: "25 mins", videoUrl: "" },
    { id: "gd-3", title: "Advanced generative fills & layout assets", duration: "32 mins", videoUrl: "" }
  ],
  "Film Making": [
    { id: "fm-1", title: "Cinematic camera path prompting in Runway", duration: "20 mins", videoUrl: "https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4" },
    { id: "fm-2", title: "Consistent actor generation & video merging", duration: "28 mins", videoUrl: "" }
  ],
  "Content Creation": [
    { id: "cc-1", title: "Setting up chatGPT scripts & content calendars", duration: "15 mins", videoUrl: "https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4" }
  ],
  "Vibe Coding": [
    { id: "vc-1", title: "Building custom HTML components with Claude", duration: "24 mins", videoUrl: "https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4" }
  ],
  "Business Automation": [
    { id: "ba-1", title: "Make.com workflow integrations & Zapier setup", duration: "30 mins", videoUrl: "https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4" }
  ]
};

export default function CoursesScreen({ user, onLogout, onNavigateToChat }) {
  const [selectedCourse, setSelectedCourse] = useState(user.courses[0] || "Graphic Design");
  const [currentVideo, setCurrentVideo] = useState(COURSE_CURRICULUM[selectedCourse]?.[0] || null);

  const handleSelectVideo = (video) => {
    if (!video.videoUrl) {
      alert("This video module is locked or currently being uploaded. Check back soon!");
      return;
    }
    setCurrentVideo(video);
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>Hello, {user.name || "Student"}</Text>
          <Text style={styles.userStatus}>Enrolled: {user.courses.length} Program(s)</Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.chatButton} onPress={onNavigateToChat}>
            <Text style={styles.chatButtonText}>ASK DOUBTS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
            <Text style={styles.logoutText}>LOGOUT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main video area */}
      <View style={styles.videoPlayerContainer}>
        {currentVideo && currentVideo.videoUrl ? (
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
        <Text style={styles.videoTitle}>{currentVideo ? currentVideo.title : "No lecture playing"}</Text>
        <Text style={styles.videoDuration}>{currentVideo ? `Duration: ${currentVideo.duration}` : ""}</Text>
      </View>

      {/* Course selectors */}
      <View style={styles.courseTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {user.courses.map((course) => (
            <TouchableOpacity 
              key={course}
              style={[styles.tab, selectedCourse === course && styles.activeTab]}
              onPress={() => {
                setSelectedCourse(course);
                setCurrentVideo(COURSE_CURRICULUM[course]?.[0] || null);
              }}
            >
              <Text style={[styles.tabText, selectedCourse === course && styles.activeTabText]}>
                {course}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Curriculum list */}
      <FlatList
        data={COURSE_CURRICULUM[selectedCourse] || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.curriculumList}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.lectureItem, currentVideo?.id === item.id && styles.activeLectureItem]}
            onPress={() => handleSelectVideo(item)}
          >
            <View style={styles.lectureMeta}>
              <View style={[styles.playIconCircle, !item.videoUrl && styles.lockedCircle]}>
                <Text style={styles.playIcon}>{item.videoUrl ? "▶" : "🔒"}</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  userStatus: {
    fontSize: 10,
    color: '#00f0ff',
    fontWeight: '600',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  chatButton: {
    backgroundColor: '#a855f7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '800',
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
  }
});
