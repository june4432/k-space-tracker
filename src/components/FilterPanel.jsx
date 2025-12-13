/**
 * 위성 카테고리 및 궤도 필터 패널
 */
function FilterPanel({ filters, categories, onChange, orbitFilters, onOrbitChange }) {
  return (
    <div className="filter-panel">
      <h3>카테고리</h3>
      {categories.map(category => (
        <label key={category.id}>
          <input
            type="checkbox"
            checked={filters[category.id] ?? true}
            onChange={() => onChange(category.id)}
          />
          <span style={{ color: getCategoryColor(category.id) }}>
            {category.name}
          </span>
        </label>
      ))}

      <h3 style={{ marginTop: '15px' }}>궤도 유형</h3>
      {ORBIT_TYPES.map(orbit => (
        <label key={orbit.id}>
          <input
            type="checkbox"
            checked={orbitFilters[orbit.id] ?? true}
            onChange={() => onOrbitChange(orbit.id)}
          />
          <span style={{ color: orbit.color }}>
            {orbit.name}
          </span>
          <span style={{ color: '#888', fontSize: '10px', marginLeft: '5px' }}>
            {orbit.range}
          </span>
        </label>
      ))}
    </div>
  )
}

const ORBIT_TYPES = [
  { id: 'LEO', name: 'LEO (저궤도)', range: '~2,000km', color: '#4fc3f7' },
  { id: 'MEO', name: 'MEO (중궤도)', range: '2,000~35,786km', color: '#81c784' },
  { id: 'GEO', name: 'GEO (정지궤도)', range: '~35,786km', color: '#ffb74d' },
  { id: 'HEO', name: 'HEO (고궤도)', range: '35,786km+', color: '#e57373' },
]

function getCategoryColor(category) {
  switch (category) {
    case 'korea': return '#ff6b6b'
    case 'starlink': return '#00bcd4'
    case 'stations': return '#f44336'
    case 'active': return '#ffeb3b'
    case 'debris_cosmos': return '#9e9e9e'
    case 'debris_iridium': return '#757575'
    case 'debris_fengyun': return '#bdbdbd'
    default: return '#ffffff'
  }
}

export default FilterPanel
