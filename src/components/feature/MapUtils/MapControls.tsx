import React from 'react';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onGetCurrentLocation: () => void;
  onZoomToField: () => void;
  onToggleFullscreen: () => void;
  onToggleHeatMap: () => void;
  onToggleTimeSeries: () => void;
  selectedField: any;
  hasIndexHeatMap: boolean;
  hasTimeSeries: boolean;
  isFullscreen: boolean;
  currentBaseLayer: 'satellite' | 'hybrid' | 'terrain';
  onBaseLayerChange: (layer: 'satellite' | 'hybrid' | 'terrain') => void;
  showBaseLayerMenu: boolean;
  onToggleBaseLayerMenu: () => void;
}

export default function MapControls({
  onZoomIn,
  onZoomOut,
  onGetCurrentLocation,
  onZoomToField,
  onToggleFullscreen,
  onToggleHeatMap,
  onToggleTimeSeries,
  selectedField,
  hasIndexHeatMap,
  hasTimeSeries,
  isFullscreen,
  currentBaseLayer,
  onBaseLayerChange,
  showBaseLayerMenu,
  onToggleBaseLayerMenu
}: MapControlsProps) {
  return (
    <>
      {/* Zoom Controls */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg z-10">
        <button 
          onClick={onZoomIn}
          className="block w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-t-lg border-b border-gray-200 transition-colors"
          title="Zoom In"
        >
          <i className="ri-add-line text-lg font-bold text-gray-700"></i>
        </button>
        <button 
          onClick={onZoomOut}
          className="block w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-b-lg transition-colors"
          title="Zoom Out"
        >
          <i className="ri-subtract-line text-lg font-bold text-gray-700"></i>
        </button>
      </div>

      {/* Main Action Controls */}
      <div className="absolute top-24 left-4 bg-white rounded-lg shadow-lg z-10 p-2 flex flex-col space-y-1 md:top-4 md:left-24 md:flex-row md:space-y-0 md:space-x-2 md:items-center">
        {/* Base Layer Toggle with Dropdown */}
        <div className="relative">
          <button 
            onClick={onToggleBaseLayerMenu}
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
                  onClick={() => onBaseLayerChange(layer)}
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
          onClick={onGetCurrentLocation}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
          title="Current Location"
        >
          <i className="ri-crosshair-line text-base text-gray-700"></i>
        </button>

        {/* Zoom to Field */}
        {selectedField && (
          <button 
            onClick={onZoomToField}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
            title="Zoom to Field"
          >
            <i className="ri-focus-3-line text-base text-gray-700"></i>
          </button>
        )}

        {/* Heat Map Controls */}
        {hasIndexHeatMap && (
          <div className="relative group">
            <button 
              onClick={onToggleHeatMap}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
              title="Toggle Heat Map"
            >
              <i className="ri-fire-line text-base text-orange-600"></i>
            </button>
          </div>
        )}
        
        {/* Time Series Controls */}
        {hasTimeSeries && (
          <div className="relative group">
            <button 
              onClick={onToggleTimeSeries}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
              title="Toggle Time Series"
            >
              <i className="ri-time-line text-base text-blue-600"></i>
            </button>
          </div>
        )}

        {/* Fullscreen Toggle */}
        <button 
          onClick={onToggleFullscreen}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          <i className={`ri-${isFullscreen ? 'fullscreen-exit' : 'fullscreen'}-line text-base text-gray-700`}></i>
        </button>
      </div>
    </>
  );
}