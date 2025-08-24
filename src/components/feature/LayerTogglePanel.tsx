import React, { useState } from 'react';

export interface LayerState {
  yield: boolean;
  vhi: boolean;
  lst: boolean;
  heatMap: boolean;
  timeSeries: boolean;
}

export interface LayerOpacity {
  yield: number;
  vhi: number;
  lst: number;
  heatMap: number;
  timeSeries: number;
}

export interface LayerTogglePanelProps {
  layerVisibility: LayerState;
  layerOpacity: LayerOpacity;
  onLayerToggle: (layerType: keyof LayerState, visible: boolean) => void;
  onOpacityChange: (layerType: keyof LayerState, opacity: number) => void;
  onLayerClick?: (layerType: keyof LayerState) => void; // New prop for zoom functionality
  legendUrls?: {
    yield?: string;
    vhi?: string;
    lst?: string;
  };
  className?: string;
}

interface LayerConfig {
  key: keyof LayerState;
  label: string;
  color: string;
  icon: string;
  description: string;
  hasZoom: boolean; // Add flag to indicate which layers support zoom
}

const layerConfigs: LayerConfig[] = [
  {
    key: 'yield',
    label: 'Projected Yield',
    color: 'text-green-600',
    icon: 'ri-leaf-line',
    description: 'Projected Yield (Tons per Hectare)',
    hasZoom: true
  },
  {
    key: 'vhi',
    label: 'VHI',
    color: 'text-blue-600',
    icon: 'ri-heart-pulse-line',
    description: 'Vegetation Health Index',
    hasZoom: true
  },
  {
    key: 'lst',
    label: 'LST',
    color: 'text-red-600',
    icon: 'ri-temp-hot-line',
    description: 'Land Surface Temperature',
    hasZoom: true
  }
];

export default function LayerTogglePanel({
  layerVisibility,
  layerOpacity,
  onLayerToggle,
  onOpacityChange,
  onLayerClick,
  legendUrls = {},
  className = ''
}: LayerTogglePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLegends, setShowLegends] = useState(false);

  // Count visible layers
  const visibleLayersCount = Object.values(layerVisibility).filter(Boolean).length;

  // Handle layer toggle
  const handleLayerToggle = (layerKey: keyof LayerState) => {
    const newVisibility = !layerVisibility[layerKey];
    onLayerToggle(layerKey, newVisibility);
  };

  // Handle opacity change
  const handleOpacityChange = (layerKey: keyof LayerState, value: number) => {
    onOpacityChange(layerKey, value / 100);
  };

  // Handle layer click for zoom functionality
  const handleLayerClick = (layerKey: keyof LayerState) => {
    if (onLayerClick) {
      onLayerClick(layerKey);
    }
  };

  return (
    <div className={`absolute top-4 right-4 z-20 ${className}`}>
      {/* Main Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-white hover:bg-gray-50 rounded-lg shadow-lg p-3 transition-all duration-200 border border-gray-200"
        title="Toggle Layers"
      >
        <div className="flex items-center space-x-2">
          <i className="ri-stack-line text-xl text-gray-700"></i>
          <span className="text-sm font-medium text-gray-700">Layers</span>
          {visibleLayersCount > 0 && (
            <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {visibleLayersCount}
            </span>
          )}
          <i className={`ri-arrow-${isExpanded ? 'up' : 'down'}-s-line text-sm text-gray-500`}></i>
        </div>
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          {/* Panel Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Map Layers</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowLegends(!showLegends)}
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
                  title="Toggle Legends"
                >
                  <i className="ri-image-line mr-1"></i>
                  Legends
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <i className="ri-close-line text-sm"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Layer Controls */}
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {layerConfigs.map((config) => (
              <div key={config.key} className="space-y-2">
                {/* Layer Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <button
                      onClick={() => handleLayerToggle(config.key)}
                      className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
                        layerVisibility[config.key]
                          ? 'bg-green-100 text-green-600 ring-2 ring-green-500 ring-opacity-30'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      <i className={config.icon}></i>
                    </button>
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => handleLayerClick(config.key)}
                    >
                      <div className={`text-sm font-medium ${layerVisibility[config.key] ? config.color : 'text-gray-500'} hover:opacity-80 transition-opacity`}>
                        {config.label}
                        {config.hasZoom && (
                          <i className="ri-map-pin-line ml-1 text-xs opacity-60" title="Click to zoom to Philippines"></i>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{config.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {Math.round(layerOpacity[config.key] * 100)}%
                    </span>
                    {/* Zoom button */}
                    {config.hasZoom && (
                      <button
                        onClick={() => handleLayerClick(config.key)}
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                        title="Zoom to Philippines"
                      >
                        <i className="ri-zoom-in-line text-sm"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Opacity Slider - Only show if layer is visible */}
                {layerVisibility[config.key] && (
                  <div className="ml-11 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Opacity</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={layerOpacity[config.key] * 100}
                      onChange={(e) => handleOpacityChange(config.key, parseInt(e.target.value))}
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer opacity-slider"
                      style={{
                        background: `linear-gradient(to right, ${config.color.replace('text-', 'rgb(from theme(colors.')} 0%, ${config.color.replace('text-', 'rgb(from theme(colors.')} ${layerOpacity[config.key] * 100}%, #e5e7eb ${layerOpacity[config.key] * 100}%, #e5e7eb 100%)`
                      }}
                    />
                  </div>
                )}

                {/* Legend - Only show for WMS layers if legends are enabled */}
                {showLegends && layerVisibility[config.key] && legendUrls[config.key as keyof typeof legendUrls] && (
                  <div className="ml-11 mt-2">
                    <div className="text-xs text-gray-500 mb-1">Legend:</div>
                    <img
                      src={legendUrls[config.key as keyof typeof legendUrls]}
                      alt={`${config.label} Legend`}
                      className="border border-gray-200 rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Divider */}
                {layerConfigs.indexOf(config) < layerConfigs.length - 1 && (
                  <div className="border-b border-gray-100"></div>
                )}
              </div>
            ))}
          </div>

          {/* Panel Footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{visibleLayersCount} layer{visibleLayersCount !== 1 ? 's' : ''} active</span>
              <button
                onClick={() => {
                  // Turn off all layers
                  Object.keys(layerVisibility).forEach((key) => {
                    if (layerVisibility[key as keyof LayerState]) {
                      onLayerToggle(key as keyof LayerState, false);
                    }
                  });
                }}
                className="text-red-600 hover:text-red-700 transition-colors"
                disabled={visibleLayersCount === 0}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .opacity-slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #374151;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          cursor: pointer;
        }

        .opacity-slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #374151;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}