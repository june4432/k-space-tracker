import * as satellite from 'satellite.js'

/**
 * TLE 데이터로부터 현재 위성 위치를 계산합니다
 * @param {Object} sat - 위성 데이터 (tle.line1, tle.line2 포함)
 * @param {Date} date - 계산할 시간 (기본값: 현재)
 * @returns {Object|null} { latitude, longitude, altitude, velocity }
 */
export function calculatePosition(sat, date = new Date()) {
  try {
    const { line1, line2 } = sat.tle

    if (!line1 || !line2) {
      return null
    }

    // TLE에서 satrec 객체 생성
    const satrec = satellite.twoline2satrec(line1, line2)

    // 주어진 시간의 위치/속도 계산 (SGP4 알고리즘)
    const positionAndVelocity = satellite.propagate(satrec, date)

    if (!positionAndVelocity.position || typeof positionAndVelocity.position === 'boolean') {
      return null
    }

    // ECI 좌표를 지리 좌표로 변환
    const gmst = satellite.gstime(date)
    const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, gmst)

    // 라디안을 도로 변환
    const longitude = satellite.degreesLong(positionGd.longitude)
    const latitude = satellite.degreesLat(positionGd.latitude)
    const altitude = positionGd.height // km 단위

    // 유효성 검사
    if (isNaN(latitude) || isNaN(longitude) || isNaN(altitude)) {
      return null
    }

    // 속도 계산 (km/s)
    const vel = positionAndVelocity.velocity
    const speed = vel && typeof vel !== 'boolean'
      ? Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2)
      : null

    return {
      latitude,
      longitude,
      altitude,
      velocity: speed ? speed.toFixed(2) : null,
    }
  } catch (error) {
    // TLE 데이터 오류 시 조용히 실패
    return null
  }
}

/**
 * 여러 위성의 위치를 한번에 계산합니다
 * @param {Array} satellites - 위성 배열
 * @param {Date} date - 계산할 시간
 * @returns {Object} { [satelliteId]: position }
 */
export function calculatePositions(satellites, date = new Date()) {
  const positions = {}

  satellites.forEach(sat => {
    const pos = calculatePosition(sat, date)
    if (pos) {
      positions[sat.id] = pos
    }
  })

  return positions
}

/**
 * 고도를 사람이 읽기 쉬운 형식으로 변환
 * @param {number} altitudeKm - 고도 (km)
 * @returns {string} 포맷된 고도 문자열
 */
export function formatAltitude(altitudeKm) {
  if (altitudeKm < 1) {
    return `${(altitudeKm * 1000).toFixed(0)} m`
  }
  return `${altitudeKm.toFixed(1)} km`
}

/**
 * 궤도 유형을 판별합니다
 * @param {number} altitudeKm - 고도 (km)
 * @returns {string} 궤도 유형 (LEO, MEO, GEO, HEO)
 */
export function getOrbitType(altitudeKm) {
  if (altitudeKm < 2000) return 'LEO (저궤도)'
  if (altitudeKm < 35786) return 'MEO (중궤도)'
  if (altitudeKm >= 35786 && altitudeKm <= 35800) return 'GEO (정지궤도)'
  return 'HEO (고궤도)'
}

/**
 * 궤도 유형 ID를 반환합니다 (필터링용)
 * @param {number} altitudeKm - 고도 (km)
 * @returns {string} 궤도 유형 ID (LEO, MEO, GEO, HEO)
 */
export function getOrbitTypeId(altitudeKm) {
  if (altitudeKm < 2000) return 'LEO'
  if (altitudeKm < 35786) return 'MEO'
  if (altitudeKm >= 35786 && altitudeKm <= 35800) return 'GEO'
  return 'HEO'
}

/**
 * 두 위치 간의 3D 거리를 계산합니다 (km)
 * @param {Object} pos1 - 첫 번째 위치 { latitude, longitude, altitude }
 * @param {Object} pos2 - 두 번째 위치 { latitude, longitude, altitude }
 * @returns {number} 거리 (km)
 */
