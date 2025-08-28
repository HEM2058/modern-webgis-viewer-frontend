import React, { useEffect, useRef } from 'react';
import { Map, View } from 'ol';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM, Vector as VectorSource } from 'ol/source';
import { fromLonLat, toLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';
import { Style, Stroke, Fill } from 'ol/style';
import { Polygon } from 'ol/geom';
import { Feature } from 'ol';
import { getCenter } from 'ol/extent';
import 'ol/ol.css';

interface InsetMapProps {
  mainMap?: Map;
  className?: string;
}

export default function InsetMap({ mainMap, className = '' }: InsetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const insetMapRef = useRef<Map | null>(null);
  const extentLayerRef = useRef<VectorLayer | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    console.log('InsetMap: Initializing interactive inset map...');

    // Create the inset map
    const insetMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        })
      ],
      view: new View({
        center: fromLonLat([124.659593, 8.067894]), // Philippines center
        zoom: 5, // Broader view for overview
      }),
      controls: defaultControls({
        zoom: false,
        attribution: false,
        rotate: false
      }),
    });

    // Create vector source and layer for showing main map bbox
    const vectorSource = new VectorSource();
    const extentLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        stroke: new Stroke({
          color: '#ff4444',
          width: 3,
          lineDash: [8, 4], // Dashed line for better visibility
        }),
        fill: new Fill({
          color: 'rgba(255, 68, 68, 0.15)',
        }),
      }),
      zIndex: 1000, // Ensure it's on top
    });

    insetMap.addLayer(extentLayer);
    insetMapRef.current = insetMap;
    extentLayerRef.current = extentLayer;

    console.log('InsetMap: Interactive inset map initialized');

    // Update bbox indicator when main map changes
    const updateExtent = () => {
      if (!mainMap || !extentLayerRef.current) return;

      const mainView = mainMap.getView();
      const extent = mainView.calculateExtent();
      const size = mainMap.getSize();
      const zoom = mainView.getZoom();
      const center = mainView.getCenter();
      
      if (extent && size && zoom && center) {
        // Clear previous extent features
        vectorSource.clear();

        // Convert extent to lon/lat for logging
        const lonLatExtent = [
          toLonLat([extent[0], extent[1]]),
          toLonLat([extent[2], extent[3]])
        ];

        console.log('InsetMap: Main map navigation update:', {
          bbox: extent,
          lonLatBbox: {
            southwest: lonLatExtent[0],
            northeast: lonLatExtent[1]
          },
          center: toLonLat(center),
          zoom: zoom.toFixed(2),
          mapSize: size
        });

        // Create polygon feature for the main map viewport bbox
        const extentCoords = [
          [extent[0], extent[1]], // bottom-left
          [extent[2], extent[1]], // bottom-right
          [extent[2], extent[3]], // top-right
          [extent[0], extent[3]], // top-left
          [extent[0], extent[1]]  // close polygon
        ];

        const extentFeature = new Feature({
          geometry: new Polygon([extentCoords]),
        });

        // Add custom properties for debugging
        extentFeature.set('type', 'main_map_bbox');
        extentFeature.set('zoom', zoom);
        extentFeature.set('center', center);

        vectorSource.addFeature(extentFeature);
        
        // Force inset map to render the updated bbox
        insetMapRef.current?.render();
      }
    };

    // Handle click on inset map to sync main map
    const handleInsetMapClick = (event: any) => {
      if (!mainMap) return;

      const clickedCoordinate = event.coordinate;
      console.log('InsetMap: Clicked coordinate:', clickedCoordinate);
      
      // Convert to lon/lat for logging
      const lonLat = toLonLat(clickedCoordinate);
      console.log('InsetMap: Clicked lon/lat:', lonLat);

      // Get current main map view
      const mainView = mainMap.getView();
      const currentZoom = mainView.getZoom() || 10;
      
      // Animate main map to clicked location
      mainView.animate({
        center: clickedCoordinate,
        zoom: currentZoom, // Keep current zoom level
        duration: 500
      });
      
      console.log('InsetMap: Synced main map to new center:', clickedCoordinate);
    };

    // Add click listener to inset map
    insetMap.on('singleclick', handleInsetMapClick);

    // Handle drag on extent box to move main map
    let isDragging = false;
    let dragStartCoordinate: any = null;

    const handlePointerDown = (event: any) => {
      const feature = insetMap.forEachFeatureAtPixel(event.pixel, (feature) => feature);
      if (feature) {
        isDragging = true;
        dragStartCoordinate = event.coordinate;
        insetMap.getTarget().style.cursor = 'grabbing';
        event.preventDefault();
      }
    };

    const handlePointerMove = (event: any) => {
      if (isDragging && dragStartCoordinate && mainMap) {
        const dragCurrentCoordinate = event.coordinate;
        const deltaX = dragCurrentCoordinate[0] - dragStartCoordinate[0];
        const deltaY = dragCurrentCoordinate[1] - dragStartCoordinate[1];
        
        // Update main map center
        const mainView = mainMap.getView();
        const currentCenter = mainView.getCenter();
        if (currentCenter) {
          const newCenter = [currentCenter[0] + deltaX, currentCenter[1] + deltaY];
          mainView.setCenter(newCenter);
        }
        
        dragStartCoordinate = dragCurrentCoordinate;
      } else {
        // Show pointer cursor when hovering over extent box
        const feature = insetMap.forEachFeatureAtPixel(event.pixel, (feature) => feature);
        insetMap.getTarget().style.cursor = feature ? 'grab' : 'pointer';
      }
    };

    const handlePointerUp = () => {
      if (isDragging) {
        isDragging = false;
        dragStartCoordinate = null;
        insetMap.getTarget().style.cursor = 'pointer';
      }
    };

    // Add pointer event listeners for dragging
    insetMap.on('pointerdown', handlePointerDown);
    insetMap.on('pointermove', handlePointerMove);
    insetMap.on('pointerup', handlePointerUp);

    // Listen to all main map view changes for real-time bbox updates
    if (mainMap) {
      const mainView = mainMap.getView();
      
      // Listen to center changes (panning)
      mainView.on('change:center', updateExtent);
      
      // Listen to zoom/resolution changes
      mainView.on('change:resolution', updateExtent);
      
      // Listen to any view property changes
      mainView.on('propertychange', updateExtent);
      
      // Listen to map move events
      mainMap.on('movestart', () => {
        console.log('InsetMap: Main map move started');
      });
      
      mainMap.on('moveend', () => {
        console.log('InsetMap: Main map move ended - updating bbox');
        updateExtent();
      });
      
      // Initial extent update
      setTimeout(updateExtent, 100); // Small delay to ensure main map is fully loaded
    }

    // Cleanup
    return () => {
      if (insetMapRef.current) {
        // Remove event listeners
        insetMapRef.current.un('singleclick', handleInsetMapClick);
        insetMapRef.current.un('pointerdown', handlePointerDown);
        insetMapRef.current.un('pointermove', handlePointerMove);
        insetMapRef.current.un('pointerup', handlePointerUp);
        
        // Remove main map listeners
        if (mainMap) {
          const mainView = mainMap.getView();
          mainView.un('change:center', updateExtent);
          mainView.un('change:resolution', updateExtent);
          mainView.un('propertychange', updateExtent);
          
          mainMap.un('movestart');
          mainMap.un('moveend', updateExtent);
        }
        
        insetMapRef.current.setTarget(undefined);
        insetMapRef.current = null;
      }
    };
  }, [mainMap]);

  return (
    <div className={`absolute bottom-4 right-4 z-10 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl border border-gray-300 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-emerald-50 px-3 py-2 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <i className="ri-map-2-line text-blue-600 text-sm"></i>
              <span className="text-xs font-medium text-gray-700">Overview Map</span>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>
        
        {/* Map Container */}
        <div className="relative">
          <div 
            ref={mapRef} 
            className="w-56 h-36 bg-gray-100"
            style={{ minWidth: '224px', minHeight: '144px' }}
          />
          
          {/* Interactive Legend with BBox Info */}
          <div className="absolute top-2 left-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded shadow-lg">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-1">
                <div className="w-4 h-2 border-2 border-red-400 border-dashed bg-red-400 bg-opacity-20"></div>
                <span className="font-medium">Viewport BBox</span>
              </div>
              <div className="text-xs text-gray-300">
                🖱️ Click to navigate
              </div>
              <div className="text-xs text-gray-400 italic">
                Updates with zoom/pan
              </div>
            </div>
          </div>
          
          {/* Attribution */}
          <div className="absolute bottom-1 right-1 text-xs text-gray-500 bg-white bg-opacity-90 px-1 rounded">
            © OSM
          </div>
        </div>
      </div>
    </div>
  );
}