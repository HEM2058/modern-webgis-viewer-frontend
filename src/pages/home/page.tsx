import { useState } from 'react';
import axios from 'axios';
import Sidebar from '../../components/feature/Sidebar';
import AnalysisPanel from '../../components/feature/AnalysisPanel';
import MapView from '../../components/feature/MapView';
import logo from "../../assets/logo.png";

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
  const [timeSeriesData, setTimeSeriesData] = useState(null); // Added time series state

  // Fetch GeoJSON for the selected field
  const fetchFieldGeoJson = async (fieldId) => {
    setIsLoadingGeoJson(true);
    try {
      const response = await axios.get(`https://digisaka.app/api/mobile/explorer-fields/${fieldId}`);
      const areaGeoJson = response.data.data.features[0]; // Assuming the GeoJSON data is in the 'data' field
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
    setTimeSeriesData(null); // Clear time series data
    setFieldGeoJson(null);
    
    // Fetch GeoJSON for the selected field
    if (field && field.farm_id) {
      await fetchFieldGeoJson(field.farm_id);
    }
  };

  // Updated handler to receive analysis data from AnalysisPanel
  const handleAnalysisRun = async (analysisType, params) => {
    if (!selectedField) return;

    setProcessing(true);
    setProcessingType(getProcessingMessage(analysisType, params));

    try {
      switch (analysisType) {
        case 'heatmap':
          // Heat map data is already processed in AnalysisPanel
          // We just need to set the data here
          setIndexHeatMapData(params);
          setAnalysisResults(params);
          console.log('Heat map data set:', params);
          break;
          
        case 'timeseries':
          // Time series data is already processed in AnalysisPanel
          // Set the time series data for the MapView component
          setTimeSeriesData(params);
          setAnalysisResults(params);
          console.log('Time series data set:', params);
          break;
          
        case 'report':
          await handleReportGeneration(params);
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
      default:
        return `Running ${analysisType} analysis...`;
    }
  };

  const handleTimeSeriesAnalysis = async (params) => {
    try {
      // This is now handled directly in AnalysisPanel
      // Keeping this function for backward compatibility or future use
      console.log('Time series analysis params:', params);
      
      // Simulate API calls for time series if needed
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
      // Simulate API call for report generation
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
    // This would trigger map zoom functionality
    if (fieldId) {
      console.log('Zooming to field:', fieldId);
      
      // If we don't have the GeoJSON for this field yet, fetch it
      if (!fieldGeoJson || (selectedField && selectedField.farm_id !== fieldId)) {
        const geoJson = await fetchFieldGeoJson(fieldId);
        if (geoJson) {
          console.log('GeoJSON available for zoom:', geoJson);
          // The MapView component will handle the actual zoom with this GeoJSON
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
    setTimeSeriesData(null); // Clear time series data
    setSelectedField(null);
    setFieldGeoJson(null);
    setAnalysisPanelOpen(false);
  };

  const handleDeleteField = async (fieldId) => {
    try {
      await fetch(`https://digisaka.app/api/mobile/explorer-fields/${fieldId}`, {
        method: 'DELETE'
      });
      
      // If deleted field was selected, clear selection
      if (selectedField && selectedField.farm_id === fieldId) {
        setSelectedField(null);
        setFieldGeoJson(null);
        setAnalysisPanelOpen(false);
        setAnalysisResults(null);
        setIndexHeatMapData(null);
        setTimeSeriesData(null); // Clear time series data
      }
    } catch (error) {
      console.error('Delete field error:', error);
    }
  };

  // Handle time series slider changes from AnalysisPanel
  const handleTimeSeriesSliderChange = (imageData) => {
    console.log('Time series slider changed:', imageData);
    // This can be used to sync UI or trigger additional actions
    // The MapView component handles the actual layer updates
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
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
                <div className="text-sm text-gray-700">
                  <div className="font-medium">{processingType}</div>
                  <div className="text-gray-500">Please wait...</div>
                </div>
              </div>
            </div>
          )}
          
          <MapView 
            selectedField={selectedField}
            fieldGeoJson={fieldGeoJson}
            analysisResults={analysisResults}
            indexHeatMapData={indexHeatMapData}
            timeSeriesData={timeSeriesData} // Pass time series data to MapView
            onFieldClick={handleFieldSelect}
            onZoomToField={handleZoomToField}
            isLoadingGeoJson={isLoadingGeoJson}
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
          timeSeriesData={timeSeriesData} // Pass time series data to AnalysisPanel
          onTimeSeriesSliderChange={handleTimeSeriesSliderChange} // Handle slider changes
        />
      )}
    </div>
  );
}