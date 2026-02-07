// Firebase Configuration for Clipboard Share
// time2share 프로젝트 (Blaze 요금제)

export const firebaseConfig = {
    apiKey: "AIzaSyCEK2TKbac8alN5-q60FHbuRzYaer4MJiI",
    authDomain: "time2share.firebaseapp.com",
    projectId: "time2share",
    storageBucket: "time2share.firebasestorage.app",
    messagingSenderId: "431189624696",
    appId: "1:431189624696:web:c6f2a1dcc062e20c0dea8d",
    databaseURL: "https://time2share-default-rtdb.asia-southeast1.firebasedatabase.app/"
};
// App Configuration
export const APP_NAME = "Time Note";
export const APP_VERSION = "1.0.5";
export const APP_BUILD = "2026-02-07-timenote";

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
