import { useState } from 'react';
import axios from 'axios';
import Sidebar from '../../components/feature/Sidebar';
import AnalysisPanel from '../../components/feature/AnalysisPanel';
import MapView from '../../components/feature/MapView';
import { useWMSLayers } from '../../components/feature/MapUtils/hooks/useWMSLayers';
import type { WMSLayerData } from '../../components/feature/MapUtils/hooks/useWMSLayers';
import logo from "../../assets/logo.png";

// Sample WMS date arrays - Replace with actual API data
const wmsDateArrays: WMSLayerData = {
  ndvi: [
    '2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01', 
    '2024-05-01', '2024-06-01', '2024-07-01', '2024-08-01', 
    '2024-09-01', '2024-10-01', '2024-11-01', '2024-12-01'
  ],
  vhi: [
    '2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01', 
    '2024-05-01', '2024-06-01', '2024-07-01', '2024-08-01', 
    '2024-09-01', '2024-10-01', '2024-11-01', '2024-12-01'
  ],
  lst: [
    '2023-01-01', '2023-02-01', '2023-03-01', '2023-04-01', 
    '2023-05-01', '2023-06-01', '2023-07-01', '2023-08-01', 
    '2023-09-01', '2023-10-01', '2023-11-01', '2023-12-01'
  ]
};

