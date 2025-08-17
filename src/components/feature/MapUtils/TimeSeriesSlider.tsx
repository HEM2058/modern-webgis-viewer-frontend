import React, { useState, useEffect } from 'react';

interface TimeSeriesData {
  index?: string;
  results: Array<{
    date: string;
    mean_index_value?: number;
    cloud_cover?: number;
    tile_url?: string;
  }>;
}

interface TimeSeriesSliderProps {
  timeSeriesData: TimeSeriesData;
  currentIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  onIndexChange: (index: number) => void;
  onPlayToggle: () => void;
  onSpeedChange: (speed: number) => void;
}

export default function TimeSeriesSlider({
  timeSeriesData,
  currentIndex,
  isPlaying,
  playbackSpeed,
  onIndexChange,
  onPlayToggle,
  onSpeedChange
}: TimeSeriesSliderProps) {
  const getCurrentImage = () => timeSeriesData?.results?.[currentIndex];

  if (!timeSeriesData?.results || timeSeriesData.results.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-20 left-4 right-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-4 z-10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center">
            <i className="ri-time-line mr-2 text-blue-600"></i>
            Time Series: {timeSeriesData.index?.toUpperCase()}
          </h4>
          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {currentIndex + 1} / {timeSeriesData.results.length}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onPlayToggle}
            className={`px-3 py-1 rounded text-sm flex items-center font-medium transition-colors ${
              isPlaying 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <i className={`ri-${isPlaying ? 'pause' : 'play'}-line mr-1`}></i>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          
          <select
            value={playbackSpeed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="bg-gray-100 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={isPlaying}
          >
            <option value={2000}>0.5x</option>
            <option value={1000}>1x</option>
            <option value={500}>2x</option>
            <option value={250}>4x</option>
          </select>
        </div>
      </div>

      {/* Enhanced Slider */}
      <div className="mb-3">
        <div className="relative">
          <input
            type="range"
            min="0"
            max={timeSeriesData.results.length - 1}
            value={currentIndex}
            onChange={(e) => onIndexChange(Number(e.target.value))}
            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #10b981 0%, #10b981 ${
                (currentIndex / (timeSeriesData.results.length - 1)) * 100
              }%, #e5e7eb ${(currentIndex / (timeSeriesData.results.length - 1)) * 100}%, #e5e7eb 100%)`
            }}
          />
          
          {/* Progress markers */}
          <div className="absolute top-0 left-0 w-full h-3 pointer-events-none">
            {timeSeriesData.results.map((_, index) => (
              <div
                key={index}
                className="absolute w-0.5 h-3 bg-gray-400"
                style={{
                  left: `${(index / (timeSeriesData.results.length - 1)) * 100}%`
                }}
              />
            ))}
          </div>
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{new Date(timeSeriesData.results[0].date).toLocaleDateString()}</span>
          <span>{new Date(timeSeriesData.results[timeSeriesData.results.length - 1].date).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Current Image Info */}
      {getCurrentImage() && (
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="text-center bg-gray-50 rounded p-2">
            <div className="text-gray-600 text-xs mb-1">Date</div>
            <div className="font-semibold text-gray-800">
              {new Date(getCurrentImage().date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
          </div>
          <div className="text-center bg-emerald-50 rounded p-2">
            <div className="text-gray-600 text-xs mb-1">Mean {timeSeriesData.index?.toUpperCase()}</div>
            <div className="font-semibold text-emerald-600 text-lg">
              {getCurrentImage().mean_index_value?.toFixed(3)}
            </div>
          </div>
          <div className="text-center bg-blue-50 rounded p-2">
            <div className="text-gray-600 text-xs mb-1">Progress</div>
            <div className="font-semibold text-blue-600">
              {Math.round(((currentIndex + 1) / timeSeriesData.results.length) * 100)}%
            </div>
          </div>
          <div className="text-center bg-purple-50 rounded p-2">
            <div className="text-gray-600 text-xs mb-1">Cloud Cover</div>
            <div className="font-semibold text-purple-600">
              {getCurrentImage().cloud_cover ? 
                `${Math.round(getCurrentImage().cloud_cover)}%` : 'N/A'
              }
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        input[type="range"]::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}