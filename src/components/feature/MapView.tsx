import React, { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import { Map, View } from 'ol';
import { fromLonLat, toLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';
import { Draw, Modify, Snap } from 'ol/interaction';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { Style, Fill, Stroke, Circle } from 'ol/style';
import { GeoJSON } from 'ol/format';

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
} from './MapUtils/utils/MapUtils';

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
  
  // Drawing props
  isDrawingMode?: boolean;
  onFieldDrawn?: (geoJsonFeature: any) => void;
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
  className = "",
  
  // Drawing props
  isDrawingMode = false,
  onFieldDrawn
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const layerManagerRef = useRef<MapLayerManager | null>(null);
  
  // Drawing-related refs
  const drawInteractionRef = useRef<Draw | null>(null);
  const modifyInteractionRef = useRef<Modify | null>(null);
  const snapInteractionRef = useRef<Snap | null>(null);
  const drawSourceRef = useRef<VectorSource | null>(null);
  const drawLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

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

  // Create persistent drawing styles
  const createDrawingStyles = () => {
    return {
      // Style for completed features (drawn polygons)
      featureStyle: new Style({
        fill: new Fill({
          color: 'rgba(59, 130, 246, 0.3)', // Blue with transparency
        }),
        stroke: new Stroke({
          color: '#3B82F6', // Blue
          width: 3,
        }),
      }),
      // Style for drawing in progress
      drawingStyle: new Style({
        fill: new Fill({
          color: 'rgba(59, 130, 246, 0.2)',
        }),
        stroke: new Stroke({
          color: '#3B82F6',
          width: 3,
          lineDash: [10, 10],
        }),
        image: new Circle({
          radius: 6,
          fill: new Fill({
            color: '#3B82F6',
          }),
          stroke: new Stroke({
            color: '#FFFFFF',
            width: 2,
          }),
        }),
      }),
      // Style for modify handles
      modifyStyle: new Style({
        image: new Circle({
          radius: 8,
          fill: new Fill({
            color: '#FF6B6B',
          }),
          stroke: new Stroke({
            color: '#FFFFFF',
            width: 2,
          }),
        }),
      })
    };
  };

  // Initialize drawing layer and interactions
  const initializeDrawing = () => {
    if (!mapInstanceRef.current) return;

    const styles = createDrawingStyles();

    // Create drawing source and layer
    const drawSource = new VectorSource();
    drawSourceRef.current = drawSource;

    const drawLayer = new VectorLayer({
      source: drawSource,
      style: styles.featureStyle, // Use consistent style for completed features
      zIndex: 1000, // High z-index to ensure visibility
    });
    drawLayerRef.current = drawLayer;
    mapInstanceRef.current.addLayer(drawLayer);

    // Create draw interaction for polygons
    const drawInteraction = new Draw({
      source: drawSource,
      type: 'Polygon',
      style: styles.drawingStyle, // Style while drawing
    });
    drawInteractionRef.current = drawInteraction;

    // Create modify interaction
    const modifyInteraction = new Modify({ 
      source: drawSource,
      style: styles.modifyStyle,
    });
    modifyInteractionRef.current = modifyInteraction;

    // Create snap interaction
    const snapInteraction = new Snap({ source: drawSource });
    snapInteractionRef.current = snapInteraction;

    // Handle draw end event
    drawInteraction.on('drawend', (event) => {
      const feature = event.feature;
      const geometry = feature.getGeometry();
      
      if (geometry) {
        // Ensure the feature uses the correct style
        feature.setStyle(styles.featureStyle);
        
        // Force map refresh to ensure visibility
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.getView().changed();
            mapInstanceRef.current.renderSync();
          }
        }, 100);

        // Convert to GeoJSON
        const geoJsonFormat = new GeoJSON();
        const geoJsonFeature = geoJsonFormat.writeFeatureObject(feature, {
          featureProjection: mapInstanceRef.current?.getView().getProjection(),
          dataProjection: 'EPSG:4326',
        });

        console.log('Feature drawn:', geoJsonFeature);

        // Call the callback with the drawn feature
        if (onFieldDrawn) {
          onFieldDrawn(geoJsonFeature);
        }
      }
    });

    // Handle modify end event to maintain visibility
    modifyInteraction.on('modifyend', (event) => {
      // Force refresh after modification
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.getView().changed();
          mapInstanceRef.current.renderSync();
        }
      }, 100);
    });
  };

  // Clean up drawing interactions
  const cleanupDrawing = () => {
    if (mapInstanceRef.current) {
      if (drawInteractionRef.current) {
        mapInstanceRef.current.removeInteraction(drawInteractionRef.current);
        drawInteractionRef.current = null;
      }
      if (modifyInteractionRef.current) {
        mapInstanceRef.current.removeInteraction(modifyInteractionRef.current);
        modifyInteractionRef.current = null;
      }
      if (snapInteractionRef.current) {
        mapInstanceRef.current.removeInteraction(snapInteractionRef.current);
        snapInteractionRef.current = null;
      }
      // DON'T remove the layer here - keep drawn features visible
      // if (drawLayerRef.current) {
      //   mapInstanceRef.current.removeLayer(drawLayerRef.current);
      //   drawLayerRef.current = null;
      // }
    }
    // drawSourceRef.current = null; // Keep the source reference
  };

  // Clear all drawn features (call this explicitly when needed)
  const clearDrawnFeatures = () => {
    if (drawSourceRef.current) {
      drawSourceRef.current.clear();
    }
  };

  // Enable/disable drawing mode
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (isDrawingMode) {
      // Initialize drawing if not already done
      if (!drawSourceRef.current) {
        initializeDrawing();
      }
      
      // Add drawing interactions
      if (drawInteractionRef.current) {
        mapInstanceRef.current.addInteraction(drawInteractionRef.current);
      }
      if (modifyInteractionRef.current) {
        mapInstanceRef.current.addInteraction(modifyInteractionRef.current);
      }
      if (snapInteractionRef.current) {
        mapInstanceRef.current.addInteraction(snapInteractionRef.current);
      }
      
      // Change cursor
      mapInstanceRef.current.getTargetElement().style.cursor = 'crosshair';
    } else {
      // Remove drawing interactions but keep the layer visible
      if (mapInstanceRef.current && drawInteractionRef.current) {
        mapInstanceRef.current.removeInteraction(drawInteractionRef.current);
      }
      if (mapInstanceRef.current && modifyInteractionRef.current) {
        mapInstanceRef.current.removeInteraction(modifyInteractionRef.current);
      }
      if (mapInstanceRef.current && snapInteractionRef.current) {
        mapInstanceRef.current.removeInteraction(snapInteractionRef.current);
      }
      
      // Reset cursor
      if (mapInstanceRef.current) {
        mapInstanceRef.current.getTargetElement().style.cursor = '';
      }
    }
  }, [isDrawingMode, onFieldDrawn]);

  // REMOVED: Don't clear features when exiting drawing mode
  // This was the main cause of the issue
  // useEffect(() => {
  //   if (!isDrawingMode && drawSourceRef.current) {
  //     drawSourceRef.current.clear();
  //   }
  // }, [isDrawingMode]);

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

    // Add click handler for map interactions (only when not drawing)
    map.on('click', (event) => {
      if (isDrawingMode) return; // Don't handle clicks when drawing
      
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
      if (isDrawingMode) return; // Keep drawing cursor when in drawing mode
      
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
      cleanupDrawing();
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
      
      {/* Drawing Mode Indicator */}
      {isDrawingMode && (
        <div className="absolute top-4 left-4 z-20 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <i className="ri-pencil-line"></i>
            <span className="text-sm font-medium">Drawing Mode</span>
          </div>
          <div className="text-xs mt-1 opacity-90">
            Click to draw field boundary, double-click to finish
          </div>
          {/* Add clear button */}
          <button
            onClick={clearDrawnFeatures}
            className="mt-2 text-xs bg-red-500 hover:bg-red-600 px-2 py-1 rounded"
          >
            Clear Drawings
          </button>
        </div>
      )}
      
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

      {/* Search Bar - Hide in drawing mode */}
      {!isDrawingMode && (
        <SearchBar onLocationSelect={handleLocationSelect} />
      )}

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

      {/* Drawing Instructions */}
      {isDrawingMode && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 bg-white rounded-lg shadow-lg px-4 py-3 max-w-md">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900 mb-1">
              Draw Your Field Boundary
            </div>
            <div className="text-xs text-gray-600">
              • Click points around your field perimeter<br/>
              • Double-click the last point to complete<br/>
              • Use modify handles to adjust after drawing<br/>
              • Fields remain visible after drawing
            </div>
          </div>
        </div>
      )}

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