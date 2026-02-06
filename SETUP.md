# 클립보드 공유 앱 설치 및 설정 가이드

## 🎯 단계별 설치 가이드

### 1단계: Firebase 프로젝트 생성

1. **Firebase Console 접속**
   - https://console.firebase.google.com/ 접속
   - Google 계정으로 로그인

2. **새 프로젝트 생성**
   - "프로젝트 추가" 클릭
   - 프로젝트 이름 입력 (예: clipboard-share)
   - Google Analytics 설정 (선택사항)
   - "프로젝트 만들기" 클릭

### 2단계: Firebase Realtime Database 설정

1. **Realtime Database 활성화**
   - 왼쪽 메뉴에서 "빌드" → "Realtime Database" 선택
   - "데이터베이스 만들기" 클릭
   - 위치 선택 (가까운 지역 선택, 예: asia-southeast1)
   - 보안 규칙: "테스트 모드로 시작" 선택
   - "사용 설정" 클릭

2. **보안 규칙 설정**
   - "규칙" 탭 클릭
   - 아래 내용으로 변경:

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

   - "게시" 버튼 클릭

3. **Database URL 확인**
   - "데이터" 탭에서 상단의 URL 확인 및 복사
   - 예: `https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app/`

### 3단계: Firebase 웹 앱 설정

1. **웹 앱 추가**
   - 프로젝트 개요로 이동
   - 웹 아이콘(</>) 클릭
   - 앱 닉네임 입력 (예: Clipboard Share Web)
   - Firebase 호스팅 체크박스는 선택사항
   - "앱 등록" 클릭

2. **Firebase 구성 정보 복사**
   - 표시되는 `firebaseConfig` 객체 전체를 복사
   - 예시:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:xxxxxxxxxxxxx",
  databaseURL: "https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app/"
};
```

### 4단계: 앱 설정 파일 수정

1. **config.js 파일 열기**
   - `js/config.js` 파일을 텍스트 에디터로 엽니다

2. **Firebase 구성 정보 입력**
   - `firebaseConfig` 객체를 복사한 정보로 교체

```javascript
export const firebaseConfig = {
  apiKey: "여기에_복사한_API_KEY",
  authDomain: "여기에_복사한_AUTH_DOMAIN",
  projectId: "여기에_복사한_PROJECT_ID",
  storageBucket: "여기에_복사한_STORAGE_BUCKET",
  messagingSenderId: "여기에_복사한_MESSAGING_SENDER_ID",
  appId: "여기에_복사한_APP_ID",
  databaseURL: "여기에_복사한_DATABASE_URL"
};
```

3. **파일 저장**
   - Ctrl+S (Windows) 또는 Cmd+S (Mac)로 저장

### 5단계: 앱 실행

#### 방법 1: 로컬 웹 서버 사용 (권장)

**Python이 설치된 경우:**
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

**Node.js가 설치된 경우:**
```bash
# http-server 설치
npm install -g http-server

# 서버 실행
http-server -p 8000
```

**VS Code를 사용하는 경우:**
- Live Server 확장 프로그램 설치
- index.html 우클릭 → "Open with Live Server"

브라우저에서 `http://localhost:8000` 접속

#### 방법 2: 파일로 직접 실행

- `index.html` 파일을 더블클릭하여 브라우저에서 엽니다
- 일부 브라우저에서는 CORS 정책으로 인해 제한될 수 있습니다

### 6단계: 테스트

1. **첫 번째 PC/탭**
   - "새 룸 생성" 클릭
   - 생성된 룸 코드 확인 (예: ABC-123)

2. **두 번째 PC/탭**
   - 새 브라우저 탭 또는 다른 PC에서 앱 열기
   - 룸 코드 입력
   - "룸 입장" 클릭

3. **동기화 테스트**
   - 한쪽에서 텍스트 입력
   - 다른 쪽에서 즉시 반영되는지 확인

## 🌐 온라인 배포 (선택사항)

### Firebase Hosting 배포

1. **Firebase CLI 설치**
```bash
npm install -g firebase-tools
```

2. **로그인**
```bash
firebase login
```

3. **프로젝트 초기화**
```bash
cd clipboard-share
firebase init hosting
```

설정:
- 기존 프로젝트 선택
- Public directory: `.` (점 입력)
- Single-page app: `No`
- Overwrite index.html: `No`

4. **배포**
```bash
firebase deploy --only hosting
```

5. **접속**
- 배포 완료 후 표시되는 URL로 접속
- 예: `https://your-project.web.app`

## 🔧 문제 해결

### Firebase 연결 오류
- Firebase 구성 정보가 정확한지 확인
- Database URL이 포함되어 있는지 확인
- 브라우저 개발자 도구(F12) → Console 탭에서 오류 메시지 확인

### 텍스트 동기화 안 됨
- 인터넷 연결 확인
- Firebase Database 규칙이 올바르게 설정되었는지 확인
- 연결 상태 표시가 "연결됨"인지 확인

### CORS 오류
- 로컬 웹 서버를 통해 실행 (파일 직접 열기 대신)
- 또는 Firebase Hosting에 배포하여 사용

### 룸 입장 실패
- 룸 코드가 정확한지 확인 (대소문자 구분 없음)
- 룸이 24시간 이내에 생성되었는지 확인
- Firebase Database에서 데이터 확인

## 📞 추가 도움

더 자세한 정보는 다음을 참고하세요:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Realtime Database 가이드](https://firebase.google.com/docs/database)
- 프로젝트 README.md 파일

설치가 완료되었습니다! 🎉
