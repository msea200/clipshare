# PWA 아이콘 생성 가이드

## 필요한 아이콘 크기
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152 (iOS)
- 192x192
- 384x384
- 512x512

## 온라인 도구로 생성하기

1. **방법 1: PWA Asset Generator**
   - https://www.pwabuilder.com/imageGenerator
   - 512x512 PNG 이미지 업로드
   - 모든 크기 자동 생성

2. **방법 2: Favicon Generator**
   - https://realfavicongenerator.net/
   - SVG 또는 PNG 업로드
   - PWA 아이콘 옵션 선택

## 수동으로 생성하기

기존 favicon.png를 사용하여 각 크기로 리사이즈:

```bash
# ImageMagick 사용 (설치 필요)
convert favicon.png -resize 72x72 icons/icon-72x72.png
convert favicon.png -resize 96x96 icons/icon-96x96.png
convert favicon.png -resize 128x128 icons/icon-128x128.png
convert favicon.png -resize 144x144 icons/icon-144x144.png
convert favicon.png -resize 152x152 icons/icon-152x152.png
convert favicon.png -resize 192x192 icons/icon-192x192.png
convert favicon.png -resize 384x384 icons/icon-384x384.png
convert favicon.png -resize 512x512 icons/icon-512x512.png
```

## 현재 상태
- icon-template.svg 파일이 생성되었습니다
- 위의 온라인 도구를 사용하여 PNG 아이콘을 생성하세요
- 생성된 아이콘을 icons/ 폴더에 저장하세요

## 빠른 해결책 (임시)
당장 테스트하려면 favicon.png를 복사하여 사용:

```bash
cp favicon.png icons/icon-72x72.png
cp favicon.png icons/icon-96x96.png
cp favicon.png icons/icon-128x128.png
cp favicon.png icons/icon-144x144.png
cp favicon.png icons/icon-152x152.png
cp favicon.png icons/icon-192x192.png
cp favicon.png icons/icon-384x384.png
cp favicon.png icons/icon-512x512.png
```
