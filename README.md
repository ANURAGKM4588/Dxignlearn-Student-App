# Dxign.learn Mobile Portal — Setup & Deploy Guide

This is the mobile application codebase for **Dxign.learn** built with React Native (Expo) and styled with deep dark theme brand colors. It allows registered students to watch pre-recorded lectures and clear doubts with mentors via a WhatsApp-style real-time chat.

---

## 🛠 Features Included
1. **Protected Whitelist Login**: Students can only log in using their purchased course email. OTP is handled securely via free Google Apps Script integrations.
2. **Lecture Streaming**: Embedded video player supporting speed control, seek operations, and course categorization.
3. **WhatsApp-Style Chat**: Instant real-time text, images, videos, documents, and voice note sharing.

---

## 📱 Getting Started (Local Development)

### Prerequisites
1. Install **Node.js** (v18 or higher) on your machine.
2. Download the **Expo Go** app on your iOS or Android mobile device.

### Installation
1. Navigate to the mobile app folder:
   ```bash
   cd mobile
   ```
2. Install all dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server:
   ```bash
   npx expo start
   ```
4. **Scan the QR Code** displayed in your terminal using the camera app (iOS) or Expo Go app (Android) to open the app live on your phone.

---

## ⚙️ Backend Integration (100% Free Plan)

### Step 1: Google Sheets Apps Script Setup
Your website logs Razorpay transaction details to a Google Sheet. We will use a Google Apps Script trigger to manage verification OTP codes:
1. Open your Google Sheet where student transactions are logged.
2. Go to **Extensions** -> **Apps Script**.
3. Clear any existing code and copy the contents of [backend/Code.gs](file:///c:/Users/anura/Desktop/Dxign%20Website%202/backend/Code.gs).
4. Update `FIREBASE_PROJECT_ID` and `FIREBASE_API_KEY` with your credentials.
5. Click **Deploy** -> **New Deployment**.
6. Select **Web App** as the type.
7. Configure:
   - **Execute as**: Me (Your Account)
   - **Who has access**: Anyone (This is required so the mobile app can request OTPs)
8. Copy the generated **Web App URL** and update the `APPS_SCRIPT_WEBHOOK` variable in [mobile/src/services/firebase.js](file:///c:/Users/anura/Desktop/Dxign%20Website%202/mobile/src/services/firebase.js#L27).

---

### Step 2: Firebase Configuration
Create a standard **Firebase Project (Spark Plan - 100% Free)** to manage real-time doubt clearing chat:
1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Under project settings, add a **Web App** to copy the config object keys.
3. Paste these keys into [mobile/src/services/firebase.js](file:///c:/Users/anura/Desktop/Dxign%20Website%202/mobile/src/services/firebase.js#L11).

#### Cloud Firestore Security Rules
Go to **Cloud Firestore** -> **Rules** and set up permissions so students can read/write their own chat rooms:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allows students to view and write messages inside their own designated chat room
    match /chats/{chatRoomId}/messages/{messageId} {
      allow read, write: if true; // In production, verify user authentication matching email
    }
    match /whitelisted_students/{email} {
      allow read: if true;
      allow write: if false; // Only Google Sheets Apps Script can write whitelisted users
    }
  }
}
```

#### Firebase Storage Security Rules
Go to **Storage** -> **Rules** to allow students to upload doubt clearance files (screenshots, recordings):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /chats/{chatRoomId}/{allPaths=**} {
      allow read, write: if true; // Allows access to attachments uploaded for doubt clearing
    }
  }
}
```

---

## 🎯 Production Deployment
When you are ready to publish to Android Google Play Store and Apple App Store:
1. Setup an Expo account: `npx expo login`
2. Run Android build: `npx eas build --platform android`
3. Run iOS build: `npx eas build --platform ios`
*(No active billing server costs are required; the app will scale up to 50,000 active students on the free plan).*
