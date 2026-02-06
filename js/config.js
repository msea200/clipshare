// Firebase Configuration for Clipboard Share
// 본인의 Firebase 프로젝트 설정으로 변경하세요

export const firebaseConfig = {
    apiKey: "AIzaSyB4LQlDQcZfoQTbuvzxVHRrlOEnFqi1kmI",
    authDomain: "mycopy-share.firebaseapp.com",
    projectId: "mycopy-share",
    storageBucket: "mycopy-share.firebasestorage.app",
    messagingSenderId: "621363907111",
    appId: "1:621363907111:web:d9df9b16bd1ed40e401c02",
    databaseURL: "https://mycopy-share-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// App Configuration
export const APP_NAME = "Clipboard Share";
export const APP_VERSION = "1.0.0";
export const APP_BUILD = "2026-02-06";

// RTDB Path
export const RTDB_PATH = {
  CLIPBOARD: 'clipboard'
};

// Room Configuration
export const ROOM_EXPIRY_HOURS = 24;
export const MAX_TEXT_LENGTH = 10000;
export const UPDATE_DEBOUNCE_MS = 500;
export const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10분
