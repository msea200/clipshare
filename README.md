# � Easy Note

여러 기기 간 노트를 실시간으로 공유할 수 있는 웹 애플리케이션입니다.

## ✨ 주요 기능

- 🚀 **간편한 방 생성**: 클릭 한 번으로 새로운 공유 방 생성
- 📅 **날짜 기반 방 코드**: YYMMDD 형식의 직관적인 방 코드 (예: 260207)
- 🔗 **방 코드 공유**: 고유한 방 코드로 여러 기기 연결
- ⚡ **실시간 동기화**: Firebase Realtime Database를 활용한 즉시 동기화
- 📝 **여러 노트 관리**: 여러 개의 노트를 목록으로 추가 및 관리
- ➕ **노트 추가**: 상단 입력 필드에서 새 노트를 계속 추가 가능
- 👤 **작성자 표시**: 각 노트에 작성자 이름과 프로필 사진 표시
- 📋 **개별 복사/삭제**: 각 노트 아이템을 개별적으로 복사하거나 삭제
- 💾 **자동 저장**: 입력하는 텍스트가 자동으로 저장되고 동기화됨
- 🌐 **연결 상태 표시**: 실시간 연결 상태 모니터링
- 🔐 **Google 로그인**: Google 계정으로 간편 로그인
- 👨‍💼 **관리자 기능**: 모든 방 관리, 영구 보관 설정
- ⏰ **자동 정리**: 24시간 후 방 자동 삭제 (영구 보관 제외)
- 📱 **반응형 디자인**: 모바일과 데스크톱 모두 지원
- ⌨️ **단축키 지원**: Ctrl+Enter로 빠르게 노트 추가
- 🎤 **음성 입력**: Web Speech API로 말로 쓰기
- ✨ **AI 정리**: OpenAI GPT-4o-mini로 메모 자동 정리 (Cloudflare Workers)

## 🚀 빠른 시작

### 1. Firebase 프로젝트 설정

1. [Firebase Console](https://console.firebase.google.com/)에 접속하여 새 프로젝트 생성
2. **Realtime Database** 활성화
3. Database 규칙을 아래와 같이 설정:

```json
{
  "rules": {
    "clipboard": {
      "$roomCode": {
        ".read": true,
        ".write": true,
        ".indexOn": ["expiresAt", "lastUpdated"]
      }
    }
  }
}
```

4. 프로젝트 설정에서 Firebase 구성 정보 복사

### 2. 설정 파일 수정

`js/config.js` 파일을 열어 Firebase 구성 정보를 입력하세요:

```javascript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  databaseURL: "https://your-project-default-rtdb.region.firebasedatabase.app/"
### 3. 앱 실행

1. 웹 서버를 통해 `index.html` 파일을 제공하거나
2. 브라우저에서 `index.html` 파일을 직접 열어서 실행

## 📖 사용 방법

### 첫 번째 기기 (방 생성자)

1. **오늘 방 입장** - 오늘 날짜(YYMMDD)로 자동 입장
2. **새 방 만들기** - 오늘 날짜 + 연번으로 새 방 생성 (예: 260207-001)
3. 생성된 방 코드를 다른 기기와 공유

### 두 번째 기기 (참여자)

1. "기존 방 입장" 섹션에서 방 코드 입력
2. "방 입장" 버튼 클릭

### 노트 추가 및 관리

1. **새 노트 추가**
   - 상단 입력 필드에 텍스트 입력 또는 붙여넣기
   - "노트 추가" 버튼 클릭 (또는 Ctrl+Enter)
   - 추가된 노트가 목록에 표시됨
   - 작성자 이름과 프로필 사진이 함께 표시됨

2. **노트 복사**
   - 각 노트 아이템의 📋 버튼 클릭
   - 해당 텍스트가 시스템 클립보드에 복사됨

3. **노트 삭제**
   - 각 노트 아이템의 🗑️ 버튼 클릭
   - 해당 노트만 삭제됨

4. **실시간 동기화**
   - 모든 기기에서 노트 목록이 실시간으로 동기화
   - 누가 어떤 노트를 추가/삭제해도 즉시 반영
   - 생성 시간 순으로 자동 정렬 (최신순)

### 관리자 기능 (로그인 필요)

1. **Google 로그인**
   - 우측 상단 "Google 로그인" 버튼 클릭

2. **관리자 패널** (관리자 계정만)
   - "🛠️ 관리자 패널" 버튼으로 모든 방 관리
   - 일반 방 / 영구 방 필터링
   - 방 삭제, 영구 보관 설정 가능

## 📁 프로젝트 구조

```
easy-note/
├── index.html          # 메인 HTML 파일
├── css/
│   └── styles.css      # 스타일시트
├── js/
│   ├── config.js       # Firebase 및 앱 설정
│   └── app.js          # 메인 애플리케이션 로직
├── firebase.json       # Firebase 호스팅 설정 (선택사항)
├── database.rules.json # Firebase Database 규칙
└── README.md           # 프로젝트 문서
```

## 🔧 설정 옵션

`js/config.js` 파일에서 다음 설정을 변경할 수 있습니다:

```javascript
export const ROOM_EXPIRY_HOURS = 24;        // 룸 만료 시간 (시간)
export const MAX_TEXT_LENGTH = 10000;       // 최대 텍스트 길이 (글자)
export const UPDATE_DEBOUNCE_MS = 500;      // 업데이트 지연 시간 (밀리초)
export const CLEANUP_INTERVAL_MS = 600000;  // 정리 주기 (밀리초)
```

## 🌐 배포

### 1. Cloudflare Workers 배포 (AI 기능)

```bash
cd worker
wrangler login
wrangler secret put OPENAI_API_KEY
wrangler deploy
```

배포 후 나온 Worker URL을 [js/app.js](js/app.js)에서 업데이트하세요.

자세한 내용은 [worker/README.md](worker/README.md)를 참고하세요.

### 2. Firebase Hosting 배포

```bash
firebase login
firebase deploy --only hosting
```

배포 후 제공되는 URL을 통해 어디서든 접속 가능합니다.

## 🔒 보안 및 주의사항

- ⚠️ **민감한 정보를 공유하지 마세요**: 비밀번호, 개인정보, 금융 정보 등
- 🔓 **방 코드를 아는 사람은 누구나 접근 가능**: 방 코드를 안전하게 공유하세요
- ⏰ **24시간 후 자동 삭제**: 방과 노트는 24시간 후 자동으로 삭제됩니다 (영구 보관 제외)
- 🔒 **추가 보안**: Google 로그인을 통한 사용자 인증 지원

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Firebase Realtime Database
- **인증**: Firebase Authentication (Google Login)
- **호스팅**: Firebase Hosting

## 📝 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

## 🤝 기여

버그 리포트, 기능 제안, Pull Request를 환영합니다!

## 📮 문의

문제가 발생하거나 질문이 있으시면 Issues를 통해 문의해주세요.

---

**Clipboard Share** - 2대 이상의 PC 간 텍스트를 쉽고 빠르게 공유하세요! 📋✨
