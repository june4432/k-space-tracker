import { useState, useMemo } from 'react'

// 발사 기지 데이터
const LAUNCH_SITES = [
  { id: 'naro', name: '🇰🇷 나로우주센터', lat: 34.43, lng: 127.54, country: 'Korea' },
  { id: 'cape', name: '🇺🇸 케이프 커내버럴', lat: 28.56, lng: -80.57, country: 'USA' },
  { id: 'baikonur', name: '🇰🇿 바이코누르', lat: 45.96, lng: 63.31, country: 'Kazakhstan' },
  { id: 'kourou', name: '🇫🇷 기아나 우주센터', lat: 5.23, lng: -52.77, country: 'French Guiana' },
  { id: 'tanegashima', name: '🇯🇵 다네가시마', lat: 30.4, lng: 130.97, country: 'Japan' },
]

// 위성 용도 프리셋
const SATELLITE_PRESETS = [
  { id: 'earth_obs', name: '🌍 지구관측', altitude: 500, inclination: 97.4, description: 'LEO 태양동기궤도' },
  { id: 'communication', name: '📡 통신위성', altitude: 35786, inclination: 0, description: 'GEO 정지궤도' },
  { id: 'navigation', name: '🛰️ 항법(GPS)', altitude: 20200, inclination: 55, description: 'MEO 중궤도' },
  { id: 'science', name: '🔬 과학연구', altitude: 400, inclination: 51.6, description: 'ISS 궤도와 유사' },
  { id: 'custom', name: '⚙️ 직접 설정', altitude: 500, inclination: 45, description: '파라미터 직접 조절' },
]

/**
 * 위성 발사 시뮬레이터 컴포넌트
 */
