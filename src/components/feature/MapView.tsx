import React, { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import { Map, View } from 'ol';
import { fromLonLat, toLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';

// Import components from MapUtils folder
import MapControls from './MapUtils/MapControls';
import SearchBar from './MapUtils/SearchBar';
import TimeSeriesSlider from './MapUtils/TimeSeriesSlider';
import MapLegend from './MapUtils/MapLegend';
import MapStatusIndicators from './MapUtils/MapStatusIndicators';
import { MapLayerManager } from './MapUtils/MapLayerManager';

// Import hooks
import { useMapControls } from './MapUtils/hooks/useMapControls';
import { useTimeSeriesControl } from './MapUtils/hooks/useTimeSeriesControl';
import { useLayerControls } from './MapUtils/hooks/useLayerControls';

// Import utilities
import {
  getCurrentAnalysisInfo,
  getVisualizationParams
} from './MapUtils/utils/mapUtils';

interface MapViewProps {
  selectedField?: any;
  fieldGeoJson?: any;
  analysisResults?: any;
  indexHeatMapData?: any;
  timeSeriesData?: any;
  onFieldClick?: (field: any) => void;
  onZoomToField?: (fieldId: any) => void;
  onTimeSeriesSliderChange?: (imageData: any) => void;
  isLoadingGeoJson?: boolean;
  className?: string;
}

export default function MapView({
  selectedField,
  fieldGeoJson,
  analysisResults,
  indexHeatMapData,
  timeSeriesData,
  onFieldClick,
  onZoomToField,
  onTimeSeriesSliderChange,
  isLoadingGeoJson = false,
  className = ""
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const layerManagerRef = useRef<MapLayerManager | null>(null);

  // Custom hooks for state management
  const {
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
  } = useMapControls({ mapInstance: mapInstanceRef.current });

  const {
    showTimeSeriesSlider,
    currentTimeSeriesIndex,
    isPlayingTimeSeries,
    playbackSpeed,
    handleTimeSeriesSliderChange,
    togglePlayPause,
    handleSpeedChange,
    getCurrentTimeSeriesImage
  } = useTimeSeriesControl({
    timeSeriesData,
    onTimeSeriesChange: (imageData) => {
      if (layerManagerRef.current) {
        layerManagerRef.current.updateTimeSeriesLayer(imageData, layerOpacities.timeSeries);
      }
      if (onTimeSeriesSliderChange) {
        onTimeSeriesSliderChange(imageData);
      }
    }
  });

  const {
    showLegend,
    layerOpacities,
    adjustLayerOpacity,
    showLegendPanel
  } = useLayerControls();

  // Initialize the map
  useEffect(() => {
    if (!mapRef.current) return;

    // Create the map
    const map = new Map({
      target: mapRef.current,
      layers: [],
      view: new View({
        center: fromLonLat(mapCoordinates),
        zoom: zoomLevel,
      }),
      controls: defaultControls({ zoom: false, attribution: false }),
    });

    mapInstanceRef.current = map;
    
    // Initialize layer manager
    layerManagerRef.current = new MapLayerManager(map);
    
    // Add base layer
    const baseLayers = MapLayerManager.createBaseLayers();
    map.addLayer(baseLayers[currentBaseLayer]);
    
    // Initialize vector layer
    layerManagerRef.current.initializeVectorLayer();

    // Add click handler for map interactions
    map.on('click', (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (feature) => feature);
      if (feature && onFieldClick) {
        const properties = feature.getProperties();
        onFieldClick(properties);
      }
      
      // Get coordinates for debugging/info
      const coordinates = toLonLat(event.coordinate);
      console.log('Map clicked at:', coordinates);
    });

    // Add pointer move handler for cursor change
    map.on('pointermove', (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (feature) => feature);
      map.getTargetElement().style.cursor = feature ? 'pointer' : '';
    });

    // Add view change handlers
    map.getView().on('change:center', () => {
      const center = toLonLat(map.getView().getCenter() || [0, 0]);
      setMapCoordinates([center[0], center[1]]);
    });

    map.getView().on('change:resolution', () => {
      setZoomLevel(Math.round(map.getView().getZoom() || 16));
    });

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
      if (layerManagerRef.current) {
        layerManagerRef.current.cleanup();
        layerManagerRef.current = null;
      }
    };
  }, []);

  // Update base layer when changed
  useEffect(() => {
    if (layerManagerRef.current) {
      layerManagerRef.current.changeBaseLayer(currentBaseLayer);
    }
  }, [currentBaseLayer]);

  // Update GeoJSON visualization when fieldGeoJson changes
  useEffect(() => {
    if (layerManagerRef.current) {
      layerManagerRef.current.updateGeoJsonLayer(fieldGeoJson, selectedField);
    }
  }, [fieldGeoJson, selectedField]);

  // Handle heat map data - Auto show legend when field loaded
  useEffect(() => {
    if (layerManagerRef.current) {
      layerManagerRef.current.updateHeatMapLayer(indexHeatMapData, layerOpacities.heatMap);
      if (indexHeatMapData?.tileUrl) {
        showLegendPanel();
      }
    }
  }, [indexHeatMapData, layerOpacities.heatMap]);

  // Handle time series data and show slider
  useEffect(() => {
    if (timeSeriesData?.results && timeSeriesData.results.length > 0) {
      showLegendPanel();
      // Load the first time series image
      if (layerManagerRef.current) {
        layerManagerRef.current.updateTimeSeriesLayer(
          timeSeriesData.results[0],
          layerOpacities.timeSeries
        );
      }
    } else {
      // Remove time series layer if it exists
      if (layerManagerRef.current) {
        layerManagerRef.current.updateTimeSeriesLayer(null);
      }
    }
  }, [timeSeriesData, layerOpacities.timeSeries]);

  // Handle search location selection
  const handleLocationSelect = (lat: number, lon: number, name: string) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.getView().animate({
        center: fromLonLat([lon, lat]),
        zoom: 15,
        duration: 1000
      });
    }
  };

  // Handle zoom to field
  const handleZoomToField = () => {
    if (layerManagerRef.current && selectedField) {
      layerManagerRef.current.zoomToField();
    }
  };

  // Toggle layer visibility
  const toggleLayerVisibility = (layerType: 'heatMap' | 'timeSeries') => {
    if (layerManagerRef.current) {
      layerManagerRef.current.toggleLayerVisibility(layerType, layerOpacities[layerType]);
    }
  };

  // Handle layer opacity changes
  const handleLayerOpacityChange = (layerType: 'heatMap' | 'timeSeries', opacity: number) => {
    adjustLayerOpacity(layerType, opacity);
    if (layerManagerRef.current) {
      layerManagerRef.current.adjustLayerOpacity(layerType, opacity);
    }
  };

  // Get current analysis info
  const analysisInfo = getCurrentAnalysisInfo(
    showTimeSeriesSlider,
    getCurrentTimeSeriesImage(),
    timeSeriesData,
    indexHeatMapData
  );

  // Get visualization parameters
  const visParams = getVisualizationParams(timeSeriesData, indexHeatMapData);

  return (
    <div className={`relative w-full h-full bg-gray-900 overflow-hidden ${className}`}>
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full"></div>
      
      {/* Map Controls */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onGetCurrentLocation={getCurrentLocation}
        onZoomToField={handleZoomToField}
        onToggleFullscreen={toggleFullscreen}
        onToggleHeatMap={() => toggleLayerVisibility('heatMap')}
        onToggleTimeSeries={() => toggleLayerVisibility('timeSeries')}
        selectedField={selectedField}
        hasIndexHeatMap={!!indexHeatMapData}
        hasTimeSeries={showTimeSeriesSlider}
        isFullscreen={isFullscreen}
        currentBaseLayer={currentBaseLayer}
        onBaseLayerChange={handleBaseLayerChange}
        showBaseLayerMenu={showBaseLayerMenu}
        onToggleBaseLayerMenu={toggleBaseLayerMenu}
      />

      {/* Search Bar */}
      <SearchBar onLocationSelect={handleLocationSelect} />

      {/* Time Series Slider */}
      {showTimeSeriesSlider && timeSeriesData && (
        <TimeSeriesSlider
          timeSeriesData={timeSeriesData}
          currentIndex={currentTimeSeriesIndex}
          isPlaying={isPlayingTimeSeries}
          playbackSpeed={playbackSpeed}
          onIndexChange={handleTimeSeriesSliderChange}
          onPlayToggle={togglePlayPause}
          onSpeedChange={handleSpeedChange}
        />
      )}

      {/* Legend */}
      {showLegend && (
        <MapLegend
          analysisInfo={analysisInfo}
          visParams={visParams}
        />
      )}

      {/* Status Indicators */}
      <MapStatusIndicators
        analysisInfo={analysisInfo}
        zoomLevel={zoomLevel}
        mapCoordinates={mapCoordinates}
        selectedField={selectedField}
        isLoadingGeoJson={isLoadingGeoJson}
      />

      {/* Click handler to close dropdowns */}
      <div 
        className="absolute inset-0 pointer-events-none"
        onClick={() => {
          // Close any open menus when clicking on map
        }}
      />
    </div>
  );
}