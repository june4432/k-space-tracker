import { useState, useEffect } from 'react'
import { fetchAllSatellites, CATEGORIES } from '../services/celestrakApi'

/**
 * 위성 데이터를 관리하는 커스텀 훅
 * @returns {Object} satellites, loading, error, categories, refetch
 */
export function useSatelliteData() {
  const [satellites, setSatellites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const categories = Object.keys(CATEGORIES).map(key => ({
    id: key,
    name: getCategoryName(key),
  }))

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchAllSatellites()
      setSatellites(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return {
    satellites,
    loading,
    error,
    categories,
    refetch: fetchData,
  }
}

function getCategoryName(category) {
  const names = {
    korea: '🇰🇷 한국 위성',
    starlink: 'Starlink',
    stations: '우주정거장 (ISS/CSS)',
    active: '활성 위성',
    debris_cosmos: '우주쓰레기 (Cosmos 2251)',
    debris_iridium: '우주쓰레기 (Iridium 33)',
    debris_fengyun: '우주쓰레기 (Fengyun 1C)',
  }
  return names[category] || category
}