function LaunchSimulator({ onLaunch, onClose, satellites = [] }) {
  const [launchSite, setLaunchSite] = useState(LAUNCH_SITES[0])
  const [preset, setPreset] = useState(SATELLITE_PRESETS[0])
  const [altitude, setAltitude] = useState(500)
  const [inclination, setInclination] = useState(97.4)
  const [satelliteName, setSatelliteName] = useState('My-Sat-1')
  const [isLaunching, setIsLaunching] = useState(false)
  const [launchPhase, setLaunchPhase] = useState(null)
  const [launchComplete, setLaunchComplete] = useState(false)

  // 프리셋 변경 시 파라미터 업데이트
  const handlePresetChange = (presetId) => {
    const newPreset = SATELLITE_PRESETS.find(p => p.id === presetId)
    if (newPreset) {
      setPreset(newPreset)
      if (presetId !== 'custom') {
        setAltitude(newPreset.altitude)
        setInclination(newPreset.inclination)
      }
    }
  }

  // 궤도 정보 계산
  const orbitInfo = useMemo(() => {
    const R = 6371 // 지구 반지름 (km)
    const GM = 398600.4418 // 지구 중력 상수 (km³/s²)
    const a = R + altitude // 궤도 반지름

    // 궤도 주기 (분)
    const period = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / GM) / 60

    // 하루 회전 수
    const orbitsPerDay = 1440 / period

    // 궤도 속도 (km/s)
    const velocity = Math.sqrt(GM / a)

    // 예상 수명 (고도에 따른 대략적 추정)
    let lifetime
    if (altitude < 300) lifetime = '수개월'
    else if (altitude < 500) lifetime = '2-5년'
    else if (altitude < 800) lifetime = '10-25년'
    else if (altitude < 1000) lifetime = '100년+'
    else lifetime = '1000년+'

    return {
      period: period.toFixed(1),
      orbitsPerDay: orbitsPerDay.toFixed(1),
      velocity: velocity.toFixed(2),
      lifetime,
      orbitType: getOrbitType(altitude),
    }
  }, [altitude])

  // 안전성 검사 - 기존 위성/쓰레기와 충돌 가능성
  const safetyCheck = useMemo(() => {
    const warnings = []
    const dangers = []

    // 고도별 혼잡도 체크
    satellites.forEach(sat => {
      if (!sat.position) return
      const satAlt = sat.position.altitude
      const altDiff = Math.abs(satAlt - altitude)

      if (altDiff < 10) {
        dangers.push(`${sat.name}과 고도 ${altDiff.toFixed(1)}km 차이`)
      } else if (altDiff < 50) {
        warnings.push(`${sat.name} 궤도 근접 (${altDiff.toFixed(1)}km)`)
      }
    })

    // 특정 궤도대 경고
    if (altitude >= 500 && altitude <= 600) {
      warnings.push('Starlink 밀집 구역 (500-600km)')
    }
    if (altitude >= 750 && altitude <= 850) {
      warnings.push('Iridium/Cosmos 파편 구역')
    }

    return { warnings: warnings.slice(0, 3), dangers: dangers.slice(0, 3) }
  }, [altitude, satellites])

  // 발사 시퀀스
  const handleLaunch = async () => {
    setIsLaunching(true)
    setLaunchComplete(false)

    const phases = [
      { phase: 'countdown', text: '카운트다운...', duration: 2000 },
      { phase: 'liftoff', text: '🚀 발사!', duration: 1500 },
      { phase: 'maxq', text: 'Max-Q 통과', duration: 1500 },
      { phase: 'stage1', text: '1단 분리', duration: 1500 },
      { phase: 'stage2', text: '2단 점화', duration: 1500 },
      { phase: 'orbit', text: '궤도 진입 중...', duration: 2000 },
      { phase: 'deploy', text: '🛰️ 위성 배치 완료!', duration: 1000 },
    ]

    for (const p of phases) {
      setLaunchPhase(p)
      await new Promise(resolve => setTimeout(resolve, p.duration))
    }

    setLaunchPhase(null)
    setIsLaunching(false)
    setLaunchComplete(true)

    // 부모 컴포넌트에 발사된 위성 정보 전달
    if (onLaunch) {
      onLaunch({
        name: satelliteName,
        launchSite,
        altitude,
        inclination,
        orbitInfo,
        launchedAt: new Date(),
      })
    }
  }

  return (
    <div className="launch-simulator">
      <button className="close-btn" onClick={onClose}>✕</button>

      <h2>🚀 위성 발사 시뮬레이터</h2>

      {/* 발사 중 오버레이 */}
      {isLaunching && launchPhase && (
        <div className="launch-overlay">
          <div className="launch-phase">
            <div className="phase-icon">
              {launchPhase.phase === 'countdown' && '⏱️'}
              {launchPhase.phase === 'liftoff' && '🚀'}
              {launchPhase.phase === 'maxq' && '💨'}
              {launchPhase.phase === 'stage1' && '🔥'}
              {launchPhase.phase === 'stage2' && '✨'}
              {launchPhase.phase === 'orbit' && '🌍'}
              {launchPhase.phase === 'deploy' && '🛰️'}
            </div>
            <div className="phase-text">{launchPhase.text}</div>
          </div>
        </div>
      )}

      {/* 발사 완료 */}
      {launchComplete && (
        <div className="launch-complete">
          <h3>🎉 발사 성공!</h3>
          <p><strong>{satelliteName}</strong>이(가) 궤도에 진입했습니다.</p>
          <div className="orbit-summary">
            <p>고도: {altitude} km ({orbitInfo.orbitType})</p>
            <p>경사각: {inclination}°</p>
            <p>궤도 주기: {orbitInfo.period}분</p>
            <p>예상 수명: {orbitInfo.lifetime}</p>
          </div>
          <button onClick={() => setLaunchComplete(false)}>
            다시 발사하기
          </button>
        </div>
      )}

      {/* 설정 패널 */}
      {!isLaunching && !launchComplete && (
        <div className="simulator-content">
          {/* 위성 이름 */}
          <div className="form-group">
            <label>위성 이름</label>
            <input
              type="text"
              value={satelliteName}
              onChange={(e) => setSatelliteName(e.target.value)}
              placeholder="My-Sat-1"
            />
          </div>

          {/* 발사 기지 선택 */}
          <div className="form-group">
            <label>발사 기지</label>
            <select
              value={launchSite.id}
              onChange={(e) => setLaunchSite(LAUNCH_SITES.find(s => s.id === e.target.value))}
            >
              {LAUNCH_SITES.map(site => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
            <span className="hint">위도: {launchSite.lat}°, 경도: {launchSite.lng}°</span>
          </div>

          {/* 위성 용도 프리셋 */}
          <div className="form-group">
            <label>위성 용도</label>
            <select
              value={preset.id}
              onChange={(e) => handlePresetChange(e.target.value)}
            >
              {SATELLITE_PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <span className="hint">{preset.description}</span>
          </div>

          {/* 고도 슬라이더 */}
          <div className="form-group">
            <label>
              목표 고도: <strong>{altitude.toLocaleString()} km</strong>
              <span className="orbit-badge">{orbitInfo.orbitType}</span>
            </label>
            <input
              type="range"
              min="200"
              max="40000"
              step="100"
              value={altitude}
              onChange={(e) => {
                setAltitude(Number(e.target.value))
                setPreset({ ...preset, id: 'custom' })
              }}
            />
            <div className="range-labels">
              <span>200km</span>
              <span>LEO</span>
              <span>MEO</span>
              <span>GEO</span>
              <span>40,000km</span>
            </div>
          </div>

          {/* 경사각 슬라이더 */}
          <div className="form-group">
            <label>궤도 경사각: <strong>{inclination}°</strong></label>
            <input
              type="range"
              min="0"
              max="98"
              step="0.1"
              value={inclination}
              onChange={(e) => {
                setInclination(Number(e.target.value))
                setPreset({ ...preset, id: 'custom' })
              }}
            />
            <div className="range-labels">
              <span>0° (적도)</span>
              <span>45°</span>
              <span>90° (극궤도)</span>
            </div>
          </div>

          {/* 궤도 정보 */}
          <div className="orbit-info">
            <h4>📊 예상 궤도 정보</h4>
            <div className="info-grid">
              <div><span>궤도 주기</span><strong>{orbitInfo.period}분</strong></div>
              <div><span>하루 회전</span><strong>{orbitInfo.orbitsPerDay}회</strong></div>
              <div><span>궤도 속도</span><strong>{orbitInfo.velocity} km/s</strong></div>
              <div><span>예상 수명</span><strong>{orbitInfo.lifetime}</strong></div>
            </div>
          </div>

          {/* 안전성 검사 */}
          <div className="safety-check">
            <h4>⚠️ 안전성 검사</h4>
            {safetyCheck.dangers.length === 0 && safetyCheck.warnings.length === 0 ? (
              <p className="safe">✅ 충돌 위험 없음</p>
            ) : (
              <>
                {safetyCheck.dangers.map((d, i) => (
                  <p key={i} className="danger">🔴 {d}</p>
                ))}
                {safetyCheck.warnings.map((w, i) => (
                  <p key={i} className="warning">🟡 {w}</p>
                ))}
              </>
            )}
          </div>

          {/* 발사 버튼 */}
          <button
            className="launch-btn"
            onClick={handleLaunch}
            disabled={isLaunching}
          >
            🚀 발사!
          </button>
        </div>
      )}
    </div>
  )
}

function getOrbitType(altitudeKm) {
  if (altitudeKm < 2000) return 'LEO'
  if (altitudeKm < 35786) return 'MEO'
  if (altitudeKm >= 35786 && altitudeKm <= 36000) return 'GEO'
  return 'HEO'
}

export default LaunchSimulator
