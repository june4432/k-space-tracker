import { useState, useEffect, useMemo } from 'react'
import { calculateDistance } from '../utils/satelliteCalculations'

/**
 * 우주쓰레기 청소 게임 컴포넌트
 */
function CleanupGame({ debris = [], onClose, simulationTime }) {
  // 게임 상태
  const [gameState, setGameState] = useState('ready') // ready, playing, moving, gameover
  const [fuel, setFuel] = useState(100)
  const [score, setScore] = useState(0)
  const [collectedCount, setCollectedCount] = useState(0)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [message, setMessage] = useState('')

  // 청소 위성 상태
  const [cleanerPosition, setCleanerPosition] = useState(null)
  const [targetDebris, setTargetDebris] = useState(null)
  const [isMoving, setIsMoving] = useState(false)
  const [moveProgress, setMoveProgress] = useState(0)

  // 수거된 쓰레기 ID 목록
  const [collectedIds, setCollectedIds] = useState(new Set())

  // 게임 가능한 쓰레기 목록 (위치가 있는 것만)
  const availableDebris = useMemo(() => {
    return debris
      .filter(d => d.position && !collectedIds.has(d.id))
      .slice(0, 50) // 성능을 위해 50개로 제한
  }, [debris, collectedIds])

  // 게임 시작
  const startGame = () => {
    if (availableDebris.length === 0) {
      setMessage('⚠️ 우주쓰레기 데이터를 먼저 로드해주세요!')
      return
    }

    // 첫 번째 쓰레기 근처에서 시작
    const startDebris = availableDebris[0]
    setCleanerPosition({
      latitude: startDebris.position.latitude + 0.5,
      longitude: startDebris.position.longitude + 0.5,
      altitude: startDebris.position.altitude + 50,
    })

    setGameState('playing')
    setFuel(100)
    setScore(0)
    setCollectedCount(0)
    setTimeElapsed(0)
    setCollectedIds(new Set())
    setMessage('🎮 목표 쓰레기를 선택하세요!')
  }

  // 시간 경과 타이머
  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'moving') return

    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState])

  // 쓰레기 선택
  const selectDebris = (debrisItem) => {
    if (gameState !== 'playing' || isMoving) return
    if (collectedIds.has(debrisItem.id)) return

    setTargetDebris(debrisItem)

    // 거리 및 연료 소모 계산
    const distance = calculateDistance(cleanerPosition, debrisItem.position)
    const fuelCost = calculateFuelCost(distance)

    if (fuelCost > fuel) {
      setMessage(`⛽ 연료 부족! (필요: ${fuelCost.toFixed(1)}%, 보유: ${fuel.toFixed(1)}%)`)
      return
    }

    setMessage(`📍 ${debrisItem.name} 선택 (거리: ${distance.toFixed(1)}km, 연료: -${fuelCost.toFixed(1)}%)`)
  }

  // 이동 실행
  const executeMove = () => {
    if (!targetDebris || isMoving) return

    const distance = calculateDistance(cleanerPosition, targetDebris.position)
    const fuelCost = calculateFuelCost(distance)

    if (fuelCost > fuel) {
      setMessage('⛽ 연료가 부족합니다!')
      return
    }

    // 이동 시작
    setIsMoving(true)
    setGameState('moving')
    setFuel(prev => prev - fuelCost)
    setMessage('🚀 이동 중...')

    // 이동 애니메이션 (거리에 비례한 시간)
    const moveDuration = Math.min(3000, Math.max(1000, distance * 10))
    const startTime = Date.now()
    const startPos = { ...cleanerPosition }
    const endPos = { ...targetDebris.position }

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(1, elapsed / moveDuration)
      setMoveProgress(progress)

      // 위치 보간
      setCleanerPosition({
        latitude: startPos.latitude + (endPos.latitude - startPos.latitude) * progress,
        longitude: startPos.longitude + (endPos.longitude - startPos.longitude) * progress,
        altitude: startPos.altitude + (endPos.altitude - startPos.altitude) * progress,
      })

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        // 이동 완료 - 수거
        collectDebris()
      }
    }

    requestAnimationFrame(animate)
  }

  // 쓰레기 수거
  const collectDebris = () => {
    if (!targetDebris) return

    // 수거 완료
    setCollectedIds(prev => new Set([...prev, targetDebris.id]))
    setCollectedCount(prev => prev + 1)

    // 점수 계산 (크기, 위험도에 따라)
    const points = calculatePoints(targetDebris)
    setScore(prev => prev + points)

    setMessage(`✅ ${targetDebris.name} 수거 완료! +${points}점`)
    setTargetDebris(null)
    setIsMoving(false)
    setMoveProgress(0)
    setGameState('playing')

    // 게임 오버 체크
    if (fuel <= 0) {
      endGame()
    }
  }

  // 게임 종료
  const endGame = () => {
    setGameState('gameover')
    setMessage(`🏆 게임 종료! 최종 점수: ${score}`)
  }

  // 연료 소모 계산 (거리 기반)
  const calculateFuelCost = (distance) => {
    // 100km당 약 10% 연료 소모
    return Math.max(1, distance / 10)
  }

  // 점수 계산
  const calculatePoints = (debrisItem) => {
    // 기본 10점 + 고도에 따른 보너스
    let points = 10
    if (debrisItem.position.altitude > 800) points += 5
    if (debrisItem.position.altitude > 1000) points += 5
    return points
  }

  // 가장 가까운 쓰레기 찾기
  const findNearestDebris = () => {
    if (!cleanerPosition || availableDebris.length === 0) return null

    let nearest = null
    let minDist = Infinity

    availableDebris.forEach(d => {
      const dist = calculateDistance(cleanerPosition, d.position)
      if (dist < minDist) {
        minDist = dist
        nearest = { ...d, distance: dist }
      }
    })

    return nearest
  }

  const nearestDebris = findNearestDebris()

  // 포맷팅
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="cleanup-game">
      <button className="close-btn" onClick={onClose}>✕</button>

      <h2>🧹 우주쓰레기 청소</h2>

      {/* 게임 준비 화면 */}
      {gameState === 'ready' && (
        <div className="game-intro">
          <div className="intro-icon">🛸</div>
          <h3>미션 브리핑</h3>
          <p>청소 위성을 조종하여 우주쓰레기를 수거하세요!</p>
          <ul>
            <li>🎯 목표 쓰레기를 클릭하여 선택</li>
            <li>🚀 "이동" 버튼으로 수거하러 이동</li>
            <li>⛽ 연료를 효율적으로 사용하세요</li>
            <li>📊 더 많이 수거할수록 높은 점수!</li>
          </ul>
          <p className="debris-count">
            수거 가능한 쓰레기: <strong>{availableDebris.length}개</strong>
          </p>
          <button className="start-btn" onClick={startGame}>
            🎮 게임 시작
          </button>
        </div>
      )}

      {/* 게임 플레이 화면 */}
      {(gameState === 'playing' || gameState === 'moving') && (
        <div className="game-play">
          {/* 상태 바 */}
          <div className="game-stats">
            <div className="stat">
              <span className="stat-label">⛽ 연료</span>
              <div className="fuel-bar">
                <div
                  className="fuel-fill"
                  style={{
                    width: `${fuel}%`,
                    background: fuel > 30 ? '#4caf50' : fuel > 10 ? '#ff9800' : '#f44336'
                  }}
                />
              </div>
              <span className="stat-value">{fuel.toFixed(1)}%</span>
            </div>
            <div className="stat">
              <span className="stat-label">🗑️ 수거</span>
              <span className="stat-value">{collectedCount}개</span>
            </div>
            <div className="stat">
              <span className="stat-label">⭐ 점수</span>
              <span className="stat-value">{score}</span>
            </div>
            <div className="stat">
              <span className="stat-label">⏱️ 시간</span>
              <span className="stat-value">{formatTime(timeElapsed)}</span>
            </div>
          </div>

          {/* 메시지 */}
          <div className="game-message">{message}</div>

          {/* 이동 진행바 */}
          {isMoving && (
            <div className="move-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${moveProgress * 100}%` }} />
              </div>
              <span>이동 중... {(moveProgress * 100).toFixed(0)}%</span>
            </div>
          )}

          {/* 목표 정보 */}
          {targetDebris && !isMoving && (
            <div className="target-info">
              <h4>🎯 선택된 목표</h4>
              <p><strong>{targetDebris.name}</strong></p>
              <p>거리: {calculateDistance(cleanerPosition, targetDebris.position).toFixed(1)} km</p>
              <p>연료 소모: {calculateFuelCost(calculateDistance(cleanerPosition, targetDebris.position)).toFixed(1)}%</p>
              <button className="move-btn" onClick={executeMove}>
                🚀 이동하여 수거
              </button>
            </div>
          )}

          {/* 가까운 쓰레기 추천 */}
          {!targetDebris && nearestDebris && !isMoving && (
            <div className="nearest-hint">
              <p>💡 가장 가까운 쓰레기:</p>
              <button onClick={() => selectDebris(nearestDebris)}>
                {nearestDebris.name} ({nearestDebris.distance.toFixed(1)}km)
              </button>
            </div>
          )}

          {/* 쓰레기 목록 */}
          <div className="debris-list">
            <h4>📋 수거 대상 (가까운 순)</h4>
            <div className="debris-scroll">
              {availableDebris
                .map(d => ({
                  ...d,
                  distance: cleanerPosition ? calculateDistance(cleanerPosition, d.position) : 0
                }))
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 10)
                .map(d => (
                  <div
                    key={d.id}
                    className={`debris-item ${targetDebris?.id === d.id ? 'selected' : ''}`}
                    onClick={() => selectDebris(d)}
                  >
                    <span className="debris-name">{d.name}</span>
                    <span className="debris-dist">{d.distance.toFixed(1)}km</span>
                    <span className="debris-fuel">-{calculateFuelCost(d.distance).toFixed(1)}%</span>
                  </div>
                ))}
            </div>
          </div>

          {/* 게임 종료 버튼 */}
          <button className="end-game-btn" onClick={endGame}>
            게임 종료
          </button>
        </div>
      )}

      {/* 게임 오버 화면 */}
      {gameState === 'gameover' && (
        <div className="game-over">
          <div className="over-icon">🏆</div>
          <h3>미션 완료!</h3>
          <div className="final-stats">
            <div className="final-stat">
              <span>수거한 쓰레기</span>
              <strong>{collectedCount}개</strong>
            </div>
            <div className="final-stat">
              <span>최종 점수</span>
              <strong>{score}점</strong>
            </div>
            <div className="final-stat">
              <span>소요 시간</span>
              <strong>{formatTime(timeElapsed)}</strong>
            </div>
            <div className="final-stat">
              <span>남은 연료</span>
              <strong>{fuel.toFixed(1)}%</strong>
            </div>
          </div>
          <div className="grade">
            {score >= 100 ? '🥇 S등급 - 전설의 청소부!' :
             score >= 70 ? '🥈 A등급 - 우주 영웅!' :
             score >= 40 ? '🥉 B등급 - 훌륭해요!' :
             '🎖️ C등급 - 다음엔 더 잘할 수 있어요!'}
          </div>
          <button className="restart-btn" onClick={startGame}>
            🔄 다시 도전
          </button>
        </div>
      )}
    </div>
  )
}

export default CleanupGame
