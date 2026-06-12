import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator, 
  Image,
  Vibration,
  Alert,
  Dimensions
} from 'react-native';
import { Audio, Video } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { 
  Paperclip, 
  Mic, 
  Send, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  FileText, 
  ArrowLeft, 
  Check, 
  CheckCheck, 
  Play, 
  Pause, 
  Camera, 
  Phone, 
  MoreVertical, 
  Volume2,
  X,
  Trash,
  Smile
} from 'lucide-react-native';
import { db, storage, APPS_SCRIPT_WEBHOOK } from '../services/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system/legacy';

const getDriveFileId = (url) => {
  if (!url) return null;
  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\/view/);
  if (match && match[1]) return match[1];
  match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  return null;
};

const getMediaDirectUrl = (url) => {
  if (!url) return '';
  const fileId = getDriveFileId(url);
  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  return url;
};

const getVideoThumbnailUrl = (url) => {
  if (!url) return '';
  const fileId = getDriveFileId(url);
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
  }
  return url;
};

const WAVEFORM_HEIGHTS = [6, 12, 18, 14, 8, 10, 16, 22, 14, 12, 8, 6, 10, 16, 20, 14, 18, 12, 8, 6, 12, 16, 10, 8, 12, 14, 6];

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
// Max width a chat bubble image can occupy
const CHAT_IMAGE_WIDTH = Math.round(SCREEN_WIDTH * 0.72);
// Max height — portrait images capped so they don't fill the whole screen
const CHAT_IMAGE_MAX_HEIGHT = Math.round(SCREEN_HEIGHT * 0.65);
// Min height — even tiny images get a sensible floor
const CHAT_IMAGE_MIN_HEIGHT = 80;

const COMMON_EMOJIS = ['😀', '😂', '😍', '👍', '🙌', '🔥', '❤️', '👏', '🎉', '🚀', '💡', '💯', '🤔', '😢', '😎', '💻'];

/**
 * VideoChatPreview
 * Shows a video thumbnail in the chat at the video's ACTUAL aspect ratio.
 * Uses expo-av Video component (opacity:0, size 0) to detect:
 *   - natural width/height via onReadyForDisplay
 *   - duration via onPlaybackStatusUpdate
 * Then renders the thumbnail image at that exact ratio.
 */
const VideoChatPreview = React.memo(({
  videoUrl, thumbnailUrl, onPress, isMe, timestamp, itemStatus
}) => {
  const rs = isMe
    ? { borderRadius: 16, borderTopRightRadius: 2 }
    : { borderRadius: 16, borderTopLeftRadius: 2 };

  const [frameHeight, setFrameHeight] = React.useState(
    Math.round(CHAT_IMAGE_WIDTH * (9 / 16))  // default 16:9 until video loads
  );
  const [duration, setDuration] = React.useState('0:00');
  const [dimsSet, setDimsSet] = React.useState(false);
  const [localThumbnail, setLocalThumbnail] = React.useState(null);

  React.useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;
    const generateThumbnail = async () => {
      try {
        const directUrl = getMediaDirectUrl(videoUrl);
        if (!directUrl) return;
        const { uri } = await VideoThumbnails.getThumbnailAsync(directUrl, {
          time: 0,
          quality: 0.6,
        });
        if (active && uri) {
          setLocalThumbnail(uri);
        }
      } catch (e) {
        console.warn('Error generating video thumbnail:', e);
      }
    };
    generateThumbnail();
    return () => {
      active = false;
    };
  }, [videoUrl]);

  const onReadyForDisplay = React.useCallback((e) => {
    if (dimsSet) return;
    const { width: vw, height: vh } = e.naturalSize || {};
    if (vw && vh) {
      const ratio = vh / vw;
      const rawH = CHAT_IMAGE_WIDTH * ratio;
      const h = Math.max(CHAT_IMAGE_MIN_HEIGHT, Math.min(rawH, CHAT_IMAGE_MAX_HEIGHT));
      setFrameHeight(Math.round(h));
      setDimsSet(true);
    }
  }, [dimsSet]);

  const onPlaybackStatus = React.useCallback((status) => {
    if (status.isLoaded && status.durationMillis && duration === '0:00') {
      const totalSec = Math.floor(status.durationMillis / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      setDuration(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
    }
  }, [duration]);

  const borderColor = isMe ? 'rgba(0,240,255,0.25)' : 'rgba(168,85,247,0.2)';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <View style={[{
        width: CHAT_IMAGE_WIDTH,
        height: frameHeight,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor,
        backgroundColor: 'rgba(5,20,30,0.95)',
      }, rs]}>

        {/* Thumbnail image */}
        <Image
          source={{ uri: localThumbnail || thumbnailUrl }}
          style={[{ width: '100%', height: '100%' }, rs]}
          resizeMode="cover"
        />

        {/*
          Hidden Video (0x0, opacity 0) — only loaded to read naturalSize & duration.
          Not played. Unloads itself once we have both values.
        */}
        <Video
          source={{ uri: getMediaDirectUrl(videoUrl) }}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
          shouldPlay={false}
          isMuted={true}
          onReadyForDisplay={onReadyForDisplay}
          onPlaybackStatusUpdate={onPlaybackStatus}
        />

        {/* Dark overlay — clipped by parent overflow:hidden */}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />

        {/* Centered play button */}
        <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
          <View style={styles.videoPlayOverlayBtn}>
            <Play color="#fff" size={28} fill="#fff" style={{ marginLeft: 3 }} />
          </View>
        </View>

        {/* Bottom bar: HD + duration | timestamp + ticks */}
        <View style={[styles.videoBottomBar]}>
          <View style={styles.videoBottomLeft}>
            <View style={styles.videoHDBadge}>
              <Text style={styles.videoHDText}>HD</Text>
            </View>
            <Text style={styles.videoDurationText}>{duration}</Text>
          </View>
          <View style={styles.videoBottomRight}>
            <Text style={styles.mediaTimestampText}>{timestamp}</Text>
            {isMe && (
              itemStatus === 'read'
                ? <CheckCheck color="#00f0ff" size={12} />
                : <CheckCheck color="rgba(255,255,255,0.85)" size={12} />
            )}
          </View>
        </View>

      </View>
    </TouchableOpacity>
  );
});

/**
 * DynamicMediaPreview
 * ─ Owns its own border + borderRadius + overflow:hidden (elevation 0 → clips correctly on Android)
 * ─ Calls Image.getSize to render at the real image aspect ratio
 * ─ Passes borderRadius down to overlays via renderOverlays(rs) render prop
 */
