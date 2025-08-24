import React, { useState, useRef, useEffect } from 'react';
import type { LayerVisibilityState, LayerOpacityState } from './MapUtils/MapLayerManager';

interface LayerTogglePanelProps {
  layerVisibility: LayerVisibilityState;
  layerOpacity: LayerOpacityState;
  onLayerToggle: (layerType: keyof LayerVisibilityState, visible: boolean) => void;
  onOpacityChange: (layerType: keyof LayerOpacityState, opacity: number) => void;
  legendUrls?: Record<string, string>;
}

export default function LayerTogglePanel({
  layerVisibility,
  layerOpacity,
  onLayerToggle,
  onOpacityChange,
  legendUrls = {}
}: LayerTogglePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeSeries' | 'cropArea'>('timeSeries');
  const [loadingLayers, setLoadingLayers] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const layerConfigs = {
    timeSeries: [
      {
        key: 'yield' as const,
        label: 'Yield',
        icon: 'ri-plant-line',
        color: 'text-green-500',
        description: 'Crop yield predictions',
        hasLegend: true
      },
      {
        key: 'vhi' as const,
        label: 'VHI',
        icon: 'ri-leaf-line',
        color: 'text-emerald-500',
        description: 'Vegetation Health Index',
        hasLegend: true
      },
      {
        key: 'lst' as const,
        label: 'LST',
        icon: 'ri-temp-hot-line',
        color: 'text-orange-500',
        description: 'Land Surface Temperature',
        hasLegend: true
      }
    ],
    cropArea: [
      {
        key: 'maize' as const,
        label: 'Maize Area Map',
        icon: 'ri-seedling-line',
        color: 'text-yellow-600',
        description: 'Philippines Maize cultivation areas from World Cereal dataset'
      },
      {
        key: 'sugarCane' as const,
        label: 'Sugarcane Area Map', 
        icon: 'ri-plant-line',
        color: 'text-green-600',
        description: 'Philippines Sugarcane cultivation areas from World Cereal dataset'
      },
      {
        key: 'rice' as const,
        label: 'Rice Area Map',
        icon: 'ri-seedling-fill',
        color: 'text-green-700',
        description: 'Philippines Rice cultivation areas from World Cereal dataset'
      }
    ]
  };

  // Get currently selected layer for Time Series (only one can be selected)
  const getSelectedTimeSeriesLayer = (): string | null => {
    for (const config of layerConfigs.timeSeries) {
      if (layerVisibility[config.key]) {
        return config.key;
      }
    }
    return null;
  };

  const handleTimeSeriesLayerToggle = (layerKey: keyof LayerVisibilityState) => {
    const currentSelected = getSelectedTimeSeriesLayer();
    
    // If clicking the currently selected layer, deselect it
    if (currentSelected === layerKey) {
      onLayerToggle(layerKey, false);
    } else {
      // First turn off the currently selected layer if any
      if (currentSelected) {
        onLayerToggle(currentSelected as keyof LayerVisibilityState, false);
      }
      // Then turn on the new layer
      onLayerToggle(layerKey, true);
    }
  };

  const handleCropAreaLayerToggle = (layerKey: keyof LayerVisibilityState) => {
    const isVisible = layerVisibility[layerKey];
    onLayerToggle(layerKey, !isVisible);
  };

  const getVisibleLayersCount = (tab: 'timeSeries' | 'cropArea') => {
    const configs = layerConfigs[tab];
    return configs.filter(config => layerVisibility[config.key]).length;
  };

  const renderTimeSeriesLayerItem = (config: typeof layerConfigs.timeSeries[0]) => {
    const isSelected = layerVisibility[config.key];
    const opacity = layerOpacity[config.key];

    return (
      <div key={config.key} className={`bg-white rounded-lg p-4 border-2 transition-all duration-200 cursor-pointer ${
        isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => handleTimeSeriesLayerToggle(config.key)}
      >
        {/* Layer Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {/* Radio button style indicator */}
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                isSelected ? 'border-emerald-500' : 'border-gray-300'
              }`}>
                {isSelected && (
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                )}
              </div>
              <i className={`${config.icon} ${config.color} text-lg`}></i>
              <span className={`font-medium ${isSelected ? 'text-emerald-900' : 'text-gray-900'}`}>
                {config.label}
              </span>
            </div>
          </div>
          
          {/* Selection indicator */}
          <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
        </div>

        {/* Layer Description */}
        <p className={`text-xs mb-3 ${isSelected ? 'text-emerald-700' : 'text-gray-600'}`}>
          {config.description}
        </p>

        {/* Opacity Slider */}
        {isSelected && (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-600">Opacity</span>
              <span className="text-xs font-medium text-emerald-700">{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={opacity}
              onChange={(e) => onOpacityChange(config.key, parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer opacity-slider"
            />
          </div>
        )}

        {/* Legend for Time Series layers */}
        {config.hasLegend && isSelected && legendUrls[config.key] && (
          <div className="mt-3 pt-3 border-t border-emerald-200" onClick={(e) => e.stopPropagation()}>
            <div className="text-xs text-emerald-600 mb-2">Legend</div>
            <img
              src={legendUrls[config.key]}
              alt={`${config.label} Legend`}
              className="max-w-full h-auto rounded border"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>
    );
  };

  const renderCropAreaLayerItem = (config: typeof layerConfigs.cropArea[0]) => {
    const isVisible = layerVisibility[config.key];
    const opacity = layerOpacity[config.key];
    const isLoading = loadingLayers.has(config.key);

    const handleToggle = async () => {
      if (isLoading) return; // Prevent multiple clicks during loading
      
      if (!isVisible) {
        // Show loading state when enabling
        setLoadingLayers(prev => new Set([...prev, config.key]));
      }
      
      handleCropAreaLayerToggle(config.key);
      
      // Remove loading state after a delay (the actual loading is handled in MapView)
      setTimeout(() => {
        setLoadingLayers(prev => {
          const newSet = new Set(prev);
          newSet.delete(config.key);
          return newSet;
        });
      }, 3000); // 3 second timeout
    };

    return (
      <div key={config.key} className={`bg-white rounded-lg p-4 border-2 transition-all duration-200 ${
        isVisible ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
      } ${isLoading ? 'opacity-75' : ''}`}>
        {/* Layer Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isVisible}
                onChange={handleToggle}
                disabled={isLoading}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
              />
              {isLoading ? (
                <div className="animate-spin h-4 w-4 border-2 border-emerald-500 rounded-full border-t-transparent"></div>
              ) : (
                <i className={`${config.icon} ${config.color} text-lg`}></i>
              )}
              <span className={`font-medium ${
                isVisible ? 'text-green-900' : 'text-gray-900'
              } ${isLoading ? 'opacity-75' : ''}`}>
                {config.label}
                {isLoading && <span className="text-xs text-emerald-600 ml-2">(Loading...)</span>}
              </span>
            </label>
          </div>
          
          {/* Status indicator */}
          <div className={`w-2 h-2 rounded-full ${
            isLoading ? 'bg-yellow-500 animate-pulse' : 
            isVisible ? 'bg-green-500' : 'bg-gray-300'
          }`}></div>
        </div>

        {/* Layer Description */}
        <p className={`text-xs mb-3 ${
          isVisible ? 'text-green-700' : 'text-gray-600'
        }`}>{config.description}</p>

        {/* Loading Progress */}
        {isLoading && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-emerald-600 mb-1">
              <span>Fetching crop area data...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-emerald-500 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        )}

        {/* Opacity Slider */}
        {isVisible && !isLoading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-green-600">Opacity</span>
              <span className="text-xs font-medium text-green-700">{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={opacity}
              onChange={(e) => onOpacityChange(config.key, parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer opacity-slider"
            />
          </div>
        )}

        {/* API Info */}
        {isVisible && !isLoading && (
          <div className="mt-3 pt-2 border-t border-green-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-green-600">Data Source</span>
              <span className="text-green-700 font-medium">World Cereal API</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const tabNames = {
    timeSeries: 'Time Series',
    cropArea: 'Crop Areas'
  };

  return (
    <div ref={panelRef} className="absolute top-4 right-4 z-20">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-white rounded-lg shadow-lg p-3 hover:shadow-xl transition-all duration-300 border-2 ${
          isOpen ? 'border-emerald-500' : 'border-gray-200'
        }`}
        title="Layer Controls"
      >
        <div className="flex items-center space-x-2">
          <i className={`ri-stack-line text-xl ${isOpen ? 'text-emerald-600' : 'text-gray-600'}`}></i>
          {/* Active layers indicator */}
          {(getVisibleLayersCount('timeSeries') + getVisibleLayersCount('cropArea')) > 0 && (
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          )}
        </div>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute top-16 right-0 w-80 max-h-96 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <i className="ri-stack-line text-emerald-600 text-lg"></i>
                <h3 className="font-semibold text-gray-900">Layer Controls</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex mt-3 bg-white rounded-lg p-1">
              {(Object.keys(tabNames) as Array<keyof typeof tabNames>).map((tab) => {
                const visibleCount = getVisibleLayersCount(tab);
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors ${
                      activeTab === tab
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tabNames[tab]}
                    {visibleCount > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-xs bg-emerald-500 text-white rounded-full">
                        {visibleCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 max-h-64 overflow-y-auto">
            <div className="space-y-3">
              {activeTab === 'timeSeries' && layerConfigs.timeSeries.map(renderTimeSeriesLayerItem)}
              {activeTab === 'cropArea' && layerConfigs.cropArea.map(renderCropAreaLayerItem)}
            </div>

            {/* Empty state */}
            {layerConfigs[activeTab].length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <i className="ri-landscape-line text-3xl mb-2"></i>
                <p className="text-sm">No layers available in this category</p>
              </div>
            )}
          </div>

          {/* Footer with layer summary */}
          <div className="bg-gray-50 p-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>
                Total Active: {getVisibleLayersCount('timeSeries') + getVisibleLayersCount('cropArea')} layers
              </span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>Live</span>
              </div>
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
          background: #10b981;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .opacity-slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}