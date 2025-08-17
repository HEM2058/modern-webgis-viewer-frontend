import React, { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import { Map, View } from 'ol';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { XYZ, Vector as VectorSource } from 'ol/source';
import { GeoJSON } from 'ol/format';
import { Style, Stroke, Fill } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';

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

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: string[];
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
  const vectorLayerRef = useRef<VectorLayer | null>(null);
  const heatMapLayerRef = useRef<TileLayer | null>(null);
  const timeSeriesLayerRef = useRef<TileLayer | null>(null);
  
  const [zoomLevel, setZoomLevel] = useState(16);
  const [showLegend, setShowLegend] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapCoordinates, setMapCoordinates] = useState<[number, number]>([120.86, 15.59]);
  const [layerOpacities, setLayerOpacities] = useState({
    heatMap: 0.7,
    timeSeries: 0.7
  });
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Time Series Slider States
  const [showTimeSeriesSlider, setShowTimeSeriesSlider] = useState(false);
  const [currentTimeSeriesIndex, setCurrentTimeSeriesIndex] = useState(0);
  const [isPlayingTimeSeries, setIsPlayingTimeSeries] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);

  // Map layer types
  const [currentBaseLayer, setCurrentBaseLayer] = useState<'satellite' | 'hybrid' | 'terrain'>('satellite');
  const [showBaseLayerMenu, setShowBaseLayerMenu] = useState(false);

  // Search with Nominatim API (limited to Philippines)
  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ph&limit=5&addressdetails=1`
      );
      const data = await response.json();
      setSearchResults(data);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchLocation(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle search result selection
  const selectSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    if (mapInstanceRef.current) {
      mapInstanceRef.current.getView().animate({
        center: fromLonLat([lon, lat]),
        zoom: 15,
        duration: 1000
      });
    }
    
    setSearchQuery(result.display_name);
    setShowSearchResults(false);
  };

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (mapInstanceRef.current) {
            mapInstanceRef.current.getView().animate({
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
      mapRef.current?.requestFullscreen().then(() => {
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
        if (mapInstanceRef.current) {
          mapInstanceRef.current.updateSize();
        }
      }, 100);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Initialize the map
  useEffect(() => {
    if (!mapRef.current) return;

    // Base layer configurations
    const baseLayers = {
      satellite: new TileLayer({
        source: new XYZ({
          url: 'http://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
          crossOrigin: 'anonymous',
        }),
      }),
      hybrid: new TileLayer({
        source: new XYZ({
          url: 'http://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          crossOrigin: 'anonymous',
        }),
      }),
      terrain: new TileLayer({
        source: new XYZ({
          url: 'http://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
          crossOrigin: 'anonymous',
        }),
      })
    };

    // Create vector source and layer for GeoJSON
    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        stroke: new Stroke({
          color: '#10b981',
          width: 3,
        }),
        fill: new Fill({
          color: 'rgba(16, 185, 129, 0.15)',
        }),
      }),
    });

    vectorLayerRef.current = vectorLayer;

    // Create the map
    const map = new Map({
      target: mapRef.current,
      layers: [baseLayers[currentBaseLayer], vectorLayer],
      view: new View({
        center: fromLonLat(mapCoordinates),
        zoom: zoomLevel,
      }),
      controls: defaultControls({ zoom: false, attribution: false }),
    });

    mapInstanceRef.current = map;

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
    };
  }, [currentBaseLayer]);

  // Update base layer when changed
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const layers = mapInstanceRef.current.getLayers().getArray();
    const baseLayer = layers[0];
    
    // Base layer configurations
    const baseLayers = {
      satellite: new TileLayer({
        source: new XYZ({
          url: 'http://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
          crossOrigin: 'anonymous',
        }),
      }),
      hybrid: new TileLayer({
        source: new XYZ({
          url: 'http://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          crossOrigin: 'anonymous',
        }),
      }),
      terrain: new TileLayer({
        source: new XYZ({
          url: 'http://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
          crossOrigin: 'anonymous',
        }),
      })
    };

    mapInstanceRef.current.removeLayer(baseLayer);
    mapInstanceRef.current.getLayers().insertAt(0, baseLayers[currentBaseLayer]);
  }, [currentBaseLayer]);

  // Update GeoJSON visualization when fieldGeoJson changes
  useEffect(() => {
    if (!mapInstanceRef.current || !vectorLayerRef.current || !fieldGeoJson) return;

    const vectorSource = vectorLayerRef.current.getSource();
    if (!vectorSource) return;

    try {
      vectorSource.clear();

      const format = new GeoJSON({
        featureProjection: 'EPSG:3857',
      });

      const feature = format.readFeature(fieldGeoJson);
      
      // Enhanced styling for selected field
      feature.setStyle(new Style({
        stroke: new Stroke({
          color: selectedField ? '#10b981' : '#3b82f6',
          width: selectedField ? 4 : 3,
        }),
        fill: new Fill({
          color: selectedField ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.15)',
        }),
      }));

      vectorSource.addFeature(feature);

      // Auto-fit to field if it's newly selected
      const extent = feature.getGeometry()?.getExtent();
      if (extent && selectedField) {
        mapInstanceRef.current.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 18,
          duration: 1000,
        });
      }
    } catch (error) {
      console.error('Error adding GeoJSON to map:', error);
    }
  }, [fieldGeoJson, selectedField]);

  // Handle heat map data - Auto show legend when field loaded
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove existing heat map layer if it exists
    if (heatMapLayerRef.current) {
      mapInstanceRef.current.removeLayer(heatMapLayerRef.current);
      heatMapLayerRef.current = null;
    }

    // Add new heat map layer if we have tile URL
    if (indexHeatMapData?.tileUrl) {
      const heatMapLayer = new TileLayer({
        source: new XYZ({
          url: indexHeatMapData.tileUrl,
          crossOrigin: 'anonymous',
        }),
        opacity: layerOpacities.heatMap,
      });

      heatMapLayerRef.current = heatMapLayer;
      mapInstanceRef.current.addLayer(heatMapLayer);
      setShowLegend(true); // Always show legend when field is loaded
    }
  }, [indexHeatMapData, layerOpacities.heatMap]);

  // Handle time series data and show slider
  useEffect(() => {
    if (timeSeriesData?.results && timeSeriesData.results.length > 0) {
      setShowTimeSeriesSlider(true);
      setCurrentTimeSeriesIndex(0);
      setShowLegend(true); // Always show legend when time series is loaded
      // Load the first time series image
      updateTimeSeriesLayer(0);
    } else {
      setShowTimeSeriesSlider(false);
      // Remove time series layer if it exists
      if (timeSeriesLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(timeSeriesLayerRef.current);
        timeSeriesLayerRef.current = null;
      }
    }
  }, [timeSeriesData]);

  // Update time series layer
  const updateTimeSeriesLayer = (index: number) => {
    if (!mapInstanceRef.current || !timeSeriesData?.results?.[index]) return;

    // Remove existing time series layer
    if (timeSeriesLayerRef.current) {
      mapInstanceRef.current.removeLayer(timeSeriesLayerRef.current);
      timeSeriesLayerRef.current = null;
    }

    // Add new time series layer
    const imageData = timeSeriesData.results[index];
    if (imageData.tile_url) {
      const timeSeriesLayer = new TileLayer({
        source: new XYZ({
          url: imageData.tile_url,
          crossOrigin: 'anonymous',
        }),
        opacity: layerOpacities.timeSeries,
      });

      timeSeriesLayerRef.current = timeSeriesLayer;
      mapInstanceRef.current.addLayer(timeSeriesLayer);
      
      // Notify parent component of the change
      if (onTimeSeriesSliderChange) {
        onTimeSeriesSliderChange(imageData);
      }
    }
  };

  // Handle time series slider change
  const handleTimeSeriesSliderChange = (index: number) => {
    setCurrentTimeSeriesIndex(index);
    updateTimeSeriesLayer(index);
  };

  // Auto-play functionality for time series
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlayingTimeSeries && timeSeriesData?.results) {
      interval = setInterval(() => {
        setCurrentTimeSeriesIndex(prev => {
          const nextIndex = (prev + 1) % timeSeriesData.results.length;
          updateTimeSeriesLayer(nextIndex);
          return nextIndex;
        });
      }, playbackSpeed);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlayingTimeSeries, playbackSpeed, timeSeriesData]);

  // Handle zoom level changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      const currentZoom = mapInstanceRef.current.getView().getZoom();
      if (Math.abs((currentZoom || 16) - zoomLevel) > 0.5) {
        mapInstanceRef.current.getView().animate({
          zoom: zoomLevel,
          duration: 300
        });
      }
    }
  }, [zoomLevel]);

  // Map control functions
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 1, 20));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 1, 1));
  };

  const handleZoomToField = () => {
    if (vectorLayerRef.current && selectedField) {
      const source = vectorLayerRef.current.getSource();
      const features = source?.getFeatures();
      if (features && features.length > 0) {
        const extent = features[0].getGeometry()?.getExtent();
        if (extent) {
          mapInstanceRef.current?.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            maxZoom: 18,
            duration: 1000,
          });
        }
      }
    }
  };

  const toggleLayerVisibility = (layerType: 'heatMap' | 'timeSeries') => {
    const layer = layerType === 'heatMap' ? heatMapLayerRef.current : timeSeriesLayerRef.current;
    if (layer) {
      const currentOpacity = layer.getOpacity();
      const newOpacity = currentOpacity > 0 ? 0 : layerOpacities[layerType];
      layer.setOpacity(newOpacity);
    }
  };

  const adjustLayerOpacity = (layerType: 'heatMap' | 'timeSeries', opacity: number) => {
    setLayerOpacities(prev => ({ ...prev, [layerType]: opacity }));
    const layer = layerType === 'heatMap' ? heatMapLayerRef.current : timeSeriesLayerRef.current;
    if (layer) {
      layer.setOpacity(opacity);
    }
  };

  const createColorScale = (visParams: any) => {
    if (!visParams || !visParams.palette) return [];
    
    const { min, max, palette } = visParams;
    const steps = palette.length;
    const stepSize = (max - min) / (steps - 1);
    
    return palette.map((color: string, index: number) => ({
      color,
      value: min + (stepSize * index),
      label: (min + (stepSize * index)).toFixed(3)
    }));
  };

  // Get current time series image data
  const getCurrentTimeSeriesImage = () => {
    return timeSeriesData?.results?.[currentTimeSeriesIndex];
  };

  // Get current analysis info
  const getCurrentAnalysisInfo = () => {
    if (showTimeSeriesSlider && getCurrentTimeSeriesImage()) {
      return {
        type: 'Time Series',
        index: timeSeriesData.index?.toUpperCase(),
        date: new Date(getCurrentTimeSeriesImage().date).toLocaleDateString(),
        value: getCurrentTimeSeriesImage().mean_index_value?.toFixed(3)
      };
    } else if (indexHeatMapData) {
      return {
        type: 'Heat Map',
        index: indexHeatMapData.index?.toUpperCase(),
        date: new Date(indexHeatMapData.firstImageDate).toLocaleDateString(),
        value: null
      };
    }
    return null;
  };

  return (
    <div className={`relative w-full h-full bg-gray-900 overflow-hidden ${className}`}>
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full"></div>
      
      {/* Loading indicator */}
      {isLoadingGeoJson && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
            <span className="text-sm text-gray-600">Loading field boundaries...</span>
          </div>
        </div>
      )}
      
      {/* Enhanced Map Controls */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg z-10">
        <button 
          onClick={handleZoomIn}
          className="block w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-t-lg border-b border-gray-200 transition-colors"
          title="Zoom In"
        >
          <i className="ri-add-line text-lg font-bold text-gray-700"></i>
        </button>
        <button 
          onClick={handleZoomOut}
          className="block w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-b-lg transition-colors"
          title="Zoom Out"
        >
          <i className="ri-subtract-line text-lg font-bold text-gray-700"></i>
        </button>
      </div>

      {/* Main Action Controls - Enhanced with more margin */}

      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg z-10">
        <button 
          onClick={handleZoomIn}
          className="block w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-t-lg border-b border-gray-200 transition-colors"
          title="Zoom In"
        >
          <i className="ri-add-line text-lg font-bold text-gray-700"></i>
        </button>
        <button 
          onClick={handleZoomOut}
          className="block w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-b-lg transition-colors"
          title="Zoom Out"
        >
          <i className="ri-subtract-line text-lg font-bold text-gray-700"></i>
        </button>
      </div>

      {/* Main Action Controls - Reduced Vertical Dimension */}
      <div className="absolute top-24 left-4 bg-white rounded-lg shadow-lg z-10 p-2 flex flex-col space-y-1 md:top-4 md:left-24 md:flex-row md:space-y-0 md:space-x-2 md:items-center">
        {/* Base Layer Toggle with Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowBaseLayerMenu(!showBaseLayerMenu)}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
            title="Change Base Layer"
          >
            <i className="ri-stack-line text-base text-gray-700"></i>
          </button>
          
          {showBaseLayerMenu && (
            <div className="absolute left-0 top-12 md:left-0 md:top-12 bg-white rounded-lg shadow-lg p-2 z-10 min-w-32">
              {(['satellite', 'hybrid', 'terrain'] as const).map((layer) => (
                <button
                  key={layer}
                  onClick={() => {
                    setCurrentBaseLayer(layer);
                    setShowBaseLayerMenu(false);
                  }}
                  className={`block w-full text-left px-3 py-2 text-sm rounded capitalize transition-colors ${
                    currentBaseLayer === layer 
                      ? 'bg-emerald-600 text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {layer}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Current Location */}
        <button 
          onClick={getCurrentLocation}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
          title="Current Location"
        >
          <i className="ri-crosshair-line text-base text-gray-700"></i>
        </button>

        {/* Zoom to Field */}
        {selectedField && (
          <button 
            onClick={handleZoomToField}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
            title="Zoom to Field"
          >
            <i className="ri-focus-3-line text-base text-gray-700"></i>
          </button>
        )}

        {/* Heat Map Controls */}
        {indexHeatMapData && (
          <div className="relative group">
            <button 
              onClick={() => toggleLayerVisibility('heatMap')}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
              title="Toggle Heat Map"
            >
              <i className="ri-fire-line text-base text-orange-600"></i>
            </button>
          </div>
        )}
        
        {/* Time Series Controls */}
        {showTimeSeriesSlider && (
          <div className="relative group">
            <button 
              onClick={() => toggleLayerVisibility('timeSeries')}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
              title="Toggle Time Series"
            >
              <i className="ri-time-line text-base text-blue-600"></i>
            </button>
          </div>
        )}

        {/* Fullscreen Toggle */}
        <button 
          onClick={toggleFullscreen}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          <i className={`ri-${isFullscreen ? 'fullscreen-exit' : 'fullscreen'}-line text-base text-gray-700`}></i>
        </button>
      </div>

      {/* Enhanced Time Series Slider */}
      {showTimeSeriesSlider && timeSeriesData?.results && (
        <div className="absolute bottom-20 left-4 right-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <h4 className="text-sm font-semibold text-gray-800 flex items-center">
                <i className="ri-time-line mr-2 text-blue-600"></i>
                Time Series: {timeSeriesData.index?.toUpperCase()}
              </h4>
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {currentTimeSeriesIndex + 1} / {timeSeriesData.results.length}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPlayingTimeSeries(!isPlayingTimeSeries)}
                className={`px-3 py-1 rounded text-sm flex items-center font-medium transition-colors ${
                  isPlayingTimeSeries 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                <i className={`ri-${isPlayingTimeSeries ? 'pause' : 'play'}-line mr-1`}></i>
                {isPlayingTimeSeries ? 'Pause' : 'Play'}
              </button>
              
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="bg-gray-100 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                disabled={isPlayingTimeSeries}
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
                value={currentTimeSeriesIndex}
                onChange={(e) => handleTimeSeriesSliderChange(Number(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${
                    (currentTimeSeriesIndex / (timeSeriesData.results.length - 1)) * 100
                  }%, #e5e7eb ${(currentTimeSeriesIndex / (timeSeriesData.results.length - 1)) * 100}%, #e5e7eb 100%)`
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
          {getCurrentTimeSeriesImage() && (
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="text-center bg-gray-50 rounded p-2">
                <div className="text-gray-600 text-xs mb-1">Date</div>
                <div className="font-semibold text-gray-800">
                  {new Date(getCurrentTimeSeriesImage().date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              </div>
              <div className="text-center bg-emerald-50 rounded p-2">
                <div className="text-gray-600 text-xs mb-1">Mean {timeSeriesData.index?.toUpperCase()}</div>
                <div className="font-semibold text-emerald-600 text-lg">
                  {getCurrentTimeSeriesImage().mean_index_value?.toFixed(3)}
                </div>
              </div>
              <div className="text-center bg-blue-50 rounded p-2">
                <div className="text-gray-600 text-xs mb-1">Progress</div>
                <div className="font-semibold text-blue-600">
                  {Math.round(((currentTimeSeriesIndex + 1) / timeSeriesData.results.length) * 100)}%
                </div>
              </div>
              <div className="text-center bg-purple-50 rounded p-2">
                <div className="text-gray-600 text-xs mb-1">Cloud Cover</div>
                <div className="font-semibold text-purple-600">
                  {getCurrentTimeSeriesImage().cloud_cover ? 
                    `${Math.round(getCurrentTimeSeriesImage().cloud_cover)}%` : 'N/A'
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Search Bar - Responsive */}
      <div className="absolute top-4 right-0 w-48 sm:w-64 md:w-80 z-10 px-2 sm:px-4">
        <div className="relative">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full px-3 py-2 pl-8 pr-3 bg-white rounded-lg shadow-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            onFocus={() => {
              if (searchResults.length > 0) setShowSearchResults(true);
            }}
            onBlur={() => {
              // Delay hiding results to allow for clicks
              setTimeout(() => setShowSearchResults(false), 150);
            }}
          />
          
          <div className="absolute left-2 top-2.5 flex items-center">
            {isSearching ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
            ) : (
              <i className="ri-search-line text-gray-400"></i>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-20">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => selectSearchResult(result)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="text-sm text-gray-800 font-medium truncate">
                    {result.display_name.split(',')[0]}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {result.display_name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Legend with Color Bar - Mobile Optimized */}
      {showLegend && (
        <div className="absolute right-2 sm:top-6 sm:right-6 bg-white rounded-lg shadow-lg p-2 sm:p-4 z-10 max-w-xs w-auto mx-2 sm:mx-0" style={{ top: '80px' }}>
     
          
          <div className="space-y-2 sm:space-y-3">
            {/* Index Info */}
            <div className="bg-gray-50 rounded p-2">
              <div className="text-xs font-medium text-gray-700 mb-1">
                {getCurrentAnalysisInfo()?.index}
              </div>
              <div className="text-xs text-gray-600 truncate">
                {getCurrentAnalysisInfo()?.date}
              </div>
              {getCurrentAnalysisInfo()?.value && (
                <div className="text-xs font-semibold text-emerald-600 mt-1">
                  Mean: {getCurrentAnalysisInfo()?.value}
                </div>
              )}
            </div>

            {/* Color Bar Legend */}
            {(timeSeriesData?.vis_params || indexHeatMapData?.visParams) && (() => {
              const visParams = timeSeriesData?.vis_params || indexHeatMapData?.visParams;
              const { min, max, palette } = visParams;
              
              return (
                <div className="space-y-2">
                  {/* Color Bar */}
                  <div className="relative h-3 sm:h-4 rounded border border-gray-300 overflow-hidden">
                    <div 
                      className="h-full w-full"
                      style={{
                        background: `linear-gradient(to right, ${palette.join(', ')})`
                      }}
                    />
                  </div>
                  
                  {/* Min-Max Labels */}
                  <div className="flex justify-between text-xs text-gray-600 font-mono">
                    <span>{min.toFixed(2)}</span>
                    <span>{max.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Analysis Status Indicator */}
      {getCurrentAnalysisInfo() && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-10 border-l-4 border-emerald-500">
          <div className="flex items-center text-sm">
            <div className="flex items-center text-emerald-600 mr-3">
              <i className="ri-check-circle-line mr-1"></i>
              <span className="font-medium">Active Analysis</span>
            </div>
            <div className="text-gray-700">
              {getCurrentAnalysisInfo()?.type}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Map Info Bar */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 text-white px-4 py-2 rounded-lg text-sm z-10 flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <i className="ri-zoom-in-line"></i>
          <span>Zoom: {Math.round(zoomLevel)}</span>
        </div>
        <div className="flex items-center space-x-2">
          <i className="ri-map-pin-line"></i>
          <span>{mapCoordinates[1].toFixed(4)}, {mapCoordinates[0].toFixed(4)}</span>
        </div>
        {selectedField && (
          <div className="flex items-center space-x-2">
            <i className="ri-plant-line"></i>
            <span>Field: {selectedField.farm_name}</span>
          </div>
        )}
      </div>

      {/* Click handler to close dropdowns */}
      <div 
        className="absolute inset-0 pointer-events-none"
        onClick={() => {
          setShowBaseLayerMenu(false);
          setShowSearchResults(false);
        }}
      />

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