export default function Home() {
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analysisPanelOpen, setAnalysisPanelOpen] = useState(false);
  
  // Field and Analysis State
  const [selectedField, setSelectedField] = useState(null);
  const [fieldGeoJson, setFieldGeoJson] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processingType, setProcessingType] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isLoadingGeoJson, setIsLoadingGeoJson] = useState(false);
  
  // Analysis Data States
  const [indexData, setIndexData] = useState(null);
  const [vhiData, setVhiData] = useState(null);
  const [indexHeatMapData, setIndexHeatMapData] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState(null);

  // Drawing States
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawnField, setDrawnField] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // WMS Layer Management Hook
  const {
    layerStates: wmsLayerStates,
    toggleLayerVisibility: toggleWMSLayerVisibility,
    setLayerDateByIndex,
    setLayerDate,
    toggleLayerPlayback,
    stopAllPlayback,
    hideAllLayers: hideAllWMSLayers,
    getVisibleLayers,
    getPlayingLayers,
  } = useWMSLayers({
    dateArrays: wmsDateArrays,
    onDateChange: (date, layerType) => {
      console.log(`WMS Layer ${layerType} date changed to:`, date);
      // The MapView component will handle the actual layer updates through MapLayerManager
    },
    playbackSpeed: 1000,
  });

  // Fetch GeoJSON for the selected field
  const fetchFieldGeoJson = async (fieldId) => {
    setIsLoadingGeoJson(true);
    try {
      const response = await axios.get(`https://digisaka.app/api/mobile/explorer-fields/${fieldId}`);
      const areaGeoJson = response.data.data.features[0];
      console.log('Fetched GeoJSON:', areaGeoJson);
      setFieldGeoJson(areaGeoJson);
      return areaGeoJson;
    } catch (error) {
      console.error('Error fetching field GeoJSON:', error);
      setFieldGeoJson(null);
      return null;
    } finally {
      setIsLoadingGeoJson(false);
    }
  };

  // Handlers from Sidebar
  const handleFieldSelect = async (field) => {
    setSelectedField(field);
    setAnalysisPanelOpen(true);
    
    // Clear previous analysis results when selecting new field
    setAnalysisResults(null);
    setIndexData(null);
    setVhiData(null);
    setIndexHeatMapData(null);
    setTimeSeriesData(null);
    setFieldGeoJson(null);
    
    // Hide all WMS layers when selecting a new field to avoid confusion
    hideAllWMSLayers();
    
    // Fetch GeoJSON for the selected field
    if (field && field.farm_id) {
      await fetchFieldGeoJson(field.farm_id);
    }
  };

  // Drawing mode handlers
  const handleDrawingModeToggle = (isDrawing) => {
    setIsDrawingMode(isDrawing);
    if (!isDrawing) {
      setDrawnField(null);
    }
    
    // Hide WMS layers during drawing mode for better visibility
    if (isDrawing) {
      stopAllPlayback();
    }
  };

  // Handle field drawn on map
  const handleFieldDrawn = (geoJsonFeature) => {
    console.log('Field drawn:', geoJsonFeature);
    
    const demoField = {
      farm_id: 'demo_field',
      farm_name: 'Demo Field',
      isDemo: true,
      isUnsaved: true,
      geometry: geoJsonFeature
    };
    
    setDrawnField(demoField);
    setIsDrawingMode(false);
    setSelectedField(demoField);
    setFieldGeoJson(geoJsonFeature);
    setAnalysisPanelOpen(true);
  };

  // Handle save demo field
  const handleSaveDemoField = () => {
    setShowSaveModal(true);
  };

  // Handle demo field deletion
  const handleDeleteDemoField = () => {
    setDrawnField(null);
    setSelectedField(null);
    setFieldGeoJson(null);
    setAnalysisPanelOpen(false);
  };

  // WMS Layer control handlers
  const handleWMSLayerToggle = (layerType: 'ndvi' | 'vhi' | 'lst') => {
    toggleWMSLayerVisibility(layerType);
  };

  const handleWMSDateChange = (layerType: 'ndvi' | 'vhi' | 'lst', dateIndex: number) => {
    setLayerDateByIndex(layerType, dateIndex);
  };

  const handleWMSPlayToggle = (layerType: 'ndvi' | 'vhi' | 'lst') => {
    toggleLayerPlayback(layerType);
  };

  // Updated handler to receive analysis data from AnalysisPanel
  const handleAnalysisRun = async (analysisType, params) => {
    if (!selectedField) return;

    setProcessing(true);
    setProcessingType(getProcessingMessage(analysisType, params));

    try {
      // Stop any WMS layer playback during analysis
      stopAllPlayback();

      switch (analysisType) {
        case 'heatmap':
          setIndexHeatMapData(params);
          setAnalysisResults(params);
          console.log('Heat map data set:', params);
          break;
          
        case 'timeseries':
          setTimeSeriesData(params);
          setAnalysisResults(params);
          console.log('Time series data set:', params);
          break;
          
        case 'report':
          await handleReportGeneration(params);
          break;
          
        // Add WMS-specific analysis types
        case 'wms_ndvi':
          handleWMSLayerToggle('ndvi');
          setAnalysisResults({ type: 'wms_ndvi', ...params });
          break;
          
        case 'wms_vhi':
          handleWMSLayerToggle('vhi');
          setAnalysisResults({ type: 'wms_vhi', ...params });
          break;
          
        case 'wms_lst':
          handleWMSLayerToggle('lst');
          setAnalysisResults({ type: 'wms_lst', ...params });
          break;
          
        default:
          console.warn('Unknown analysis type:', analysisType);
          break;
      }
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setProcessing(false);
      setProcessingType(null);
    }
  };

  // Helper function to get processing message
  const getProcessingMessage = (analysisType, params) => {
    switch (analysisType) {
      case 'heatmap':
        return `Generating ${params.index} Heat Map...`;
      case 'timeseries':
        return `Generating ${params.index} Time Series...`;
      case 'report':
        return 'Generating Report...';
      case 'wms_ndvi':
        return 'Loading NDVI Layer...';
      case 'wms_vhi':
        return 'Loading VHI Layer...';
      case 'wms_lst':
        return 'Loading LST Layer...';
      default:
        return `Running ${analysisType} analysis...`;
    }
  };

  const handleTimeSeriesAnalysis = async (params) => {
    try {
      console.log('Time series analysis params:', params);
      
      const [indexResponse, vhiResponse] = await Promise.all([
        fetch(`https://digisaka.app/api/mobile/field-index/${selectedField.farm_id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            index_type: params.indexType,
            start_date: params.startDate,
            end_date: params.endDate
          })
        }),
        fetch(`https://digisaka.app/api/mobile/field-vhi/${selectedField.farm_id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_date: params.startDate,
            end_date: params.endDate
          })
        })
      ]);

      const indexData = await indexResponse.json();
      const vhiData = await vhiResponse.json();

      setIndexData(indexData);
      setVhiData(vhiData);
      setAnalysisResults({ indexData, vhiData });
    } catch (error) {
      console.error('Time series analysis error:', error);
    }
  };

  const handleReportGeneration = async (params) => {
    try {
      const response = await fetch(`https://digisaka.app/api/mobile/generate-report/${selectedField.farm_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: params.reportType,
          analysis_period: params.analysisPeriod
        })
      });
      const data = await response.json();
      setAnalysisResults(data);
    } catch (error) {
      console.error('Report generation error:', error);
    }
  };

  const handleZoomToField = async (fieldId) => {
    if (fieldId) {
      console.log('Zooming to field:', fieldId);
      
      if (!fieldGeoJson || (selectedField && selectedField.farm_id !== fieldId)) {
        const geoJson = await fetchFieldGeoJson(fieldId);
        if (geoJson) {
          console.log('GeoJSON available for zoom:', geoJson);
        }
      } else {
        console.log('Using existing GeoJSON for zoom:', fieldGeoJson);
      }
    }
  };

  const handleCloseAnalysis = () => {
    setAnalysisResults(null);
    setIndexData(null);
    setVhiData(null);
    setIndexHeatMapData(null);
    setTimeSeriesData(null);
    setSelectedField(null);
    setFieldGeoJson(null);
    setAnalysisPanelOpen(false);
    
    // Hide all WMS layers when closing analysis
    hideAllWMSLayers();
  };

  const handleDeleteField = async (fieldId) => {
    try {
      await fetch(`https://digisaka.app/api/mobile/explorer-fields/${fieldId}`, {
        method: 'DELETE'
      });
      
      if (selectedField && selectedField.farm_id === fieldId) {
        setSelectedField(null);
        setFieldGeoJson(null);
        setAnalysisPanelOpen(false);
        setAnalysisResults(null);
        setIndexHeatMapData(null);
        setTimeSeriesData(null);
        hideAllWMSLayers();
      }
    } catch (error) {
      console.error('Delete field error:', error);
    }
  };

  const handleTimeSeriesSliderChange = (imageData) => {
    console.log('Time series slider changed:', imageData);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onFieldSelect={handleFieldSelect}
        onDeleteField={handleDeleteField}
        selectedField={selectedField}
        selectedFieldId={selectedField?.farm_id}
        isDrawingMode={isDrawingMode}
        onDrawingModeToggle={handleDrawingModeToggle}
        drawnField={drawnField}
        onSaveDemoField={handleSaveDemoField}
        onDeleteDemoField={handleDeleteDemoField}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <i className="ri-menu-line text-xl"></i>
          </button>

          <img 
            src={logo} 
            alt="Logo" 
            className="h-8 w-auto"
          />

          <button 
            onClick={() => setAnalysisPanelOpen(!analysisPanelOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <i className="ri-bar-chart-line text-xl"></i>
          </button>
        </div>

        {/* Map Area */}
        <div className="flex-1 relative">
          {/* Processing indicator */}
          {processing && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
                <div className="text-sm text-gray-700">
                  <div className="font-medium">{processingType}</div>
                  <div className="text-gray-500">Please wait...</div>
                </div>
              </div>
            </div>
          )}

          {/* Active WMS Layers Indicator */}
          {getVisibleLayers().length > 0 && (
            <div className="absolute top-4 left-4 z-15 bg-green-100 border border-green-300 rounded-lg p-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-700 font-medium">
                  {getVisibleLayers().length} WMS Layer{getVisibleLayers().length > 1 ? 's' : ''} Active
                </span>
                {getPlayingLayers().length > 0 && (
                  <i className="ri-play-fill text-green-600 text-sm"></i>
                )}
              </div>
            </div>
          )}
          
          <MapView 
            selectedField={selectedField}
            fieldGeoJson={fieldGeoJson}
            analysisResults={analysisResults}
            indexHeatMapData={indexHeatMapData}
            timeSeriesData={timeSeriesData}
            onFieldClick={handleFieldSelect}
            onZoomToField={handleZoomToField}
            isLoadingGeoJson={isLoadingGeoJson}
            isDrawingMode={isDrawingMode}
            onFieldDrawn={handleFieldDrawn}
            onTimeSeriesSliderChange={handleTimeSeriesSliderChange}
            // Pass WMS layer states
            wmsLayerStates={wmsLayerStates}
            wmsDateArrays={wmsDateArrays}
            onWMSDateChange={handleWMSDateChange}
            onWMSLayerToggle={handleWMSLayerToggle}
            onWMSPlayToggle={handleWMSPlayToggle}
          />
        </div>
      </div>
      
      {/* Analysis Panel */}
      {selectedField && (
        <AnalysisPanel 
          isOpen={analysisPanelOpen} 
          onToggle={() => setAnalysisPanelOpen(!analysisPanelOpen)}
          selectedField={selectedField}
          fieldGeoJson={fieldGeoJson}
          onAnalysisRun={handleAnalysisRun}
          onZoomToField={handleZoomToField}
          onCloseAnalysis={handleCloseAnalysis}
          processing={processing}
          processingType={processingType}
          analysisResults={analysisResults}
          indexData={indexData}
          vhiData={vhiData}
          indexHeatMapData={indexHeatMapData}
          timeSeriesData={timeSeriesData}
          onTimeSeriesSliderChange={handleTimeSeriesSliderChange}
          // Pass WMS states for analysis panel integration
          wmsLayerStates={wmsLayerStates}
          onWMSAnalysisRun={(layerType) => handleAnalysisRun(`wms_${layerType}`, { layerType })}
        />
      )}

      {/* Save Field Modal */}
      {showSaveModal && (
        <SaveFieldModal
          drawnField={drawnField}
          onClose={() => setShowSaveModal(false)}
          onSave={(savedField) => {
            setDrawnField(null);
            setShowSaveModal(false);
            console.log('Field saved:', savedField);
          }}
        />
      )}
    </div>
  );
}

