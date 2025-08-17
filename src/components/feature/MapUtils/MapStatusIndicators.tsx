import React from 'react';

interface AnalysisInfo {
  type: string;
  index?: string;
  date?: string;
  value?: string;
}

interface MapStatusIndicatorsProps {
  analysisInfo: AnalysisInfo | null;
  zoomLevel: number;
  mapCoordinates: [number, number];
  selectedField: any;
  isLoadingGeoJson: boolean;
}

export default function MapStatusIndicators({
  analysisInfo,
  zoomLevel,
  mapCoordinates,
  selectedField,
  isLoadingGeoJson
}: MapStatusIndicatorsProps) {
  return (
    <>
      {/* Loading indicator */}
      {isLoadingGeoJson && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
            <span className="text-sm text-gray-600">Loading field boundaries...</span>
          </div>
        </div>
      )}

      {/* Analysis Status Indicator */}
      {analysisInfo && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-10 border-l-4 border-emerald-500">
          <div className="flex items-center text-sm">
            <div className="flex items-center text-emerald-600 mr-3">
              <i className="ri-check-circle-line mr-1"></i>
              <span className="font-medium">Active Analysis</span>
            </div>
            <div className="text-gray-700">
              {analysisInfo.type}
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
    </>
  );
}