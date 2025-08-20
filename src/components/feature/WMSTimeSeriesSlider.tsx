import React, { useState, useEffect, useRef } from 'react';

export interface WMSTimeSeriesSliderProps {
  dateArray: string[];
  layerType: 'ndvi' | 'vhi' | 'lst';
  layerName: string;
  isVisible: boolean;
  onDateChange: (date: string, layerType: 'ndvi' | 'vhi' | 'lst') => void;
  onPlayToggle?: (isPlaying: boolean, layerType: 'ndvi' | 'vhi' | 'lst') => void;
}

export default function WMSTimeSeriesSlider({
  dateArray = [],
  layerType,
  layerName,
  isVisible,
  onDateChange,
  onPlayToggle
}: WMSTimeSeriesSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // milliseconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Handle slider change
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(event.target.value);
    setCurrentIndex(newIndex);
    if (dateArray[newIndex]) {
      onDateChange(dateArray[newIndex], layerType);
    }
  };

  // Handle play/pause toggle
  const handlePlayToggle = () => {
    const newPlayState = !isPlaying;
    setIsPlaying(newPlayState);
    if (onPlayToggle) {
      onPlayToggle(newPlayState, layerType);
    }
  };

  // Handle speed change
  const handleSpeedChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSpeed = parseInt(event.target.value);
    setPlaybackSpeed(newSpeed);
  };

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && dateArray.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          const nextIndex = (prev + 1) % dateArray.length;
          if (dateArray[nextIndex]) {
            onDateChange(dateArray[nextIndex], layerType);
          }
          return nextIndex;
        });
      }, playbackSpeed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed, dateArray, layerType, onDateChange]);

  // Reset to first frame when dates change
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
    if (dateArray.length > 0) {
      onDateChange(dateArray[0], layerType);
    }
  }, [dateArray, layerType, onDateChange]);

  // Don't render if not visible or no dates
  if (!isVisible || dateArray.length === 0) {
    return null;
  }

  const currentDate = dateArray[currentIndex];
  const progress = dateArray.length > 1 ? (currentIndex / (dateArray.length - 1)) * 100 : 0;

  return (
    <div className="absolute bottom-20 left-4 right-4 z-10">
      <div className="bg-white rounded-lg shadow-lg p-4 mx-auto max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <h3 className="text-sm font-medium text-gray-900">
              {layerName} Time Series
            </h3>
          </div>
          <div className="text-xs text-gray-500">
            {currentIndex + 1} of {dateArray.length}
          </div>
        </div>

        {/* Date Display */}
        <div className="text-center mb-3">
          <div className="text-lg font-semibold text-gray-900">
            {formatDate(currentDate)}
          </div>
        </div>

        {/* Slider */}
        <div className="relative mb-4">
          <input
            type="range"
            min={0}
            max={Math.max(0, dateArray.length - 1)}
            value={currentIndex}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #10b981 0%, #10b981 ${progress}%, #e5e7eb ${progress}%, #e5e7eb 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{formatDate(dateArray[0])}</span>
            <span>{formatDate(dateArray[dateArray.length - 1])}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Play/Pause Button */}
            <button
              onClick={handlePlayToggle}
              className="flex items-center justify-center w-10 h-10 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <i className="ri-pause-fill text-lg"></i>
              ) : (
                <i className="ri-play-fill text-lg ml-0.5"></i>
              )}
            </button>

            {/* Previous Frame */}
            <button
              onClick={() => {
                const newIndex = Math.max(0, currentIndex - 1);
                setCurrentIndex(newIndex);
                onDateChange(dateArray[newIndex], layerType);
              }}
              disabled={currentIndex === 0}
              className="flex items-center justify-center w-8 h-8 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded transition-colors"
              title="Previous"
            >
              <i className="ri-skip-back-fill text-sm"></i>
            </button>

            {/* Next Frame */}
            <button
              onClick={() => {
                const newIndex = Math.min(dateArray.length - 1, currentIndex + 1);
                setCurrentIndex(newIndex);
                onDateChange(dateArray[newIndex], layerType);
              }}
              disabled={currentIndex === dateArray.length - 1}
              className="flex items-center justify-center w-8 h-8 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded transition-colors"
              title="Next"
            >
              <i className="ri-skip-forward-fill text-sm"></i>
            </button>
          </div>

          {/* Speed Control */}
          <div className="flex items-center space-x-2">
            <label className="text-xs text-gray-600">Speed:</label>
            <select
              value={playbackSpeed}
              onChange={handleSpeedChange}
              className="text-xs bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value={2000}>0.5x</option>
              <option value={1000}>1x</option>
              <option value={500}>2x</option>
              <option value={250}>4x</option>
            </select>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div
              className="bg-green-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #10b981;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #10b981;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}