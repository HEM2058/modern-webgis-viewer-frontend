import { useState, useEffect } from 'react';
import { Map } from 'ol';
import { fromLonLat } from 'ol/proj';

interface UseMapControlsProps {
  mapInstance: Map | null;
}

export function useMapControls({ mapInstance }: UseMapControlsProps) {
  const [zoomLevel, setZoomLevel] = useState(16);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapCoordinates, setMapCoordinates] = useState<[number, number]>([120.86, 15.59]);
  const [currentBaseLayer, setCurrentBaseLayer] = useState<'satellite' | 'hybrid' | 'terrain'>('satellite');
  const [showBaseLayerMenu, setShowBaseLayerMenu] = useState(false);

  // Map control functions
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 1, 20));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 1, 1));
  };

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (mapInstance) {
            mapInstance.getView().animate({
              center: fromLonLat([longitude, latitude]),
              zoom: 16,
              duration: 1000
            });
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to get your current location. Please check your browser permissions.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Resize map when entering/exiting fullscreen
      setTimeout(() => {
        if (mapInstance) {
          mapInstance.updateSize();
        }
      }, 100);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [mapInstance]);

  // Handle zoom level changes
  useEffect(() => {
    if (mapInstance) {
      const currentZoom = mapInstance.getView().getZoom();
      if (Math.abs((currentZoom || 16) - zoomLevel) > 0.5) {
        mapInstance.getView().animate({
          zoom: zoomLevel,
          duration: 300
        });
      }
    }
  }, [zoomLevel, mapInstance]);

  // Handle base layer menu toggle
  const toggleBaseLayerMenu = () => {
    setShowBaseLayerMenu(!showBaseLayerMenu);
  };

  const handleBaseLayerChange = (layer: 'satellite' | 'hybrid' | 'terrain') => {
    setCurrentBaseLayer(layer);
    setShowBaseLayerMenu(false);
  };

  return {
    zoomLevel,
    setZoomLevel,
    isFullscreen,
    mapCoordinates,
    setMapCoordinates,
    currentBaseLayer,
    showBaseLayerMenu,
    handleZoomIn,
    handleZoomOut,
    getCurrentLocation,
    toggleFullscreen,
    toggleBaseLayerMenu,
    handleBaseLayerChange
  };
}