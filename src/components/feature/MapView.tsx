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

// Import components
import MapControls from './MapUtils/MapControls';
import SearchBar from './MapUtils/SearchBar';
import TimeSeriesSlider from './MapUtils/TimeSeriesSlider';
import MapLegend from './MapUtils/MapLegend';
import MapStatusIndicators from './MapUtils/MapStatusIndicators';
import WMSTimeSeriesSlider from './WMSTimeSeriesSlider';
import LayerTogglePanel from './LayerTogglePanel';

// Import enhanced layer manager
import { MapLayerManager } from './MapUtils/MapLayerManager';
import type { LayerVisibilityState, LayerOpacityState } from './MapUtils/MapLayerManager';

// Import hooks
import { useMapControls } from './MapUtils/hooks/useMapControls';
import { useTimeSeriesControl } from './MapUtils/hooks/useTimeSeriesControl';
import { useLayerControls } from './MapUtils/hooks/useLayerControls';
import type { WMSLayerState } from './MapUtils/hooks/useWMSLayers';

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
  
  // WMS props
  wmsLayerStates?: WMSLayerState;
  wmsDateArrays?: {
    ndvi: string[];
    vhi: string[];
    lst: string[];
  };
  onWMSDateChange?: (date: string, layerType: 'ndvi' | 'vhi' | 'lst') => void;
  onWMSLayerToggle?: (layerType: 'ndvi' | 'vhi' | 'lst') => void;
  onWMSPlayToggle?: (layerType: 'ndvi' | 'vhi' | 'lst') => void;
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
  onFieldDrawn,
  
  // WMS props
  wmsLayerStates,
  wmsDateArrays,
  onWMSDateChange,
  onWMSLayerToggle,
  onWMSPlayToggle
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

  // Change Detection States
  const [isChangeDetectionMode, setIsChangeDetectionMode] = useState(false);
  const [changeDetectionImages, setChangeDetectionImages] = useState<{
    before: any | null;
    after: any | null;
  }>({ before: null, after: null });
  const [showChangeDetectionArrow, setShowChangeDetectionArrow] = useState(false);

  // Non-WMS Layer states (heatMap and timeSeries only)
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibilityState>({
    ndvi: false,
    vhi: false, 
    lst: false,
    heatMap: false,
    timeSeries: false,
  });

  const [layerOpacity, setLayerOpacity] = useState<LayerOpacityState>({
    ndvi: 0.8,
    vhi: 0.8,
    lst: 0.8,
    heatMap: 0.7,
    timeSeries: 0.7,
  });

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
        layerManagerRef.current.updateTimeSeriesLayer(imageData, layerOpacity.timeSeries);
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

  // Handle change detection toggle
  const handleChangeDetectionToggle = (enabled: boolean, beforeIndex?: number, afterIndex?: number) => {
    setIsChangeDetectionMode(enabled);
    
    if (enabled && beforeIndex !== undefined && afterIndex !== undefined && timeSeriesData?.results) {
      // Set up change detection images
      setChangeDetectionImages({
        before: timeSeriesData.results[beforeIndex],
        after: timeSeriesData.results[afterIndex]
      });
      setShowChangeDetectionArrow(true);
      
      // Stop any playing animation
      if (isPlayingTimeSeries) {
        togglePlayPause();
      }
    } else {
      // Exit change detection mode
      setChangeDetectionImages({ before: null, after: null });
      setShowChangeDetectionArrow(false);
    }
  };

  // Handle change detection layer updates
  useEffect(() => {
    if (layerManagerRef.current && isChangeDetectionMode && changeDetectionImages.before && changeDetectionImages.after) {
      // Initially show the before image
      layerManagerRef.current.updateTimeSeriesLayer(changeDetectionImages.before, layerOpacity.timeSeries);
      
      // You can extend MapLayerManager to support dual layer rendering for change detection
      // For now, we'll handle it through the time series mechanism
    }
  }, [isChangeDetectionMode, changeDetectionImages, layerOpacity.timeSeries]);

  // Sync WMS layer states with local state and MapLayerManager
  useEffect(() => {
    if (wmsLayerStates && layerManagerRef.current) {
      console.log('MapView: Syncing WMS layer states:', wmsLayerStates);
      
      // Update local visibility state for UI consistency
      setLayerVisibility(prev => ({
        ...prev,
        ndvi: wmsLayerStates.ndvi?.visible || false,
        vhi: wmsLayerStates.vhi?.visible || false,
        lst: wmsLayerStates.lst?.visible || false,
      }));

      // Update actual map layers
      const layerTypes: ('ndvi' | 'vhi' | 'lst')[] = ['ndvi', 'vhi', 'lst'];
      
      layerTypes.forEach(layerType => {
        const layerState = wmsLayerStates[layerType];
        if (layerState) {
          // Toggle layer visibility
          layerManagerRef.current!.toggleWMSLayer(layerType, layerState.visible);
          
          // Update layer time if visible and has current date
          if (layerState.visible && layerState.currentDate) {
            layerManagerRef.current!.updateWMSLayerTime(layerType, layerState.currentDate);
          }
        }
      });
    }
  }, [wmsLayerStates]);

  // Handle non-WMS layer toggle
  const handleLayerToggle = (layerType: keyof LayerVisibilityState, visible: boolean) => {
    // For WMS layers, delegate to parent
    if (['ndvi', 'vhi', 'lst'].includes(layerType)) {
      if (onWMSLayerToggle) {
        onWMSLayerToggle(layerType as 'ndvi' | 'vhi' | 'lst');
      }
      return;
    }
    
    // Handle non-WMS layers locally
    setLayerVisibility(prev => ({ ...prev, [layerType]: visible }));
    
    if (layerManagerRef.current) {
      if (layerType === 'heatMap' || layerType === 'timeSeries') {
        layerManagerRef.current.toggleLayerVisibility(layerType, layerOpacity[layerType]);
      }
    }
  };

  // Handle opacity change
  const handleOpacityChange = (layerType: keyof LayerOpacityState, opacity: number) => {
    setLayerOpacity(prev => ({ ...prev, [layerType]: opacity }));
    
    if (layerManagerRef.current) {
      if (['ndvi', 'vhi', 'lst'].includes(layerType)) {
        layerManagerRef.current.setWMSLayerOpacity(layerType as 'ndvi' | 'vhi' | 'lst', opacity);
      } else if (layerType === 'heatMap' || layerType === 'timeSeries') {
        layerManagerRef.current.adjustLayerOpacity(layerType, opacity);
      }
    }
  };

  // Handle WMS date change
  const handleWMSDateChange = (date: string, layerType: 'ndvi' | 'vhi' | 'lst') => {
    console.log(`MapView: WMS date change for ${layerType}:`, date);
    
    // Update the layer in MapLayerManager immediately
    if (layerManagerRef.current) {
      layerManagerRef.current.updateWMSLayerTime(layerType, date);
    }
    
    // Notify parent component
    if (onWMSDateChange) {
      onWMSDateChange(date, layerType);
    }
  };

  // Get legend URLs
  const getLegendUrls = () => {
    if (!layerManagerRef.current) return {};
    
    return {
      ndvi: layerManagerRef.current.getWMSLegendUrl('ndvi'),
      vhi: layerManagerRef.current.getWMSLegendUrl('vhi'),
      lst: layerManagerRef.current.getWMSLegendUrl('lst'),
    };
  };

  // Get current layer visibility state (combining WMS and non-WMS)
  const getCurrentLayerVisibility = (): LayerVisibilityState => {
    return {
      ndvi: wmsLayerStates?.ndvi?.visible || false,
      vhi: wmsLayerStates?.vhi?.visible || false,
      lst: wmsLayerStates?.lst?.visible || false,
      heatMap: layerVisibility.heatMap,
      timeSeries: layerVisibility.timeSeries,
    };
  };

  // Create persistent drawing styles
  const createDrawingStyles = () => {
    return {
      featureStyle: new Style({
        fill: new Fill({
          color: 'rgba(59, 130, 246, 0.3)',
        }),
        stroke: new Stroke({
          color: '#3B82F6',
          width: 3,
        }),
      }),
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

    const drawSource = new VectorSource();
    drawSourceRef.current = drawSource;

    const drawLayer = new VectorLayer({
      source: drawSource,
      style: styles.featureStyle,
      zIndex: 1000,
    });
    drawLayerRef.current = drawLayer;
    mapInstanceRef.current.addLayer(drawLayer);

    const drawInteraction = new Draw({
      source: drawSource,
      type: 'Polygon',
      style: styles.drawingStyle,
    });
    drawInteractionRef.current = drawInteraction;

    const modifyInteraction = new Modify({ 
      source: drawSource,
      style: styles.modifyStyle,
    });
    modifyInteractionRef.current = modifyInteraction;

    const snapInteraction = new Snap({ source: drawSource });
    snapInteractionRef.current = snapInteraction;

    drawInteraction.on('drawend', (event) => {
      const feature = event.feature;
      const geometry = feature.getGeometry();
      
      if (geometry) {
        feature.setStyle(styles.featureStyle);
        
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.getView().changed();
            mapInstanceRef.current.renderSync();
          }
        }, 100);

        const geoJsonFormat = new GeoJSON();
        const geoJsonFeature = geoJsonFormat.writeFeatureObject(feature, {
          featureProjection: mapInstanceRef.current?.getView().getProjection(),
          dataProjection: 'EPSG:4326',
        });

        if (onFieldDrawn) {
          onFieldDrawn(geoJsonFeature);
        }
      }
    });

    modifyInteraction.on('modifyend', () => {
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
    }
  };

  // Clear all drawn features
  const clearDrawnFeatures = () => {
    if (drawSourceRef.current) {
      drawSourceRef.current.clear();
    }
  };

  // Enable/disable drawing mode
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (isDrawingMode) {
      if (!drawSourceRef.current) {
        initializeDrawing();
      }
      
      if (drawInteractionRef.current) {
        mapInstanceRef.current.addInteraction(drawInteractionRef.current);
      }
      if (modifyInteractionRef.current) {
        mapInstanceRef.current.addInteraction(modifyInteractionRef.current);
      }
      if (snapInteractionRef.current) {
        mapInstanceRef.current.addInteraction(snapInteractionRef.current);
      }
      
      mapInstanceRef.current.getTargetElement().style.cursor = 'crosshair';
    } else {
      if (mapInstanceRef.current && drawInteractionRef.current) {
        mapInstanceRef.current.removeInteraction(drawInteractionRef.current);
      }
      if (mapInstanceRef.current && modifyInteractionRef.current) {
        mapInstanceRef.current.removeInteraction(modifyInteractionRef.current);
      }
      if (mapInstanceRef.current && snapInteractionRef.current) {
        mapInstanceRef.current.removeInteraction(snapInteractionRef.current);
      }
      
      if (mapInstanceRef.current) {
        mapInstanceRef.current.getTargetElement().style.cursor = '';
      }
    }
  }, [isDrawingMode, onFieldDrawn]);

  // Initialize the map
  useEffect(() => {
    if (!mapRef.current) return;

    console.log('MapView: Initializing map...');

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
    console.log('MapView: MapLayerManager initialized');
    
    // Add base layer
    const baseLayers = MapLayerManager.createBaseLayers();
    map.addLayer(baseLayers[currentBaseLayer]);
    
    // Initialize vector layer for field boundaries
    layerManagerRef.current.initializeVectorLayer();

    // Set up map event listeners
    map.on('click', (event) => {
      if (isDrawingMode) return;
      
      const feature = map.forEachFeatureAtPixel(event.pixel, (feature) => feature);
      if (feature && onFieldClick) {
        const properties = feature.getProperties();
        onFieldClick(properties);
      }
      
      const coordinates = toLonLat(event.coordinate);
      console.log('Map clicked at:', coordinates);
    });

    map.on('pointermove', (event) => {
      if (isDrawingMode) return;
      
      const feature = map.forEachFeatureAtPixel(event.pixel, (feature) => feature);
      map.getTargetElement().style.cursor = feature ? 'pointer' : '';
    });

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
      // Handle both regular fields and demo fields
      let geoJsonToDisplay = fieldGeoJson;
      
      // If selectedField has geometry but fieldGeoJson is null (edge case)
      if (!fieldGeoJson && selectedField?.geometry) {
        geoJsonToDisplay = selectedField.geometry;
      }
      
      // If selectedField has _geometry (from FieldsPanel formatting)
      if (!fieldGeoJson && selectedField?._geometry) {
        geoJsonToDisplay = selectedField._geometry;
      }
      
      console.log('Updating GeoJSON layer with:', geoJsonToDisplay);
      layerManagerRef.current.updateGeoJsonLayer(geoJsonToDisplay, selectedField);
    }
  }, [fieldGeoJson, selectedField]);

  // Handle heat map data
  useEffect(() => {
    if (layerManagerRef.current) {
      layerManagerRef.current.updateHeatMapLayer(indexHeatMapData, layerOpacity.heatMap);
      if (indexHeatMapData?.tileUrl) {
        setLayerVisibility(prev => ({ ...prev, heatMap: true }));
        showLegendPanel();
      }
    }
  }, [indexHeatMapData, layerOpacity.heatMap]);

  // Handle time series data
  useEffect(() => {
    if (timeSeriesData?.results && timeSeriesData.results.length > 0) {
      showLegendPanel();
      if (layerManagerRef.current) {
        layerManagerRef.current.updateTimeSeriesLayer(
          timeSeriesData.results[0],
          layerOpacity.timeSeries
        );
        setLayerVisibility(prev => ({ ...prev, timeSeries: true }));
      }
    } else {
      if (layerManagerRef.current) {
        layerManagerRef.current.updateTimeSeriesLayer(null);
        setLayerVisibility(prev => ({ ...prev, timeSeries: false }));
      }
    }
  }, [timeSeriesData, layerOpacity.timeSeries]);

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

  // Get current analysis info
  const analysisInfo = getCurrentAnalysisInfo(
    showTimeSeriesSlider,
    getCurrentTimeSeriesImage(),
    timeSeriesData,
    indexHeatMapData
  );

  // Get visualization parameters
  const visParams = getVisualizationParams(timeSeriesData, indexHeatMapData);

  // Get currently active WMS layer for slider
  const getActiveWMSLayer = (): { type: 'ndvi' | 'vhi' | 'lst'; name: string } | null => {
    if (!wmsLayerStates) return null;
    
    if (wmsLayerStates.ndvi?.visible) return { type: 'ndvi', name: 'NDVI' };
    if (wmsLayerStates.vhi?.visible) return { type: 'vhi', name: 'VHI' };
    if (wmsLayerStates.lst?.visible) return { type: 'lst', name: 'LST' };
    return null;
  };

  // Get currently visible WMS layers count
  const getVisibleWMSLayersCount = (): number => {
    if (!wmsLayerStates) return 0;
    
    let count = 0;
    if (wmsLayerStates.ndvi?.visible) count++;
    if (wmsLayerStates.vhi?.visible) count++;
    if (wmsLayerStates.lst?.visible) count++;
    return count;
  };

  // Get currently playing WMS layers count  
  const getPlayingWMSLayersCount = (): number => {
    if (!wmsLayerStates) return 0;
    
    let count = 0;
    if (wmsLayerStates.ndvi?.isPlaying) count++;
    if (wmsLayerStates.vhi?.isPlaying) count++;
    if (wmsLayerStates.lst?.isPlaying) count++;
    return count;
  };

  const activeWMSLayer = getActiveWMSLayer();
  const visibleWMSLayersCount = getVisibleWMSLayersCount();
  const playingWMSLayersCount = getPlayingWMSLayersCount();
  const currentLayerVisibility = getCurrentLayerVisibility();

  return (
    <div className={`relative w-full h-full bg-gray-900 overflow-hidden ${className}`}>
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full"></div>
      
      {/* Layer Toggle Panel */}
      <LayerTogglePanel
        layerVisibility={currentLayerVisibility}
        layerOpacity={layerOpacity}
        onLayerToggle={handleLayerToggle}
        onOpacityChange={handleOpacityChange}
        legendUrls={getLegendUrls()}
      />

      {/* Change Detection Mode Indicator */}
      {isChangeDetectionMode && (
        <div className="absolute top-4 left-4 z-20 bg-orange-100 border border-orange-300 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-orange-700 font-medium">
              Change Detection Mode
            </span>
            <i className="ri-compare-line text-orange-600"></i>
          </div>
          {changeDetectionImages.before && changeDetectionImages.after && (
            <div className="text-xs text-orange-600 mt-1">
              Comparing: {new Date(changeDetectionImages.before.date).toLocaleDateString()} 
              vs {new Date(changeDetectionImages.after.date).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {/* Change Detection Arrow Indicator */}
      {showChangeDetectionArrow && (
        <div className="absolute top-1/2 right-4 transform -translate-y-1/2 z-20">
          <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow-lg p-2">
            <div className="flex flex-col items-center space-y-2">
              <i className="ri-arrow-up-down-line text-2xl text-orange-600"></i>
              <span className="text-xs text-gray-600 writing-mode-vertical">
                Swipe Compare
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Active WMS Layers Indicator */}
      {visibleWMSLayersCount > 0 && !isChangeDetectionMode && (
        <div className="absolute top-4 left-4 z-15 bg-green-100 border border-green-300 rounded-lg p-2">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-700 font-medium">
              {visibleWMSLayersCount} WMS Layer{visibleWMSLayersCount > 1 ? 's' : ''} Active
            </span>
            {playingWMSLayersCount > 0 && (
              <i className="ri-play-fill text-green-600 text-sm"></i>
            )}
          </div>
        </div>
      )}

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
        onToggleHeatMap={() => handleLayerToggle('heatMap', !layerVisibility.heatMap)}
        onToggleTimeSeries={() => handleLayerToggle('timeSeries', !layerVisibility.timeSeries)}
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

      {/* WMS Time Series Slider - Hide in change detection mode */}
      {activeWMSLayer && wmsDateArrays && !isChangeDetectionMode && (
        <WMSTimeSeriesSlider
          dateArray={wmsDateArrays[activeWMSLayer.type] || []}
          layerType={activeWMSLayer.type}
          layerName={activeWMSLayer.name}
          isVisible={true}
          onDateChange={handleWMSDateChange}
          onPlayToggle={onWMSPlayToggle}
        />
      )}

      {/* Enhanced Time Series Slider with Change Detection */}
      {showTimeSeriesSlider && timeSeriesData && !activeWMSLayer && (
        <TimeSeriesSlider
          timeSeriesData={timeSeriesData}
          currentIndex={currentTimeSeriesIndex}
          isPlaying={isPlayingTimeSeries}
          playbackSpeed={playbackSpeed}
          onIndexChange={handleTimeSeriesSliderChange}
          onPlayToggle={togglePlayPause}
          onSpeedChange={handleSpeedChange}
          onChangeDetectionToggle={handleChangeDetectionToggle}
        />
      )}

      {/* Legend */}
      {showLegend && !isChangeDetectionMode && (
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

      {/* Change Detection Instructions */}
      {isChangeDetectionMode && changeDetectionImages.before && changeDetectionImages.after && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 bg-gradient-to-r from-blue-50 to-orange-50 border border-gray-200 rounded-lg shadow-lg px-4 py-3 max-w-lg">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900 mb-1 flex items-center justify-center">
              <i className="ri-compare-line mr-2 text-orange-600"></i>
              Change Detection Active
            </div>
            <div className="text-xs text-gray-600 grid grid-cols-2 gap-4">
              <div className="text-blue-700 bg-blue-100 p-2 rounded">
                <div className="font-medium">Before Image</div>
                <div>{new Date(changeDetectionImages.before.date).toLocaleDateString()}</div>
                <div>NDVI: {changeDetectionImages.before.mean_index_value?.toFixed(3) || 'N/A'}</div>
              </div>
              <div className="text-orange-700 bg-orange-100 p-2 rounded">
                <div className="font-medium">After Image</div>
                <div>{new Date(changeDetectionImages.after.date).toLocaleDateString()}</div>
                <div>NDVI: {changeDetectionImages.after.mean_index_value?.toFixed(3) || 'N/A'}</div>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Use the slider below to toggle between before and after images
            </div>
          </div>
        </div>
      )}
    </div>
  );}