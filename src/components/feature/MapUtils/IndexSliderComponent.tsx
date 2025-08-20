import React, { useState, useEffect } from 'react';

interface IndexSliderComponentProps {
  startDate: string;
  endDate: string;
  onDateChange: (newDate: string, imageData?: any) => void;
  indexData?: any;
  vhiData?: any;
  timeSeriesData?: any;
  layerType?: 'index' | 'vhi' | 'timeSeries';
  currentIndex?: number;
  isPlaying?: boolean;
  onPlayToggle?: () => void;
  playbackSpeed?: number;
  onSpeedChange?: (speed: number) => void;
}

export default function IndexSliderComponent({
  startDate,
  endDate,
  onDateChange,
  indexData,
  vhiData,
  timeSeriesData,
  layerType = 'index',
  currentIndex = 0,
  isPlaying = false,
  onPlayToggle,
  playbackSpeed = 1000,
  onSpeedChange
}: IndexSliderComponentProps) {
  const [selectedIndex, setSelectedIndex] = useState(currentIndex);
  const [localIsPlaying, setLocalIsPlaying] = useState(isPlaying);
  const [localSpeed, setLocalSpeed] = useState(playbackSpeed);

  // Get the appropriate data based on layer type
  const getCurrentData = () => {
    switch (layerType) {
      case 'vhi':
        return vhiData;
      case 'timeSeries':
        return timeSeriesData;
      case 'index':
      default:
        return indexData;
    }
  };

  const currentData = getCurrentData();
  const dataResults = currentData?.results || [];

  // Auto-play functionality
  useEffect(() => {
    if (localIsPlaying && dataResults.length > 0) {
      const interval = setInterval(() => {
        setSelectedIndex(prev => {
          const nextIndex = prev >= dataResults.length - 1 ? 0 : prev + 1;
          const nextDate = dataResults[nextIndex]?.date;
          const nextImageData = dataResults[nextIndex];
          
          if (nextDate) {
            onDateChange(nextDate, nextImageData);
          }
          
          return nextIndex;
        });
      }, localSpeed);

      return () => clearInterval(interval);
    }
  }, [localIsPlaying, localSpeed, dataResults, onDateChange]);

  // Handle manual slider change
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(event.target.value);
    setSelectedIndex(newIndex);
    
    if (dataResults[newIndex]) {
      const newDate = dataResults[newIndex].date;
      const imageData = dataResults[newIndex];
      onDateChange(newDate, imageData);
    }
  };

  // Handle play/pause toggle
  const handlePlayToggle = () => {
    const newPlayState = !localIsPlaying;
    setLocalIsPlaying(newPlayState);
    onPlayToggle?.();
  };

  // Handle speed change
  const handleSpeedChange = (newSpeed: number) => {
    setLocalSpeed(newSpeed);
    onSpeedChange?.(newSpeed);
  };

  // Get layer info for display
  const getLayerInfo = () => {
    switch (layerType) {
      case 'vhi':
        return {
          title: 'VHI Layer',
          color: 'bg-green-500',
          icon: 'ri-leaf-line'
        };
      case 'timeSeries':
        return {
          title: 'Time Series',
          color: 'bg-purple-500',
          icon: 'ri-line-chart-line'
        };
      case 'index':
      default:
        return {
          title: `${currentData?.index_type?.toUpperCase() || 'Index'} Layer`,
          color: 'bg-blue-500',
          icon: 'ri-bar-chart-line'
        };
    }
  };

  const layerInfo = getLayerInfo();

  if (!dataResults.length) {
    return null;
  }

  const currentDate = dataResults[selectedIndex]?.date || startDate;
  const formattedCurrentDate = new Date(currentDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-md w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${layerInfo.color}`}></div>
          <h4 className="text-sm font-medium text-gray-900">{layerInfo.title}</h4>
        </div>
        <div className="text-xs text-gray-500">
          {selectedIndex + 1} / {dataResults.length}
        </div>
      </div>

      {/* Current Date Display */}
      <div className="text-center mb-4">
        <div className="text-lg font-semibold text-gray-900">{formattedCurrentDate}</div>
        <div className="text-xs text-gray-500">
          {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
        </div>
      </div>

      {/* Slider */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max={dataResults.length - 1}
          value={selectedIndex}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, ${layerInfo.color.replace('bg-', '#')} 0%, ${layerInfo.color.replace('bg-', '#')} ${(selectedIndex / (dataResults.length - 1)) * 100}%, #e5e7eb ${(selectedIndex / (dataResults.length - 1)) * 100}%, #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{new Date(dataResults[0]?.date).toLocaleDateString()}</span>
          <span>{new Date(dataResults[dataResults.length - 1]?.date).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Playback Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              const newIndex = selectedIndex > 0 ? selectedIndex - 1 : dataResults.length - 1;
              setSelectedIndex(newIndex);
              onDateChange(dataResults[newIndex].date, dataResults[newIndex]);
            }}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Previous"
          >
            <i className="ri-skip-back-line text-sm"></i>
          </button>
          
          <button
            onClick={handlePlayToggle}
            className={`p-2 rounded-full ${localIsPlaying ? 'bg-red-100 hover:bg-red-200' : 'bg-green-100 hover:bg-green-200'} transition-colors`}
            title={localIsPlaying ? 'Pause' : 'Play'}
          >
            <i className={`text-sm ${localIsPlaying ? 'ri-pause-line' : 'ri-play-line'}`}></i>
          </button>
          
          <button
            onClick={() => {
              const newIndex = selectedIndex < dataResults.length - 1 ? selectedIndex + 1 : 0;
              setSelectedIndex(newIndex);
              onDateChange(dataResults[newIndex].date, dataResults[newIndex]);
            }}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Next"
          >
            <i className="ri-skip-forward-line text-sm"></i>
          </button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">Speed:</span>
          <select
            value={localSpeed}
            onChange={(e) => handleSpeedChange(parseInt(e.target.value))}
            className="text-xs bg-gray-100 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={2000}>0.5x</option>
            <option value={1000}>1x</option>
            <option value={500}>2x</option>
            <option value={250}>4x</option>
          </select>
        </div>
      </div>

      {/* Layer Info */}
      {dataResults[selectedIndex] && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-600 space-y-1">
            {dataResults[selectedIndex].tileUrl && (
              <div>Tile URL: <span className="font-mono text-gray-500">...{dataResults[selectedIndex].tileUrl.slice(-20)}</span></div>
            )}
            {dataResults[selectedIndex].metadata && (
              <div>Cloud Cover: {dataResults[selectedIndex].metadata.cloudCover || 'N/A'}%</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}