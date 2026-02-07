# ClipShare 보안 가이드

## 🔒 개요

이 문서는 ClipShare 앱의 백엔드 아키텍처와 보안 설정을 설명합니다.

## 🏗️ 아키텍처

### Firebase
- **Authentication**: Google 로그인
- **Realtime Database**: 실시간 클립보드 동기화

### Cloudflare Workers
- **AI API 백엔드**: OpenAI API 호출을 위한 프록시
- **장점**: 무료 tier 넉넉, cold start 없음, 빠른 응답

---

## ⚡ Cloudflare Workers 배포 (권장)

Firebase Functions 대신 Cloudflare Workers를 사용합니다. 자세한 내용은 [worker/README.md](worker/README.md)를 참고하세요.

### 빠른 시작

```bash
# 1. Wrangler CLI 설치
npm install -g wrangler

# 2. Cloudflare 로그인
wrangler login

# 3. API 키 설정
cd worker
wrangler secret put OPENAI_API_KEY

# 4. 배포
wrangler deploy

# 5. app.js에서 Worker URL 업데이트
# functionUrl을 배포된 Worker URL로 변경

# 6. 프론트엔드 재배포
cd ..
firebase deploy --only hosting
```

---

## 🔧 Firebase Functions (더 이상 사용 안 함)

Firebase Functions는 Blaze 플랜이 필요하므로 Cloudflare Workers로 대체했습니다.

## 환경 변수에서 OpenAI API 키 가져오기
const openaiApiKey = process.env.OPENAI_API_KEY;
```

### 로컬 테스트

#### 1. 에뮬레이터로 테스트
```bash
cd functions
firebase emulators:start --only functions
```

#### 2. 테스트 요청
```bash
curl -X POST http://localhost:5001/clip2share/asia-northeast3/organizeSchedule \
  -H "Content-Type: application/json" \
  -d '{"prompt":"내일 오전 10시 회의"}'
```

### 배포

#### 1. Functions 배포
```bash
# Functions와 Hosting 동시 배포
firebase deploy
```

#### 2. Functions만 배포
```bash
firebase deploy --only functions
```

### 보안 체크리스트

- [x] 클라이언트에서 API 키 제거
- [x] Firebase Function으로 백엔드 처리
- [x] .env 파일을 .gitignore에 추가
- [ ] Blaze 플랜으로 업그레이드
- [ ] Secret Manager로 API 키 관리
- [ ] CORS 설정 확인
- [ ] 인증 토큰 검증 (선택사항)

### 비용 관리

- Firebase Functions는 Blaze 플랜에서 무료 할당량 제공:
  - 2백만 호출/월
  - 400,000 GB-초/월
  - 200,000 CPU-초/월

- OpenAI API 비용:
  - GPT-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens
  - 월 사용량 모니터링 권장

### 문제 해결

#### Secret 설정 실패 시
```bash
# 1. Firebase CLI 최신 버전 확인
firebase --version

# 2. 로그인 재시도
firebase logout
firebase login

# 3. 프로젝트 확인
firebase projects:list
```

#### Function 배포 실패 시
```bash
# 로그 확인
firebase functions:log

# 특정 함수 로그
firebase functions:log --only organizeSchedule
```

### 참고 문서

- [Firebase Functions Secrets](https://firebase.google.com/docs/functions/config-env#secret-manager)
- [OpenAI API Best Practices](https://platform.openai.com/docs/guides/production-best-practices)
