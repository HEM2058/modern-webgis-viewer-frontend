import React from 'react';

interface AnalysisInfo {
  type: string;
  index: string;
  date: string;
  value?: string;
}

interface VisParams {
  min: number;
  max: number;
  palette: string[];
}

interface MapLegendProps {
  analysisInfo: AnalysisInfo | null;
  visParams: VisParams | null;
}

export default function MapLegend({ analysisInfo, visParams }: MapLegendProps) {
  if (!analysisInfo) return null;

  return (
    <div className="absolute right-2 sm:top-6 sm:right-6 bg-white rounded-lg shadow-lg p-2 sm:p-4 z-10 max-w-xs w-auto mx-2 sm:mx-0" style={{ top: '80px' }}>
      <div className="space-y-2 sm:space-y-3">
        {/* Index Info */}
        <div className="bg-gray-50 rounded p-2">
          <div className="text-xs font-medium text-gray-700 mb-1">
            {analysisInfo.index}
          </div>
          <div className="text-xs text-gray-600 truncate">
            {analysisInfo.date}
          </div>
          {analysisInfo.value && (
            <div className="text-xs font-semibold text-emerald-600 mt-1">
              Mean: {analysisInfo.value}
            </div>
          )}
        </div>

        {/* Color Bar Legend */}
        {visParams && (
          <div className="space-y-2">
            {/* Color Bar */}
            <div className="relative h-3 sm:h-4 rounded border border-gray-300 overflow-hidden">
              <div 
                className="h-full w-full"
                style={{
                  background: `linear-gradient(to right, ${visParams.palette.join(', ')})`
                }}
              />
            </div>
            
            {/* Min-Max Labels */}
            <div className="flex justify-between text-xs text-gray-600 font-mono">
              <span>{visParams.min.toFixed(2)}</span>
              <span>{visParams.max.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}