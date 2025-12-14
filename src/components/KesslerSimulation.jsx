import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * 케슬러 신드롬 시뮬레이션
 * - 우주쓰레기 충돌 → 파편 증가 → 연쇄 충돌 시각화
 */
function KesslerSimulation({ onClose }) {
  const [simState, setSimState] = useState('intro') // intro, running, paused, ended
  const [debris, setDebris] = useState([])
  const [collisionCount, setCollisionCount] = useState(0)
  const [elapsedYears, setElapsedYears] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [history, setHistory] = useState([]) // 시간별 debris 수 기록
  const [recentCollisions, setRecentCollisions] = useState([])

  const animationRef = useRef(null)
  const lastUpdateRef = useRef(Date.now())

  // 초기 쓰레기 생성
  const initializeDebris = useCallback(() => {
    const initialDebris = []

    // 다양한 궤도에 초기 쓰레기 배치
    const orbits = [
      { alt: 400, count: 15, name: 'LEO-하단' },
      { alt: 550, count: 20, name: 'Starlink 궤도' },
      { alt: 780, count: 25, name: 'Iridium 궤도' },
      { alt: 850, count: 15, name: 'LEO-상단' },
    ]

    let id = 0
    orbits.forEach(orbit => {
      for (let i = 0; i < orbit.count; i++) {
        const angle = (i / orbit.count) * 360 + Math.random() * 20
        initialDebris.push({
          id: id++,
          lat: (Math.random() - 0.5) * 140, // -70 ~ 70
          lng: angle % 360 - 180,
          alt: orbit.alt + (Math.random() - 0.5) * 50,
          size: Math.random() * 2 + 0.5, // 0.5 ~ 2.5m
          velocity: 7.5 + Math.random() * 0.5, // km/s
          orbitName: orbit.name,
          isNew: false,
          age: 0,
        })
      }
    })

    return initialDebris
  }, [])

  // 시뮬레이션 시작
  const startSimulation = () => {
    const initial = initializeDebris()
    setDebris(initial)
    setCollisionCount(0)
    setElapsedYears(0)
    setHistory([{ year: 0, count: initial.length }])
    setRecentCollisions([])
    setSimState('running')
  }

  // 충돌 감지 및 파편 생성
  const checkCollisions = useCallback((currentDebris) => {
    const collisions = []
    const collisionRadius = 5 // km (충돌 판정 거리)

    for (let i = 0; i < currentDebris.length; i++) {
      for (let j = i + 1; j < currentDebris.length; j++) {
        const d1 = currentDebris[i]
        const d2 = currentDebris[j]

        // 고도 차이 체크 (빠른 필터링)
        if (Math.abs(d1.alt - d2.alt) > collisionRadius) continue

        // 거리 계산 (간략화된 2D)
        const latDiff = d1.lat - d2.lat
        const lngDiff = d1.lng - d2.lng
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111 // 대략적 km 변환

        if (distance < collisionRadius) {
          collisions.push({ d1, d2 })
        }
      }
    }

    return collisions
  }, [])

  // 파편 생성
  const createFragments = useCallback((d1, d2, nextId) => {
    const fragments = []
    // 충돌 시 3-8개의 파편 생성
    const fragmentCount = Math.floor(Math.random() * 6) + 3

    const centerLat = (d1.lat + d2.lat) / 2
    const centerLng = (d1.lng + d2.lng) / 2
    const centerAlt = (d1.alt + d2.alt) / 2

    for (let i = 0; i < fragmentCount; i++) {
      fragments.push({
        id: nextId + i,
        lat: centerLat + (Math.random() - 0.5) * 10,
        lng: centerLng + (Math.random() - 0.5) * 10,
        alt: centerAlt + (Math.random() - 0.5) * 30,
        size: Math.random() * 0.5 + 0.1, // 작은 파편
        velocity: 7 + Math.random() * 1.5,
        orbitName: '충돌 파편',
        isNew: true,
        age: 0,
      })
    }

    return fragments
  }, [])

  // 메인 시뮬레이션 루프
  useEffect(() => {
    if (simState !== 'running') return

    const simulate = () => {
      const now = Date.now()
      const deltaTime = (now - lastUpdateRef.current) / 1000 * speed
      lastUpdateRef.current = now

      setDebris(currentDebris => {
        // 위치 업데이트 (간략화된 궤도 운동)
        let updatedDebris = currentDebris.map(d => ({
          ...d,
          lng: ((d.lng + d.velocity * deltaTime * 0.1) + 180) % 360 - 180,
          lat: d.lat + Math.sin(d.lng * 0.1) * deltaTime * 0.5,
          isNew: d.isNew && d.age < 2,
          age: d.age + deltaTime,
        }))

        // 충돌 체크 (일정 확률로)
        if (Math.random() < 0.02 * speed) {
          const collisions = checkCollisions(updatedDebris)

          if (collisions.length > 0) {
            const collision = collisions[0] // 첫 번째 충돌만 처리

            // 충돌한 물체 제거
            updatedDebris = updatedDebris.filter(
              d => d.id !== collision.d1.id && d.id !== collision.d2.id
            )

            // 파편 생성
            const maxId = Math.max(...updatedDebris.map(d => d.id), 0)
            const fragments = createFragments(collision.d1, collision.d2, maxId + 1)
            updatedDebris = [...updatedDebris, ...fragments]

            // 충돌 기록
            setCollisionCount(prev => prev + 1)
            setRecentCollisions(prev => [
              {
                time: elapsedYears,
                debris1: collision.d1.orbitName,
                debris2: collision.d2.orbitName,
                fragments: fragments.length,
              },
              ...prev.slice(0, 4)
            ])
          }
        }

        return updatedDebris
      })

      // 시간 업데이트
      setElapsedYears(prev => {
        const newYears = prev + deltaTime * 0.1

        // 히스토리 기록 (1년마다)
        if (Math.floor(newYears) > Math.floor(prev)) {
          setHistory(h => [...h, { year: Math.floor(newYears), count: debris.length }])
        }

        return newYears
      })

      // 종료 조건 체크
      if (debris.length > 500) {
        setSimState('ended')
        return
      }

      animationRef.current = requestAnimationFrame(simulate)
    }

    animationRef.current = requestAnimationFrame(simulate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [simState, speed, checkCollisions, createFragments, debris.length, elapsedYears])

  // 간단한 막대 그래프
  const renderGraph = () => {
    const maxCount = Math.max(...history.map(h => h.count), 100)

    return (
      <div className="debris-graph">
        <div className="graph-bars">
          {history.slice(-20).map((h, i) => (
            <div
              key={i}
              className="graph-bar"
              style={{
                height: `${(h.count / maxCount) * 100}%`,
                background: h.count > 200 ? '#f44336' : h.count > 100 ? '#ff9800' : '#4caf50',
              }}
              title={`${h.year}년: ${h.count}개`}
            />
          ))}
        </div>
        <div className="graph-label">쓰레기 증가 추이</div>
      </div>
    )
  }

  return (
    <div className="kessler-simulation">
      <button className="close-btn" onClick={onClose}>✕</button>

      <h2>💥 케슬러 신드롬 시뮬레이션</h2>

      {/* 인트로 화면 */}
      {simState === 'intro' && (
        <div className="kessler-intro">
          <div className="intro-icon">🛰️💥🛰️</div>
          <h3>케슬러 신드롬이란?</h3>
          <p>
            1978년 NASA 과학자 도널드 케슬러가 예측한 시나리오입니다.
          </p>
          <div className="kessler-explanation">
            <div className="step">
              <span className="step-num">1</span>
              <span>두 우주쓰레기가 충돌</span>
            </div>
            <div className="step-arrow">↓</div>
            <div className="step">
              <span className="step-num">2</span>
              <span>수십~수백 개의 파편 생성</span>
            </div>
            <div className="step-arrow">↓</div>
            <div className="step">
              <span className="step-num">3</span>
              <span>파편들이 다른 물체와 충돌</span>
            </div>
            <div className="step-arrow">↓</div>
            <div className="step danger">
              <span className="step-num">4</span>
              <span>연쇄 반응으로 기하급수적 증가</span>
            </div>
          </div>
          <p className="warning-text">
            ⚠️ 최악의 경우, 특정 궤도가 사용 불가능해질 수 있습니다.
          </p>
          <button className="start-sim-btn" onClick={startSimulation}>
            🚀 시뮬레이션 시작
          </button>
        </div>
      )}

      {/* 시뮬레이션 실행 중 */}
      {(simState === 'running' || simState === 'paused') && (
        <div className="kessler-running">
          {/* 상태 표시 */}
          <div className="sim-stats">
            <div className="stat-item">
              <span className="stat-label">🗑️ 쓰레기 수</span>
              <span className="stat-value" style={{
                color: debris.length > 200 ? '#f44336' : debris.length > 100 ? '#ff9800' : '#4caf50'
              }}>
                {debris.length}개
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">💥 충돌 횟수</span>
              <span className="stat-value">{collisionCount}회</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">📅 경과 시간</span>
              <span className="stat-value">{elapsedYears.toFixed(1)}년</span>
            </div>
          </div>

          {/* 그래프 */}
          {renderGraph()}

          {/* 궤도 시각화 (2D 간략화) */}
          <div className="orbit-visualization">
            <div className="earth">🌍</div>
            {debris.slice(0, 100).map(d => (
              <div
                key={d.id}
                className={`debris-dot ${d.isNew ? 'new' : ''}`}
                style={{
                  left: `${50 + (d.lng / 180) * 40}%`,
                  top: `${50 - (d.lat / 90) * 40}%`,
                  width: `${Math.max(3, d.size * 2)}px`,
                  height: `${Math.max(3, d.size * 2)}px`,
                }}
              />
            ))}
            {debris.length > 100 && (
              <div className="overflow-indicator">
                +{debris.length - 100} more
              </div>
            )}
          </div>

          {/* 최근 충돌 로그 */}
          {recentCollisions.length > 0 && (
            <div className="collision-log">
              <h4>💥 최근 충돌</h4>
              {recentCollisions.map((c, i) => (
                <div key={i} className="collision-entry">
                  <span className="collision-time">{c.time.toFixed(1)}년</span>
                  <span className="collision-info">
                    {c.debris1} ↔ {c.debris2} → {c.fragments}개 파편
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 컨트롤 */}
          <div className="sim-controls">
            <button
              className={`control-btn ${simState === 'paused' ? 'paused' : ''}`}
              onClick={() => setSimState(simState === 'running' ? 'paused' : 'running')}
            >
              {simState === 'running' ? '⏸️ 일시정지' : '▶️ 재개'}
            </button>

            <div className="speed-controls">
              <span>속도:</span>
              {[1, 2, 5, 10].map(s => (
                <button
                  key={s}
                  className={`speed-btn ${speed === s ? 'active' : ''}`}
                  onClick={() => setSpeed(s)}
                >
                  {s}x
                </button>
              ))}
            </div>

            <button className="reset-btn" onClick={startSimulation}>
              🔄 리셋
            </button>
          </div>

          {/* 위험 경고 */}
          {debris.length > 150 && (
            <div className="danger-warning">
              ⚠️ 케슬러 신드롬 임계점 접근 중!
            </div>
          )}
        </div>
      )}

      {/* 시뮬레이션 종료 */}
      {simState === 'ended' && (
        <div className="kessler-ended">
          <div className="end-icon">🚨</div>
          <h3>케슬러 신드롬 발생!</h3>
          <p>우주쓰레기가 통제 불능 상태에 도달했습니다.</p>

          <div className="final-stats">
            <div className="final-stat">
              <span>최종 쓰레기 수</span>
              <strong>{debris.length}개</strong>
            </div>
            <div className="final-stat">
              <span>총 충돌 횟수</span>
              <strong>{collisionCount}회</strong>
            </div>
            <div className="final-stat">
              <span>소요 시간</span>
              <strong>{elapsedYears.toFixed(1)}년</strong>
            </div>
          </div>

          <div className="lesson">
            <h4>💡 교훈</h4>
            <p>
              실제로 2009년 Cosmos-Iridium 충돌로 2,000개 이상의 파편이 생성되었습니다.
              우주쓰레기 문제는 전 인류가 함께 해결해야 할 과제입니다.
            </p>
          </div>

          <button className="restart-btn" onClick={startSimulation}>
            🔄 다시 시뮬레이션
          </button>
        </div>
      )}
    </div>
  )
}

export default KesslerSimulation
