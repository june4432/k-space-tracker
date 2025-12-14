import { useState, useEffect, useRef, useMemo } from 'react'
import { Viewer, PointPrimitiveCollection, PointPrimitive, Entity, PolylineGraphics, EllipseGraphics } from 'resium'
import { Cartesian3, Color } from 'cesium'
import { useSatelliteData } from './hooks/useSatelliteData'
import { calculatePosition, getOrbitTypeId, calculateOrbit, findNearbyObjects } from './utils/satelliteCalculations'
import FilterPanel from './components/FilterPanel'
import SatelliteInfo from './components/SatelliteInfo'
import TimeController from './components/TimeController'
import LaunchSimulator from './components/LaunchSimulator'
import CleanupGame from './components/CleanupGame'
import KesslerSimulation from './components/KesslerSimulation'
import AsteroidTracker from './components/AsteroidTracker'

function App() {
  const { satellites, loading, error, categories } = useSatelliteData()
  const [filters, setFilters] = useState({
    korea: true,              // 한국 위성만 기본 ON
    starlink: false,
    stations: false,
    active: false,
    debris_cosmos: false,
    debris_iridium: false,
    debris_fengyun: false,
  })
  const [orbitFilters, setOrbitFilters] = useState({
    LEO: true,
    MEO: true,
    GEO: true,
    HEO: true,
  })
  const [selectedSatellite, setSelectedSatellite] = useState(null)
  const [showLaunchSimulator, setShowLaunchSimulator] = useState(false)
  const [showCleanupGame, setShowCleanupGame] = useState(false)
  const [showKessler, setShowKessler] = useState(false)
  const [showAsteroid, setShowAsteroid] = useState(false)
  const [launchedSatellites, setLaunchedSatellites] = useState([])
  const viewerRef = useRef(null)

  // 시뮬레이션 시간 상태
  const [simulationTime, setSimulationTime] = useState(new Date())
  const [speed, setSpeed] = useState(1)
  const [isPlaying, setIsPlaying] = useState(true)

  // 시뮬레이션 시간 업데이트 (배속에 따라 주기 조절)
  useEffect(() => {
    if (!isPlaying) return

    // 배속이 높을수록 업데이트 주기를 늘림 (CPU 절약)
    const updateInterval = speed <= 1 ? 1000 : speed <= 60 ? 500 : 250

    const interval = setInterval(() => {
      setSimulationTime(prev => {
        const increment = speed * updateInterval
        return new Date(prev.getTime() + increment)
      })
    }, updateInterval)

    return () => clearInterval(interval)
  }, [isPlaying, speed])

  // 필터링된 위성과 위치를 동기적으로 계산 (useMemo로 타이밍 문제 해결)
  const visibleSatellites = useMemo(() => {
    if (satellites.length === 0) return []

    return satellites
      .filter(sat => filters[sat.category])
      .map(sat => {
        const pos = calculatePosition(sat, simulationTime)
        if (!pos) return null

        // 궤도 필터 적용
        const orbitType = getOrbitTypeId(pos.altitude)
        if (!orbitFilters[orbitType]) return null

        return { ...sat, position: pos }
      })
      .filter(Boolean)
  }, [satellites, filters, orbitFilters, simulationTime])

  // 선택된 위성의 궤적 계산 (90분 = 약 한 바퀴)
  const selectedOrbit = useMemo(() => {
    if (!selectedSatellite) return null

    // satellites에서 원본 데이터 찾기 (TLE 포함)
    const satData = satellites.find(s => s.id === selectedSatellite.id)
    if (!satData) return null

    const orbitPositions = calculateOrbit(satData, simulationTime, 45, 45, 1)

    // 과거/미래 궤적 분리
    const pastPositions = orbitPositions.filter(p => p.isPast)
    const futurePositions = orbitPositions.filter(p => !p.isPast)

    return { past: pastPositions, future: futurePositions }
  }, [selectedSatellite, satellites, simulationTime])

  // 선택된 위성 주변 근접 물체 탐지 (100km 이내)
  const nearbyObjects = useMemo(() => {
    if (!selectedSatellite) return []

    // 선택된 위성의 현재 위치 찾기
    const selectedWithPos = visibleSatellites.find(s => s.id === selectedSatellite.id)
    if (!selectedWithPos) return []

    // 모든 위성(필터 무관)의 위치 계산
    const allWithPositions = satellites.map(sat => {
      const pos = calculatePosition(sat, simulationTime)
      return pos ? { ...sat, position: pos } : null
    }).filter(Boolean)

    return findNearbyObjects(selectedWithPos, allWithPositions, 100)
  }, [selectedSatellite, satellites, visibleSatellites, simulationTime])

  const handleFilterChange = (category) => {
    setFilters(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const handleOrbitFilterChange = (orbitType) => {
    setOrbitFilters(prev => ({
      ...prev,
      [orbitType]: !prev[orbitType]
    }))
  }

  const handleSatelliteClick = (satellite) => {
    // 같은 위성 클릭하면 선택 해제
    if (selectedSatellite?.id === satellite.id) {
      setSelectedSatellite(null)
    } else {
      setSelectedSatellite(satellite)
    }
  }

  // 줌 인/아웃 (카메라 높이 조절)
  const handleZoom = (direction) => {
    if (!viewerRef.current?.cesiumElement) return
    const viewer = viewerRef.current.cesiumElement
    const camera = viewer.camera

    // 현재 카메라 높이 가져오기
    const cartographic = camera.positionCartographic
    const currentHeight = cartographic.height

    // 줌 비율 (20%씩)
    const factor = direction === 'in' ? 0.7 : 1.4
    const newHeight = Math.max(100000, Math.min(currentHeight * factor, 50000000))

    camera.flyTo({
      destination: Cartesian3.fromRadians(
        cartographic.longitude,
        cartographic.latitude,
        newHeight
      ),
      duration: 0.3,
    })
  }

  // 지구 전체 보기
  const handleResetView = () => {
    if (!viewerRef.current?.cesiumElement) return
    const viewer = viewerRef.current.cesiumElement
    viewer.camera.flyHome(1.5)
  }

  const handleTimeChange = (newTime) => {
    setSimulationTime(newTime)
  }

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed)
  }

  const handlePlayPause = () => {
    if (!isPlaying) {
      // 재생 시 현재 시간과 동기화 (1x 속도일 때만)
      if (speed === 1) {
        setSimulationTime(new Date())
      }
    }
    setIsPlaying(!isPlaying)
  }

  const getCategoryColor = (category) => {
    switch (category) {
      case 'korea': return Color.fromCssColorString('#ff6b6b')  // 빨간색 계열
      case 'starlink': return Color.CYAN
      case 'stations': return Color.RED
      case 'active': return Color.YELLOW
      case 'debris_cosmos': return Color.GRAY
      case 'debris_iridium': return Color.DARKGRAY
      case 'debris_fengyun': return Color.SILVER
      case 'launched': return Color.fromCssColorString('#667eea')  // 발사한 위성
      default: return Color.WHITE
    }
  }

  // 발사된 위성 처리
  const handleLaunch = (launchedSat) => {
    setLaunchedSatellites(prev => [...prev, {
      ...launchedSat,
      id: `launched-${Date.now()}`,
      category: 'launched',
    }])
  }

  // 발사된 위성 삭제
  const handleDeleteLaunched = (satId) => {
    setLaunchedSatellites(prev => prev.filter(s => s.id !== satId))
  }

  // 전체 삭제
  const handleClearAllLaunched = () => {
    setLaunchedSatellites([])
  }

  return (
    <div className="app">
      <Viewer
        ref={viewerRef}
        full
        timeline={false}
        animation={false}
        homeButton={false}
        geocoder={false}
        sceneModePicker={false}
        baseLayerPicker={false}
        navigationHelpButton={false}
        fullscreenButton={false}
        infoBox={false}
        selectionIndicator={false}
        onClick={(_, target) => {
          if (target?.id) {
            const sat = visibleSatellites.find(s => s.id === target.id.id)
            if (sat) handleSatelliteClick({ ...sat, ...sat.position })
          }
        }}
      >
        <PointPrimitiveCollection>
          {visibleSatellites.map(sat => (
            <PointPrimitive
              key={sat.id}
              id={{ id: sat.id, name: sat.name }}
              position={Cartesian3.fromDegrees(
                sat.position.longitude,
                sat.position.latitude,
                sat.position.altitude * 1000
              )}
              pixelSize={
                selectedSatellite?.id === sat.id
                  ? 12
                  : sat.category === 'stations' ? 8 : 4
              }
              color={
                selectedSatellite?.id === sat.id
                  ? Color.MAGENTA
                  : getCategoryColor(sat.category)
              }
            />
          ))}
        </PointPrimitiveCollection>

        {/* 선택된 위성의 궤적 표시 */}
        {selectedOrbit && (
          <>
            {/* 과거 궤적 (어두운 색) */}
            <Entity>
              <PolylineGraphics
                positions={Cartesian3.fromDegreesArrayHeights(
                  selectedOrbit.past.flatMap(p => [p.longitude, p.latitude, p.altitude * 1000])
                )}
                width={2}
                material={Color.MAGENTA.withAlpha(0.3)}
              />
            </Entity>
            {/* 미래 궤적 (밝은 색) */}
            <Entity>
              <PolylineGraphics
                positions={Cartesian3.fromDegreesArrayHeights(
                  selectedOrbit.future.flatMap(p => [p.longitude, p.latitude, p.altitude * 1000])
                )}
                width={3}
                material={Color.MAGENTA.withAlpha(0.8)}
              />
            </Entity>
          </>
        )}

        {/* 발사된 위성들의 궤도 및 위치 시각화 */}
        {launchedSatellites.map((sat) => {
          // 원형 궤도 생성 (간단한 시각화)
          const orbitPoints = []
          for (let i = 0; i <= 360; i += 5) {
            const rad = (i * Math.PI) / 180
            // 경사각을 고려한 궤도 계산
            const incRad = (sat.inclination * Math.PI) / 180
            const lat = Math.asin(Math.sin(incRad) * Math.sin(rad)) * (180 / Math.PI)
            const lng = (sat.launchSite.lng + i) % 360 - 180
            orbitPoints.push(lng, lat, sat.altitude * 1000)
          }

          // 위성 현재 위치 계산 (발사 이후 시간 기반)
          const timeSinceLaunch = (simulationTime - sat.launchedAt) / 1000 // 초
          const orbitalPeriod = parseFloat(sat.orbitInfo.period) * 60 // 초
          const angle = ((timeSinceLaunch / orbitalPeriod) * 360) % 360
          const angleRad = (angle * Math.PI) / 180
          const incRad = (sat.inclination * Math.PI) / 180
          const satLat = Math.asin(Math.sin(incRad) * Math.sin(angleRad)) * (180 / Math.PI)
          const satLng = (sat.launchSite.lng + angle) % 360 - 180

          return (
            <Entity key={sat.id}>
              {/* 궤도 경로 */}
              <PolylineGraphics
                positions={Cartesian3.fromDegreesArrayHeights(orbitPoints)}
                width={2}
                material={Color.fromCssColorString('#667eea').withAlpha(0.6)}
              />
            </Entity>
          )
        })}

        {/* 발사된 위성 포인트 (PointPrimitiveCollection 내부에 추가) */}
        <PointPrimitiveCollection>
          {launchedSatellites.map((sat) => {
            const timeSinceLaunch = (simulationTime - sat.launchedAt) / 1000
            const orbitalPeriod = parseFloat(sat.orbitInfo.period) * 60
            const angle = ((timeSinceLaunch / orbitalPeriod) * 360) % 360
            const angleRad = (angle * Math.PI) / 180
            const incRad = (sat.inclination * Math.PI) / 180
            const satLat = Math.asin(Math.sin(incRad) * Math.sin(angleRad)) * (180 / Math.PI)
            const satLng = (sat.launchSite.lng + angle) % 360 - 180

            return (
              <PointPrimitive
                key={sat.id}
                position={Cartesian3.fromDegrees(satLng, satLat, sat.altitude * 1000)}
                pixelSize={10}
                color={Color.fromCssColorString('#667eea')}
              />
            )
          })}
        </PointPrimitiveCollection>
      </Viewer>

      <FilterPanel
        filters={filters}
        categories={categories}
        onChange={handleFilterChange}
        orbitFilters={orbitFilters}
        onOrbitChange={handleOrbitFilterChange}
      />

      <TimeController
        simulationTime={simulationTime}
        onTimeChange={handleTimeChange}
        onSpeedChange={handleSpeedChange}
        speed={speed}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
      />

      <div className="stats">
        <span>표시 중: {visibleSatellites.length}개</span>
        <span>전체: {satellites.length}개</span>
      </div>

      {/* 줌 컨트롤 */}
      <div className="zoom-controls">
        <button onClick={() => handleZoom('in')} title="확대">+</button>
        <button onClick={() => handleZoom('out')} title="축소">−</button>
        <button onClick={handleResetView} title="지구 전체 보기">🌍</button>
      </div>

      {loading && (
        <div className="loading-overlay">
          위성 데이터 로딩 중...
        </div>
      )}

      {error && (
        <div className="loading-overlay" style={{ color: '#ff6b6b' }}>
          오류: {error}
        </div>
      )}

      {selectedSatellite && (
        <SatelliteInfo
          satellite={selectedSatellite}
          onClose={() => setSelectedSatellite(null)}
          nearbyObjects={nearbyObjects}
        />
      )}

      {/* 액션 버튼들 */}
      <div className="action-buttons">
        <button
          className="game-button"
          onClick={() => setShowCleanupGame(true)}
        >
          🧹 쓰레기 청소
        </button>
        <button
          className="launch-button"
          onClick={() => setShowLaunchSimulator(true)}
        >
          🚀 위성 발사
        </button>
        <button
          className="kessler-button"
          onClick={() => setShowKessler(true)}
        >
          💥 케슬러 신드롬
        </button>
        <button
          className="asteroid-button"
          onClick={() => setShowAsteroid(true)}
        >
          ☄️ 소행성
        </button>
      </div>

      {/* 발사된 위성 목록 */}
      {launchedSatellites.length > 0 && (
        <div className="launched-list">
          <div className="launched-header">
            <span>🛰️ 내 위성 ({launchedSatellites.length})</span>
            <button onClick={handleClearAllLaunched} title="전체 삭제">🗑️</button>
          </div>
          {launchedSatellites.map(sat => (
            <div key={sat.id} className="launched-item">
              <span>{sat.name}</span>
              <span className="launched-alt">{sat.altitude}km</span>
              <button onClick={() => handleDeleteLaunched(sat.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* 발사 시뮬레이터 */}
      {showLaunchSimulator && (
        <LaunchSimulator
          onLaunch={handleLaunch}
          onClose={() => setShowLaunchSimulator(false)}
          satellites={visibleSatellites}
        />
      )}

      {/* 우주쓰레기 청소 게임 */}
      {showCleanupGame && (
        <CleanupGame
          debris={satellites.filter(s =>
            s.category === 'debris_cosmos' ||
            s.category === 'debris_iridium' ||
            s.category === 'debris_fengyun'
          ).map(s => {
            const pos = calculatePosition(s, simulationTime)
            return pos ? { ...s, position: pos } : null
          }).filter(Boolean)}
          onClose={() => setShowCleanupGame(false)}
          simulationTime={simulationTime}
        />
      )}

      {/* 케슬러 신드롬 시뮬레이션 */}
      {showKessler && (
        <KesslerSimulation onClose={() => setShowKessler(false)} />
      )}

      {/* 소행성 추적기 */}
      {showAsteroid && (
        <AsteroidTracker onClose={() => setShowAsteroid(false)} />
      )}
    </div>
  )
}

export default App
