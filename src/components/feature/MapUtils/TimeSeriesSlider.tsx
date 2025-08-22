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
  onChangeDetectionToggle?: (enabled: boolean, beforeIndex?: number, afterIndex?: number) => void;
}

export default function TimeSeriesSlider({
  timeSeriesData,
  currentIndex,
  isPlaying,
  playbackSpeed,
  onIndexChange,
  onPlayToggle,
  onSpeedChange,
  onChangeDetectionToggle
}: TimeSeriesSliderProps) {
  // Change Detection States
  const [isChangeDetectionMode, setIsChangeDetectionMode] = useState(false);
  const [beforeImageIndex, setBeforeImageIndex] = useState<number | null>(null);
  const [afterImageIndex, setAfterImageIndex] = useState<number | null>(null);
  const [isSelectingBefore, setIsSelectingBefore] = useState(true);
  const [changeDetectionSlider, setChangeDetectionSlider] = useState(0); // 0 = before, 1 = after

  const getCurrentImage = () => timeSeriesData?.results?.[currentIndex];
  const getBeforeImage = () => beforeImageIndex !== null ? timeSeriesData?.results?.[beforeImageIndex] : null;
  const getAfterImage = () => afterImageIndex !== null ? timeSeriesData?.results?.[afterImageIndex] : null;

  // Handle change detection mode toggle
  const handleChangeDetectionToggle = () => {
    const newMode = !isChangeDetectionMode;
    setIsChangeDetectionMode(newMode);
    
    if (!newMode) {
      // Exiting change detection mode - reset states
      setBeforeImageIndex(null);
      setAfterImageIndex(null);
      setIsSelectingBefore(true);
      setChangeDetectionSlider(0);
      if (onChangeDetectionToggle) {
        onChangeDetectionToggle(false);
      }
    } else {
      // Entering change detection mode
      setIsSelectingBefore(true);
      if (onChangeDetectionToggle) {
        onChangeDetectionToggle(true);
      }
    }
  };

  // Handle date selection in change detection mode
  const handleDateSelection = (index: number) => {
    if (!isChangeDetectionMode) return;
    
    if (isSelectingBefore) {
      setBeforeImageIndex(index);
      setIsSelectingBefore(false);
    } else {
      setAfterImageIndex(index);
      setIsSelectingBefore(true);
      
      // Notify parent with selected indices
      if (onChangeDetectionToggle && beforeImageIndex !== null) {
        onChangeDetectionToggle(true, beforeImageIndex, index);
      }
    }
  };

  // Handle change detection slider movement
  const handleChangeDetectionSliderChange = (value: number) => {
    setChangeDetectionSlider(value);
    
    // Update the main slider to show the selected image
    if (value === 0 && beforeImageIndex !== null) {
      onIndexChange(beforeImageIndex);
    } else if (value === 1 && afterImageIndex !== null) {
      onIndexChange(afterImageIndex);
    }
  };

  // Reset selections when exiting change detection
  useEffect(() => {
    if (!isChangeDetectionMode) {
      setBeforeImageIndex(null);
      setAfterImageIndex(null);
      setChangeDetectionSlider(0);
    }
  }, [isChangeDetectionMode]);

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
            {isChangeDetectionMode && (
              <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                Change Detection
              </span>
            )}
          </h4>
          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {currentIndex + 1} / {timeSeriesData.results.length}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Change Detection Toggle */}
          <button
            onClick={handleChangeDetectionToggle}
            className={`px-3 py-1 rounded text-sm flex items-center font-medium transition-colors ${
              isChangeDetectionMode
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            disabled={isPlaying}
          >
            <i className="ri-compare-line mr-1"></i>
            {isChangeDetectionMode ? 'Exit Change' : 'Compare'}
          </button>
          
          {!isChangeDetectionMode && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Change Detection Instructions */}
      {isChangeDetectionMode && (beforeImageIndex === null || afterImageIndex === null) && (
        <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="text-xs text-orange-700 font-medium mb-1">
            {isSelectingBefore ? 'Step 1: Select BEFORE image' : 'Step 2: Select AFTER image'}
          </div>
          <div className="text-xs text-orange-600">
            {isSelectingBefore 
              ? 'Click on a date below to select the first image for comparison'
              : 'Click on a date below to select the second image for comparison'
            }
          </div>
        </div>
      )}

      {/* Change Detection Slider */}
      {isChangeDetectionMode && beforeImageIndex !== null && afterImageIndex !== null && (
        <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-orange-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-blue-700">
              Before: {new Date(timeSeriesData.results[beforeImageIndex].date).toLocaleDateString()}
            </span>
            <span className="text-xs font-medium text-orange-700">
              After: {new Date(timeSeriesData.results[afterImageIndex].date).toLocaleDateString()}
            </span>
          </div>
          
          {/* Vertical Toggle Slider */}
          <div className="relative">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={changeDetectionSlider}
              onChange={(e) => handleChangeDetectionSliderChange(Number(e.target.value))}
              className="w-full h-8 bg-gradient-to-r from-blue-200 to-orange-200 rounded-lg appearance-none cursor-pointer change-detection-slider"
            />
            <div className="absolute top-0 left-0 w-full h-8 pointer-events-none flex items-center justify-between px-2">
              <i className="ri-arrow-up-line text-blue-600 text-lg"></i>
              <i className="ri-arrow-down-line text-orange-600 text-lg"></i>
            </div>
          </div>
          
          <div className="text-center mt-2">
            <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
              {changeDetectionSlider < 0.5 ? 'Showing BEFORE' : 'Showing AFTER'} 
              ({Math.round(changeDetectionSlider < 0.5 ? (1 - changeDetectionSlider * 2) * 100 : (changeDetectionSlider - 0.5) * 200)}%)
            </span>
          </div>
        </div>
      )}

      {/* Main Time Series Slider */}
      {!isChangeDetectionMode && (
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
      )}

      {/* Date Selection Grid for Change Detection */}
      {isChangeDetectionMode && (
        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-2 font-medium">Available Dates:</div>
          <div className="grid grid-cols-6 gap-1 max-h-32 overflow-y-auto">
            {timeSeriesData.results.map((result, index) => (
              <button
                key={index}
                onClick={() => handleDateSelection(index)}
                className={`text-xs p-2 rounded border transition-colors ${
                  index === beforeImageIndex
                    ? 'bg-blue-500 text-white border-blue-600'
                    : index === afterImageIndex
                    ? 'bg-orange-500 text-white border-orange-600'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
                disabled={!isChangeDetectionMode}
              >
                {new Date(result.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Image Info */}
      {((!isChangeDetectionMode && getCurrentImage()) || 
        (isChangeDetectionMode && changeDetectionSlider < 0.5 && getBeforeImage()) ||
        (isChangeDetectionMode && changeDetectionSlider >= 0.5 && getAfterImage())) && (
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="text-center bg-gray-50 rounded p-2">
            <div className="text-gray-600 text-xs mb-1">Date</div>
            <div className="font-semibold text-gray-800">
              {(() => {
                let imageData;
                if (!isChangeDetectionMode) {
                  imageData = getCurrentImage();
                } else if (changeDetectionSlider < 0.5) {
                  imageData = getBeforeImage();
                } else {
                  imageData = getAfterImage();
                }
                return imageData ? new Date(imageData.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                }) : 'N/A';
              })()}
            </div>
          </div>
          <div className="text-center bg-emerald-50 rounded p-2">
            <div className="text-gray-600 text-xs mb-1">Mean {timeSeriesData.index?.toUpperCase()}</div>
            <div className="font-semibold text-emerald-600 text-lg">
              {(() => {
                let imageData;
                if (!isChangeDetectionMode) {
                  imageData = getCurrentImage();
                } else if (changeDetectionSlider < 0.5) {
                  imageData = getBeforeImage();
                } else {
                  imageData = getAfterImage();
                }
                return imageData?.mean_index_value?.toFixed(3) || 'N/A';
              })()}
            </div>
          </div>
          <div className="text-center bg-blue-50 rounded p-2">
            <div className="text-gray-600 text-xs mb-1">
              {isChangeDetectionMode ? 'Mode' : 'Progress'}
            </div>
            <div className="font-semibold text-blue-600">
              {isChangeDetectionMode 
                ? (changeDetectionSlider < 0.5 ? 'Before' : 'After')
                : `${Math.round(((currentIndex + 1) / timeSeriesData.results.length) * 100)}%`
              }
            </div>
          </div>
          <div className="text-center bg-purple-50 rounded p-2">
            <div className="text-gray-600 text-xs mb-1">Cloud Cover</div>
            <div className="font-semibold text-purple-600">
              {(() => {
                let imageData;
                if (!isChangeDetectionMode) {
                  imageData = getCurrentImage();
                } else if (changeDetectionSlider < 0.5) {
                  imageData = getBeforeImage();
                } else {
                  imageData = getAfterImage();
                }
                return imageData?.cloud_cover ? 
                  `${Math.round(imageData.cloud_cover)}%` : 'N/A';
              })()}
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

        .change-detection-slider::-webkit-slider-thumb {
          appearance: none;
          height: 32px;
          width: 32px;
          border-radius: 50%;
          background: linear-gradient(45deg, #3b82f6, #f97316);
          cursor: pointer;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }

        .change-detection-slider::-moz-range-thumb {
          height: 32px;
          width: 32px;
          border-radius: 50%;
          background: linear-gradient(45deg, #3b82f6, #f97316);
          cursor: pointer;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}