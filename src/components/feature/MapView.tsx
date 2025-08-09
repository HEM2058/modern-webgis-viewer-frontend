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
  onFieldClick?: (field: any) => void;
  onZoomToField?: (fieldId: any) => void;
  isLoadingGeoJson?: boolean;
}

export default function MapView({
  selectedField,
  fieldGeoJson,
  analysisResults,
  indexHeatMapData,
  onFieldClick,
  onZoomToField,
  isLoadingGeoJson = false
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const vectorLayerRef = useRef<VectorLayer | null>(null);
  const [zoomLevel, setZoomLevel] = useState(12);

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
          color: '#10b981', // Emerald color
          width: 3,
        }),
        fill: new Fill({
          color: 'rgba(16, 185, 129, 0.1)', // Semi-transparent emerald
        }),
      }),
    });

    vectorLayerRef.current = vectorLayer;

    // Create the map
    const map = new Map({
      target: mapRef.current,
      layers: [satelliteLayer, vectorLayer],
      view: new View({
        center: fromLonLat([120.86, 15.59]), // Default center
        zoom: zoomLevel,
      }),
      controls: defaultControls({ zoom: false }), // Disable default zoom controls
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
      // Clear existing features
      vectorSource.clear();

      // Parse and add the new GeoJSON
      const format = new GeoJSON({
        featureProjection: 'EPSG:3857', // Web Mercator projection
      });

      // Create feature from GeoJSON
      const feature = format.readFeature(fieldGeoJson);
      
      // Add custom style for selected field
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

      // Zoom to the feature extent
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

  const handleZoomToField = () => {
    if (selectedField && onZoomToField) {
      onZoomToField(selectedField.farm_id);
    }
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

      {/* Coordinates Display */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-sm z-10">
        {selectedField ? (
          `Field: ${selectedField.farm_name}`
        ) : (
          'Select a field to view details'
        )}
      </div>
    </div>
  );
}