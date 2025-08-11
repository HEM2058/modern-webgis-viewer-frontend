import { useState, useEffect } from 'react';
import axios from 'axios';

interface AnalysisPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedField?: any;
  fieldGeoJson?: any;
  onAnalysisRun?: (analysisType: string, params: any) => void;
  onZoomToField?: () => void;
  onCloseAnalysis?: () => void;
  processing?: boolean;
  processingType?: string;
  analysisResults?: any;
  indexData?: any;
  vhiData?: any;
  indexHeatMapData?: any;
  timeSeriesData?: any;
  onTimeSeriesSliderChange?: (imageData: any) => void;
}

export default function AnalysisPanel({ 
  isOpen, 
  onToggle, 
  selectedField, 
  fieldGeoJson,
  onAnalysisRun,
  onZoomToField,
  onCloseAnalysis,
  processing = false,
  processingType = '',
  analysisResults,
  indexData,
  vhiData,
  indexHeatMapData,
  timeSeriesData,
  onTimeSeriesSliderChange
}: AnalysisPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState('NDVI');
  const [selectedTimeRange, setSelectedTimeRange] = useState('Last Month');
  const [startDate, setStartDate] = useState('2025-05-01');
  const [endDate, setEndDate] = useState('2025-08-06');
  const [showAnalysisTools, setShowAnalysisTools] = useState(true);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState('heatmap');
  const [observationDate, setObservationDate] = useState('2024-01-15');
  const [observationDates, setObservationDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);
  
  // Enhanced processing states
  const [isProcessingHeatMap, setIsProcessingHeatMap] = useState(false);
  const [isProcessingTimeSeries, setIsProcessingTimeSeries] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [processingError, setProcessingError] = useState('');
  
  // Time series specific states
  const [timeSeriesSliderIndex, setTimeSeriesSliderIndex] = useState(0);
  const [isPlayingTimeSeries, setIsPlayingTimeSeries] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // milliseconds between frames

  // Set default date range based on current date
  useEffect(() => {
    const currentDate = new Date();
    const threeMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1);
    
    setStartDate(threeMonthsAgo.toISOString().split('T')[0]);
    setEndDate(currentDate.toISOString().split('T')[0]);
  }, []);

  const indexOptions = [
    'NDVI',
    'EVI', 
    'SAVI',
    'NDWI',
    'GNDVI',
    'MSAVI',
    'MSAVI2',
    'SIPI',
    'VARI',
    'ARVI',
    'RGR',
    'PSRI',
    'NDII',
    'RENDVI',
    'IRECI',
    'S2REP',
    'REB_NDVI1',
    'NBR',
    'NDPI',
    'SCCCI'
  ];

  // Processing stages for time series generation
  const timeSeriesProcessingStages = [
    'Initializing time series analysis...',
    'Fetching historical satellite data...',
    'Processing vegetation indices...',
    'Generating time series data...',
    'Preparing visualization...'
  ];

  // Function to simulate processing stages
  const simulateTimeSeriesProcessing = () => {
    let currentStage = 0;
    const stageInterval = setInterval(() => {
      if (currentStage < timeSeriesProcessingStages.length) {
        setProcessingStage(timeSeriesProcessingStages[currentStage]);
        setProcessingProgress((currentStage + 1) * 20);
        currentStage++;
      } else {
        clearInterval(stageInterval);
      }
    }, 1000);

    return stageInterval;
  };

  // Function to fetch observation dates
  const fetchObservationDates = async (geometry: any) => {
    setLoadingDates(true);
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      const response = await axios.post('https://backend.digisaka.com/api/sentinel2observationdate/', {
        geometry: geometry,
        start_date: "2024-01-01",
        end_date: currentDate
      });
      
      const dates = response.data.dates;
      setObservationDates(dates);
      
      if (dates && dates.length > 0) {
        setObservationDate(dates[dates.length - 1]);
      }
    } catch (error) {
      console.error('Error fetching observation dates:', error);
      setObservationDates([]);
    } finally {
      setLoadingDates(false);
    }
  };

  // Effect to fetch observation dates when field changes
  useEffect(() => {
    if (selectedField && fieldGeoJson) {
      fetchObservationDates(fieldGeoJson);
    }
  }, [selectedField, fieldGeoJson]);

  // Function to fetch time series data
  const fetchTimeSeriesData = async () => {
    if (!selectedField || !fieldGeoJson) {
      console.error('No field selected or geometry missing');
      return;
    }

    setIsProcessingTimeSeries(true);
    setProcessingProgress(0);
    setProcessingError('');
    setProcessingStage('Initializing time series analysis...');

    const stageInterval = simulateTimeSeriesProcessing();

    try {
      const requestData = {
        start_date: startDate,
        end_date: endDate,
        geometry: fieldGeoJson,
        index: selectedIndex.toLowerCase()
      };

      console.log('Fetching time series data with params:', requestData);

      const response = await axios.post("https://backend.digisaka.com/api/timeseriesimages/", requestData);

      console.log('Time series response:', response.data);
      
      clearInterval(stageInterval);
      setProcessingProgress(100);
      setProcessingStage('Time series data loaded successfully!');
      
      // Reset slider to first image
      setTimeSeriesSliderIndex(0);
      
      // Pass the time series data to parent component
      if (onAnalysisRun) {
        onAnalysisRun('timeseries', {
          type: 'timeseries',
          ...response.data,
          index: selectedIndex,
          startDate: startDate,
          endDate: endDate,
          geometry: fieldGeoJson
        });
      }
      
      setTimeout(() => {
        setIsProcessingTimeSeries(false);
        setProcessingProgress(0);
        setProcessingStage('');
      }, 2000);
      
    } catch (error) {
      console.error('Error fetching time series data:', error);
      
      clearInterval(stageInterval);
      setProcessingError('Failed to generate time series. Please try again.');
      setProcessingStage('Error occurred');
      setProcessingProgress(0);
      
      if (axios.isAxiosError(error)) {
        console.error('API Error Details:', error.response?.data);
        setProcessingError(error.response?.data?.message || 'API Error occurred');
      }
      
      setTimeout(() => {
        setIsProcessingTimeSeries(false);
        setProcessingError('');
        setProcessingStage('');
      }, 5000);
    }
  };

  // Function to fetch heat map data
  const fetchHeatMapData = async () => {
    if (!selectedField || !fieldGeoJson) {
      console.error('No field selected or geometry missing');
      return;
    }

    setIsProcessingHeatMap(true);
    setProcessingProgress(0);
    setProcessingError('');
    setProcessingStage('Initializing analysis...');

    const stageInterval = setInterval(() => {
      // Simulate progress for heat map
    }, 1000);

    try {
      const response = await axios.post("https://backend.digisaka.com/api/indexheatmap/", {
        geometry: fieldGeoJson,
        observation_date: observationDate,
        index: selectedIndex.toLowerCase(),
      });

      clearInterval(stageInterval);
      setProcessingProgress(100);
      setProcessingStage('Heat map generated successfully!');
      
      if (onAnalysisRun) {
        onAnalysisRun('heatmap', {
          type: 'heatmap',
          tileUrl: response.data.tile_url,
          visParams: response.data.vis_params,
          firstImageDate: response.data.first_image_date,
          success: response.data.success,
          index: selectedIndex,
          observationDate: observationDate,
          geometry: fieldGeoJson
        });
      }
      
      setTimeout(() => {
        setIsProcessingHeatMap(false);
        setProcessingProgress(0);
        setProcessingStage('');
      }, 2000);
      
    } catch (error) {
      console.error('Error fetching heat map data:', error);
      clearInterval(stageInterval);
      setProcessingError('Failed to generate heat map. Please try again.');
      
      setTimeout(() => {
        setIsProcessingHeatMap(false);
        setProcessingError('');
        setProcessingStage('');
      }, 5000);
    }
  };

  const handleRunAnalysis = () => {
    if (activeAnalysisTab === 'heatmap') {
      fetchHeatMapData();
    } else if (activeAnalysisTab === 'timeseries') {
      fetchTimeSeriesData();
    } else if (onAnalysisRun) {
      const params = {
        index: selectedIndex,
        observationDate: observationDate,
        startDate: startDate,
        endDate: endDate,
        timeRange: selectedTimeRange,
        analysisType: activeAnalysisTab
      };
      onAnalysisRun(activeAnalysisTab, params);
    }
  };

  // Handle time series slider change
  const handleTimeSeriesSliderChange = (index: number) => {
    if (timeSeriesData && timeSeriesData.results && timeSeriesData.results[index]) {
      setTimeSeriesSliderIndex(index);
      if (onTimeSeriesSliderChange) {
        onTimeSeriesSliderChange(timeSeriesData.results[index]);
      }
    }
  };

  // Auto-play functionality for time series
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlayingTimeSeries && timeSeriesData?.results) {
      interval = setInterval(() => {
        setTimeSeriesSliderIndex(prev => {
          const nextIndex = (prev + 1) % timeSeriesData.results.length;
          handleTimeSeriesSliderChange(nextIndex);
          return nextIndex;
        });
      }, playbackSpeed);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlayingTimeSeries, playbackSpeed, timeSeriesData]);

  // Create chart data from time series results
  const createChartData = () => {
    if (!timeSeriesData?.results) return [];
    
    return timeSeriesData.results.map((item: any) => ({
      date: item.date,
      value: item.mean_index_value,
      formattedDate: new Date(item.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }));
  };

  const chartData = createChartData();
  const maxValue = chartData.length > 0 ? Math.max(...chartData.map(d => Math.max(d.value, 0))) : 1;
  const minValue = chartData.length > 0 ? Math.min(...chartData.map(d => Math.min(d.value, 0))) : 0;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onToggle}
        />
      )}
      
      {/* Analysis Panel */}
  <div className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-gray-900 text-white transform transition-transform duration-300 z-50 ${
  isOpen ? 'translate-x-0' : 'translate-x-full'
} lg:relative lg:translate-x-0 lg:block overflow-y-auto`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <button
            onClick={() => setShowAnalysisTools(!showAnalysisTools)}
            className="flex items-center text-lg font-semibold hover:text-gray-300"
          >
            Analysis Tools
            <i className={`ri-arrow-${showAnalysisTools ? 'down' : 'right'}-line ml-2`}></i>
          </button>
          <div className="flex items-center space-x-2">
            {onCloseAnalysis && (
              <button 
                onClick={onCloseAnalysis}
                className="p-1 rounded hover:bg-gray-700"
                title="Close Analysis"
              >
                <i className="ri-close-circle-line text-xl"></i>
              </button>
            )}
            <button 
              onClick={onToggle}
              className="lg:hidden p-1 rounded hover:bg-gray-700"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
        </div>

        {showAnalysisTools && (
          <div className="p-4">
            {/* Selected Field Info */}
            {selectedField && (
              <div className="mb-6 p-3 bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium text-emerald-400 mb-1">Selected Field</h4>
                <div className="text-sm font-medium">{selectedField.farm_name}</div>
                <div className="text-xs text-gray-400">ID: {selectedField.farm_id}</div>
              </div>
            )}

            {/* Analysis Type Tabs */}
            <div className="mb-6">
              <div className="flex space-x-1 mb-4">
                <button
                  onClick={() => setActiveAnalysisTab('heatmap')}
                  className={`px-3 py-2 text-xs rounded ${
                    activeAnalysisTab === 'heatmap' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Heat Map
                </button>
                <button
                  onClick={() => setActiveAnalysisTab('timeseries')}
                  className={`px-3 py-2 text-xs rounded ${
                    activeAnalysisTab === 'timeseries' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Time Series
                </button>
                <button
                  onClick={() => setActiveAnalysisTab('report')}
                  className={`px-3 py-2 text-xs rounded ${
                    activeAnalysisTab === 'report' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Report
                </button>
              </div>
            </div>

            {/* Heat Map Analysis */}
            {activeAnalysisTab === 'heatmap' && (
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-4">Heat Map Analysis</h4>
                
                {/* Observation Date */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-300 mb-2">
                    Observation Date
                    {loadingDates && (
                      <span className="ml-2 text-emerald-400">
                        <i className="ri-loader-4-line animate-spin"></i>
                      </span>
                    )}
                  </label>
                  
                  {observationDates.length > 0 ? (
                    <div className="relative">
                      <select
                        value={observationDate}
                        onChange={(e) => setObservationDate(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm pr-8 appearance-none"
                        disabled={loadingDates || isProcessingHeatMap}
                      >
                        {observationDates.map((date) => (
                          <option key={date} value={date}>
                            {new Date(date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </option>
                        ))}
                      </select>
                      <i className="ri-arrow-down-s-line absolute right-2 top-2.5 text-gray-400 pointer-events-none"></i>
                    </div>
                  ) : (
                    <input
                      type="date"
                      value={observationDate}
                      onChange={(e) => setObservationDate(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
                      disabled={loadingDates || isProcessingHeatMap}
                    />
                  )}
                </div>

                {/* Index Selection */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-300 mb-2">Index Type</label>
                  <div className="relative">
                    <select 
                      value={selectedIndex}
                      onChange={(e) => setSelectedIndex(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm pr-8 appearance-none"
                      disabled={isProcessingHeatMap}
                    >
                      {indexOptions.map((index) => (
                        <option key={index} value={index}>{index}</option>
                      ))}
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-2 top-2.5 text-gray-400 pointer-events-none"></i>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleRunAnalysis}
                  disabled={!selectedField || processing || loadingDates || isProcessingHeatMap}
                  className={`w-full px-4 py-2 rounded text-sm font-medium transition-all duration-300 flex items-center justify-center ${
                    isProcessingHeatMap
                      ? 'bg-emerald-600/50 cursor-not-allowed'
                      : !selectedField || processing || loadingDates
                      ? 'bg-gray-700 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 transform hover:scale-[1.02]'
                  }`}
                >
                  {isProcessingHeatMap ? (
                    <>
                      <div className="animate-spin h-4 w-4 border border-white rounded-full border-t-transparent mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="ri-map-2-line mr-2"></i>
                      Generate Heat Map
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Time Series Analysis */}
            {activeAnalysisTab === 'timeseries' && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium">Time Series Analysis</h4>
                </div>

                {/* Index Type */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-300 mb-2">Index Type</label>
                  <div className="relative">
                    <select 
                      value={selectedIndex}
                      onChange={(e) => setSelectedIndex(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm pr-8 appearance-none"
                      disabled={isProcessingTimeSeries}
                    >
                      {indexOptions.map((index) => (
                        <option key={index} value={index}>{index}</option>
                      ))}
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-2 top-2.5 text-gray-400 pointer-events-none"></i>
                  </div>
                </div>

                {/* Date Range */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-300 mb-2">Date Range</label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
                      disabled={isProcessingTimeSeries}
                    />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
                      disabled={isProcessingTimeSeries}
                    />
                  </div>
                </div>

                {/* Processing Status */}
                {isProcessingTimeSeries && (
                  <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-emerald-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-medium text-emerald-400">Generating Time Series</h5>
                      <div className="text-xs text-gray-400">{processingProgress}%</div>
                    </div>
                    
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${processingProgress}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-300">
                      <div className="animate-spin h-4 w-4 border border-emerald-400 rounded-full border-t-transparent mr-3"></div>
                      <span>{processingStage}</span>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {processingError && (
                  <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <div className="flex items-center text-red-400">
                      <i className="ri-error-warning-line mr-2"></i>
                      <span className="text-sm">{processingError}</span>
                    </div>
                  </div>
                )}

{/* Time Series Line Chart */}
{chartData.length > 0 && (
  <div className="mb-6 bg-gray-800 rounded-lg p-6 border border-gray-700">
    <div className="flex items-center justify-between mb-6">
      <h5 className="text-sm font-medium text-gray-200">
        {selectedIndex} (Normalized Difference Vegetation Index)
      </h5>
      <div className="text-xs text-gray-400">
        {chartData.length} observations
      </div>
    </div>
    
    {/* Chart Container */}
    <div className="relative" style={{ height: '300px', width: '100%' }}>
      <svg width="100%" height="100%" viewBox="0 0 500 300" className="overflow-visible">
        {/* Chart background */}
        <rect width="450" height="250" x="40" y="20" fill="#1f2937" stroke="none"/>
        
        {/* Horizontal grid lines */}
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, index) => {
          const y = 270 - (ratio * 250);
          const value = minValue + (maxValue - minValue) * ratio;
          return (
            <g key={index}>
              <line 
                x1="40" 
                y1={y} 
                x2="490" 
                y2={y} 
                stroke="#374151" 
                strokeWidth="1"
              />
              <text
                x="35"
                y={y + 3}
                fill="#9ca3af"
                fontSize="10"
                textAnchor="end"
              >
                {value.toFixed(2)}
              </text>
            </g>
          );
        })}
        
        {/* Chart line */}
        <path
          d={chartData.map((data, index) => {
            const x = 40 + (index / (chartData.length - 1)) * 450;
            const normalizedValue = maxValue > minValue 
              ? ((data.value - minValue) / (maxValue - minValue))
              : 0.5;
            const y = 270 - (normalizedValue * 250);
            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ')}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
        />
        
        {/* Data points */}
        {chartData.map((data, index) => {
          const x = 40 + (index / (chartData.length - 1)) * 450;
          const normalizedValue = maxValue > minValue 
            ? ((data.value - minValue) / (maxValue - minValue))
            : 0.5;
          const y = 270 - (normalizedValue * 250);
          const isSelected = index === timeSeriesSliderIndex;
          
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={isSelected ? "5" : "4"}
              fill={isSelected ? "#dc2626" : "#3b82f6"}
              stroke="#1f2937"
              strokeWidth="2"
              className="cursor-pointer transition-all duration-200"
              onClick={() => handleTimeSeriesSliderChange(index)}
            />
          );
        })}
        
        {/* X-axis */}
        <line x1="40" y1="270" x2="490" y2="270" stroke="#9ca3af" strokeWidth="1"/>
        
        {/* X-axis labels */}
        {chartData.map((data, index) => {
          if (index % Math.max(1, Math.floor(chartData.length / 6)) === 0 || index === chartData.length - 1) {
            const x = 40 + (index / (chartData.length - 1)) * 450;
            return (
              <text
                key={index}
                x={x}
                y="290"
                fill="#9ca3af"
                fontSize="10"
                textAnchor="middle"
                transform={`rotate(-45, ${x}, 290)`}
              >
                {data.date}
              </text>
            );
          }
          return null;
        })}
        
        {/* Y-axis */}
        <line x1="40" y1="20" x2="40" y2="270" stroke="#9ca3af" strokeWidth="1"/>
      </svg>
    </div>

    
    {/* Current value display */}
    {timeSeriesData?.results?.[timeSeriesSliderIndex] && (
      <div className="mt-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm font-medium text-gray-200">
              {new Date(timeSeriesData.results[timeSeriesSliderIndex].date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            <div className="text-xl font-bold text-blue-400">
              {timeSeriesData.results[timeSeriesSliderIndex].mean_index_value.toFixed(3)}
            </div>
            <div className="text-xs text-gray-400">Mean {selectedIndex} Value</div>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-gray-400">Observation</div>
            <div className="text-sm font-medium text-gray-200">
              {timeSeriesSliderIndex + 1} of {chartData.length}
            </div>
          </div>
        </div>
        
        {/* Trend indicator */}
        {timeSeriesSliderIndex > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-600">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Change from previous:</span>
              <div className={`flex items-center ${
                timeSeriesData.results[timeSeriesSliderIndex].mean_index_value > 
                timeSeriesData.results[timeSeriesSliderIndex - 1].mean_index_value 
                  ? 'text-green-400' : 'text-red-400'
              }`}>
                <i className={`ri-arrow-${
                  timeSeriesData.results[timeSeriesSliderIndex].mean_index_value > 
                  timeSeriesData.results[timeSeriesSliderIndex - 1].mean_index_value 
                    ? 'up' : 'down'
                }-line mr-1`}></i>
                {Math.abs(
                  timeSeriesData.results[timeSeriesSliderIndex].mean_index_value - 
                  timeSeriesData.results[timeSeriesSliderIndex - 1].mean_index_value
                ).toFixed(4)}
              </div>
            </div>
          </div>
        )}
      </div>
    )}
    
    {/* Navigation slider */}
    <div className="mt-4">
      <input
        type="range"
        min="0"
        max={chartData.length - 1}
        value={timeSeriesSliderIndex}
        onChange={(e) => handleTimeSeriesSliderChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider-dark"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>Start</span>
        <span>End</span>
      </div>
    </div>
  </div>
)}

                <button
                  onClick={handleRunAnalysis}
                  disabled={!selectedField || processing || isProcessingTimeSeries}
                  className={`w-full px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center mb-4 ${
                    isProcessingTimeSeries
                      ? 'bg-emerald-600/50 cursor-not-allowed'
                      : !selectedField || processing
                      ? 'bg-gray-700 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {isProcessingTimeSeries ? (
                    <>
                      <div className="animate-spin h-4 w-4 border border-white rounded-full border-t-transparent mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="ri-line-chart-line mr-2"></i>
                      Generate Time Series
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Report Generation */}
            {activeAnalysisTab === 'report' && (
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-4">Generate Report</h4>
                
                {/* Report Type */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-300 mb-2">Report Type</label>
                  <div className="space-y-2">
                    {['Field Health Report', 'Yield Prediction Report', 'Comprehensive Analysis'].map((type) => (
                      <label key={type} className="flex items-center">
                        <input
                          type="radio"
                          name="reportType"
                          value={type}
                          className="mr-2 text-emerald-600"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Date Range for Report */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-300 mb-2">Analysis Period</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      placeholder="Start Date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
                    />
                    <input
                      type="date"
                      placeholder="End Date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={handleRunAnalysis}
                  disabled={!selectedField || processing}
                  className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors flex items-center justify-center"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin h-4 w-4 border border-white rounded-full border-t-transparent mr-2"></div>
                      {processingType || 'Generating...'}
                    </>
                  ) : (
                    <>
                      <i className="ri-file-text-line mr-2"></i>
                      Generate Report
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Field Management Tools */}
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-4">Field Management</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onZoomToField}
                  disabled={!selectedField}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed rounded text-xs font-medium transition-colors flex items-center justify-center"
                >
                  <i className="ri-search-line mr-1"></i>
                  Zoom to Field
                </button>
                <button
                  disabled={!selectedField}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed rounded text-xs font-medium transition-colors flex items-center justify-center"
                >
                  <i className="ri-calendar-line mr-1"></i>
                  Crop Calendar
                </button>
              </div>
            </div>

            {/* Color palette */}
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-3">Color Palette</h4>
              <div className="flex space-x-2">
                {[
                  'bg-yellow-400',
                  'bg-blue-400', 
                  'bg-orange-400',
                  'bg-purple-400'
                ].map((color, index) => (
                  <div key={index} className="flex items-center space-x-1">
                    <div className={`w-6 h-6 rounded ${color} cursor-pointer hover:scale-110 transition-transform`}></div>
                  </div>
                ))}
                <button className="w-6 h-6 border-2 border-dashed border-gray-500 rounded flex items-center justify-center hover:border-gray-400">
                  <i className="ri-add-line text-gray-400 text-sm"></i>
                </button>
              </div>
            </div>

            {/* Results Section */}
            {analysisResults && (
              <div className="mb-6 p-3 bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Analysis Results</h4>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>Current {selectedIndex}: {analysisResults.ndvi || '0.65'}</div>
                  <div>Health Status: {analysisResults.healthStatus || 'Good'}</div>
                  <div>Last Updated: {analysisResults.lastUpdated || '2 hours ago'}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* When collapsed, show minimal container */}
        {!showAnalysisTools && (
          <div className="p-4 text-center text-gray-400 text-sm">
            Analysis tools hidden - click arrow above to show
          </div>
        )}
      </div>
    </>
  );
}