export function calculateDistance(pos1, pos2) {
  const R = 6371 // 지구 반지름 (km)

  // 위도/경도를 라디안으로 변환
  const lat1 = pos1.latitude * Math.PI / 180
  const lat2 = pos2.latitude * Math.PI / 180
  const lon1 = pos1.longitude * Math.PI / 180
  const lon2 = pos2.longitude * Math.PI / 180

  // 각 위성의 지구 중심으로부터의 거리
  const r1 = R + pos1.altitude
  const r2 = R + pos2.altitude

  // 3D 직교 좌표로 변환
  const x1 = r1 * Math.cos(lat1) * Math.cos(lon1)
  const y1 = r1 * Math.cos(lat1) * Math.sin(lon1)
  const z1 = r1 * Math.sin(lat1)

  const x2 = r2 * Math.cos(lat2) * Math.cos(lon2)
  const y2 = r2 * Math.cos(lat2) * Math.sin(lon2)
  const z2 = r2 * Math.sin(lat2)

  // 유클리드 거리
  return Math.sqrt((x2-x1)**2 + (y2-y1)**2 + (z2-z1)**2)
}

/**
 * 선택된 위성 주변의 근접 물체를 찾습니다
 * @param {Object} targetSat - 대상 위성
 * @param {Array} allSatellites - 모든 위성 배열 (position 포함)
 * @param {number} maxDistance - 최대 거리 (km)
 * @returns {Array} 근접 물체 배열 [{ satellite, distance, risk }]
 */
export function findNearbyObjects(targetSat, allSatellites, maxDistance = 100) {
  if (!targetSat?.position) return []

  const nearby = []

  allSatellites.forEach(sat => {
    if (sat.id === targetSat.id) return // 자기 자신 제외
    if (!sat.position) return

    const distance = calculateDistance(targetSat.position, sat.position)

    if (distance <= maxDistance) {
      // 위험도 계산
      let risk = 'safe'
      if (distance < 1) risk = 'critical'
      else if (distance < 10) risk = 'danger'
      else if (distance < 50) risk = 'warning'

      nearby.push({
        satellite: sat,
        distance,
        risk,
      })
    }
  })

  // 거리순 정렬
  return nearby.sort((a, b) => a.distance - b.distance)
}

/**
 * 미래 시간 동안 최근접 거리를 예측합니다
 * @param {Object} sat1 - 첫 번째 위성 (TLE 포함)
 * @param {Object} sat2 - 두 번째 위성 (TLE 포함)
 * @param {Date} startTime - 시작 시간
 * @param {number} minutesAhead - 예측 시간 (분)
 * @param {number} stepMinutes - 계산 간격 (분)
 * @returns {Object} { minDistance, time, pos1, pos2 }
 */
export function predictClosestApproach(sat1, sat2, startTime, minutesAhead = 60, stepMinutes = 1) {
  let minDistance = Infinity
  let closestTime = startTime
  let closestPos1 = null
  let closestPos2 = null

  const endTime = new Date(startTime.getTime() + minutesAhead * 60 * 1000)
  const step = stepMinutes * 60 * 1000

  for (let time = startTime.getTime(); time <= endTime.getTime(); time += step) {
    const date = new Date(time)
    const pos1 = calculatePosition(sat1, date)
    const pos2 = calculatePosition(sat2, date)

    if (pos1 && pos2) {
      const distance = calculateDistance(pos1, pos2)
      if (distance < minDistance) {
        minDistance = distance
        closestTime = date
        closestPos1 = pos1
        closestPos2 = pos2
      }
    }
  }

  return {
    minDistance,
    time: closestTime,
    pos1: closestPos1,
    pos2: closestPos2,
  }
}

export function calculateOrbit(sat, centerTime, minutesBefore = 45, minutesAfter = 45, stepMinutes = 1) {
  const positions = []
  const startTime = new Date(centerTime.getTime() - minutesBefore * 60 * 1000)
  const endTime = new Date(centerTime.getTime() + minutesAfter * 60 * 1000)
  const step = stepMinutes * 60 * 1000

  for (let time = startTime.getTime(); time <= endTime.getTime(); time += step) {
    const date = new Date(time)
    const pos = calculatePosition(sat, date)
    if (pos) {
      positions.push({
        ...pos,
        time: date,
        isPast: time < centerTime.getTime(),
      })
    }
  }

  return positions
}
