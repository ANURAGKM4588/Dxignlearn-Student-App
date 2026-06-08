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
import { Audio } from 'expo-av';
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
  Volume2
} from 'lucide-react-native';
import { db, storage } from '../services/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export default function ChatScreen({ user, onBack }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const flatListRef = useRef(null);
  const timerRef = useRef(null);

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
          name: "Anurag KM",
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
    };
  }, []);

  // 2. Send text message
  const handleSendText = async () => {
    if (!inputText.trim()) return;

    const msgData = {
      sender: user.email,
      name: user.name,
      text: inputText.trim(),
      type: 'text',
      timestamp: serverTimestamp() || { seconds: Date.now() / 1000 }
    };

    setInputText('');
    await saveMessage(msgData);
  };

  // 3. Save message to Firestore (or local state fallback)
  const saveMessage = async (msgData) => {
    try {
      const chatRoomId = user.email.replace(/[@.]/g, '_');
      await addDoc(collection(db, 'chats', chatRoomId, 'messages'), msgData);
    } catch (e) {
      console.warn("Saving to Firebase failed, appending to local state:", e);
      setMessages(prev => [...prev, { id: Math.random().toString(), ...msgData, timestamp: { seconds: Date.now() / 1000 } }]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // 4. Record Voice Notes (WhatsApp-like hold to record)
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
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

      // Feedback to indicate recording started
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

    // Short vibration to indicate recording stopped
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
          console.warn("Firebase upload failed, simulating fallback upload:", error);
          simulateUpload(localUri, type, filename);
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
            timestamp: serverTimestamp() || { seconds: Date.now() / 1000 }
          });
        }
      );
    } catch (e) {
      console.warn("Direct blob upload failed. Performing mock fallback simulation:", e);
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
          timestamp: { seconds: Date.now() / 1000 }
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

  const formatTime = (seconds) => {
    if (!seconds) return '';
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
      {/* 1. Header (WhatsApp-styled) */}
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
            <View style={styles.statusDot} />
          </View>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>Anurag KM (Mentor)</Text>
            <Text style={styles.headerStatus}>online</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconButton}>
            <Phone color="#00f0ff" size={18} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}>
            <MoreVertical color="#8696a0" size={18} />
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
                    <TouchableOpacity onPress={() => handleDownloadFile(item.fileUrl)}>
                      <Image source={{ uri: item.fileUrl }} style={styles.attachmentImage} resizeMode="cover" />
                    </TouchableOpacity>
                  )}
     
                  {item.type === 'video' && (
                    <TouchableOpacity style={styles.mediaBlock} onPress={() => handleDownloadFile(item.fileUrl)}>
                      <View style={styles.mediaIconWrapper}>
                        <Play color="#00f0ff" size={24} fill="#00f0ff" />
                      </View>
                      <View style={styles.mediaDetails}>
                        <Text style={styles.mediaTitle} numberOfLines={1}>{item.fileName || 'Video Attachment'}</Text>
                        <Text style={styles.mediaSubtitle}>Play video</Text>
                      </View>
                    </TouchableOpacity>
                  )}
     
                  {item.type === 'audio' && (
                    <TouchableOpacity style={styles.mediaBlock} onPress={() => handleDownloadFile(item.fileUrl)}>
                      <View style={styles.mediaIconWrapper}>
                        <Volume2 color="#00a884" size={24} />
                      </View>
                      <View style={styles.mediaDetails}>
                        <Text style={styles.mediaTitle} numberOfLines={1}>Voice Note</Text>
                        <Text style={styles.mediaSubtitle}>Play Audio</Text>
                      </View>
                    </TouchableOpacity>
                  )}
     
                  {item.type === 'document' && (
                    <TouchableOpacity style={styles.mediaBlock} onPress={() => handleDownloadFile(item.fileUrl)}>
                      <View style={styles.mediaIconWrapper}>
                        <FileText color="#7f66ff" size={24} />
                      </View>
                      <View style={styles.mediaDetails}>
                        <Text style={styles.mediaTitle} numberOfLines={1}>{item.fileName}</Text>
                        <Text style={styles.mediaSubtitle}>Download PDF / Doc</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Footer details inside the bubble */}
                <View style={styles.bubbleFooter}>
                  <Text style={styles.messageTime}>
                    {formatTime(item.timestamp?.seconds)}
                  </Text>
                  {isMe && (
                    <View style={styles.checkIcon}>
                      <CheckCheck color="#53bdeb" size={13} />
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
          <Text style={styles.uploadText}>Sending Attachment ({uploadProgress}%)</Text>
        </View>
      )}

      {/* 4. WhatsApp-styled Attachment Menu */}
      {showAttachmentMenu && (
        <View style={styles.attachmentTray}>
          <TouchableOpacity style={styles.trayItem} onPress={pickDocument}>
            <View style={[styles.trayIconWrapper, { backgroundColor: '#7f66ff' }]}>
              <FileText color="#fff" size={20} />
            </View>
            <Text style={styles.trayLabel}>Document</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.trayItem} onPress={() => pickMedia('video')}>
            <View style={[styles.trayIconWrapper, { backgroundColor: '#ff9f43' }]}>
              <VideoIcon color="#fff" size={20} />
            </View>
            <Text style={styles.trayLabel}>Video</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.trayItem} onPress={() => pickMedia('image')}>
            <View style={[styles.trayIconWrapper, { backgroundColor: '#20c997' }]}>
              <ImageIcon color="#fff" size={20} />
            </View>
            <Text style={styles.trayLabel}>Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 5. Input Bar (WhatsApp-styled) */}
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
              <Paperclip color={showAttachmentMenu ? "#00f0ff" : "#8696a0"} size={20} />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Type your AI doubt here..."
              placeholderTextColor="#8696a0"
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
            style={[styles.circularActionBtn, { backgroundColor: '#00a884' }]} 
            onPress={handleSendText}
          >
            <Send color="#fff" size={18} style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.circularActionBtn, isRecording ? styles.circularActionBtnRecording : { backgroundColor: '#00a884' }]} 
            onLongPress={startRecording}
            onPressOut={stopRecording}
            delayLongPress={100}
            activeOpacity={0.8}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Vibration.vibrate(40);
              }
              alert("Hold to record a voice note.");
            }}
          >
            <Mic color="#fff" size={18} />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b141a', // Classic WhatsApp dark mode background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 10,
    backgroundColor: '#1f2c34', // WhatsApp dark header color
    borderBottomWidth: 0.5,
    borderBottomColor: '#2f3b43',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 6,
    marginRight: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3f4f56',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00e676', // Online green
    borderWidth: 1.5,
    borderColor: '#1f2c34',
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#e9edef',
  },
  headerStatus: {
    fontSize: 11,
    color: '#8696a0',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconButton: {
    padding: 8,
  },
  messageList: {
    padding: 12,
    paddingBottom: 20,
    gap: 8,
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
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 4,
    borderRadius: 10,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1.5,
  },
  myBubble: {
    backgroundColor: '#005c4b', // WhatsApp dark sent color
    borderTopRightRadius: 2,
    alignSelf: 'flex-end',
  },
  theirBubble: {
    backgroundColor: '#202c33', // WhatsApp dark received color
    borderTopLeftRadius: 2,
    alignSelf: 'flex-start',
  },
  senderName: {
    color: '#34b7f1',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 3,
  },
  bubbleContent: {
    paddingRight: 50, // Space for inline time/status footer
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
  },
  myMessageText: {
    color: '#e9edef',
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
    bottom: 4,
    right: 8,
    gap: 3,
  },
  messageTime: {
    fontSize: 9,
    color: '#8696a0',
  },
  checkIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentImage: {
    width: 230,
    height: 170,
    borderRadius: 8,
    marginBottom: 4,
    marginTop: 2,
  },
  mediaBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    padding: 10,
    borderRadius: 8,
    marginTop: 2,
    gap: 12,
    width: 220,
  },
  mediaIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaDetails: {
    flex: 1,
  },
  mediaTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#e9edef',
  },
  mediaSubtitle: {
    fontSize: 10,
    color: '#8696a0',
    marginTop: 2,
  },
  uploadOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f2c34',
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#2f3b43',
  },
  uploadText: {
    color: '#00f0ff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  attachmentTray: {
    position: 'absolute',
    bottom: 72,
    left: 12,
    right: 12,
    backgroundColor: '#1f2c34',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderWidth: 0.5,
    borderColor: '#2f3b43',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  trayItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
  },
  trayIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  trayLabel: {
    fontSize: 10,
    color: '#e9edef',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#0b141a', // WhatsApp background match
    gap: 6,
  },
  inputBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2c34', // WhatsApp dark message wrapper
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
    color: '#e9edef',
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? 6 : 2,
    textAlignVertical: 'center',
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1f2c34',
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
  },
  circularActionBtnRecording: {
    backgroundColor: '#ef4444',
    transform: [{ scale: 1.15 }],
  }
});
