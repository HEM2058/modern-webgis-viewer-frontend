import { useState } from 'react';
import axios from 'axios';
import Sidebar from '../../components/feature/Sidebar';
import AnalysisPanel from '../../components/feature/AnalysisPanel';
import MapView from '../../components/feature/MapView';
import SaveFieldModal from '../../components/feature/SaveFieldModal'; // Import the SaveFieldModal
import { useWMSLayers } from '../../components/feature/MapUtils/hooks/useWMSLayers';
import type { WMSLayerData } from '../../components/feature/MapUtils/hooks/useWMSLayers';
import logo from "../../assets/logo-transparent.png";

// Sample WMS date arrays - Replace with actual API data
const wmsDateArrays: WMSLayerData = {
  yield: [
    '2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01',
    '2024-05-01', '2024-06-01', '2024-07-01',
    // August to December 2024 excluded
    '2025-01-01', '2025-02-01', '2025-03-01',
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

  // Change Detection States
  const [isChangeDetectionMode, setIsChangeDetectionMode] = useState(false);
  const [changeDetectionData, setChangeDetectionData] = useState(null);

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
    
    // Clear any previous analysis results and change detection
    setAnalysisResults(null);
    setIndexData(null);
    setVhiData(null);
    setIndexHeatMapData(null);
    setTimeSeriesData(null);
    setIsChangeDetectionMode(false);
    setChangeDetectionData(null);
    
    console.log('Uploaded field setup complete, analysis panel ready');
  };

  // Handlers from Sidebar
  const handleFieldSelect = async (field) => {
    console.log('Field selected:', field);
    
    setSelectedField(field);
    
    // Exit change detection mode when selecting new field
    setIsChangeDetectionMode(false);
    setChangeDetectionData(null);
    
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
      setIsChangeDetectionMode(false);
      setChangeDetectionData(null);
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
    
    // Clear any previous analysis results and change detection
    setAnalysisResults(null);
    setIndexData(null);
    setVhiData(null);
    setIndexHeatMapData(null);
    setTimeSeriesData(null);
    setIsChangeDetectionMode(false);
    setChangeDetectionData(null);
    
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
    
    // Clear analysis data and change detection
    setAnalysisResults(null);
    setIndexData(null);
    setVhiData(null);
    setIndexHeatMapData(null);
    setTimeSeriesData(null);
    setIsChangeDetectionMode(false);
    setChangeDetectionData(null);
  };

  // UPDATED: WMS Layer control handlers - Now ensures only one layer is visible at a time
  const handleWMSLayerToggle = (layerType: 'yield' | 'vhi' | 'lst') => {
    console.log(`Home: Toggling WMS layer: ${layerType}`);
    
    // Get current visibility state
    const currentLayerState = wmsLayerStates[layerType];
    const isCurrentlyVisible = currentLayerState?.visible || false;
    
    if (isCurrentlyVisible) {
      // If clicking on the currently visible layer, hide it
      console.log(`Home: Hiding currently visible layer: ${layerType}`);
      toggleWMSLayerVisibility(layerType);
    } else {
      // If clicking on a hidden layer, show it (this will automatically hide others)
      console.log(`Home: Showing layer ${layerType}, others will be hidden automatically`);
      
      // First hide all other layers explicitly
      const otherLayers: ('yield' | 'vhi' | 'lst')[] = ['yield', 'vhi', 'lst'].filter(l => l !== layerType);
      otherLayers.forEach(otherLayerType => {
        const otherLayerState = wmsLayerStates[otherLayerType];
        if (otherLayerState?.visible) {
          console.log(`Home: Hiding ${otherLayerType} to show ${layerType}`);
          toggleWMSLayerVisibility(otherLayerType);
        }
      });
      
      // Then show the target layer
      toggleWMSLayerVisibility(layerType);
    }
  };

  // UPDATED: Handle WMS date change - Now receives date string and converts to index
  const handleWMSDateChange = (date: string, layerType: 'yield' | 'vhi' | 'lst') => {
    console.log(`Home: WMS date change for ${layerType}:`, date);
    
    // Find the index of this date in our date arrays
    const dateArray = wmsDateArrays[layerType] || [];
    const dateIndex = dateArray.indexOf(date);
    
    if (dateIndex !== -1) {
      setLayerDateByIndex(layerType, dateIndex);
    } else {
      console.warn(`Home: Date ${date} not found in ${layerType} date array`);
    }
  };

  const handleWMSPlayToggle = (layerType: 'yield' | 'vhi' | 'lst') => {
    toggleLayerPlayback(layerType);
  };

  // Handle change detection mode toggle
  const handleChangeDetectionToggle = (enabled: boolean, beforeIndex?: number, afterIndex?: number) => {
    setIsChangeDetectionMode(enabled);
    
    if (enabled && beforeIndex !== undefined && afterIndex !== undefined && timeSeriesData?.results) {
      const changeData = {
        before: timeSeriesData.results[beforeIndex],
        after: timeSeriesData.results[afterIndex],
        beforeIndex,
        afterIndex
      };
      setChangeDetectionData(changeData);
      
      // Stop any playing animations when entering change detection
      if (getPlayingLayers().length > 0) {
        stopAllPlayback();
      }
      
      console.log('Change detection enabled:', changeData);
    } else {
      setChangeDetectionData(null);
      console.log('Change detection disabled');
    }
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

    // Exit change detection mode when running new analysis
    setIsChangeDetectionMode(false);
    setChangeDetectionData(null);

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
        case 'wms_yield':
          handleWMSLayerToggle('yield');
          setAnalysisResults({ type: 'wms_yield', ...params });
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
      case 'wms_yield':
        return 'Loading Yield Layer...';
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
    
    // Clear change detection and hide all WMS layers when closing analysis
    setIsChangeDetectionMode(false);
    setChangeDetectionData(null);
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
        setIsChangeDetectionMode(false);
        setChangeDetectionData(null);
        hideAllWMSLayers();
      }
    } catch (error) {
      console.error('Delete field error:', error);
    }
  };

  const handleTimeSeriesSliderChange = (imageData) => {
    console.log('Time series slider changed:', imageData);
  };

  // Handle successful field save from SaveFieldModal
  const handleFieldSaved = (savedFieldData) => {
    console.log('Field saved successfully:', savedFieldData);
    
    // Clear the drawn field and close modal
    setDrawnField(null);
    setShowSaveModal(false);
    
    // You might want to refresh the fields list or update the selected field
    // This depends on your sidebar implementation
    
    // Show success message
    console.log('Field has been saved to the database');
    
    // Optional: You could trigger a refresh of the fields list here
    // or update the selectedField with the saved field data
  };

  // Handle closing the save modal
  const handleCloseSaveModal = () => {
    setShowSaveModal(false);
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
          />Digisaka

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
          {selectedField?.isDemo && fieldGeoJson && analysisPanelReady && !isChangeDetectionMode && (
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

          {/* UPDATED: Single Active WMS Layer Indicator */}
          {(() => {
            const activeLayer = Object.entries(wmsLayerStates).find(([_, state]) => state?.visible);
            return activeLayer && !isChangeDetectionMode ? (
              <div className="absolute top-4 left-4 z-15 bg-green-100 border border-green-300 rounded-lg p-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-700 font-medium">
                    {activeLayer[0].toUpperCase()} Layer Active (Zoom: 9)
                  </span>
                  {activeLayer[1]?.isPlaying && (
                    <i className="ri-play-fill text-green-600 text-sm"></i>
                  )}
                </div>
              </div>
            ) : null;
          })()}

          {/* Change Detection Status Indicator */}
          {isChangeDetectionMode && changeDetectionData && (
            <div className="absolute top-4 right-4 z-30 bg-gradient-to-r from-blue-100 to-orange-100 border border-gray-300 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-700 font-medium">
                  Change Detection Active
                </span>
                <i className="ri-compare-line text-orange-600"></i>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {new Date(changeDetectionData.before.date).toLocaleDateString()} 
                <i className="ri-arrow-right-line mx-1"></i>
                {new Date(changeDetectionData.after.date).toLocaleDateString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Δyield: {(changeDetectionData.after.mean_index_value - changeDetectionData.before.mean_index_value).toFixed(3)}
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
            // Pass change detection handler
            onChangeDetectionToggle={handleChangeDetectionToggle}
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
          // Pass change detection states
          isChangeDetectionMode={isChangeDetectionMode}
          changeDetectionData={changeDetectionData}
        />
      )}

      {/* Save Field Modal */}
      {showSaveModal && drawnField && (
        <SaveFieldModal
          drawnField={drawnField}
          onClose={handleCloseSaveModal}
          onSave={handleFieldSaved}
        />
      )}
    </div>
  );
}