import { useState, useEffect, useRef } from 'react';

export interface WMSLayerData {
  ndvi: string[];
  vhi: string[];
  lst: string[];
}

export interface WMSLayerState {
  ndvi: {
    visible: boolean;
    currentDate: string;
    isPlaying: boolean;
    currentIndex: number;
  };
  vhi: {
    visible: boolean;
    currentDate: string;
    isPlaying: boolean;
    currentIndex: number;
  };
  lst: {
    visible: boolean;
    currentDate: string;
    isPlaying: boolean;
    currentIndex: number;
  };
}

export interface UseWMSLayersProps {
  dateArrays: WMSLayerData;
  onDateChange?: (date: string, layerType: 'ndvi' | 'vhi' | 'lst') => void;
  playbackSpeed?: number;
}

export function useWMSLayers({
  dateArrays,
  onDateChange,
  playbackSpeed = 1000
}: UseWMSLayersProps) {
  const [layerStates, setLayerStates] = useState<WMSLayerState>({
    ndvi: {
      visible: false,
      currentDate: dateArrays.ndvi[0] || '',
      isPlaying: false,
      currentIndex: 0,
    },
    vhi: {
      visible: false,
      currentDate: dateArrays.vhi[0] || '',
      isPlaying: false,
      currentIndex: 0,
    },
    lst: {
      visible: false,
      currentDate: dateArrays.lst[0] || '',
      isPlaying: false,
      currentIndex: 0,
    },
  });

  // Refs for intervals
  const intervalsRef = useRef<{
    ndvi?: NodeJS.Timeout;
    vhi?: NodeJS.Timeout;
    lst?: NodeJS.Timeout;
  }>({});

  // Toggle layer visibility
  const toggleLayerVisibility = (layerType: 'ndvi' | 'vhi' | 'lst') => {
    setLayerStates(prev => ({
      ...prev,
      [layerType]: {
        ...prev[layerType],
        visible: !prev[layerType].visible,
        isPlaying: false, // Stop playing when toggling visibility
      }
    }));

    // Clear interval if hiding
    if (layerStates[layerType].visible && intervalsRef.current[layerType]) {
      clearInterval(intervalsRef.current[layerType]);
      intervalsRef.current[layerType] = undefined;
    }
  };

  // Set layer date by index
  const setLayerDateByIndex = (layerType: 'ndvi' | 'vhi' | 'lst', index: number) => {
    const dates = dateArrays[layerType];
    if (dates && dates[index]) {
      const newDate = dates[index];
      setLayerStates(prev => ({
        ...prev,
        [layerType]: {
          ...prev[layerType],
          currentDate: newDate,
          currentIndex: index,
        }
      }));

      if (onDateChange) {
        onDateChange(newDate, layerType);
      }
    }
  };

  // Set layer date directly
  const setLayerDate = (layerType: 'ndvi' | 'vhi' | 'lst', date: string) => {
    const dates = dateArrays[layerType];
    const index = dates.indexOf(date);
    if (index !== -1) {
      setLayerDateByIndex(layerType, index);
    }
  };

  // Toggle play/pause for a layer
  const toggleLayerPlayback = (layerType: 'ndvi' | 'vhi' | 'lst') => {
    const currentState = layerStates[layerType];
    const newPlayingState = !currentState.isPlaying;

    setLayerStates(prev => ({
      ...prev,
      [layerType]: {
        ...prev[layerType],
        isPlaying: newPlayingState,
      }
    }));

    if (newPlayingState) {
      // Start playing
      intervalsRef.current[layerType] = setInterval(() => {
        setLayerStates(prev => {
          const dates = dateArrays[layerType];
          const nextIndex = (prev[layerType].currentIndex + 1) % dates.length;
          const nextDate = dates[nextIndex];

          if (onDateChange && nextDate) {
            onDateChange(nextDate, layerType);
          }

          return {
            ...prev,
            [layerType]: {
              ...prev[layerType],
              currentIndex: nextIndex,
              currentDate: nextDate,
            }
          };
        });
      }, playbackSpeed);
    } else {
      // Stop playing
      if (intervalsRef.current[layerType]) {
        clearInterval(intervalsRef.current[layerType]);
        intervalsRef.current[layerType] = undefined;
      }
    }
  };

  // Get currently visible layers
  const getVisibleLayers = (): Array<'ndvi' | 'vhi' | 'lst'> => {
    return (['ndvi', 'vhi', 'lst'] as const).filter(
      layer => layerStates[layer].visible
    );
  };

  // Get currently playing layers
  const getPlayingLayers = (): Array<'ndvi' | 'vhi' | 'lst'> => {
    return (['ndvi', 'vhi', 'lst'] as const).filter(
      layer => layerStates[layer].isPlaying
    );
  };

  // Stop all playback
  const stopAllPlayback = () => {
    Object.keys(intervalsRef.current).forEach(layerType => {
      const interval = intervalsRef.current[layerType as keyof typeof intervalsRef.current];
      if (interval) {
        clearInterval(interval);
        intervalsRef.current[layerType as keyof typeof intervalsRef.current] = undefined;
      }
    });

    setLayerStates(prev => ({
      ndvi: { ...prev.ndvi, isPlaying: false },
      vhi: { ...prev.vhi, isPlaying: false },
      lst: { ...prev.lst, isPlaying: false },
    }));
  };

  // Hide all layers
  const hideAllLayers = () => {
    stopAllPlayback();
    setLayerStates(prev => ({
      ndvi: { ...prev.ndvi, visible: false },
      vhi: { ...prev.vhi, visible: false },
      lst: { ...prev.lst, visible: false },
    }));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(intervalsRef.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, []);

  // Update states when date arrays change
  useEffect(() => {
    setLayerStates(prev => ({
      ndvi: {
        ...prev.ndvi,
        currentDate: dateArrays.ndvi[0] || prev.ndvi.currentDate,
        currentIndex: 0,
        isPlaying: false,
      },
      vhi: {
        ...prev.vhi,
        currentDate: dateArrays.vhi[0] || prev.vhi.currentDate,
        currentIndex: 0,
        isPlaying: false,
      },
      lst: {
        ...prev.lst,
        currentDate: dateArrays.lst[0] || prev.lst.currentDate,
        currentIndex: 0,
        isPlaying: false,
      },
    }));

    // Clear all intervals when date arrays change
    stopAllPlayback();
  }, [dateArrays]);

  return {
    layerStates,
    toggleLayerVisibility,
    setLayerDateByIndex,
    setLayerDate,
    toggleLayerPlayback,
    stopAllPlayback,
    hideAllLayers,
    getVisibleLayers,
    getPlayingLayers,
    dateArrays,
  };
}