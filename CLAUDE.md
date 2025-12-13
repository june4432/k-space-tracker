# Space Tracker - 위성/우주쓰레기 실시간 시각화 프로젝트

## 프로젝트 개요
실시간으로 위성과 우주쓰레기의 위치를 3D 지구 위에 시각화하는 웹 애플리케이션

## 기술 스택
- **프론트엔드**: React
- **3D 시각화**: Cesium.js (NASA, SpaceX도 사용하는 라이브러리)
- **궤도 계산**: satellite.js (SGP4 알고리즘 구현)
- **데이터 소스**: CelesTrak API (무료, TLE/JSON 제공)

## 핵심 라이브러리

```bash
# 설치 예정
npm install resium cesium satellite.js
```

| 라이브러리 | 용도 |
|-----------|------|
| cesium | 3D 지구 렌더링 |
| resium | Cesium React 래퍼 |
| satellite.js | TLE → 위성 위치 계산 |

## 데이터 소스

### CelesTrak API
- URL: https://celestrak.org/
- 포맷: TLE, JSON, XML 지원
- 주요 엔드포인트:
  - `/NORAD/elements/` - 위성 카테고리별 TLE
  - `?FORMAT=json` - JSON 형식으로 요청 가능

### 예시 API 호출
```
https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json
https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json
```

## 구현 계획

### Phase 1: 기본 설정
- [ ] React + Vite 프로젝트 생성
- [ ] Cesium.js 설정 (토큰, 에셋)
- [ ] 기본 3D 지구 렌더링

### Phase 2: 데이터 연동
- [ ] CelesTrak API 연동
- [ ] satellite.js로 위성 위치 계산
- [ ] 지구 위에 위성 마커 표시

### Phase 3: 인터랙션
- [ ] 위성 클릭 시 정보 표시
- [ ] 카테고리별 필터링 (Starlink, ISS, 우주쓰레기 등)
- [ ] 실시간 위치 업데이트

## 참고 자료

### 공식 문서
- Cesium: https://cesium.com/learn/cesiumjs/
- Resium: https://resium.reearth.io/
- satellite.js: https://github.com/shashwatak/satellite-js

### 오픈소스 참고
- KeepTrack: https://github.com/thkruz/keeptrack.space
- GitHub celestrak 토픽: https://github.com/topics/celestrak

### 데이터 참고
- CelesTrak 문서: https://celestrak.org/NORAD/documentation/gp-data-formats.php
- Space-Track (상세 데이터, 계정 필요): https://www.space-track.org/

## 메모
- Cesium은 무료 토큰 필요 (cesium.com에서 발급)
- TLE 데이터는 주기적으로 업데이트됨 (하루 1-2회 권장)
- 우주쓰레기는 10cm 이상만 추적 가능
