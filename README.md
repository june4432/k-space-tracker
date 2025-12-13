# K-Space Tracker 🛰️

실시간 위성 및 우주쓰레기 3D 시각화 웹 애플리케이션

![React](https://img.shields.io/badge/React-18-blue)
![Cesium](https://img.shields.io/badge/Cesium-1.x-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 주요 기능

- **실시간 위성 추적**: SGP4 알고리즘을 이용한 정확한 위성 위치 계산
- **한국 위성 하이라이트**: 아리랑(KOMPSAT), 천리안, 무궁화 등 한국 위성 별도 카테고리
- **다양한 카테고리**: Starlink, 우주정거장, 우주쓰레기(Cosmos, Iridium, Fengyun)
- **궤도 유형 필터**: LEO, MEO, GEO, HEO 별 필터링
- **시간 시뮬레이션**: 1x ~ 3600x 배속, 일시정지, 시간 점프
- **궤적 시각화**: 선택한 위성의 과거/미래 궤적 표시 (±45분)
- **충돌 위험 분석**: 100km 이내 근접 물체 탐지 및 위험도 표시

## 스크린샷

*추가 예정*

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### Cesium 토큰 설정

1. [Cesium ion](https://cesium.com/ion/)에서 무료 계정 생성
2. Access Token 발급
3. 프로젝트 루트에 `.env` 파일 생성:
```
VITE_CESIUM_TOKEN=여기에_토큰_입력
```

## 기술 스택

| 기술 | 용도 |
|------|------|
| React | UI 프레임워크 |
| Cesium.js | 3D 지구 렌더링 |
| Resium | Cesium React 래퍼 |
| satellite.js | TLE 기반 위성 위치 계산 (SGP4) |
| Vite | 빌드 도구 |

## 데이터 소스

- [CelesTrak](https://celestrak.org/) - TLE 데이터 제공 (무료)
- NORAD 카탈로그 기반 위성 정보

## 궤도 유형 설명

| 궤도 | 고도 | 특징 |
|------|------|------|
| LEO (저궤도) | ~2,000km | 대부분의 위성, Starlink, ISS |
| MEO (중궤도) | 2,000~35,786km | GPS, 항법 위성 |
| GEO (정지궤도) | ~35,786km | 통신위성, 기상위성 (천리안) |
| HEO (고궤도) | 35,786km+ | 타원 궤도 위성 |

## 한국 위성 목록

추적 가능한 주요 한국 위성:
- **아리랑 (KOMPSAT)** - 다목적 실용위성
- **천리안 (GEO-KOMPSAT, COMS)** - 정지궤도 복합위성
- **무궁화 (KOREASAT)** - 통신위성
- **차세대소형위성 (NEXTSAT)** - 과학기술위성

## 라이선스

MIT License

## 참고 자료

- [Cesium 공식 문서](https://cesium.com/learn/cesiumjs/)
- [satellite.js GitHub](https://github.com/shashwatak/satellite-js)
- [CelesTrak 데이터 포맷](https://celestrak.org/NORAD/documentation/gp-data-formats.php)