const DynamicMediaPreview = React.memo(({
  uri, onPress, renderOverlays, isVideo,
  borderColor, bgColor,
  myBubble,          // true = sent (right), false = received (left)
}) => {
  // Border radius matching the chat bubble shape
  const rs = myBubble
    ? { borderRadius: 16, borderTopRightRadius: 2 }
    : { borderRadius: 16, borderTopLeftRadius: 2 };

  const fallbackHeight = isVideo
    ? Math.round(CHAT_IMAGE_WIDTH * (9 / 16))
    : Math.round(CHAT_IMAGE_WIDTH * (3 / 4));

  const [frameSize, setFrameSize] = React.useState({
    width: CHAT_IMAGE_WIDTH,
    height: fallbackHeight,
  });

  React.useEffect(() => {
    if (!uri) return;
    Image.getSize(uri,
      (naturalW, naturalH) => {
        if (!naturalW || !naturalH) return;
        const ratio = naturalH / naturalW;
        const rawH = CHAT_IMAGE_WIDTH * ratio;
        const h = Math.max(CHAT_IMAGE_MIN_HEIGHT, Math.min(rawH, CHAT_IMAGE_MAX_HEIGHT));
        setFrameSize({ width: CHAT_IMAGE_WIDTH, height: Math.round(h) });
      },
      () => {}
    );
  }, [uri]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      {/*
        This View is the TRUE clip container.
        It has elevation:0 — so Android's overflow:'hidden' + borderRadius WORKS.
        The parent messageBubble for media has elevation:0 too, no conflict.
        borderWidth draws the bubble border, overflow clips the image to match.
      */}
      <View style={[
        {
          width: frameSize.width,
          height: frameSize.height,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: borderColor || 'rgba(0,240,255,0.25)',
          backgroundColor: bgColor || 'rgba(0,0,0,0.7)',
        },
        rs,
      ]}>
        <Image
          source={{ uri }}
          style={[{ width: '100%', height: '100%' }, rs]}
          resizeMode="cover"
        />
        {renderOverlays ? renderOverlays(rs) : null}
      </View>
    </TouchableOpacity>
  );
});

