import { useState, useEffect } from 'react'

/**
 * 소행성 추적기 - NASA NEO API 활용
 */
function AsteroidTracker({ onClose }) {
  const [asteroids, setAsteroids] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedAsteroid, setSelectedAsteroid] = useState(null)
  const [dateRange, setDateRange] = useState('today') // today, week

  // NASA API 키 (DEMO_KEY는 시간당 30회 제한)
  const API_KEY = 'DEMO_KEY'

  // 날짜 포맷팅
  const formatDate = (date) => {
    return date.toISOString().split('T')[0]
  }

  // 소행성 데이터 가져오기
  useEffect(() => {
    const fetchAsteroids = async () => {
      setLoading(true)
      setError(null)

      try {
        const today = new Date()
        let startDate, endDate

        if (dateRange === 'today') {
          startDate = formatDate(today)
          endDate = formatDate(today)
        } else {
          startDate = formatDate(today)
          const weekLater = new Date(today)
          weekLater.setDate(weekLater.getDate() + 7)
          endDate = formatDate(weekLater)
        }

        const response = await fetch(
          `https://api.nasa.gov/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${API_KEY}`
        )

        if (!response.ok) {
          throw new Error('NASA API 요청 실패')
        }

        const data = await response.json()

        // 모든 날짜의 소행성 합치기
        const allAsteroids = []
        Object.keys(data.near_earth_objects).forEach(date => {
          data.near_earth_objects[date].forEach(neo => {
            allAsteroids.push({
              id: neo.id,
              name: neo.name.replace(/[()]/g, ''),
              date: date,
              diameterMin: neo.estimated_diameter.meters.estimated_diameter_min,
              diameterMax: neo.estimated_diameter.meters.estimated_diameter_max,
              isDangerous: neo.is_potentially_hazardous_asteroid,
              closeApproach: neo.close_approach_data[0] ? {
                date: neo.close_approach_data[0].close_approach_date_full,
                distance: parseFloat(neo.close_approach_data[0].miss_distance.kilometers),
                distanceLunar: parseFloat(neo.close_approach_data[0].miss_distance.lunar),
                velocity: parseFloat(neo.close_approach_data[0].relative_velocity.kilometers_per_hour),
              } : null,
              nasaUrl: neo.nasa_jpl_url,
            })
          })
        })

        // 거리순 정렬
        allAsteroids.sort((a, b) =>
          (a.closeApproach?.distance || Infinity) - (b.closeApproach?.distance || Infinity)
        )

        setAsteroids(allAsteroids)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchAsteroids()
  }, [dateRange])

  // 위험도 계산
  const getDangerLevel = (asteroid) => {
    if (!asteroid.closeApproach) return 'unknown'
    const distanceLunar = asteroid.closeApproach.distanceLunar

    if (asteroid.isDangerous && distanceLunar < 5) return 'critical'
    if (asteroid.isDangerous) return 'danger'
    if (distanceLunar < 10) return 'warning'
    return 'safe'
  }

  // 크기 비교 텍스트
  const getSizeComparison = (diameterMax) => {
    if (diameterMax < 10) return '🚗 자동차 크기'
    if (diameterMax < 50) return '🏠 집 크기'
    if (diameterMax < 100) return '✈️ 비행기 크기'
    if (diameterMax < 300) return '🏟️ 축구장 크기'
    if (diameterMax < 1000) return '🏔️ 산 크기'
    return '🌋 초대형'
  }

  // 거리 포맷팅
  const formatDistance = (km) => {
    if (km < 1000000) {
      return `${(km / 1000).toFixed(0)}천 km`
    }
    return `${(km / 1000000).toFixed(1)}백만 km`
  }

  // 통계 계산
  const stats = {
    total: asteroids.length,
    dangerous: asteroids.filter(a => a.isDangerous).length,
    closest: asteroids[0]?.closeApproach?.distance,
    largest: Math.max(...asteroids.map(a => a.diameterMax || 0)),
  }

  return (
    <div className="asteroid-tracker">
      <button className="close-btn" onClick={onClose}>✕</button>

      <h2>☄️ 지구 근접 소행성</h2>

      {/* 날짜 선택 */}
      <div className="date-selector">
        <button
          className={dateRange === 'today' ? 'active' : ''}
          onClick={() => setDateRange('today')}
        >
          오늘
        </button>
        <button
          className={dateRange === 'week' ? 'active' : ''}
          onClick={() => setDateRange('week')}
        >
          이번 주
        </button>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="asteroid-loading">
          <div className="loading-spinner">🌍</div>
          <p>NASA에서 소행성 데이터를 가져오는 중...</p>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="asteroid-error">
          <p>⚠️ {error}</p>
          <button onClick={() => setDateRange(dateRange)}>다시 시도</button>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      {!loading && !error && (
        <>
          {/* 통계 */}
          <div className="asteroid-stats">
            <div className="stat-box">
              <span className="stat-num">{stats.total}</span>
              <span className="stat-label">총 소행성</span>
            </div>
            <div className="stat-box danger">
              <span className="stat-num">{stats.dangerous}</span>
              <span className="stat-label">위험 소행성</span>
            </div>
            <div className="stat-box">
              <span className="stat-num">{stats.closest ? formatDistance(stats.closest) : '-'}</span>
              <span className="stat-label">최근접 거리</span>
            </div>
            <div className="stat-box">
              <span className="stat-num">{stats.largest.toFixed(0)}m</span>
              <span className="stat-label">최대 크기</span>
            </div>
          </div>

          {/* 지구-달 거리 시각화 */}
          <div className="distance-visualization">
            <div className="distance-scale">
              <div className="earth-icon">🌍</div>
              <div className="scale-line">
                {asteroids.slice(0, 8).map((a, i) => {
                  if (!a.closeApproach) return null
                  const lunar = a.closeApproach.distanceLunar
                  // 최대 20 lunar distance까지 표시
                  const position = Math.min(lunar / 20 * 100, 95)
                  return (
                    <div
                      key={a.id}
                      className={`asteroid-marker ${getDangerLevel(a)}`}
                      style={{ left: `${position}%` }}
                      onClick={() => setSelectedAsteroid(a)}
                      title={a.name}
                    >
                      ☄️
                    </div>
                  )
                })}
                <div className="moon-marker">🌙</div>
              </div>
              <div className="scale-labels">
                <span>지구</span>
                <span>달 (38만km)</span>
              </div>
            </div>
          </div>

          {/* 소행성 목록 */}
          <div className="asteroid-list">
            <h4>📋 소행성 목록 (거리순)</h4>
            <div className="asteroid-scroll">
              {asteroids.map(asteroid => (
                <div
                  key={asteroid.id}
                  className={`asteroid-item ${getDangerLevel(asteroid)} ${selectedAsteroid?.id === asteroid.id ? 'selected' : ''}`}
                  onClick={() => setSelectedAsteroid(asteroid)}
                >
                  <div className="asteroid-main">
                    <span className="asteroid-name">
                      {asteroid.isDangerous && '⚠️ '}
                      {asteroid.name}
                    </span>
                    <span className="asteroid-size">
                      {asteroid.diameterMax.toFixed(0)}m
                    </span>
                  </div>
                  <div className="asteroid-sub">
                    <span className="asteroid-date">{asteroid.date}</span>
                    <span className="asteroid-distance">
                      {asteroid.closeApproach ?
                        `${asteroid.closeApproach.distanceLunar.toFixed(1)} LD` : '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 선택된 소행성 상세 */}
          {selectedAsteroid && (
            <div className={`asteroid-detail ${getDangerLevel(selectedAsteroid)}`}>
              <h4>
                {selectedAsteroid.isDangerous && '⚠️ '}
                {selectedAsteroid.name}
              </h4>

              <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">크기</span>
                  <span className="value">
                    {selectedAsteroid.diameterMin.toFixed(0)} ~ {selectedAsteroid.diameterMax.toFixed(0)}m
                  </span>
                  <span className="compare">{getSizeComparison(selectedAsteroid.diameterMax)}</span>
                </div>

                {selectedAsteroid.closeApproach && (
                  <>
                    <div className="detail-item">
                      <span className="label">최근접 시간</span>
                      <span className="value">{selectedAsteroid.closeApproach.date}</span>
                    </div>

                    <div className="detail-item">
                      <span className="label">최근접 거리</span>
                      <span className="value">
                        {formatDistance(selectedAsteroid.closeApproach.distance)}
                      </span>
                      <span className="compare">
                        달까지 거리의 {selectedAsteroid.closeApproach.distanceLunar.toFixed(1)}배
                      </span>
                    </div>

                    <div className="detail-item">
                      <span className="label">상대 속도</span>
                      <span className="value">
                        {(selectedAsteroid.closeApproach.velocity / 3600).toFixed(1)} km/s
                      </span>
                      <span className="compare">
                        총알의 {(selectedAsteroid.closeApproach.velocity / 3600 / 1.7).toFixed(0)}배 속도
                      </span>
                    </div>
                  </>
                )}

                <div className="detail-item">
                  <span className="label">위험도</span>
                  <span className={`value ${selectedAsteroid.isDangerous ? 'danger' : 'safe'}`}>
                    {selectedAsteroid.isDangerous ? '⚠️ 잠재적 위험' : '✅ 안전'}
                  </span>
                </div>
              </div>

              <a
                href={selectedAsteroid.nasaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="nasa-link"
              >
                NASA에서 자세히 보기 →
              </a>
            </div>
          )}

          {/* 범례 */}
          <div className="asteroid-legend">
            <span><i className="dot safe"></i> 안전</span>
            <span><i className="dot warning"></i> 관심</span>
            <span><i className="dot danger"></i> 위험</span>
            <span><i className="dot critical"></i> 매우 위험</span>
            <span className="note">* LD = Lunar Distance (달까지 거리)</span>
          </div>
        </>
      )}
    </div>
  )
}

export default AsteroidTracker
