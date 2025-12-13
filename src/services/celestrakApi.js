// CelesTrak API 서비스 (TLE 형식으로 요청)
const BASE_URL = '/api/celestrak/NORAD/elements/gp.php'

// 위성 카테고리별 엔드포인트
const CATEGORIES = {
  korea: 'korea',                 // 한국 위성 (특별 처리)
  starlink: 'starlink',           // SpaceX Starlink 위성
  stations: 'stations',           // ISS 등 우주정거장
  active: 'active',               // 활성 위성
  debris_cosmos: 'cosmos-2251-debris',   // 2009 충돌 잔해 (Cosmos)
  debris_iridium: 'iridium-33-debris',   // 2009 충돌 잔해 (Iridium)
  debris_fengyun: 'fengyun-1c-debris',   // 2007 중국 ASAT 잔해
}

// 한국 위성 이름 패턴
const KOREA_SATELLITE_PATTERNS = [
  'ARIRANG', 'KOMPSAT', 'KOREASAT', 'COMS', 'GEO-KOMPSAT',
  'MUGUNGWHA', 'NEXTSAT', 'KITSAT', 'STSAT'
]

/**
 * TLE 텍스트를 파싱합니다
 */
function parseTLE(tleText, category) {
  const lines = tleText.trim().split('\n')
  const satellites = []

  for (let i = 0; i < lines.length; i += 3) {
    if (i + 2 >= lines.length) break

    const name = lines[i].trim()
    const line1 = lines[i + 1].trim()
    const line2 = lines[i + 2].trim()

    // TLE 형식 검증
    if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) {
      continue
    }

    // NORAD ID 추출 (Line 1의 3-7번째 문자)
    const noradId = parseInt(line1.substring(2, 7).trim(), 10)

    satellites.push({
      id: noradId,
      name,
      category,
      tle: { line1, line2 },
      raw: { TLE_LINE1: line1, TLE_LINE2: line2 },
    })
  }

  return satellites
}

/**
 * CelesTrak에서 위성 데이터를 가져옵니다 (TLE 형식)
 * @param {string} category - 위성 카테고리 (starlink, stations, active)
 * @returns {Promise<Array>} 위성 데이터 배열
 */
export async function fetchSatellitesByCategory(category) {
  // 한국 위성은 active에서 필터링
  if (category === 'korea') {
    const url = `${BASE_URL}?GROUP=active&FORMAT=tle`
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const tleText = await response.text()
      const allSatellites = parseTLE(tleText, category)
      // 한국 위성만 필터링
      return allSatellites.filter(sat =>
        KOREA_SATELLITE_PATTERNS.some(pattern =>
          sat.name.toUpperCase().includes(pattern)
        )
      )
    } catch (error) {
      console.error(`한국 위성 데이터 로드 실패:`, error)
      throw error
    }
  }

  const group = CATEGORIES[category] || category
  const url = `${BASE_URL}?GROUP=${group}&FORMAT=tle`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const tleText = await response.text()
    return parseTLE(tleText, category)
  } catch (error) {
    console.error(`위성 데이터 로드 실패 (${category}):`, error)
    throw error
  }
}

/**
 * 여러 카테고리의 위성 데이터를 한번에 가져옵니다
 * @param {string[]} categories - 카테고리 배열
 * @returns {Promise<Array>} 모든 카테고리의 위성 데이터
 */
export async function fetchAllSatellites(categories = Object.keys(CATEGORIES)) {
  const results = await Promise.allSettled(
    categories.map(cat => fetchSatellitesByCategory(cat))
  )

  const satellites = []
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      satellites.push(...result.value)
    } else {
      console.warn(`${categories[index]} 로드 실패:`, result.reason)
    }
  })

  return satellites
}

export { CATEGORIES }
