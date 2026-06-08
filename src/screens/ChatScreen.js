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
  Image 
} from 'react-native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const flatListRef = useRef(null);

  // 1. Subscribe to Firebase messages
  useEffect(() => {
    // We categorize chats by user email to partition student doubts
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
        { id: "m1", sender: "mentor", text: "Welcome to Dxign.learn Doubt support! How can I help you today?", timestamp: { seconds: Date.now()/1000 } }
      ]);
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
      timestamp: serverTimestamp() || { seconds: Date.now() / 1000 }
    };

    setInputText('');
    await saveMessage(msgData);
  };

  // 3. Save message to Firestore (or local state if Firestore config fails)
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

  // 4. Record Voice Notes
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
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    // Upload voice file
    if (uri) {
      uploadFile(uri, 'audio', 'voice_note.m4a');
    }
  };

  // 5. Select Images / Videos
  const pickMedia = async (type) => {
    let result;
    const options = {
      mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.8,
    };

    if (type === 'image') {
      result = await ImagePicker.launchImageLibraryAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled && result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;
      uploadFile(uri, type, type === 'image' ? 'photo.jpg' : 'video.mp4');
    }
  };

  // 6. Select Documents
  const pickDocument = async () => {
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
    setUploadProgress(10);

    const timestamp = Date.now();
    const storagePath = `chats/${user.email.replace(/[@.]/g, '_')}/${timestamp}_${filename}`;
    
    try {
      // Fetch local file blob
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

  // Simulates uploading to bypass missing Firebase credentials during initial trials
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

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Chat header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← BACK</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>DXIGN DOUBT PORTAL</Text>
          <Text style={styles.headerStatus}>● Live Mentorship Online</Text>
        </View>
      </View>

      {/* Messages list */}
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
                {!isMe ? <Text style={styles.senderName}>{item.name || "Mentor"}</Text> : null}
                
                {/* Text Messages */}
                {item.type === 'text' ? (
                  <Text style={styles.messageText}>{item.text}</Text>
                ) : null}

                {/* Image Messages */}
                {item.type === 'image' ? (
                  <Image source={{ uri: item.fileUrl }} style={styles.attachmentImage} resizeMode="cover" />
                ) : null}

                {/* Video Messages */}
                {item.type === 'video' ? (
                  <TouchableOpacity style={styles.fileButton} onPress={() => handleDownloadFile(item.fileUrl)}>
                    <Text style={styles.fileButtonText}>▶ PLAY VIDEO ATTACHMENT</Text>
                  </TouchableOpacity>
                ) : null}

                {/* Voice Notes */}
                {item.type === 'audio' ? (
                  <TouchableOpacity style={styles.fileButton} onPress={() => handleDownloadFile(item.fileUrl)}>
                    <Text style={styles.fileButtonText}>🎙 PLAY VOICE NOTE</Text>
                  </TouchableOpacity>
                ) : null}

                {/* Documents */}
                {item.type === 'document' ? (
                  <TouchableOpacity style={styles.fileButton} onPress={() => handleDownloadFile(item.fileUrl)}>
                    <Text style={styles.fileButtonText}>📄 DOCUMENT: {item.fileName}</Text>
                  </TouchableOpacity>
                ) : null}

                <Text style={styles.messageTime}>{formatTime(item.timestamp?.seconds)}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* Upload Progress Tracker Overlay */}
      {isUploading ? (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator color="#00f0ff" size="small" />
          <Text style={styles.uploadText}>Uploading Attachment ({uploadProgress}%)</Text>
        </View>
      ) : null}

      {/* Input bar */}
      <View style={styles.inputContainer}>
        {/* Media attachments menu */}
        <View style={styles.attachmentBar}>
          <TouchableOpacity style={styles.iconButton} onPress={() => pickMedia('image')}>
            <Text style={styles.iconButtonText}>🖼 IMAGE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => pickMedia('video')}>
            <Text style={styles.iconButtonText}>🎥 VIDEO</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={pickDocument}>
            <Text style={styles.iconButtonText}>📄 DOC</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.recordButton, isRecording && styles.recordingActive]} 
            onLongPress={startRecording}
            onPressOut={stopRecording}
          >
            <Text style={[styles.recordButtonText, isRecording && styles.recordingActiveText]}>
              {isRecording ? "🎤 RECORDING..." : "🎤 VOICE NOTE"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputTextContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your AI doubt here..."
            placeholderTextColor="#555"
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSendText}>
            <Text style={styles.sendButtonText}>SEND</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#0b0b0c',
  },
  backButton: {
    paddingRight: 16,
  },
  backButtonText: {
    color: '#00f0ff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1.5,
  },
  headerStatus: {
    fontSize: 9,
    color: '#10b981',
    marginTop: 2,
    fontWeight: '600',
  },
  messageList: {
    padding: 20,
    gap: 16,
  },
  messageBubbleContainer: {
    width: '100%',
    flexDirection: 'row',
  },
  myBubbleContainer: {
    justifyContent: 'flex-end',
  },
  theirBubbleContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: '#00f0ff',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#0b0b0c',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    color: '#a855f7',
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  messageText: {
    color: '#000',
    fontSize: 14,
  },
  messageTime: {
    alignSelf: 'flex-end',
    fontSize: 8,
    color: 'rgba(0,0,0,0.5)',
    marginTop: 4,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 4,
  },
  fileButton: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  fileButtonText: {
    color: '#000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  uploadOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0b0c',
    paddingVertical: 8,
    gap: 8,
  },
  uploadText: {
    color: '#00f0ff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#0b0b0c',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  attachmentBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  iconButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  iconButtonText: {
    color: '#aaa',
    fontSize: 9,
    fontWeight: '700',
  },
  recordButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  recordingActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  recordButtonText: {
    color: '#a855f7',
    fontSize: 9,
    fontWeight: '700',
  },
  recordingActiveText: {
    color: '#fff',
  },
  inputTextContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 13,
  },
  sendButton: {
    backgroundColor: '#00f0ff',
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#050505',
    fontSize: 11,
    fontWeight: '900',
  }
});
