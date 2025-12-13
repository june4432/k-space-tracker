import { formatAltitude, getOrbitType } from '../utils/satelliteCalculations'

/**
 * 선택된 위성의 상세 정보를 표시하는 패널
 */
function SatelliteInfo({ satellite, onClose, nearbyObjects = [] }) {
  if (!satellite) return null

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'critical': return '#ff1744'
      case 'danger': return '#ff5722'
      case 'warning': return '#ffc107'
      default: return '#4caf50'
    }
  }

  const getRiskLabel = (risk) => {
    switch (risk) {
      case 'critical': return '🔴 위험'
      case 'danger': return '🟠 주의'
      case 'warning': return '🟡 관심'
      default: return '🟢 안전'
    }
  }

  return (
    <div className="satellite-info">
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'none',
          border: 'none',
          color: '#fff',
          fontSize: '18px',
          cursor: 'pointer',
        }}
      >
        ✕
      </button>

      <h3>{satellite.name}</h3>

      <p>
        <span className="label">NORAD ID: </span>
        <span className="value">{satellite.id}</span>
      </p>

      <p>
        <span className="label">카테고리: </span>
        <span className="value">{getCategoryName(satellite.category)}</span>
      </p>

      {satellite.latitude !== undefined && (
        <>
          <p>
            <span className="label">위도: </span>
            <span className="value">{satellite.latitude.toFixed(4)}°</span>
          </p>
          <p>
            <span className="label">경도: </span>
            <span className="value">{satellite.longitude.toFixed(4)}°</span>
          </p>
        </>
      )}

      {satellite.altitude !== undefined && (
        <>
          <p>
            <span className="label">고도: </span>
            <span className="value">{formatAltitude(satellite.altitude)}</span>
          </p>
          <p>
            <span className="label">궤도: </span>
            <span className="value">{getOrbitType(satellite.altitude)}</span>
          </p>
        </>
      )}

      {satellite.velocity && (
        <p>
          <span className="label">속도: </span>
          <span className="value">{satellite.velocity} km/s</span>
        </p>
      )}

      <div className="orbit-info">
        <span style={{ color: '#e040fb', fontSize: '12px' }}>
          ● 궤적 표시 중 (±45분)
        </span>
      </div>

      {/* 충돌 위험 분석 */}
      <div className="collision-section">
        <h4 style={{ marginTop: '15px', marginBottom: '8px', borderTop: '1px solid #444', paddingTop: '10px' }}>
          ⚠️ 근접 물체 (100km 이내)
        </h4>
        {nearbyObjects.length === 0 ? (
          <p style={{ color: '#4caf50', fontSize: '12px' }}>
            ✓ 근처에 물체 없음
          </p>
        ) : (
          <div className="nearby-list" style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {nearbyObjects.slice(0, 10).map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '5px 8px',
                  marginBottom: '4px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '4px',
                  borderLeft: `3px solid ${getRiskColor(item.risk)}`,
                }}
              >
                <div style={{ fontSize: '11px', color: '#aaa' }}>
                  {item.satellite.name}
                </div>
                <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: getRiskColor(item.risk) }}>
                    {getRiskLabel(item.risk)}
                  </span>
                  <span style={{ color: '#fff' }}>
                    {item.distance.toFixed(1)} km
                  </span>
                </div>
              </div>
            ))}
            {nearbyObjects.length > 10 && (
              <p style={{ fontSize: '11px', color: '#888' }}>
                ...외 {nearbyObjects.length - 10}개 더
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function getCategoryName(category) {
  const names = {
    korea: '🇰🇷 한국 위성',
    starlink: 'Starlink',
    stations: '우주정거장',
    active: '활성 위성',
    debris_cosmos: '우주쓰레기 (Cosmos)',
    debris_iridium: '우주쓰레기 (Iridium)',
    debris_fengyun: '우주쓰레기 (Fengyun)',
  }
  return names[category] || category
}

export default SatelliteInfo