const renderParsedText = (text, isMe) => {
  if (!text) return null;
  const regex = /("[^"]+")|(--\w+(?:\s+\d+:\d+|\s+\S+)?)/g;
  const parts = text.split(regex);
  return (
    <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
      {parts.map((part, index) => {
        if (!part) return null;
        if (part.startsWith('"') && part.endsWith('"')) {
          return (
            <Text key={index} style={{ color: '#00f0ff', fontWeight: 'bold' }}>
              {part}
            </Text>
          );
        }
        if (part.startsWith('--')) {
          return (
            <Text key={index} style={{ color: '#a855f7', fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
              {part}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
};


// Sort messages oldest-first by timestamp (new messages go to bottom)
const sortByTime = (msgs) => {
  return [...msgs].sort((a, b) => {
    const getMs = (ts) => {
      if (!ts) return 0;
      if (typeof ts.seconds === 'number') return ts.seconds * 1000;
      if (ts instanceof Date) return ts.getTime();
      if (typeof ts.toMillis === 'function') return ts.toMillis();
      if (typeof ts === 'number') return ts;
      return 0;
    };
    return getMs(a.timestamp) - getMs(b.timestamp);
  });
};

export default function ChatScreen({ user, onBack }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [videoDownloading, setVideoDownloading] = useState(false);

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
    setShowAttachmentMenu(false);
  };

  // Audio Playback States
  const [playbackStatus, setPlaybackStatus] = useState({
    soundId: null,
    position: 0,
    duration: 0,
    isPlaying: false,
  });
  const [currentSound, setCurrentSound] = useState(null);

  // Selection & More Dropdown States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const toggleSelectMessage = (messageId) => {
    setSelectedMessageIds(prev => {
      const exists = prev.includes(messageId);
      let updated;
      if (exists) {
        updated = prev.filter(id => id !== messageId);
      } else {
        updated = [...prev, messageId];
      }
      if (updated.length === 0) {
        setIsSelectionMode(false);
      }
      return updated;
    });
  };

  const handleLongPressMessage = (messageId) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedMessageIds([messageId]);
    } else {
      toggleSelectMessage(messageId);
    }
  };

  const handlePressMessage = async (item) => {
    if (isSelectionMode) {
      toggleSelectMessage(item.id);
    } else {
      // Normal bubble press -> trigger preview mode
      if (item.type === 'image') {
        const directUrl = getMediaDirectUrl(item.fileUrl, 'image');
        setPreviewMedia({ type: 'image', url: directUrl });
      } else if (item.type === 'video') {
        const fileId = getDriveFileId(item.fileUrl);
        if (fileId) {
          setVideoDownloading(true);
          try {
            const cacheDir = FileSystem.cacheDirectory;
            const tempPath = `${cacheDir}preview_video_${item.id}.mp4`;
            const info = await FileSystem.getInfoAsync(tempPath);
            if (info.exists) {
              setPreviewMedia({ type: 'video', url: tempPath, fileName: item.fileName });
            } else {
              const directUrl = getMediaDirectUrl(item.fileUrl);
              console.log("Attempting direct video download using FileSystem.downloadAsync from:", directUrl);
              try {
                const downloadResult = await FileSystem.downloadAsync(directUrl, tempPath);
                if (downloadResult && downloadResult.status === 200) {
                  setPreviewMedia({ type: 'video', url: tempPath, fileName: item.fileName });
                } else {
                  throw new Error(`Direct download status code: ${downloadResult ? downloadResult.status : 'unknown'}`);
                }
              } catch (dlErr) {
                console.warn("Direct download failed, falling back to Apps Script webhook base64 fetch:", dlErr);
                // Fetch via webhook
                const response = await fetch(`${APPS_SCRIPT_WEBHOOK}?action=get_file_base64&id=${fileId}`);
                const result = await response.json();
                if (result.status === 'success' && result.base64) {
                  await FileSystem.writeAsStringAsync(tempPath, result.base64, {
                    encoding: 'base64',
                  });
                  setPreviewMedia({ type: 'video', url: tempPath, fileName: item.fileName });
                } else {
                  throw new Error(result.message || 'Webhook download failed');
                }
              }
            }
          } catch (e) {
            console.warn("Failed to download preview video:", e);
            setPreviewMedia({ type: 'video', url: getMediaDirectUrl(item.fileUrl), fileName: item.fileName });
          } finally {
            setVideoDownloading(false);
          }
        } else {
          setPreviewMedia({ type: 'video', url: item.fileUrl, fileName: item.fileName });
        }
      } else if (item.type === 'document') {
        setPreviewMedia({ type: 'document', url: item.fileUrl, fileName: item.fileName });
      }
    }
  };

  const handleDeleteSelectedMessages = async () => {
    if (selectedMessageIds.length === 0) return;

    const performDelete = async () => {
      try {
        const chatRoomId = user.email.replace(/[@.]/g, '_');
        for (const msgId of selectedMessageIds) {
          try {
            await deleteDoc(doc(db, 'chats', chatRoomId, 'messages', msgId));
          } catch (dbErr) {
            console.warn("Firestore delete failed for msg ID " + msgId + ", local removal only:", dbErr);
            setMessages(prev => prev.filter(m => m.id !== msgId));
          }
        }
        setIsSelectionMode(false);
        setSelectedMessageIds([]);
      } catch (err) {
        console.error("Error deleting messages:", err);
      }
    };

    Alert.alert(
      "Delete for Everyone",
      `Are you sure you want to delete ${selectedMessageIds.length} message(s) for everyone?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete for Everyone", style: "destructive", onPress: performDelete }
      ]
    );
  };

  const handleClearChat = async () => {
    const performClear = async () => {
      try {
        const chatRoomId = user.email.replace(/[@.]/g, '_');
        for (const msg of messages) {
          try {
            await deleteDoc(doc(db, 'chats', chatRoomId, 'messages', msg.id));
          } catch (e) {
            console.warn("Failed to delete message during clear:", e);
          }
        }
        setMessages([]);
      } catch (err) {
        console.error("Error clearing chat:", err);
      }
    };

    Alert.alert(
      "Clear Chat",
      "Are you sure you want to delete all messages for everyone in this chat? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear for Everyone", style: "destructive", onPress: performClear }
      ]
    );
  };

  // Media Preview Modal States
  const [previewMedia, setPreviewMedia] = useState(null); // { type: 'image'|'video'|'document', url: string, fileName?: string }

  const flatListRef = useRef(null);
  const timerRef = useRef(null);

  // Configure Audio Mode on boot for iOS speaker routing
  useEffect(() => {
    async function setupAudio() {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldRouteThroughEarpieceIOS: false,
        });
      } catch (e) {
        console.warn("Failed to set audio mode:", e);
      }
    }
    setupAudio();
  }, []);

  // Always scroll to newest messages when messages list changes (initial load + new messages)
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to let FlatList finish laying out before scrolling
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 120);
    }
  }, [messages.length]);

  // 1. Subscribe to Firebase messages
  useEffect(() => {
    const chatRoomId = user.email.replace(/[@.]/g, '_');
    const q = query(
      collection(db, 'chats', chatRoomId, 'messages'), 
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        msgs.push({ id: docSnap.id, ...data });

        // Auto-mark mentor messages as read when student views/loads them
        if (data.sender === 'mentor' && data.status !== 'read') {
          updateDoc(doc(db, 'chats', chatRoomId, 'messages', docSnap.id), { status: 'read' })
            .catch(err => console.warn("Error marking message as read:", err));
        }
      });
      // Firestore returns asc-ordered but local additions may not be
      setMessages(sortByTime(msgs));
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, (error) => {
      console.log("Firestore subscription skipped/failed (offline/mock mode enabled)");
      // Fallback: Populate mock messages for testing
      setMessages(sortByTime([
        { 
          id: "m1", 
          sender: "mentor", 
          name: "Anurag KM (Mentor)",
          text: "Welcome to Dxign.learn Doubt support! How can I help you today?", 
          type: 'text',
          timestamp: { seconds: Date.now() / 1000 - 3600 } 
        },
        { 
          id: "m2", 
          sender: user.email, 
          name: user.name,
          text: "Hi! I need some feedback on my UI layout project.", 
          type: 'text',
          timestamp: { seconds: Date.now() / 1000 - 1800 } 
        }
      ]));
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 150);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearInterval(timerRef.current);
      if (currentSound) currentSound.unloadAsync();
    };
  }, [currentSound]);

  const [supportSettings, setSupportSettings] = useState({ isOnline: true, avgResponseTime: "4 mins" });

  // Subscribe to Firebase support availability settings
  useEffect(() => {
    const docRef = doc(db, 'settings', 'support');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setSupportSettings(docSnap.data());
      }
    }, (error) => {
      console.log("Firestore support settings listen skipped (offline/mock mode)");
    });
    return () => unsubscribe();
  }, []);

  // 2. Send text message
  const handleSendText = async () => {
    if (!inputText.trim()) return;

    const msgData = {
      sender: user.email,
      name: user.name,
      text: inputText.trim(),
      type: 'text',
      status: supportSettings.isOnline ? 'delivered' : 'sent',
      timestamp: serverTimestamp() || new Date()
    };

    setInputText('');
    setShowEmojiPicker(false);
    await saveMessage(msgData);
  };

  // 3. Save message to Firestore (or local state fallback)
  const saveMessage = async (msgData) => {
    try {
      const chatRoomId = user.email.replace(/[@.]/g, '_');
      // 1. Add message to Firestore subcollection
      await addDoc(collection(db, 'chats', chatRoomId, 'messages'), msgData);
      // 2. Sync metadata to parent registry document
      await setDoc(doc(db, 'chats', chatRoomId), {
        id: chatRoomId,
        email: user.email,
        name: user.name,
        lastMessage: msgData.text || `[${msgData.type}]`,
        lastActive: serverTimestamp() || new Date(),
        courses: user.courses || [],
        unread: true
      }, { merge: true });
    } catch (e) {
      console.warn("Saving to Firebase failed, appending to local state:", e);
      // Add locally and re-sort so order is correct
      setMessages(prev => sortByTime([...prev, { id: Math.random().toString(), ...msgData, timestamp: new Date() }]));
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // 4. Record Voice Notes (WhatsApp-like hold to record)
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return;

      // Allow recording on iOS
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldRouteThroughEarpieceIOS: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start recording timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      if (Platform.OS !== 'web') {
        Vibration.vibrate(80);
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    // Disable recording mode to route playback to standard speaker
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldRouteThroughEarpieceIOS: false,
      });
    } catch (e) {}

    if (Platform.OS !== 'web') {
      Vibration.vibrate(50);
    }

    // Upload voice file
    if (uri) {
      uploadFile(uri, 'audio', `voice_note_${Date.now()}.m4a`);
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      await recording.stopAndUnloadAsync();
    } catch (e) {}
    setRecording(null);

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldRouteThroughEarpieceIOS: false,
      });
    } catch (e) {}
  };

  // 8. Playback Voice Notes directly inside the app
  const handlePlayAudio = async (messageId, audioUrl) => {
    try {
      // Configure Audio Mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldRouteThroughEarpieceIOS: false,
      });

      // Toggle pause/resume if same message is already loaded
      if (playbackStatus.soundId === messageId) {
        if (currentSound) {
          if (playbackStatus.isPlaying) {
            await currentSound.pauseAsync();
            setPlaybackStatus(prev => ({ ...prev, isPlaying: false }));
          } else {
            await currentSound.playAsync();
            setPlaybackStatus(prev => ({ ...prev, isPlaying: true }));
          }
        }
        return;
      }

      // Stop and unload any existing sound
      if (currentSound) {
        await currentSound.stopAsync().catch(() => {});
        await currentSound.unloadAsync().catch(() => {});
        setCurrentSound(null);
      }

      // Resolve the playback URI
      // Expo AV cannot play base64 data: URIs on native — must write to temp file first
      let playUri = getMediaDirectUrl(audioUrl);
      const fileId = getDriveFileId(audioUrl);

      if (fileId) {
        try {
          const cacheDir = FileSystem.cacheDirectory;
          const files = await FileSystem.readDirectoryAsync(cacheDir);
          const cachedFile = files.find(f => f.startsWith(`voice_${messageId}.`));
          
          if (cachedFile) {
            playUri = `${cacheDir}${cachedFile}`;
          } else {
            // Fetch via Webhook to bypass Google Drive direct download credentials check
            const fetchUrl = `${APPS_SCRIPT_WEBHOOK}?action=get_file_base64&id=${fileId}`;
            const response = await fetch(fetchUrl);
            const result = await response.json();
            if (result.status === 'success' && result.base64) {
              const mimeType = result.mimeType || 'audio/mp4';
              const ext = mimeType.includes('webm') ? 'webm'
                : mimeType.includes('ogg') ? 'ogg'
                : (mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('aac')) ? 'm4a'
                : 'm4a';
              const tempPath = `${FileSystem.cacheDirectory}voice_${messageId}.${ext}`;
              await FileSystem.writeAsStringAsync(tempPath, result.base64, {
                encoding: 'base64',
              });
              playUri = tempPath;
            }
          }
        } catch (fetchErr) {
          console.warn('Failed to fetch/write Drive audio file from Webhook:', fetchErr);
        }
      } else if (audioUrl && audioUrl.startsWith('data:')) {
        try {
          // Extract the base64 portion and MIME type
          const [header, base64Data] = audioUrl.split(',');
          const mimeType = header.match(/data:([^;]+)/)?.[1] || 'audio/mp4';
          // Map MIME to file extension — iOS Expo AV plays .m4a (AAC/MP4), Android plays most formats
          const ext = mimeType.includes('webm') ? 'webm'
            : mimeType.includes('ogg') ? 'ogg'
            : (mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('aac')) ? 'm4a'
            : 'm4a';
          const tempPath = `${FileSystem.cacheDirectory}voice_${messageId}.${ext}`;
          
          // Write base64 to temp file (only if it doesn't already exist)
          const info = await FileSystem.getInfoAsync(tempPath);
          if (!info.exists) {
            await FileSystem.writeAsStringAsync(tempPath, base64Data, {
              encoding: 'base64',
            });
          }
          playUri = tempPath;
        } catch (writeErr) {
          console.warn('Failed to write audio to temp file:', writeErr);
          // Try playing the data URI directly as last resort (may work on some platforms)
          playUri = audioUrl;
        }
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: playUri },
        { shouldPlay: true }
      );

      setCurrentSound(sound);
      setPlaybackStatus({
        soundId: messageId,
        position: 0,
        duration: 0,
        isPlaying: true,
      });

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackStatus(prev => ({
            ...prev,
            position: status.positionMillis || 0,
            duration: status.durationMillis || 0,
            isPlaying: status.isPlaying,
          }));

          if (status.didJustFinish) {
            setPlaybackStatus({
              soundId: null,
              position: 0,
              duration: 0,
              isPlaying: false,
            });
            sound.unloadAsync();
            setCurrentSound(null);
          }
        }
      });
    } catch (error) {
      console.warn("Error playing audio:", error);
      setPlaybackStatus({
        soundId: null,
        position: 0,
        duration: 0,
        isPlaying: false,
      });
    }
  };

  // 5. Select Images / Videos
  const pickMedia = async (type) => {
    setShowAttachmentMenu(false);
    let result;
    const options = {
      mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      // Resize images to max 1080px wide and 60% quality — reduces 10MB → ~300KB, 30x faster upload
      quality: type === 'image' ? 0.55 : 0.8,
      ...(type === 'image' ? { exif: false } : {}),
    };

    result = await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets?.[0]?.uri) {
      const asset = result.assets[0];
      const uri = asset.uri;
      const ext = type === 'image' ? 'jpg' : 'mp4';
      const uniqueFilename = `${type}_${Date.now()}.${ext}`;
      uploadFile(uri, type, uniqueFilename, asset.mimeType);
    }
  };

  // 6. Select Documents
  const pickDocument = async () => {
    setShowAttachmentMenu(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        const name = result.assets[0].name || 'document.pdf';
        uploadFile(uri, 'document', name);
      }
    } catch (e) {
      console.log(e);
    }
  };

  // 7. General File Upload Function
  const uploadFile = async (localUri, type, filename, mimeTypeHint) => {
    setIsUploading(true);
    setUploadProgress(5);

    const timestamp = Date.now();
    const safeEmail = user.email.replace(/[@.]/g, '_');
    const storagePath = `chats/${safeEmail}/${timestamp}_${filename}`;
    
    // Determine MIME type for proper Content-Type header
    let contentType = mimeTypeHint || 'application/octet-stream';
    if (!mimeTypeHint) {
      if (type === 'image') contentType = 'image/jpeg';
      else if (type === 'audio') contentType = 'audio/mp4';
      else if (type === 'video') contentType = 'video/mp4';
      else if (filename.toLowerCase().endsWith('.pdf')) contentType = 'application/pdf';
    }

    try {
      const response = await fetch(localUri);
      const blob = await response.blob();
      
      const fileRef = ref(storage, storagePath);
      // Pass contentType metadata so Firebase Storage serves the file with correct MIME
      const metadata = { contentType };
      const uploadTask = uploadBytesResumable(fileRef, blob, metadata);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        }, 
        (error) => {
          console.warn("Firebase Storage upload failed, trying Google Drive upload fallback:", error);
          uploadToGoogleDrive(localUri, type, filename);
        }, 
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setIsUploading(false);
          setUploadProgress(0);

          await saveMessage({
            sender: user.email,
            name: user.name,
            fileUrl: downloadUrl,
            fileName: filename,
            type: type,
            status: supportSettings.isOnline ? 'delivered' : 'sent',
            timestamp: serverTimestamp() || new Date()
          });
        }
      );
    } catch (e) {
      console.warn("Direct blob upload failed, trying Google Drive upload fallback:", e);
      uploadToGoogleDrive(localUri, type, filename);
    }
  };

  // 7b. Google Drive Webhook Upload Fallback (Allows 100% free media storage via Google Account)
  const uploadToGoogleDrive = async (localUri, type, filename) => {
    try {
      setUploadProgress(15);
      // Read the file as a base64 string
      const base64Data = await FileSystem.readAsStringAsync(localUri, {
        encoding: 'base64',
      });

      setUploadProgress(45);
      
      // Map basic MIME types based on type parameters
      let mimeType = 'application/octet-stream';
      if (type === 'image') mimeType = 'image/jpeg';
      // M4A = MPEG-4 Audio (AAC). Use audio/mp4 MIME so Chrome can play it too
      else if (type === 'audio') mimeType = 'audio/mp4';
      else if (type === 'video') mimeType = 'video/mp4';
      else if (type === 'document') {
        if (filename.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
        else if (filename.toLowerCase().endsWith('.png')) mimeType = 'image/png';
        else if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';
      }

      const payload = {
        action: 'upload_file',
        fileName: filename,
        mimeType: mimeType,
        base64Data: base64Data
      };

      setUploadProgress(65);

      const response = await fetch(APPS_SCRIPT_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });

      setUploadProgress(85);

      const result = await response.json();
      if (result && result.status === 'success' && result.fileUrl) {
        setIsUploading(false);
        setUploadProgress(0);

        await saveMessage({
          sender: user.email,
          name: user.name,
          fileUrl: result.fileUrl,
          fileName: filename,
          type: type,
          status: supportSettings.isOnline ? 'delivered' : 'sent',
          timestamp: serverTimestamp() || new Date()
        });
      } else {
        throw new Error(result.message || 'Server returned an invalid upload status');
      }
    } catch (err) {
      console.warn("Google Drive upload failed, falling back to local simulation:", err);
      // Fall back silently to base64/local simulation without throwing a disruptive alert
      simulateUpload(localUri, type, filename);
    }
  };

  const simulateUpload = async (localUri, type, filename) => {
    let finalFileUrl = localUri;
    
    // Check if we can convert the local file to a base64 Data URL so the mentor can access it
    if (type === 'audio' || type === 'image') {
      try {
        const fileInfo = await FileSystem.getInfoAsync(localUri);
        if (fileInfo.exists && fileInfo.size < 750 * 1024) {
          const base64Data = await FileSystem.readAsStringAsync(localUri, {
            encoding: 'base64',
          });
          let mimeType = 'application/octet-stream';
          if (type === 'image') mimeType = 'image/jpeg';
          // Use audio/mp4 (not audio/m4a) — Chrome requires audio/mp4 to play AAC/M4A data URLs
          else if (type === 'audio') mimeType = 'audio/mp4';
          
          finalFileUrl = `data:${mimeType};base64,${base64Data}`;
          console.log("Successfully encoded mobile file to base64 data URL (size: " + fileInfo.size + " bytes)");
        }
      } catch (fileErr) {
        console.warn("Failed to read local mobile file for base64 fallback:", fileErr);
      }
    }

    let prog = 10;
    const interval = setInterval(() => {
      prog += 30;
      setUploadProgress(prog);
      if (prog >= 100) {
        clearInterval(interval);
        setIsUploading(false);
        setUploadProgress(0);

        saveMessage({
          sender: user.email,
          name: user.name,
          fileUrl: finalFileUrl,
          fileName: filename,
          type: type,
          status: supportSettings.isOnline ? 'delivered' : 'sent',
          timestamp: new Date()
        });
      }
    }, 250);
  };

  const handleDownloadFile = async (url) => {
    if (Platform.OS !== 'web') {
      await Sharing.shareAsync(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const formatDuration = (sec) => {
    if (typeof sec !== 'number' || isNaN(sec)) return '0:00';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    let seconds = 0;
    if (typeof ts.seconds === 'number') {
      seconds = ts.seconds;
    } else if (ts instanceof Date) {
      seconds = ts.getTime() / 1000;
    } else if (typeof ts.toMillis === 'function') {
      seconds = ts.toMillis() / 1000;
    } else if (typeof ts === 'number') {
      seconds = ts;
    } else if (ts.seconds) {
      seconds = Number(ts.seconds);
    } else {
      return '';
    }
    const date = new Date(seconds * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
    >
      {/* 1. Header (Premium styled matching home UI) */}
      {isSelectionMode ? (
        <View style={[styles.header, { backgroundColor: '#0c1a30', borderBottomColor: 'rgba(0, 240, 255, 0.25)' }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => {
                setIsSelectionMode(false);
                setSelectedMessageIds([]);
              }}
            >
              <X color="#00f0ff" size={20} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: '#00f0ff' }]}>{selectedMessageIds.length} Selected</Text>
              <Text style={[styles.headerStatus, { color: '#888' }]}>Selection Mode Active</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.headerIconButton} 
              onPress={handleDeleteSelectedMessages}
              disabled={selectedMessageIds.length === 0}
            >
              <Trash color={selectedMessageIds.length === 0 ? "#444" : "#ef4444"} size={20} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <ArrowLeft color="#888" size={20} />
            </TouchableOpacity>
            
            <View style={styles.avatarContainer}>
              <View style={styles.customAvatar}>
                <Text style={styles.customAvatarText}>M</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: supportSettings.isOnline ? '#10b981' : '#ef4444' }]} />
            </View>

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>MENTOR SUPPORT</Text>
              <Text style={[styles.headerStatus, { color: supportSettings.isOnline ? '#00f0ff' : '#ef4444' }]}>
                {supportSettings.isOnline ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIconButton}>
              <Phone color="#888" size={18} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerIconButton} 
              onPress={() => setShowMoreMenu(true)}
            >
              <MoreVertical color="#888" size={18} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* More Options Dropdown Overlay */}
      {showMoreMenu && (
        <TouchableOpacity 
          style={styles.dropdownOverlay} 
          activeOpacity={1} 
          onPress={() => setShowMoreMenu(false)}
        >
          <View style={styles.dropdownMenu}>
            <TouchableOpacity 
              style={styles.dropdownItem} 
              onPress={() => {
                setShowMoreMenu(false);
                setIsSelectionMode(true);
                setSelectedMessageIds([]);
              }}
            >
              <Text style={styles.dropdownItemText}>Select Messages</Text>
            </TouchableOpacity>
            
            <View style={styles.dropdownDivider} />
            
            <TouchableOpacity 
              style={styles.dropdownItem} 
              onPress={() => {
                setShowMoreMenu(false);
                handleClearChat();
              }}
            >
              <Text style={[styles.dropdownItemText, { color: '#ef4444' }]}>Clear Chat</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* 2. Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => {
          const isMe = item.sender === user.email;
          const isSelected = selectedMessageIds.includes(item.id);
          return (
            <TouchableOpacity 
              activeOpacity={isSelectionMode ? 0.85 : 1}
              onPress={() => handlePressMessage(item)}
              onLongPress={() => handleLongPressMessage(item.id)}
              style={[
                styles.messageBubbleContainer, 
                isMe ? styles.myBubbleContainer : styles.theirBubbleContainer,
                isSelected && { backgroundColor: 'rgba(0, 240, 255, 0.12)' }
              ]}
            >
              <View style={{ flexDirection: 'column', maxWidth: '85%', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <View style={[
                  styles.messageBubble, 
                  isMe ? styles.myBubble : styles.theirBubble,
                  item.type === 'audio' && { 
                    borderWidth: 0, 
                    backgroundColor: 'transparent', 
                    shadowOpacity: 0, 
                    elevation: 0, 
                    paddingHorizontal: 0, 
                    paddingTop: 0, 
                    paddingBottom: 0 
                  },
                  // For image/video: DynamicMediaPreview owns the border+radius+clipping.
                  // Strip everything from the bubble so it's invisible — elevation:0
                  // prevents Android from fighting the child's overflow:hidden.
                  (item.type === 'image' || item.type === 'video') && {
                    paddingHorizontal: 0,
                    paddingTop: 0,
                    paddingBottom: 0,
                    backgroundColor: 'transparent',
                    borderWidth: 0,
                    shadowOpacity: 0,
                    elevation: 0,
                  },
                  isSelected && { borderColor: 'rgba(0, 240, 255, 0.4)' }
                ]}>
                  {isSelectionMode && (
                    <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999 }]} />
                  )}
                  
                  {/* Inline Media Frame or Document Card */}
                  {item.fileUrl && (
                    <View style={[
                      styles.attachmentCardContainer,
                      (item.type === 'image' || item.type === 'video') && { margin: 0, padding: 0 }
                    ]}>

                      {/* ── IMAGE ── */}
                      {item.type === 'image' && (
                        <DynamicMediaPreview
                          uri={getMediaDirectUrl(item.fileUrl, 'image')}
                          onPress={() => handlePressMessage(item)}
                          isVideo={false}
                          myBubble={isMe}
                          borderColor={isMe ? 'rgba(0,240,255,0.25)' : 'rgba(168,85,247,0.2)'}
                          bgColor="rgba(0,0,0,0.5)"
                          renderOverlays={() => (
                            <View style={styles.mediaTimestampOverlay}>
                              <Text style={styles.mediaTimestampText}>{formatTime(item.timestamp)}</Text>
                              {isMe && (
                                item.status === 'read'
                                  ? <CheckCheck color="#00f0ff" size={12} />
                                  : <CheckCheck color="rgba(255,255,255,0.85)" size={12} />
                              )}
                            </View>
                          )}
                        />
                      )}

                      {/* ── VIDEO ── actual dimensions via Video.onReadyForDisplay */}
                      {item.type === 'video' && (
                        <VideoChatPreview
                          videoUrl={item.fileUrl}
                          thumbnailUrl={getVideoThumbnailUrl(item.fileUrl)}
                          onPress={() => handlePressMessage(item)}
                          isMe={isMe}
                          timestamp={formatTime(item.timestamp)}
                          itemStatus={item.status}
                        />
                      )}


                      {item.type === 'document' && (
                        <TouchableOpacity 
                          style={[
                            styles.attachmentCard,
                            isMe ? styles.myAttachmentCard : styles.theirAttachmentCard
                          ]}
                          onPress={() => handlePressMessage(item)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.attachmentIconWrapper}>
                            <FileText color="#00f0ff" size={18} />
                          </View>
                          <View style={styles.attachmentInfo}>
                            <Text style={styles.attachmentFileName} numberOfLines={1}>
                              {item.fileName || 'document.pdf'}
                            </Text>
                            <Text style={styles.attachmentFileMeta}>
                              850 KB • DOCUMENT
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Render text if it exists */}
                  {item.text ? (
                    <View style={[
                      styles.bubbleContent, 
                      (item.type === 'image' || item.type === 'video' || item.type === 'document') && { marginTop: 4 },
                      // Re-add horizontal padding for captions inside media bubbles (bubble has padding:0)
                      (item.type === 'image' || item.type === 'video') && { paddingHorizontal: 10, paddingBottom: 6, paddingTop: 2 },
                    ]}>
                      {renderParsedText(item.text, isMe)}
                    </View>
                  ) : null}

       
                  {item.type === 'audio' && (
                    <View style={[styles.audioBubble, isMe ? styles.myAudioBubble : styles.theirAudioBubble]}>
                      {isMe ? (
                        /* Sent Voice Note (Student) */
                        <View style={styles.audioBubbleInner}>
                          <View style={styles.audioMainRow}>
                            <View style={styles.audioAvatarContainerLeft}>
                              <Image 
                                source={{ uri: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=100&auto=format&fit=crop' }} 
                                style={styles.audioAvatar} 
                              />
                              <View style={[styles.audioMicBadge, styles.myAudioMicBadge, { backgroundColor: '#a855f7' }]}>
                                <Mic color="#fff" size={8} fill="#fff" />
                              </View>
                            </View>

                            <TouchableOpacity 
                              style={styles.audioPlayBtnCompact} 
                              onPress={() => handlePlayAudio(item.id, item.fileUrl)}
                              activeOpacity={0.8}
                            >
                              {playbackStatus.soundId === item.id && playbackStatus.isPlaying ? (
                                <Pause color="#fff" size={16} fill="#fff" />
                              ) : (
                                <Play color="#fff" size={16} fill="#fff" style={{ marginLeft: 2 }} />
                              )}
                            </TouchableOpacity>

                            <View style={styles.audioWaveformContainer}>
                              <View style={styles.waveformRow}>
                                {WAVEFORM_HEIGHTS.map((height, idx) => {
                                  const progress = playbackStatus.soundId === item.id && playbackStatus.duration > 0
                                    ? playbackStatus.position / playbackStatus.duration
                                    : 0;
                                  const isActive = idx / WAVEFORM_HEIGHTS.length <= progress;
                                  return (
                                    <View 
                                      key={idx} 
                                      style={[
                                        styles.waveformBar, 
                                        { height: height }, 
                                        isActive ? styles.waveformBarActivePurple : styles.waveformBarInactive
                                      ]} 
                                    />
                                  );
                                })}
                              </View>
                              {playbackStatus.soundId === item.id && playbackStatus.duration > 0 && (
                                <View 
                                  style={[
                                    styles.waveformPlayhead,
                                    { left: `${(playbackStatus.position / playbackStatus.duration) * 100}%`, backgroundColor: '#a855f7' }
                                  ]}
                                />
                              )}
                            </View>
                          </View>

                          <View style={styles.audioFooterRow}>
                            <Text style={styles.audioTimeLabel}>
                              {playbackStatus.soundId === item.id && playbackStatus.duration > 0
                                ? formatDuration(Math.floor(playbackStatus.position / 1000))
                                : '0:00'
                              }
                            </Text>
                            <View style={styles.audioFooterRight}>
                              <Text style={styles.audioTimeLabel}>
                                {formatTime(item.timestamp)}
                              </Text>
                              <View style={styles.checkIcon}>
                                {item.status === 'sent' ? (
                                  <Check color="rgba(255,255,255,0.7)" size={10} />
                                ) : item.status === 'read' ? (
                                  <CheckCheck color="#00f0ff" size={10} />
                                ) : (
                                  <CheckCheck color="rgba(255,255,255,0.7)" size={10} />
                                )}
                              </View>
                            </View>
                          </View>
                        </View>
                      ) : (
                        /* Received Voice Note (Mentor) */
                        <View style={styles.audioBubbleInner}>
                          <View style={styles.audioMainRow}>
                            <TouchableOpacity 
                              style={styles.audioPlayBtnCompact} 
                              onPress={() => handlePlayAudio(item.id, item.fileUrl)}
                              activeOpacity={0.8}
                            >
                              {playbackStatus.soundId === item.id && playbackStatus.isPlaying ? (
                                <Pause color="#fff" size={16} fill="#fff" />
                              ) : (
                                <Play color="#fff" size={16} fill="#fff" style={{ marginLeft: 2 }} />
                              )}
                            </TouchableOpacity>

                            <View style={styles.audioWaveformContainer}>
                              <View style={styles.waveformRow}>
                                {WAVEFORM_HEIGHTS.map((height, idx) => {
                                  const progress = playbackStatus.soundId === item.id && playbackStatus.duration > 0
                                    ? playbackStatus.position / playbackStatus.duration
                                    : 0;
                                  const isActive = idx / WAVEFORM_HEIGHTS.length <= progress;
                                  return (
                                    <View 
                                      key={idx} 
                                      style={[
                                        styles.waveformBar, 
                                        { height: height }, 
                                        isActive ? styles.waveformBarActiveCyan : styles.waveformBarInactive
                                      ]} 
                                    />
                                  );
                                })}
                              </View>
                              {playbackStatus.soundId === item.id && playbackStatus.duration > 0 && (
                                <View 
                                  style={[
                                    styles.waveformPlayhead,
                                    { left: `${(playbackStatus.position / playbackStatus.duration) * 100}%`, backgroundColor: '#00f0ff' }
                                  ]}
                                />
                              )}
                            </View>

                            <View style={styles.audioAvatarContainerRight}>
                              <Image 
                                source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop' }} 
                                style={styles.audioAvatar} 
                              />
                              <View style={[styles.audioMicBadge, styles.theirAudioMicBadge, { backgroundColor: '#00f0ff' }]}>
                                <Mic color="#fff" size={8} fill="#fff" />
                              </View>
                            </View>
                          </View>

                          <View style={styles.audioFooterRow}>
                            <Text style={styles.audioTimeLabel}>
                              {playbackStatus.soundId === item.id && playbackStatus.duration > 0
                                ? formatDuration(Math.floor(playbackStatus.position / 1000))
                                : '0:00'
                              }
                            </Text>
                            <Text style={styles.audioTimeLabel}>
                              {formatTime(item.timestamp)}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Timestamp below/outside the bubble — hidden for image/video (shown overlaid inside) */}
                {item.type !== 'audio' && item.type !== 'image' && item.type !== 'video' && (
                  <View style={[styles.bubbleFooterOutside, isMe ? styles.myBubbleFooterOutside : styles.theirBubbleFooterOutside]}>
                    <Text style={styles.messageTimeOutside}>{formatTime(item.timestamp)}</Text>
                    {isMe && (
                      <View style={styles.checkIconOutside}>
                        {item.status === 'sending' || item.status === 'sent' ? (
                          <Check color="rgba(255,255,255,0.4)" size={10} />
                        ) : item.status === 'read' ? (
                          <CheckCheck color="#00f0ff" size={10} />
                        ) : (
                          <CheckCheck color="rgba(255,255,255,0.4)" size={10} />
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* 3. Upload Progress Tracker Overlay */}
      {isUploading && (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator color="#00f0ff" size="small" />
          <Text style={styles.uploadText}>Uploading Attachment ({uploadProgress}%)</Text>
        </View>
      )}

      {/* 4. Attachment Menu */}
      {showAttachmentMenu && (
        <View style={styles.attachmentTray}>
          <TouchableOpacity style={styles.trayItem} onPress={pickDocument}>
            <View style={[styles.trayIconWrapper, { backgroundColor: 'rgba(168, 85, 247, 0.15)', borderColor: '#a855f7', borderWidth: 1 }]}>
              <FileText color="#a855f7" size={20} />
            </View>
            <Text style={styles.trayLabel}>Document</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.trayItem} onPress={() => pickMedia('video')}>
            <View style={[styles.trayIconWrapper, { backgroundColor: 'rgba(255, 159, 67, 0.15)', borderColor: '#ff9f43', borderWidth: 1 }]}>
              <VideoIcon color="#ff9f43" size={20} />
            </View>
            <Text style={styles.trayLabel}>Video</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.trayItem} onPress={() => pickMedia('image')}>
            <View style={[styles.trayIconWrapper, { backgroundColor: 'rgba(0, 240, 255, 0.15)', borderColor: '#00f0ff', borderWidth: 1 }]}>
              <ImageIcon color="#00f0ff" size={20} />
            </View>
            <Text style={styles.trayLabel}>Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 5. Input Bar */}
      <View style={styles.inputContainer}>
        {isRecording ? (
          <View style={styles.recordingContainer}>
            <View style={styles.recordingDurationWrapper}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording {formatDuration(recordingDuration)}</Text>
            </View>
            <TouchableOpacity style={styles.cancelRecordButton} onPress={cancelRecording}>
              <Text style={styles.cancelRecordText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputBarWrapper}>
            <TouchableOpacity 
              style={styles.emojiButton}
              onPress={toggleEmojiPicker}
            >
              <Smile color={showEmojiPicker ? "#00f0ff" : "rgba(255, 255, 255, 0.75)"} size={20} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.attachmentButton}
              onPress={() => {
                setShowAttachmentMenu(!showAttachmentMenu);
                setShowEmojiPicker(false);
              }}
            >
              <Paperclip color={showAttachmentMenu ? "#00f0ff" : "rgba(255, 255, 255, 0.75)"} size={20} />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#555"
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                if (showAttachmentMenu) setShowAttachmentMenu(false);
              }}
              onFocus={() => setShowEmojiPicker(false)}
              multiline
            />
          </View>
        )}

        {/* Circular Action Trigger (Send or Record) */}
        {inputText.trim().length > 0 ? (
          <TouchableOpacity 
            style={[styles.circularActionBtn, { backgroundColor: '#00f0ff' }]} 
            onPress={handleSendText}
          >
            <Send color="#050505" size={18} style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.circularActionBtn, isRecording ? styles.circularActionBtnRecording : { backgroundColor: '#00f0ff' }]} 
            onLongPress={startRecording}
            onPressOut={stopRecording}
            delayLongPress={100}
            activeOpacity={0.85}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Vibration.vibrate(40);
              }
              Alert.alert("Doubt Support", "Hold to record a voice note.");
            }}
          >
            <Mic color={isRecording ? "#ffffff" : "#050505"} size={18} />
          </TouchableOpacity>
        )}
      </View>

      {/* Emoji Picker Tray */}
      {showEmojiPicker && (
        <View style={styles.emojiPickerContainer}>
          <FlatList
            data={COMMON_EMOJIS}
            keyExtractor={(item, index) => index.toString()}
            numColumns={8}
            contentContainerStyle={styles.emojiPickerList}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.emojiItem} 
                onPress={() => setInputText(prev => prev + item)}
              >
                <Text style={styles.emojiText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* 6. Media Preview Modal (Frosted Glass Fullscreen Overlay) */}
      {previewMedia && (
        <View style={styles.previewModal}>
          <TouchableOpacity 
            style={styles.previewCloseBtn} 
            onPress={() => setPreviewMedia(null)}
            activeOpacity={0.7}
          >
            <X color="#fff" size={24} />
          </TouchableOpacity>

          <View style={styles.previewContentContainer}>
            {previewMedia.type === 'image' && (
              <Image 
                source={{ uri: previewMedia.url }} 
                style={styles.fullPreviewImage} 
                resizeMode="contain" 
              />
            )}

            {previewMedia.type === 'video' && (
              <Video
                source={{ uri: previewMedia.url }}
                rate={1.0}
                volume={1.0}
                isMuted={false}
                resizeMode="contain"
                shouldPlay
                useNativeControls
                style={styles.fullPreviewVideo}
              />
            )}

            {previewMedia.type === 'document' && (
              <View style={styles.docPreviewCard}>
                <FileText color="#a855f7" size={64} style={{ marginBottom: 16 }} />
                <Text style={styles.docPreviewTitle} numberOfLines={2}>
                  {previewMedia.fileName || 'document.pdf'}
                </Text>
                <Text style={styles.docPreviewSubtitle}>
                  Document Attachment
                </Text>
                
                <TouchableOpacity 
                  style={styles.docDownloadBtn} 
                  onPress={() => handleDownloadFile(previewMedia.url)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.docDownloadBtnText}>SHARE / DOWNLOAD DOCUMENT</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {videoDownloading && (
        <View style={styles.videoLoadingOverlay}>
          <ActivityIndicator size="large" color="#00f0ff" />
          <Text style={styles.videoLoadingText}>Optimizing video stream...</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505', // Deep Black matching home UI
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 12,
    backgroundColor: '#0b0b0c', // Dark card background matching home UI
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 6,
    marginRight: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  customAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customAvatarText: {
    color: '#00f0ff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981', // Online green matching home UI
    borderWidth: 1.5,
    borderColor: '#0b0b0c',
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerStatus: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    padding: 8,
  },
  messageList: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  messageBubbleContainer: {
    width: '100%',
    flexDirection: 'row',
    marginVertical: 2,
  },
  myBubbleContainer: {
    justifyContent: 'flex-end',
  },
  theirBubbleContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 16,
    position: 'relative',
    borderWidth: 1,
  },
  myBubble: {
    // Transparent Cyan liquid glass effect
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderColor: 'rgba(0, 240, 255, 0.25)',
    borderTopRightRadius: 2,
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  theirBubble: {
    // Transparent Purple liquid glass effect
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    borderColor: 'rgba(168, 85, 247, 0.2)',
    borderTopLeftRadius: 2,
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  // Mirror the bubble corner radii for DynamicMediaPreview clipping
  // Sent (right side): top-right corner is the "tail" → nearly square
  myBubbleMediaRadius: {
    borderRadius: 16,
    borderTopRightRadius: 2,
  },
  // Received (left side): top-left corner is the "tail" → nearly square
  theirBubbleMediaRadius: {
    borderRadius: 16,
    borderTopLeftRadius: 2,
  },
  senderName: {
    color: '#a855f7',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bubbleContent: {
    paddingRight: 45, // Space for inline time & double-ticks
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
  },
  myMessageText: {
    color: '#fff',
  },
  theirMessageText: {
    color: '#e9edef',
  },
  bubbleFooterOutside: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  myBubbleFooterOutside: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    marginRight: 4,
  },
  theirBubbleFooterOutside: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  messageTimeOutside: {
    fontSize: 9,
    color: '#888',
  },
  checkIconOutside: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
    position: 'absolute',
    bottom: 5,
    right: 8,
    gap: 3,
  },
  messageTime: {
    fontSize: 9,
    color: '#888',
  },
  checkIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Container wrapping image/video/document in bubble (no extra margin for media types)
  attachmentCardContainer: {
    // For document cards — slight vertical spacing
    // For image/video — overridden inline to margin: 0
  },
  // Document attachment card styles
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
    minWidth: 180,
    maxWidth: CHAT_IMAGE_WIDTH,
  },
  myAttachmentCard: {
    backgroundColor: 'rgba(0, 240, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
  },
  theirAttachmentCard: {
    backgroundColor: 'rgba(168, 85, 247, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  attachmentIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentFileName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  attachmentFileMeta: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Emoji picker styles
  emojiButton: {
    padding: 4,
    marginLeft: 4,
  },
  emojiPickerContainer: {
    backgroundColor: '#0b0b0c',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    maxHeight: 220,
  },
  emojiPickerList: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  emojiItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  emojiText: {
    fontSize: 24,
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
  },
  imageWrapper: {
    width: CHAT_IMAGE_WIDTH,
    // 4:3 aspect ratio — portrait images will be trimmed to this frame
    aspectRatio: 4 / 3,
    overflow: 'hidden',
    borderRadius: 0, // bubble already has borderRadius + overflow:hidden
  },
  mediaTimeOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  mediaTimeText: {
    fontSize: 9,
    color: '#fff',
  },
  mediaBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 10,
    borderRadius: 10,
    marginTop: 2,
    gap: 12,
    width: 210,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  mediaIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaDetails: {
    flex: 1,
  },
  mediaTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  mediaSubtitle: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  uploadOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0b0c',
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  uploadText: {
    color: '#00f0ff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  attachmentTray: {
    position: 'absolute',
    bottom: 72,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(11, 11, 12, 0.95)', // Frosted dark glassmorphic tray
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.15)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    elevation: 6,
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  trayItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
  },
  trayIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  trayLabel: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#050505',
    gap: 8,
  },
  inputBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)', // Frosted text input glass
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 44,
  },
  attachmentButton: {
    padding: 4,
    marginRight: 6,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? 6 : 2,
    textAlignVertical: 'center',
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 44,
  },
  recordingDurationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  recordingText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelRecordButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  cancelRecordText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  circularActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  circularActionBtnRecording: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    transform: [{ scale: 1.15 }],
  },
  previewModal: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(5, 5, 5, 0.96)', // Deep dark transparent backing
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  previewCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    padding: 10,
    zIndex: 1001,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 22,
  },
  previewContentContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPreviewImage: {
    width: '100%',
    height: '100%',
  },
  fullPreviewVideo: {
    width: '100%',
    height: '100%',
  },
  docPreviewCard: {
    width: '90%',
    maxWidth: 340,
    backgroundColor: '#0b0b0c',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.2)', // Glowing purple card
    padding: 32,
    alignItems: 'center',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
  docPreviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  docPreviewSubtitle: {
    fontSize: 11,
    color: '#666',
    marginBottom: 24,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  docDownloadBtn: {
    backgroundColor: '#a855f7',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignSelf: 'stretch',
    alignItems: 'center',
    shadowColor: '#a855f7',
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  docDownloadBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  audioBubble: {
    width: 240,
    padding: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    // No border on audio/voice bubbles
  },
  myAudioBubble: {
    backgroundColor: 'rgba(5, 97, 98, 0.15)',
  },
  theirAudioBubble: {
    backgroundColor: 'rgba(32, 33, 37, 0.75)',
  },
  audioBubbleInner: {
    width: '100%',
  },
  audioMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  audioAvatarContainerLeft: {
    position: 'relative',
    marginRight: 10,
  },
  audioAvatarContainerRight: {
    position: 'relative',
    marginLeft: 10,
  },
  audioAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222',
  },
  audioMicBadge: {
    position: 'absolute',
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34b7f1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#050505',
  },
  myAudioMicBadge: {
    right: -2,
    backgroundColor: '#34b7f1',
  },
  theirAudioMicBadge: {
    left: -2,
    backgroundColor: '#34b7f1',
  },
  audioPlayBtnCompact: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioWaveformContainer: {
    flex: 1,
    height: 24,
    justifyContent: 'center',
    position: 'relative',
    marginLeft: 6,
    marginRight: 6,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
  },
  waveformBar: {
    width: 2.2,
    borderRadius: 1.1,
  },
  waveformBarActiveCyan: {
    backgroundColor: '#34b7f1',
  },
  waveformBarActivePurple: {
    backgroundColor: '#a855f7',
  },
  waveformBarInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  waveformPlayhead: {
    position: 'absolute',
    top: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34b7f1',
    transform: [{ translateX: -6 }],
  },
  audioFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  audioFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  audioTimeLabel: {
    fontSize: 9,
    color: '#888',
  },
  videoBubble: {
    width: CHAT_IMAGE_WIDTH,
    // 16:9 aspect ratio for video thumbnails
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    borderRadius: 0, // bubble already has borderRadius + overflow:hidden
  },
  videoThumbnailWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoThumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  videoPlayOverlayBtn: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── WhatsApp-style media timestamp overlay ──
  // Shared: semi-transparent pill at bottom-right of image or video
  mediaTimestampOverlay: {
    position: 'absolute',
    bottom: 7,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  mediaTimestampText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },

  // Video bottom bar: HD+duration on left, timestamp+tick on right
  videoBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    // Subtle gradient-like fade from transparent to dark at the bottom
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  videoBottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  videoBottomRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoHDBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  videoHDText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  videoDurationText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  videoBadgeText: {
    fontSize: 8,
    color: '#00f0ff',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  videoFooterOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoFooterLeft: {
    flex: 1,
    marginRight: 8,
  },
  videoFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  videoTimeText: {
    fontSize: 9,
    color: '#aaa',
  },
  videoOverlayTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  videoOverlaySubtitle: {
    fontSize: 8,
    color: '#888',
    marginTop: 1,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  dropdownMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 95 : 65,
    right: 16,
    backgroundColor: '#0b0b0c',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 6,
    width: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  videoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 5, 5, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  videoLoadingText: {
    color: '#00f0ff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 12,
  }
});
