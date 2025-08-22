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

  // Track if analysis panel should be available (but not auto-opened)
  const [analysisPanelReady, setAnalysisPanelReady] = useState(false);

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

  // Handle file upload from Sidebar
  const handleFileUpload = (geoJsonFeature) => {
    console.log('File uploaded with geometry:', geoJsonFeature);
    
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const uploadedField = {
      farm_id: `uploaded_field_${Date.now()}`,
      farm_name: `Uploaded Field (${timestamp})`,
      isDemo: true,
      isUnsaved: true,
      geometry: geoJsonFeature
    };
    
    // Set all the states properly
    setDrawnField(uploadedField);
    setSelectedField(uploadedField);
    setFieldGeoJson(geoJsonFeature);
    
    // Panel should be ready but not auto-opened for uploaded files
    setAnalysisPanelOpen(false);
    setAnalysisPanelReady(true);
    
    // Clear any previous analysis results
    setAnalysisResults(null);
    setIndexData(null);
    setVhiData(null);
    setIndexHeatMapData(null);
    setTimeSeriesData(null);
    
    console.log('Uploaded field setup complete, analysis panel ready');
  };

  // Handlers from Sidebar
  const handleFieldSelect = async (field) => {
    console.log('Field selected:', field);
    
    setSelectedField(field);
    
    // Only auto-open for saved fields, not drawn/uploaded fields
    if (!field.isDemo) {
      setAnalysisPanelOpen(true);
      setAnalysisPanelReady(true);
    } else {
      // For demo fields, don't auto-open but make ready if geometry exists
      setAnalysisPanelOpen(false);
      setAnalysisPanelReady(field.geometry ? true : false);
    }
    
    // Clear previous analysis results when selecting new field
    setAnalysisResults(null);
    setIndexData(null);
    setVhiData(null);
    setIndexHeatMapData(null);
    setTimeSeriesData(null);
    
    // Hide all WMS layers when selecting a new field to avoid confusion
    hideAllWMSLayers();
    
    // Handle geometry for different field types
    if (field && field.isDemo && field.geometry) {
      // For demo/drawn/uploaded fields, use the geometry directly
      console.log('Setting geometry for demo field:', field.geometry);
      setFieldGeoJson(field.geometry);
    } else if (field && field.farm_id && !field.isDemo) {
      // For regular saved fields, fetch GeoJSON from API
      setFieldGeoJson(null); // Clear previous geometry first
      await fetchFieldGeoJson(field.farm_id);
    } else {
      setFieldGeoJson(null);
    }
  };

  // Drawing mode handlers
  const handleDrawingModeToggle = (isDrawing) => {
    setIsDrawingMode(isDrawing);
    
    if (isDrawing) {
      // Starting drawing mode - close analysis panel and reset states
      setAnalysisPanelOpen(false);
      setAnalysisPanelReady(false);
      setDrawnField(null);
      stopAllPlayback();
      console.log('Drawing mode started - analysis panel disabled');
    } else if (!isDrawing) {
      // Exiting drawing mode without drawing - clean up
      setDrawnField(null);
      console.log('Drawing mode ended');
    }
  };

  // Handle field drawn on map
  const handleFieldDrawn = (geoJsonFeature) => {
    console.log('Field drawn with geometry:', geoJsonFeature);
    
    // Generate a more descriptive name with timestamp
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const demoField = {
      farm_id: 'demo_field',
      farm_name: `Drawn Field (${timestamp})`,
      isDemo: true,
      isUnsaved: true,
      geometry: geoJsonFeature
    };
    
    // Set all the states properly
    setDrawnField(demoField);
    setIsDrawingMode(false);
    setSelectedField(demoField);
    
    // Set the fieldGeoJson directly to the drawn geometry
    setFieldGeoJson(geoJsonFeature);
    
    // Ensure panel stays closed and only becomes ready after drawing is complete
    setAnalysisPanelOpen(false);
    
    // Use setTimeout to ensure drawing mode is fully exited before making panel ready
    setTimeout(() => {
      setAnalysisPanelReady(true);
      console.log('Analysis panel is now ready for manual opening');
    }, 100);
    
    // Clear any previous analysis results
    setAnalysisResults(null);
    setIndexData(null);
    setVhiData(null);
    setIndexHeatMapData(null);
    setTimeSeriesData(null);
    
    console.log('Demo field setup complete, analysis panel will be ready shortly');
  };

  // Handle analysis panel toggle with validation
  const handleAnalysisPanelToggle = () => {
    if (!analysisPanelReady || !selectedField) {
      console.log('Analysis panel not ready or no field selected');
      return;
    }
    setAnalysisPanelOpen(!analysisPanelOpen);
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
    setAnalysisPanelReady(false);
    
    // Clear analysis data
    setAnalysisResults(null);
    setIndexData(null);
    setVhiData(null);
    setIndexHeatMapData(null);
    setTimeSeriesData(null);
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
    if (!selectedField) {
      console.error('No field selected for analysis');
      return;
    }

    if (!fieldGeoJson) {
      console.error('No geometry available for analysis');
      return;
    }

    console.log('Running analysis:', analysisType, 'with params:', params);
    console.log('Using geometry:', fieldGeoJson);

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
    setAnalysisPanelReady(false);
    
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
        setAnalysisPanelReady(false);
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
        onFileUpload={handleFileUpload}
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

          {/* Analysis button with better state management */}
          <button 
            onClick={handleAnalysisPanelToggle}
            className={`p-2 rounded-lg transition-colors ${
              analysisPanelReady && selectedField 
                ? 'hover:bg-gray-100 text-gray-900' 
                : 'text-gray-400 cursor-not-allowed'
            }`}
            disabled={!analysisPanelReady || !selectedField}
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

          {/* Demo field ready indicator with click prompt */}
          {selectedField?.isDemo && fieldGeoJson && analysisPanelReady && (
            <div className="absolute top-4 right-4 z-30 bg-blue-100 border border-blue-300 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-700 font-medium">
                  {selectedField.farm_name} Ready
                </span>
                <button
                  onClick={handleAnalysisPanelToggle}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                  title="Open Analysis Panel"
                >
                  <i className="ri-arrow-right-line text-lg"></i>
                </button>
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
      
      {/* Analysis Panel - Only render when ready and field selected */}
      {analysisPanelReady && selectedField && (
        <AnalysisPanel 
          isOpen={analysisPanelOpen} 
          onToggle={handleAnalysisPanelToggle}
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

      {/* Save Field Modal - You'll need to create this component */}
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