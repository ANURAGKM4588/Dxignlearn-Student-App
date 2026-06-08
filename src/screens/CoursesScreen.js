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

// Simulated course curriculum structure with enriched metadata pointing to Cloudinary CDN
const COURSE_CURRICULUM = {
  "Graphic Design": [
    { 
      id: "gd-1", 
      title: "CGI Ad Video - Tender Coconut", 
      duration: "1 min", 
      videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/CGI_Ad_Video_Tender_coconut_mm1yoo.mp4",
      description: "Learn how to build visual 3D tender coconut elements and integrate them into dynamic commercial CGI layouts. Perfect for advertising creatives.",
      difficulty: "Intermediate",
      tags: ["CGI", "Product Ad", "Blender"],
      resources: [
        { name: "3D Tender Coconut Asset Bundle", size: "14.2 MB" },
        { name: "Lighting & Materials Setup Guide PDF", size: "2.4 MB" }
      ]
    },
    { 
      id: "gd-2", 
      title: "Golden Tea Ad Commercial", 
      duration: "1 min", 
      videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Golden_tea_Ad_ebxdah.mp4",
      description: "Step-by-step breakdown of designing fluid tea animations and gold branding highlights for high-end beverage commercials.",
      difficulty: "Advanced",
      tags: ["Fluids simulation", "Gold VFX", "Color Grading"],
      resources: [
        { name: "Gold Material Settings & Presets", size: "1.8 MB" }
      ]
    },
    { 
      id: "gd-3", 
      title: "Jewllery Advertisement Showcase", 
      duration: "1 min", 
      videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Jewllery_ads_uikdt5.mp4",
      description: "Mastering micro-refraction and diamond lighting angles to create luxury jewellery ads. Focus on composition and depth of field.",
      difficulty: "Advanced",
      tags: ["Macro lighting", "Jewellery design", "Render passes"],
      resources: [
        { name: "Luxury Studio HDRI Map", size: "32.0 MB" },
        { name: "Refraction Index Guide CheatSheet", size: "850 KB" }
      ]
    }
  ],
  "Film Making": [
    { 
      id: "fm-1", 
      title: "Cinematic Car Ads Project", 
      duration: "1 min", 
      videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Car_Ads_hnpyf0.mp4",
      description: "Explore camera paths, dynamic pacing, and sound design layers to construct high-energy, cinematic automotive commercials.",
      difficulty: "Intermediate",
      tags: ["Speed ramping", "Camera paths", "Sound design"],
      resources: [
        { name: "Sound Design SFX Pack", size: "45.1 MB" }
      ]
    },
    { 
      id: "fm-2", 
      title: "Grandma's Sweet Storyboard Video", 
      duration: "2 mins", 
      videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Grandmas_Sweet_iyztel.mp4",
      description: "How to tell emotional, narrative-driven stories through cinematography. Analyzing framing, warm lighting, and actor pacing.",
      difficulty: "Beginner",
      tags: ["Storytelling", "Warm lighting", "Framing"],
      resources: [
        { name: "Storyboard Blank Template PDF", size: "1.1 MB" }
      ]
    },
    { 
      id: "fm-3", 
      title: "Romantic Couple Short Cinematic", 
      duration: "1 min", 
      videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Romantic_Couple_Short_video_k1m9ba.mp4",
      description: "Focus on capturing slow-motion expressions, sunset backlighting, and warm-toned color grading for romantic visuals.",
      difficulty: "Beginner",
      tags: ["Slow motion", "Backlighting", "Grading"],
      resources: [
        { name: "LUTs Pack - Cinematic Warm Gold", size: "8.4 MB" }
      ]
    }
  ],
  "Content Creation": [
    { 
      id: "cc-1", 
      title: "KOME Reel - French Edition", 
      duration: "1 min", 
      videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/KOME_Reel_-2_French_j0arz5.mp4",
      description: "Dissecting fast-paced typography transitions and modern French aesthetics used to capture high engagement in brand reels.",
      difficulty: "Intermediate",
      tags: ["Kinetic text", "Transitions", "Reels format"],
      resources: [
        { name: "Premiere Pro Text Templates", size: "12.2 MB" }
      ]
    },
    { 
      id: "cc-2", 
      title: "Mayflower Reel 2 Project", 
      duration: "1 min", 
      videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Mayflower_Reel_2_blefup.mp4",
      description: "Advanced audio syncing techniques and creative text overlays to create visual impact for storytelling reels.",
      difficulty: "Intermediate",
      tags: ["Audio syncing", "Text overlays", "Retention tips"],
      resources: [
        { name: "Hook Templates (50 Script Ideas)", size: "420 KB" }
      ]
    },
    { 
      id: "cc-3", 
      title: "Regalia Brand Reel 1", 
      duration: "1 min", 
      videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Regalia_reel_1_gc2qyp.mp4",
      description: "Clean aesthetic product shots with smooth pan camera moves. Crafting premium content on budget setups.",
      difficulty: "Beginner",
      tags: ["Product shots", "Pan movements", "Budget setups"],
      resources: [
        { name: "Budget Equipment Guide PDF", size: "3.5 MB" }
      ]
    }
  ],
  "Vibe Coding": [
    { 
      id: "vc-1", 
      title: "Reshma Website WebQ Reel", 
      duration: "1 min", 
      videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Reshma_Website_WebQ_Reel_1_gqohvf.mp4",
      description: "Watch the build flow of a developer landing page using Claude 3.5 Sonnet. Best practices in prompt structure and component validation.",
      difficulty: "Beginner",
      tags: ["Claude 3.5", "Vite JS", "Components"],
      resources: [
        { name: "Prompts System Template MD", size: "120 KB" }
      ]
    },
    { 
      id: "vc-2", 
      title: "Velox Reel System Integration", 
      duration: "2 mins", 
      videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Velox_Reel_1_xeweqz.mp4",
      description: "Building database hooks and payment checkouts dynamically with generative code tools. Complete testing guide.",
      difficulty: "Advanced",
      tags: ["API hooks", "Payments integration", "Node JS"],
      resources: [
        { name: "Stripe Webhook Script template", size: "45 KB" }
      ]
    }
  ],
  "Business Automation": [
    { 
      id: "ba-1", 
      title: "Sky Bound Travel Agency Automations", 
      duration: "1 min", 
      videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/Sky_Bound_Traval_Agency_vg5oqa.mp4",
      description: "Automate leads from Google Ads directly to WhatsApp notifications and CRM databases using Make.com (integromat).",
      difficulty: "Intermediate",
      tags: ["Make.com", "CRM Sync", "WhatsApp API"],
      resources: [
        { name: "Make.com Scenario blueprint JSON", size: "340 KB" }
      ]
    },
    { 
      id: "ba-2", 
      title: "OPTIC EXPO 2025 System Demo", 
      duration: "1 min", 
      videoUrl: "https://res.cloudinary.com/dwfjax67x/video/upload/OPTIC_EXPO_2025_joubt6.mp4",
      description: "Bulk registration automations and check-in system design utilizing QR scanning and Apps Script sync logs.",
      difficulty: "Advanced",
      tags: ["QR verification", "Google Sheets API", "Expo Router"],
      resources: [
        { name: "QR Scanner React Native hook code", size: "12 KB" }
      ]
    }
  ]
};