// Save Field Modal Component (keeping existing implementation)
function SaveFieldModal({ drawnField, onClose, onSave }) {
  const [formValues, setFormValues] = useState({
    name: '',
    farmer_id: '',
    region: '',
    province: '',
    municipality: '',
    barangay: '',
    total_land_area: '',
    ndvi_notification: '0',
    is_jas: '0'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveField = async () => {
    if (!formValues.name.trim()) {
      alert('Please enter a field name');
      return;
    }

    setIsLoading(true);
    try {
      const geometry = drawnField.geometry;
      
      const payload = {
        name: formValues.name,
        farmer_id: parseInt(formValues.farmer_id) || 0,
        region: formValues.region,
        province: formValues.province,
        municipality: formValues.municipality,
        barangay: formValues.barangay,
        total_land_area: parseFloat(formValues.total_land_area) || 0,
        ndvi_notification: parseInt(formValues.ndvi_notification) || 0,
        is_jas: parseInt(formValues.is_jas) || 0,
        geometry: geometry
      };

      console.log('Saving field with payload:', payload);

      const response = await axios.post('https://digisaka.app/api/mobile/explorer-fields-create', payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Field saved successfully:', response.data);
      onSave(response.data);
    } catch (error) {
      console.error('Error saving field:', error);
      alert('Failed to save field. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const closeSaveModal = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black opacity-50" onClick={closeSaveModal}></div>
      <div className="relative bg-white rounded-lg p-4 shadow-lg w-96 z-10">
        <h4 className="text-md font-semibold text-green-700 mb-3">Save Field</h4>
        <form className="space-y-2">
          {[
            { label: 'Field Name', name: 'name', type: 'text', required: true },
            { label: 'Farmer ID', name: 'farmer_id', type: 'number' },
            { label: 'Region', name: 'region', type: 'text' },
            { label: 'Province', name: 'province', type: 'text' },
            { label: 'Municipality', name: 'municipality', type: 'text' },
            { label: 'Barangay', name: 'barangay', type: 'text' },
            { label: 'Land Area (ha)', name: 'total_land_area', type: 'number' },
            { label: 'NDVI Notification (1 = on)', name: 'ndvi_notification', type: 'number' },
            { label: 'JAS Certified (1 = yes)', name: 'is_jas', type: 'number' }
          ].map(({ label, name, type, required }) => (
            <div key={name}>
              <label className="block text-gray-700 text-sm">
                {label}{required && <span className="text-red-500">*</span>}:
              </label>
              <input
                type={type}
                name={name}
                value={formValues[name]}
                onChange={handleInputChange}
                className="w-full p-1.5 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                required={required}
                disabled={isLoading}
              />
            </div>
          ))}
        </form>
        <div className="flex justify-end space-x-2 mt-3">
          <button
            onClick={closeSaveModal}
            disabled={isLoading}
            className="w-full p-1.5 text-sm bg-white border border-gray-300 rounded-md text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveField}
            disabled={isLoading}
            className="w-full p-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}