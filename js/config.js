// Firebase Configuration for Clipboard Share
// 본인의 Firebase 프로젝트 설정으로 변경하세요

export const firebaseConfig = {
    apiKey: "AIzaSyDhyfqV0IkxpQnjAvPaZHlLs4U1-KAqM7k",
    authDomain: "clip2share.firebaseapp.com",
    projectId: "clip2share",
    storageBucket: "clip2share.firebasestorage.app",
    messagingSenderId: "162423397060",
    appId: "1:162423397060:web:10d6e7fc00367afb62c791",
    databaseURL: "https://clip2share-default-rtdb.asia-southeast1.firebasedatabase.app/"
};
// App Configuration
export const APP_NAME = "Easy Note";
export const APP_VERSION = "1.0.4";
export const APP_BUILD = "2026-02-07-voice-simple";

// RTDB Path
export const RTDB_PATH = {
  CLIPBOARD: 'clipboard'
};

// Room Configuration
export const ROOM_EXPIRY_HOURS = 24;
export const MAX_TEXT_LENGTH = 10000;
export const UPDATE_DEBOUNCE_MS = 500;
export const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10분

// OpenAI Configuration
// ✅ 보안: API 키는 Firebase Functions에서 환경 변수로 관리됩니다.
// 클라이언트에서는 Firebase Function을 통해 안전하게 호출합니다.