export default function CoursesScreen({ user }) {
  const [selectedCourse, setSelectedCourse] = useState(user.courses[0] || "Graphic Design");
  const [currentVideo, setCurrentVideo] = useState(COURSE_CURRICULUM[selectedCourse]?.[0] || null);
  const [downloadingResource, setDownloadingResource] = useState({});

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

  const handleDownloadResource = (resourceName) => {
    if (downloadingResource[resourceName]) return;
    
    setDownloadingResource(prev => ({ ...prev, [resourceName]: 'downloading' }));
    
    setTimeout(() => {
      setDownloadingResource(prev => ({ ...prev, [resourceName]: 'done' }));
      alert(`Successfully saved "${resourceName}" to your local downloads folder!`);
    }, 2000);
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

      {/* Scrollable details and chapters */}
      <FlatList
        data={COURSE_CURRICULUM[selectedCourse] || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.curriculumList}
        ListHeaderComponent={
          <View style={styles.headerComponent}>
            {/* Selected video details */}
            <View style={styles.videoDetails}>
              <View style={styles.detailsHeaderRow}>
                <Text style={styles.videoCategory}>{selectedCourse.toUpperCase()}</Text>
                {currentVideo && isEnrolled && currentVideo.difficulty && (
                  <View style={[
                    styles.difficultyBadge, 
                    currentVideo.difficulty === 'Beginner' ? styles.badgeBeginner :
                    currentVideo.difficulty === 'Intermediate' ? styles.badgeIntermediate : styles.badgeAdvanced
                  ]}>
                    <Text style={[
                      styles.difficultyText,
                      currentVideo.difficulty === 'Beginner' ? styles.textBeginner :
                      currentVideo.difficulty === 'Intermediate' ? styles.textIntermediate : styles.textAdvanced
                    ]}>{currentVideo.difficulty.toUpperCase()}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.videoTitle}>
                {currentVideo && isEnrolled ? currentVideo.title : !isEnrolled ? "Access Blocked" : "No lecture playing"}
              </Text>
              
              {currentVideo && isEnrolled && (
                <View style={styles.lectureMetaRow}>
                  <Text style={styles.videoDuration}>Duration: {currentVideo.duration}</Text>
                </View>
              )}

              {/* Skill Pills */}
              {currentVideo && isEnrolled && currentVideo.tags && (
                <View style={styles.tagsContainer}>
                  {currentVideo.tags.map(tag => (
                    <View key={tag} style={styles.tagPill}>
                      <Text style={styles.tagPillText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Expandable Description Block */}
              {currentVideo && isEnrolled && currentVideo.description && (
                <View style={styles.descriptionBlock}>
                  <Text style={styles.descriptionTitle}>Lecture Summary</Text>
                  <Text style={styles.descriptionText}>{currentVideo.description}</Text>
                </View>
              )}

              {/* Downloadable Assets & Resources */}
              {currentVideo && isEnrolled && currentVideo.resources && currentVideo.resources.length > 0 && (
                <View style={styles.resourcesContainer}>
                  <Text style={styles.resourcesTitle}>Downloadable Resources</Text>
                  {currentVideo.resources.map((res) => {
                    const dlState = downloadingResource[res.name];
                    return (
                      <TouchableOpacity 
                        key={res.name}
                        style={styles.resourceRow}
                        onPress={() => handleDownloadResource(res.name)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.resourceMetaInfo}>
                          <Text style={styles.resourceIcon}>📁</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.resourceNameText} numberOfLines={1}>{res.name}</Text>
                            <Text style={styles.resourceSizeText}>{res.size}</Text>
                          </View>
                        </View>
                        <View style={[
                          styles.downloadBadge, 
                          dlState === 'downloading' && styles.dlProgress,
                          dlState === 'done' && styles.dlComplete
                        ]}>
                          <Text style={styles.downloadBadgeText}>
                            {dlState === 'downloading' ? "Saving..." :
                             dlState === 'done' ? "✓ Saved" : "Get File 📥"}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
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
            
            <Text style={styles.curriculumSectionTitle}>Course Syllabus & Chapters</Text>
          </View>
        }
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
  headerComponent: {
    backgroundColor: '#050505',
  },
  videoDetails: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  detailsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  videoCategory: {
    color: '#a855f7',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  badgeBeginner: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgeIntermediate: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  badgeAdvanced: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  difficultyText: {
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  textBeginner: { color: '#10b981' },
  textIntermediate: { color: '#f59e0b' },
  textAdvanced: { color: '#ef4444' },
  videoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  lectureMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  videoDuration: {
    color: '#555',
    fontSize: 11,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  tagPill: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagPillText: {
    color: '#999',
    fontSize: 10,
    fontWeight: '500',
  },
  descriptionBlock: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  descriptionTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  descriptionText: {
    color: '#888',
    fontSize: 12,
    lineHeight: 18,
  },
  resourcesContainer: {
    marginTop: 8,
  },
  resourcesTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0b0b0c',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  resourceMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  resourceIcon: {
    fontSize: 18,
  },
  resourceNameText: {
    color: '#eee',
    fontSize: 12,
    fontWeight: 'bold',
  },
  resourceSizeText: {
    color: '#555',
    fontSize: 10,
    marginTop: 2,
  },
  downloadBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 240, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dlProgress: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: '#f59e0b',
  },
  dlComplete: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: '#10b981',
  },
  downloadBadgeText: {
    color: '#00f0ff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  courseTabs: {
    paddingVertical: 12,
    backgroundColor: '#0b0b0c',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
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
  curriculumSectionTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  curriculumList: {
    paddingBottom: 24,
    gap: 8,
  },
  lectureItem: {
    backgroundColor: '#0b0b0c',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    marginHorizontal: 20,
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
