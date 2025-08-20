import { useState } from 'react';

interface LayersPanelProps {
  onLayerToggle?: (layerId: string, active: boolean) => void;
  onFileUpload?: (files: File[]) => void;
  initialLayers?: any[];
  
  // Analysis layers props
  indexData?: any;
  vhiData?: any;
  timeSeriesData?: any;
  onIndexLayerToggle?: (active: boolean) => void;
  onVhiLayerToggle?: (active: boolean) => void;
  onTimeSeriesLayerToggle?: (active: boolean) => void;
  indexLayerVisible?: boolean;
  vhiLayerVisible?: boolean;
  timeSeriesLayerVisible?: boolean;
}

// Three Analysis Layers Toggle Component
function AnalysisLayersToggle({
  indexData,
  vhiData,
  timeSeriesData,
  indexLayerVisible = false,
  vhiLayerVisible = false,
  timeSeriesLayerVisible = false,
  onIndexLayerToggle,
  onVhiLayerToggle,
  onTimeSeriesLayerToggle
}: {
  indexData?: any;
  vhiData?: any;
  timeSeriesData?: any;
  indexLayerVisible?: boolean;
  vhiLayerVisible?: boolean;
  timeSeriesLayerVisible?: boolean;
  onIndexLayerToggle?: (active: boolean) => void;
  onVhiLayerToggle?: (active: boolean) => void;
  onTimeSeriesLayerToggle?: (active: boolean) => void;
}) {
  return (
    <div className="mb-6">
      <h4 className="text-sm font-medium mb-3 flex items-center">
        <i className="ri-bar-chart-line mr-2"></i>
        Analysis Layers
      </h4>
      
      <div className="space-y-3">
        {/* Index Layer */}
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${indexLayerVisible ? 'bg-blue-500' : 'bg-gray-600'}`}></div>
              <div>
                <span className={`text-sm font-medium ${indexLayerVisible ? 'text-white' : 'text-gray-400'}`}>
                  Index Layer
                </span>
                {indexData?.index_type && (
                  <div className="text-xs text-gray-400">
                    {indexData.index_type.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => onIndexLayerToggle?.(!indexLayerVisible)}
              disabled={!indexData?.results?.length}
              className={`relative w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                indexLayerVisible && indexData?.results?.length ? 'bg-blue-500' : 'bg-gray-600'
              } ${!indexData?.results?.length ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`absolute w-4 h-4 rounded-full bg-white transition-transform ${
                indexLayerVisible && indexData?.results?.length ? 'translate-x-5' : 'translate-x-1'
              }`}></div>
            </button>
          </div>
          
          {indexData?.results?.length > 0 && (
            <div className="text-xs text-gray-400 space-y-1">
              <div>Images: {indexData.results.length}</div>
              <div>Date Range: {indexData.results[0]?.date} - {indexData.results[indexData.results.length - 1]?.date}</div>
            </div>
          )}
          
          {!indexData?.results?.length && (
            <div className="text-xs text-gray-500">
              No index data available
            </div>
          )}
        </div>

        {/* VHI Layer */}
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${vhiLayerVisible ? 'bg-green-500' : 'bg-gray-600'}`}></div>
              <div>
                <span className={`text-sm font-medium ${vhiLayerVisible ? 'text-white' : 'text-gray-400'}`}>
                  VHI Layer
                </span>
                <div className="text-xs text-gray-400">
                  Vegetation Health Index
                </div>
              </div>
            </div>
            <button
              onClick={() => onVhiLayerToggle?.(!vhiLayerVisible)}
              disabled={!vhiData?.results?.length}
              className={`relative w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                vhiLayerVisible && vhiData?.results?.length ? 'bg-green-500' : 'bg-gray-600'
              } ${!vhiData?.results?.length ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`absolute w-4 h-4 rounded-full bg-white transition-transform ${
                vhiLayerVisible && vhiData?.results?.length ? 'translate-x-5' : 'translate-x-1'
              }`}></div>
            </button>
          </div>
          
          {vhiData?.results?.length > 0 && (
            <div className="text-xs text-gray-400 space-y-1">
              <div>Images: {vhiData.results.length}</div>
              <div>Date Range: {vhiData.results[0]?.date} - {vhiData.results[vhiData.results.length - 1]?.date}</div>
            </div>
          )}
          
          {!vhiData?.results?.length && (
            <div className="text-xs text-gray-500">
              No VHI data available
            </div>
          )}
        </div>

        {/* Time Series Layer */}
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${timeSeriesLayerVisible ? 'bg-purple-500' : 'bg-gray-600'}`}></div>
              <div>
                <span className={`text-sm font-medium ${timeSeriesLayerVisible ? 'text-white' : 'text-gray-400'}`}>
                  Time Series Layer
                </span>
                {timeSeriesData?.index && (
                  <div className="text-xs text-gray-400">
                    {timeSeriesData.index.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => onTimeSeriesLayerToggle?.(!timeSeriesLayerVisible)}
              disabled={!timeSeriesData?.results?.length}
              className={`relative w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                timeSeriesLayerVisible && timeSeriesData?.results?.length ? 'bg-purple-500' : 'bg-gray-600'
              } ${!timeSeriesData?.results?.length ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`absolute w-4 h-4 rounded-full bg-white transition-transform ${
                timeSeriesLayerVisible && timeSeriesData?.results?.length ? 'translate-x-5' : 'translate-x-1'
              }`}></div>
            </button>
          </div>
          
          {timeSeriesData?.results?.length > 0 && (
            <div className="text-xs text-gray-400 space-y-1">
              <div>Images: {timeSeriesData.results.length}</div>
              <div>Date Range: {timeSeriesData.results[0]?.date} - {timeSeriesData.results[timeSeriesData.results.length - 1]?.date}</div>
            </div>
          )}
          
          {!timeSeriesData?.results?.length && (
            <div className="text-xs text-gray-500">
              No time series data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LayersPanel({
  onLayerToggle,
  onFileUpload,
  initialLayers,
  
  // Analysis layers props
  indexData,
  vhiData,
  timeSeriesData,
  onIndexLayerToggle,
  onVhiLayerToggle,
  onTimeSeriesLayerToggle,
  indexLayerVisible = false,
  vhiLayerVisible = false,
  timeSeriesLayerVisible = false
}: LayersPanelProps) {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  
  const [mapLayers, setMapLayers] = useState(initialLayers || [
    { id: 'projected-yield', name: 'Projected Yield', color: 'bg-emerald-500', active: true },
    { id: 'vegetation-health', name: 'Vegetation Health', color: 'bg-green-500', active: true },
    { id: 'surface-temperature', name: 'Surface Temperature', color: 'bg-red-500', active: false },
    { id: 'maize-areas', name: 'Maize Areas', color: 'bg-yellow-500', active: true },
    { id: 'sugarcane-areas', name: 'Sugarcane Areas', color: 'bg-orange-500', active: false },
    { id: 'rice-areas', name: 'Rice Areas', color: 'bg-teal-500', active: false }
  ]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileNames = Array.from(files).map(file => file.name);
      setUploadedFiles(prev => [...prev, ...fileNames]);
      
      if (onFileUpload) {
        onFileUpload(Array.from(files));
      }
    }
  };

  const toggleLayer = (layerId: string) => {
    setMapLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.id === layerId 
          ? { ...layer, active: !layer.active }
          : layer
      )
    );

    const layer = mapLayers.find(l => l.id === layerId);
    if (onLayerToggle && layer) {
      onLayerToggle(layerId, !layer.active);
    }
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-4 overflow-y-auto h-full">
      {/* Analysis Layers Toggle Component */}
      <AnalysisLayersToggle
        indexData={indexData}
        vhiData={vhiData}
        timeSeriesData={timeSeriesData}
        indexLayerVisible={indexLayerVisible}
        vhiLayerVisible={vhiLayerVisible}
        timeSeriesLayerVisible={timeSeriesLayerVisible}
        onIndexLayerToggle={onIndexLayerToggle}
        onVhiLayerToggle={onVhiLayerToggle}
        onTimeSeriesLayerToggle={onTimeSeriesLayerToggle}
      />

      {/* Upload Data Section */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-3 flex items-center">
          <i className="ri-upload-cloud-line mr-2"></i>
          Upload Data
        </h4>
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
          <i className="ri-upload-cloud-line text-2xl text-gray-400 mb-2 block"></i>
          <p className="text-xs text-gray-400 mb-2">Drop files here or click to upload</p>
          <p className="text-xs text-gray-500">GeoJSON, SHP, KML</p>
          <input 
            type="file"
            multiple
            accept=".geojson,.shp,.kml"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label 
            htmlFor="file-upload"
            className="inline-block mt-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs cursor-pointer transition-colors"
          >
            Browse Files
          </label>
        </div>
        
        {uploadedFiles.length > 0 && (
          <div className="mt-3 space-y-1">
            <h5 className="text-xs font-medium text-gray-300 mb-2">Uploaded Files:</h5>
            {uploadedFiles.map((file, index) => (
              <div key={index} className="text-xs text-gray-400 flex items-center justify-between bg-gray-800 rounded px-2 py-1">
                <div className="flex items-center">
                  <i className="ri-file-line mr-2"></i>
                  <span className="truncate">{file}</span>
                </div>
                <button
                  onClick={() => removeUploadedFile(index)}
                  className="text-gray-500 hover:text-red-400 ml-2 transition-colors"
                  title="Remove file"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex space-x-2 mt-3">
          <button 
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            title="Edit selected layers"
          >
            <i className="ri-edit-line"></i>
          </button>
          <button 
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            title="Draw on map"
          >
            <i className="ri-pencil-line"></i>
          </button>
          <button 
            className="p-2 bg-red-700 hover:bg-red-600 rounded transition-colors"
            title="Delete selected layers"
          >
            <i className="ri-delete-bin-line"></i>
          </button>
        </div>
      </div>

      {/* Regular Map Layers Section */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-3 flex items-center">
          <i className="ri-stack-line mr-2"></i>
          Map Layers
        </h4>
        <div className="space-y-2">
          {mapLayers.map((layer) => (
            <div key={layer.id} className="flex items-center justify-between py-2 px-3 bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${layer.color} ${!layer.active ? 'opacity-30' : ''}`}></div>
                <span className={`text-sm ${layer.active ? 'text-white' : 'text-gray-400'}`}>
                  {layer.name}
                </span>
              </div>
              <button
                onClick={() => toggleLayer(layer.id)}
                className={`relative w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  layer.active ? 'bg-emerald-500' : 'bg-gray-600'
                }`}
              >
                <div className={`absolute w-4 h-4 rounded-full bg-white transition-transform ${
                  layer.active ? 'translate-x-5' : 'translate-x-1'
                }`}></div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Layer Statistics */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-3 flex items-center">
          <i className="ri-pie-chart-line mr-2"></i>
          Layer Statistics
        </h4>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="text-blue-400 font-semibold">
                {[indexLayerVisible, vhiLayerVisible, timeSeriesLayerVisible].filter(Boolean).length}
              </div>
              <div className="text-gray-400">Analysis</div>
            </div>
            <div className="text-center">
              <div className="text-emerald-400 font-semibold">{mapLayers.filter(l => l.active).length}</div>
              <div className="text-gray-400">Active</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 font-semibold">{mapLayers.length}</div>
              <div className="text-gray-400">Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Layer Actions */}
      <div className="space-y-2">
        <button 
          onClick={() => {
            setMapLayers(prev => prev.map(layer => ({ ...layer, active: true })));
          }}
          className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors"
        >
          Enable All Map Layers
        </button>
        <button 
          onClick={() => {
            setMapLayers(prev => prev.map(layer => ({ ...layer, active: false })));
            // Also turn off analysis layers
            onIndexLayerToggle?.(false);
            onVhiLayerToggle?.(false);
            onTimeSeriesLayerToggle?.(false);
          }}
          className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors"
        >
          Disable All Layers
        </button>
      </div>
    </div>
  );
}