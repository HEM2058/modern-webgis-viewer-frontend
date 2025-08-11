import React, { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import { Map, View } from 'ol';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { XYZ, Vector as VectorSource } from 'ol/source';
import { GeoJSON } from 'ol/format';
import { Style, Stroke, Fill } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';

interface MapViewProps {
  selectedField?: any;
  fieldGeoJson?: any;
  analysisResults?: any;
  indexHeatMapData?: any;
  timeSeriesData?: any;
  onFieldClick?: (field: any) => void;
  onZoomToField?: (fieldId: any) => void;
  isLoadingGeoJson?: boolean;
}

export default function MapView({
  selectedField,
  fieldGeoJson,
  analysisResults,
  indexHeatMapData,
  timeSeriesData,
  onFieldClick,
  onZoomToField,
  isLoadingGeoJson = false
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const vectorLayerRef = useRef<VectorLayer | null>(null);
  const heatMapLayerRef = useRef<TileLayer | null>(null);
  const timeSeriesLayerRef = useRef<TileLayer | null>(null);
  
  const [zoomLevel, setZoomLevel] = useState(20);
  const [showLegend, setShowLegend] = useState(false);
  
  // Time Series Slider States
  const [showTimeSeriesSlider, setShowTimeSeriesSlider] = useState(false);
  const [currentTimeSeriesIndex, setCurrentTimeSeriesIndex] = useState(0);
  const [isPlayingTimeSeries, setIsPlayingTimeSeries] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);

  // Initialize the map
  useEffect(() => {
    if (!mapRef.current) return;

    // Create the satellite tile layer using Google Satellite imagery
    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: 'http://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        crossOrigin: 'anonymous',
      }),
    });

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
          color: 'rgba(16, 185, 129, 0.1)',
        }),
      }),
    });

    vectorLayerRef.current = vectorLayer;

    // Create the map
    const map = new Map({
      target: mapRef.current,
      layers: [satelliteLayer, vectorLayer],
      view: new View({
        center: fromLonLat([120.86, 15.59]),
        zoom: zoomLevel,
      }),
      controls: defaultControls({ zoom: false }),
    });

    mapInstanceRef.current = map;

    // Add click handler for map interactions
    map.on('click', (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (feature) => feature);
      if (feature && onFieldClick) {
        const properties = feature.getProperties();
        onFieldClick(properties);
      }
    });

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, []);

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
      
      feature.setStyle(new Style({
        stroke: new Stroke({
          color: '#10b981',
          width: 4,
        }),
        fill: new Fill({
          color: 'rgba(16, 185, 129, 0.2)',
        }),
      }));

      vectorSource.addFeature(feature);

      const extent = feature.getGeometry()?.getExtent();
      if (extent) {
        mapInstanceRef.current.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 16,
          duration: 1000,
        });
      }
    } catch (error) {
      console.error('Error adding GeoJSON to map:', error);
    }
  }, [fieldGeoJson]);

  // Handle heat map data
  useEffect(() => {
    if (!mapInstanceRef.current || !indexHeatMapData) return;

    // Remove existing heat map layer if it exists
    if (heatMapLayerRef.current) {
      mapInstanceRef.current.removeLayer(heatMapLayerRef.current);
      heatMapLayerRef.current = null;
    }

    // Add new heat map layer if we have tile URL
    if (indexHeatMapData.tileUrl) {
      const heatMapLayer = new TileLayer({
        source: new XYZ({
          url: indexHeatMapData.tileUrl,
          crossOrigin: 'anonymous',
        }),
        opacity: 0.7,
      });

      heatMapLayerRef.current = heatMapLayer;
      mapInstanceRef.current.addLayer(heatMapLayer);
      setShowLegend(true);
    }
  }, [indexHeatMapData]);

  // Handle time series data and show slider
  useEffect(() => {
    if (timeSeriesData?.results && timeSeriesData.results.length > 0) {
      setShowTimeSeriesSlider(true);
      setCurrentTimeSeriesIndex(0);
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
        opacity: 0.7,
      });

      timeSeriesLayerRef.current = timeSeriesLayer;
      mapInstanceRef.current.addLayer(timeSeriesLayer);
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
      mapInstanceRef.current.getView().setZoom(zoomLevel);
    }
  }, [zoomLevel]);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 1, 18));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 1, 1));
  };

  const toggleHeatMapVisibility = () => {
    if (heatMapLayerRef.current) {
      const currentOpacity = heatMapLayerRef.current.getOpacity();
      heatMapLayerRef.current.setOpacity(currentOpacity > 0 ? 0 : 0.7);
    }
  };

  const toggleTimeSeriesVisibility = () => {
    if (timeSeriesLayerRef.current) {
      const currentOpacity = timeSeriesLayerRef.current.getOpacity();
      timeSeriesLayerRef.current.setOpacity(currentOpacity > 0 ? 0 : 0.7);
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
      label: (min + (stepSize * index)).toFixed(2)
    }));
  };

  // Get current time series image data
  const getCurrentTimeSeriesImage = () => {
    return timeSeriesData?.results?.[currentTimeSeriesIndex];
  };

  return (
    <div className="relative w-full h-full bg-gray-900 overflow-hidden">
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full"></div>
      
      {/* Loading indicator for GeoJSON */}
      {isLoadingGeoJson && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
            <span className="text-sm text-gray-600">Loading field boundaries...</span>
          </div>
        </div>
      )}
      
      {/* Map Controls */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg z-10">
        <button 
          onClick={handleZoomIn}
          className="block w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-t-lg border-b border-gray-200"
          title="Zoom In"
        >
          <i className="ri-add-line text-lg font-bold"></i>
        </button>
        <button 
          onClick={handleZoomOut}
          className="block w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-b-lg"
          title="Zoom Out"
        >
          <i className="ri-subtract-line text-lg font-bold"></i>
        </button>
      </div>

      {/* Layer Controls */}
      <div className="absolute top-16 left-4 bg-white rounded-lg shadow-lg z-10 p-2 space-y-1">
        {/* Heat Map Controls */}
        {indexHeatMapData && (
          <button 
            onClick={toggleHeatMapVisibility}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg"
            title="Toggle Heat Map"
          >
            <i className="ri-fire-line text-lg"></i>
          </button>
        )}
        
        {/* Time Series Controls */}
        {showTimeSeriesSlider && (
          <button 
            onClick={toggleTimeSeriesVisibility}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg"
            title="Toggle Time Series"
          >
            <i className="ri-time-line text-lg"></i>
          </button>
        )}
        
        {/* Legend Toggle */}
        {(indexHeatMapData || showTimeSeriesSlider) && (
          <button 
            onClick={() => setShowLegend(!showLegend)}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg"
            title="Toggle Legend"
          >
            <i className="ri-palette-line text-lg"></i>
          </button>
        )}
      </div>

      {/* Time Series Slider */}
      {showTimeSeriesSlider && timeSeriesData?.results && (
        <div className="absolute bottom-20 left-4 right-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800 flex items-center">
              <i className="ri-time-line mr-2"></i>
              Time Series: {timeSeriesData.index?.toUpperCase()}
            </h4>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPlayingTimeSeries(!isPlayingTimeSeries)}
                className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm flex items-center"
              >
                <i className={`ri-${isPlayingTimeSeries ? 'pause' : 'play'}-line mr-1`}></i>
                {isPlayingTimeSeries ? 'Pause' : 'Play'}
              </button>
              
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="bg-gray-100 border border-gray-300 rounded px-2 py-1 text-xs"
              >
                <option value={2000}>0.5x</option>
                <option value={1000}>1x</option>
                <option value={500}>2x</option>
                <option value={250}>4x</option>
              </select>
            </div>
          </div>

          {/* Slider */}
          <div className="mb-3">
            <input
              type="range"
              min="0"
              max={timeSeriesData.results.length - 1}
              value={currentTimeSeriesIndex}
              onChange={(e) => handleTimeSeriesSliderChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #10b981 0%, #10b981 ${
                  (currentTimeSeriesIndex / (timeSeriesData.results.length - 1)) * 100
                }%, #e5e7eb ${(currentTimeSeriesIndex / (timeSeriesData.results.length - 1)) * 100}%, #e5e7eb 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{new Date(timeSeriesData.results[0].date).toLocaleDateString()}</span>
              <span>{new Date(timeSeriesData.results[timeSeriesData.results.length - 1].date).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Current Image Info */}
          {getCurrentTimeSeriesImage() && (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-gray-600">Date</div>
                <div className="font-semibold">
                  {new Date(getCurrentTimeSeriesImage().date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-600">Mean {timeSeriesData.index?.toUpperCase()}</div>
                <div className="font-semibold text-emerald-600">
                  {getCurrentTimeSeriesImage().mean_index_value.toFixed(3)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-600">Image</div>
                <div className="font-semibold">
                  {currentTimeSeriesIndex + 1} / {timeSeriesData.results.length}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-md z-10">
        <div className="relative">
          <input 
            type="text"
            placeholder="Search locations, fields, or coordinates..."
            className="w-full px-4 py-2 pl-10 bg-white rounded-lg shadow-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <i className="ri-search-line absolute left-3 top-2.5 text-gray-400"></i>
          <button className="absolute right-2 top-1.5 p-1 hover:bg-gray-100 rounded">
            <i className="ri-map-pin-line text-gray-400"></i>
          </button>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="absolute top-4 right-20 bg-white rounded-lg shadow-lg p-4 z-10 max-w-xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800">
              {showTimeSeriesSlider && getCurrentTimeSeriesImage() 
                ? `${timeSeriesData.index?.toUpperCase()} - ${new Date(getCurrentTimeSeriesImage().date).toLocaleDateString()}`
                : indexHeatMapData?.index?.toUpperCase() || 'Index'} Legend
            </h4>
            <button 
              onClick={() => setShowLegend(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="ri-close-line text-sm"></i>
            </button>
          </div>
          
          <div className="space-y-1">
            {(timeSeriesData?.vis_params || indexHeatMapData?.visParams) && 
             createColorScale(timeSeriesData?.vis_params || indexHeatMapData?.visParams).map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded border border-gray-300"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-xs text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-3 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              {showTimeSeriesSlider && getCurrentTimeSeriesImage() ? (
                <>
                  <div>Date: {getCurrentTimeSeriesImage().date}</div>
                  <div>Mean Value: {getCurrentTimeSeriesImage().mean_index_value.toFixed(3)}</div>
                </>
              ) : indexHeatMapData ? (
                <>
                  <div>Date: {indexHeatMapData.firstImageDate}</div>
                  <div>Range: {indexHeatMapData.visParams?.min} to {indexHeatMapData.visParams?.max}</div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Analysis Status */}
      {analysisResults && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10">
          <div className="flex items-center text-sm text-green-600">
            <i className="ri-check-line mr-2"></i>
            Analysis Complete
          </div>
        </div>
      )}

      {/* Location Controls */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2 z-10">
        <button 
          className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-100"
          title="Notifications"
        >
          <i className="ri-notification-line text-gray-600"></i>
        </button>
        <button 
          className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-100"
          title="User Profile"
        >
          <i className="ri-user-line text-gray-600"></i>
        </button>
        <button 
          className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-100"
          title="Add Layer"
        >
          <i className="ri-add-line text-gray-600"></i>
        </button>
        <button 
          className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-100"
          title="Layer Options"
        >
          <i className="ri-settings-3-line text-gray-600"></i>
        </button>
      </div>

      {/* Zoom Level Indicator */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-sm z-10">
        Zoom: {Math.round(zoomLevel)}
      </div>

      {/* Field Info Display */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-sm z-10">
        {selectedField ? (
          `Field: ${selectedField.farm_name}`
        ) : (
          'Select a field to view details'
        )}
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .slider::-moz-range-thumb {
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