import { useState, useEffect, useRef } from 'react'

const SPEED_OPTIONS = [
  { label: '1x', value: 1 },
  { label: '10x', value: 10 },
  { label: '60x', value: 60 },
  { label: '600x', value: 600 },
  { label: '3600x', value: 3600 },
]

function TimeController({ simulationTime, onTimeChange, onSpeedChange, speed, isPlaying, onPlayPause }) {
  const formatDateTime = (date) => {
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  const handleReset = () => {
    onTimeChange(new Date())
  }

  const handleJump = (minutes) => {
    const newTime = new Date(simulationTime.getTime() + minutes * 60 * 1000)
    onTimeChange(newTime)
  }

  const isRealTime = Math.abs(simulationTime.getTime() - Date.now()) < 2000 && speed === 1

  return (
    <div className="time-controller">
      <div className="time-display">
        <div className="current-time">{formatDateTime(simulationTime)}</div>
        <div className="time-status">
          {isRealTime ? (
            <span className="realtime-badge">LIVE</span>
          ) : (
            <span className="simulation-badge">SIMULATION</span>
          )}
        </div>
      </div>

      <div className="time-controls">
        <div className="control-group">
          <button
            className="control-btn jump-btn"
            onClick={() => handleJump(-60)}
            title="1시간 전"
          >
            -1h
          </button>
          <button
            className="control-btn jump-btn"
            onClick={() => handleJump(-10)}
            title="10분 전"
          >
            -10m
          </button>

          <button
            className={`control-btn play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={onPlayPause}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <button
            className="control-btn jump-btn"
            onClick={() => handleJump(10)}
            title="10분 후"
          >
            +10m
          </button>
          <button
            className="control-btn jump-btn"
            onClick={() => handleJump(60)}
            title="1시간 후"
          >
            +1h
          </button>
        </div>

        <div className="speed-group">
          <span className="speed-label">속도:</span>
          {SPEED_OPTIONS.map(option => (
            <button
              key={option.value}
              className={`speed-btn ${speed === option.value ? 'active' : ''}`}
              onClick={() => onSpeedChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button className="control-btn reset-btn" onClick={handleReset}>
          현재 시간으로
        </button>
      </div>
    </div>
  )
}

export default TimeController
