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
  Vibration
} from 'react-native';
import { Audio, Video } from 'expo-av';
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
  X
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
  setDoc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';

export default function ChatScreen({ user, onBack }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Audio Playback States
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [currentSound, setCurrentSound] = useState(null);

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

  // 1. Subscribe to Firebase messages
  useEffect(() => {
    const chatRoomId = user.email.replace(/[@.]/g, '_');
    const q = query(
      collection(db, 'chats', chatRoomId, 'messages'), 
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, (error) => {
      console.log("Firestore subscription skipped/failed (offline/mock mode enabled)");
      // Fallback: Populate mock messages for testing
      setMessages([
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
      ]);
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
      timestamp: serverTimestamp() || new Date()
    };

    setInputText('');
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
      setMessages(prev => [...prev, { id: Math.random().toString(), ...msgData, timestamp: new Date() }]);
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
      // If the selected voice note is already playing, pause it
      if (playingAudioId === messageId) {
        if (currentSound) {
          await currentSound.stopAsync();
          await currentSound.unloadAsync();
          setCurrentSound(null);
        }
        setPlayingAudioId(null);
        return;
      }

      // If another audio is playing, stop and unload it first
      if (currentSound) {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
        setCurrentSound(null);
      }

      setPlayingAudioId(messageId);

      // Load and play the audio file
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      setCurrentSound(sound);

      // Listen for when audio finishes playing
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingAudioId(null);
          sound.unloadAsync();
          setCurrentSound(null);
        }
      });
    } catch (error) {
      console.warn("Error playing audio:", error);
      setPlayingAudioId(null);
    }
  };

  // 5. Select Images / Videos
  const pickMedia = async (type) => {
    setShowAttachmentMenu(false);
    let result;
    const options = {
      mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.8,
    };

    result = await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;
      uploadFile(uri, type, type === 'image' ? 'photo.jpg' : 'video.mp4');
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
  const uploadFile = async (localUri, type, filename) => {
    setIsUploading(true);
    setUploadProgress(5);

    const timestamp = Date.now();
    const storagePath = `chats/${user.email.replace(/[@.]/g, '_')}/${timestamp}_${filename}`;
    
    try {
      const response = await fetch(localUri);
      const blob = await response.blob();
      
      const fileRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(fileRef, blob);

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
        encoding: FileSystem.EncodingType.Base64,
      });

      setUploadProgress(45);
      
      // Map basic MIME types based on type parameters
      let mimeType = 'application/octet-stream';
      if (type === 'image') mimeType = 'image/jpeg';
      else if (type === 'audio') mimeType = 'audio/m4a';
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
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
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
          timestamp: serverTimestamp() || new Date()
        });
      } else {
        throw new Error(result.message || 'Server returned an invalid upload status');
      }
    } catch (err) {
      console.warn("Google Drive upload failed, falling back to local simulation:", err);
      // Warn user of fallback mode, but do not crash the chat flow
      alert("Notice: Media upload failed (" + err.message + "). Falling back to local-only preview. Go to Firebase Console or configure your Webhook permissions.");
      simulateUpload(localUri, type, filename);
    }
  };

  const simulateUpload = (localUri, type, filename) => {
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
          fileUrl: localUri,
          fileName: filename,
          type: type,
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

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
    >
      {/* 1. Header (Premium styled matching home UI) */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <ArrowLeft color="#00f0ff" size={20} />
          </TouchableOpacity>
          
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=100&auto=format&fit=crop' }} 
              style={styles.avatar} 
            />
            <View style={[styles.statusDot, { backgroundColor: supportSettings.isOnline ? '#10b981' : '#ef4444' }]} />
          </View>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>Anurag KM (Mentor)</Text>
            <Text style={[styles.headerStatus, { color: supportSettings.isOnline ? '#10b981' : '#ef4444' }]}>
              {supportSettings.isOnline ? 'online support' : 'offline support'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconButton}>
            <Phone color="#00f0ff" size={18} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}>
            <MoreVertical color="#888" size={18} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => {
          const isMe = item.sender === user.email;
          return (
            <View style={[styles.messageBubbleContainer, isMe ? styles.myBubbleContainer : styles.theirBubbleContainer]}>
              <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
                {!isMe && <Text style={styles.senderName}>{item.name || "Mentor"}</Text>}
                
                {/* Message Body Content */}
                <View style={styles.bubbleContent}>
                  {item.type === 'text' && (
                    <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                      {item.text}
                    </Text>
                  )}
     
                  {item.type === 'image' && (
                    <TouchableOpacity onPress={() => setPreviewMedia({ type: 'image', url: item.fileUrl })}>
                      <Image source={{ uri: item.fileUrl }} style={styles.attachmentImage} resizeMode="cover" />
                    </TouchableOpacity>
                  )}
     
                  {item.type === 'video' && (
                    <TouchableOpacity 
                      style={styles.mediaBlock} 
                      onPress={() => setPreviewMedia({ type: 'video', url: item.fileUrl, fileName: item.fileName })}
                    >
                      <View style={styles.mediaIconWrapper}>
                        <Play color="#00f0ff" size={20} fill="#00f0ff" />
                      </View>
                      <View style={styles.mediaDetails}>
                        <Text style={styles.mediaTitle} numberOfLines={1}>{item.fileName || 'Video Attachment'}</Text>
                        <Text style={styles.mediaSubtitle}>Tap to play video</Text>
                      </View>
                    </TouchableOpacity>
                  )}
     
                  {item.type === 'audio' && (
                    <TouchableOpacity 
                      style={styles.mediaBlock} 
                      onPress={() => handlePlayAudio(item.id, item.fileUrl)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.mediaIconWrapper}>
                        {playingAudioId === item.id ? (
                          <Pause color="#00f0ff" size={20} fill="#00f0ff" />
                        ) : (
                          <Play color="#00f0ff" size={20} fill="#00f0ff" />
                        )}
                      </View>
                      <View style={styles.mediaDetails}>
                        <Text style={styles.mediaTitle} numberOfLines={1}>
                          {playingAudioId === item.id ? 'Playing Voice Note...' : 'Voice Note'}
                        </Text>
                        <Text style={styles.mediaSubtitle}>
                          {playingAudioId === item.id ? 'Tap to Pause' : 'Tap to Play'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
     
                  {item.type === 'document' && (
                    <TouchableOpacity 
                      style={styles.mediaBlock} 
                      onPress={() => setPreviewMedia({ type: 'document', url: item.fileUrl, fileName: item.fileName })}
                    >
                      <View style={styles.mediaIconWrapper}>
                        <FileText color="#a855f7" size={20} />
                      </View>
                      <View style={styles.mediaDetails}>
                        <Text style={styles.mediaTitle} numberOfLines={1}>{item.fileName}</Text>
                        <Text style={styles.mediaSubtitle}>Tap to preview document</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Footer details inside the bubble */}
                <View style={styles.bubbleFooter}>
                  <Text style={styles.messageTime}>
                    {formatTime(item.timestamp)}
                  </Text>
                  {isMe && (
                    <View style={styles.checkIcon}>
                      <CheckCheck color="#00f0ff" size={12} />
                    </View>
                  )}
                </View>
              </View>
            </View>
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

      {/* 4. WhatsApp-styled Attachment Menu with Frosted Glassmorphism */}
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

      {/* 5. Input Bar (WhatsApp-structured, Glassmorphic style) */}
      <View style={styles.inputContainer}>
        {isRecording ? (
          /* Voice Recording Input Mode */
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
          /* Normal Message Input Mode */
          <View style={styles.inputBarWrapper}>
            <TouchableOpacity 
              style={styles.attachmentButton}
              onPress={() => setShowAttachmentMenu(!showAttachmentMenu)}
            >
              <Paperclip color={showAttachmentMenu ? "#00f0ff" : "#888"} size={20} />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Type your doubt..."
              placeholderTextColor="#555"
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                if (showAttachmentMenu) setShowAttachmentMenu(false);
              }}
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
              alert("Hold to record a voice note.");
            }}
          >
            <Mic color="#050505" size={18} />
          </TouchableOpacity>
        )}
      </View>

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
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
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
    maxWidth: '85%',
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
    alignSelf: 'flex-end',
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
    alignSelf: 'flex-start',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
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
  attachmentImage: {
    width: 220,
    height: 160,
    borderRadius: 10,
    marginBottom: 4,
    marginTop: 2,
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
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  }
});
