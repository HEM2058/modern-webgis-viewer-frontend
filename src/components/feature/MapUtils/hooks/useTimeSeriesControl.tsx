import { useState, useEffect } from 'react';

interface TimeSeriesData {
  index?: string;
  results: Array<{
    date: string;
    mean_index_value?: number;
    cloud_cover?: number;
    tile_url?: string;
  }>;
}

interface UseTimeSeriesControlProps {
  timeSeriesData?: TimeSeriesData;
  onTimeSeriesChange?: (imageData: any) => void;
}

export function useTimeSeriesControl({ 
  timeSeriesData, 
  onTimeSeriesChange 
}: UseTimeSeriesControlProps) {
  const [showTimeSeriesSlider, setShowTimeSeriesSlider] = useState(false);
  const [currentTimeSeriesIndex, setCurrentTimeSeriesIndex] = useState(0);
  const [isPlayingTimeSeries, setIsPlayingTimeSeries] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);

  // Handle time series data changes
  useEffect(() => {
    if (timeSeriesData?.results && timeSeriesData.results.length > 0) {
      setShowTimeSeriesSlider(true);
      setCurrentTimeSeriesIndex(0);
    } else {
      setShowTimeSeriesSlider(false);
      setIsPlayingTimeSeries(false);
    }
  }, [timeSeriesData]);

  // Auto-play functionality for time series
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlayingTimeSeries && timeSeriesData?.results) {
      interval = setInterval(() => {
        setCurrentTimeSeriesIndex(prev => {
          const nextIndex = (prev + 1) % timeSeriesData.results.length;
          if (onTimeSeriesChange) {
            onTimeSeriesChange(timeSeriesData.results[nextIndex]);
          }
          return nextIndex;
        });
      }, playbackSpeed);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlayingTimeSeries, playbackSpeed, timeSeriesData, onTimeSeriesChange]);

  // Handle time series slider change
  const handleTimeSeriesSliderChange = (index: number) => {
    setCurrentTimeSeriesIndex(index);
    if (timeSeriesData?.results?.[index] && onTimeSeriesChange) {
      onTimeSeriesChange(timeSeriesData.results[index]);
    }
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    setIsPlayingTimeSeries(!isPlayingTimeSeries);
  };

  // Change playback speed
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  // Get current image data
  const getCurrentTimeSeriesImage = () => {
    return timeSeriesData?.results?.[currentTimeSeriesIndex];
  };

  return {
    showTimeSeriesSlider,
    currentTimeSeriesIndex,
    isPlayingTimeSeries,
    playbackSpeed,
    handleTimeSeriesSliderChange,
    togglePlayPause,
    handleSpeedChange,
    getCurrentTimeSeriesImage
  };
}