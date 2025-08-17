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

interface ReportData {
  fieldInfo: any;
  timeSeriesData: any;
  selectedIndices: string[];
  analysisDate: string;
  reportType: string;
}

// CropCalendar Component integrated within the file
const CropCalendar = ({ fieldId }: { fieldId: string }) => {
  const [geojsonData, setGeojsonData] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [field] = useState({
    crop_type: 'Rice',
    planting_date: '2023-12-09',
    harvesting_date: '2024-04-07'
  });

  const cropStages = {
    Rice: [
      { name: 'Seedling', day: 10 },
      { name: 'Tillering', day: 30 },
      { name: 'Panicle Initiation', day: 55 },
      { name: 'Booting', day: 75 },
      { name: 'Heading', day: 90 },
      { name: 'Flowering', day: 95 },
      { name: 'Maturity', day: 120 }
    ]
  };

  useEffect(() => {
    if (!fieldId) return;

    setLoading(true);
    axios
      .get(`https://digisaka.app/api/mobile/explorer-fields/${fieldId}`)
      .then(response => {
        const geojson = response.data.data.features[0];
        setGeojsonData(geojson);
      })
      .catch(error => {
        console.error('Error fetching GeoJSON:', error);
        setLoading(false);
      });
  }, [fieldId]);

  useEffect(() => {
    if (!geojsonData || !field.planting_date) return;

    const fetchTimeSeries = async () => {
      setLoading(true);

      const startDate = field.planting_date;
      const endDate = field.harvesting_date;

      const requestData = {
        start_date: startDate,
        end_date: endDate,
        geometry: geojsonData,
      };

      try {
        const res = await axios.post(
          'https://backend.digisaka.com/api/timeseriesgraph/',
          requestData
        );
        setTimeSeriesData(res.data.results || []);
      } catch (err) {
        console.error('Error fetching time series:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeSeries();
  }, [geojsonData, field]);

  if (loading) {
    return (
      <div className="p-6 bg-gray-800 rounded-lg">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border border-emerald-400 rounded-full border-t-transparent mr-3"></div>
          <span className="text-gray-300">Loading crop calendar data...</span>
        </div>
      </div>
    );
  }

  if (!timeSeriesData.length) {
    return (
      <div className="p-6 bg-gray-800 rounded-lg">
        <div className="text-center py-8">
          <i className="ri-plant-line text-4xl text-gray-400 mb-4"></i>
          <p className="text-gray-400">No crop calendar data available</p>
        </div>
      </div>
    );
  }

  // Parse dates and calculate days after planting
  const parseDate = (dateStr: string) => new Date(dateStr);
  const plantingDate = parseDate(field.planting_date);
  
  const processedData = timeSeriesData.map((d: any) => ({
    date: d.date,
    daysAfterPlanting: Math.floor((parseDate(d.date).getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24)),
    mean: d.mean_index,
  }));

  // Simple SVG chart dimensions
  const chartWidth = 100;
  const chartHeight = 60;
  const maxDays = Math.max(...processedData.map(d => d.daysAfterPlanting));
  const maxValue = Math.max(...processedData.map(d => d.mean));
  const minValue = Math.min(...processedData.map(d => d.mean));

  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-white mb-2">Crop Calendar</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Crop Type:</span>
            <span className="text-white font-medium ml-2">{field.crop_type}</span>
          </div>
          <div>
            <span className="text-gray-400">Planting Date:</span>
            <span className="text-white font-medium ml-2">{field.planting_date}</span>
          </div>
        </div>
      </div>

      {/* NDVI Chart */}
      <div className="mb-6 p-4 bg-gray-700 rounded-lg">
        <h5 className="text-sm font-medium text-gray-200 mb-4">NDVI Progress Over Growing Season</h5>
        
        <div className="relative h-48 bg-gray-600 rounded">
          <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
            {/* Background grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const y = chartHeight - 5 - (ratio * (chartHeight - 10));
              return (
                <line 
                  key={index}
                  x1="10" 
                  y1={y} 
                  x2={chartWidth - 10} 
                  y2={y} 
                  stroke="#4b5563" 
                  strokeWidth="0.5"
                />
              );
            })}
            
            {/* Chart line */}
            <path
              d={processedData.map((data, index) => {
                const x = 10 + ((data.daysAfterPlanting / maxDays) * (chartWidth - 20));
                const normalizedValue = maxValue > minValue 
                  ? ((data.mean - minValue) / (maxValue - minValue))
                  : 0.5;
                const y = (chartHeight - 5) - (normalizedValue * (chartHeight - 10));
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke="#10b981"
              strokeWidth="1"
            />
            
            {/* Data points */}
            {processedData.map((data, index) => {
              const x = 10 + ((data.daysAfterPlanting / maxDays) * (chartWidth - 20));
              const normalizedValue = maxValue > minValue 
                ? ((data.mean - minValue) / (maxValue - minValue))
                : 0.5;
              const y = (chartHeight - 5) - (normalizedValue * (chartHeight - 10));
              
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="1"
                  fill="#3b82f6"
                />
              );
            })}
          </svg>
        </div>

        {/* Chart stats */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-center">
          <div>
            <div className="text-gray-400">Current NDVI</div>
            <div className="text-emerald-400 font-semibold">
              {processedData[processedData.length - 1]?.mean?.toFixed(2) || 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Days After Planting</div>
            <div className="text-blue-400 font-semibold">
              {processedData[processedData.length - 1]?.daysAfterPlanting || 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Peak NDVI</div>
            <div className="text-yellow-400 font-semibold">{maxValue.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Growth Stages */}
      <div className="mb-4">
        <h5 className="text-sm font-medium text-gray-200 mb-3">Growth Stages</h5>
        <div className="space-y-2">
          {cropStages[field.crop_type]?.map((stage, index) => {
            const currentDays = processedData[processedData.length - 1]?.daysAfterPlanting || 0;
            const isCompleted = currentDays >= stage.day;
            const isCurrent = currentDays >= (cropStages[field.crop_type][index - 1]?.day || 0) && currentDays < stage.day;
            
            return (
              <div 
                key={index} 
                className={`flex items-center justify-between p-2 rounded text-sm ${
                  isCurrent 
                    ? 'bg-emerald-600 text-white' 
                    : isCompleted 
                      ? 'bg-gray-600 text-gray-300' 
                      : 'bg-gray-700 text-gray-400'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-3 ${
                    isCurrent 
                      ? 'bg-white' 
                      : isCompleted 
                        ? 'bg-emerald-400' 
                        : 'bg-gray-500'
                  }`}></div>
                  <span>{stage.name}</span>
                </div>
                <div className="text-xs">
                  {stage.day} days
                  {isCurrent && <span className="ml-2 text-yellow-300">(Current)</span>}
                  {isCompleted && <span className="ml-2 text-emerald-300">✓</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="p-3 bg-gray-700 rounded-lg">
        <div className="text-xs text-gray-400 space-y-1">
          <div>Growing Season: {maxDays} days total</div>
          <div>Harvest Date: {field.harvesting_date}</div>
          <div>Data Points: {processedData.length} observations</div>
        </div>
      </div>
    </div>
  );
};

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
  const [selectedIndex, setSelectedIndex] = useState('ndvi');
  const [selectedTimeRange, setSelectedTimeRange] = useState('Last Month');
  const [startDate, setStartDate] = useState('2025-05-01');
  const [endDate, setEndDate] = useState('2025-08-06');
  const [showAnalysisTools, setShowAnalysisTools] = useState(true);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState('heatmap');
  const [observationDate, setObservationDate] = useState('2024-01-15');
  const [observationDates, setObservationDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);
  
  // Report states
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState('Field Health Report');
  const [selectedReportIndices, setSelectedReportIndices] = useState(['ndvi']);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  // Enhanced processing states
  const [isProcessingHeatMap, setIsProcessingHeatMap] = useState(false);
  const [isProcessingTimeSeries, setIsProcessingTimeSeries] = useState(false);
  const [isProcessingCropCalendar, setIsProcessingCropCalendar] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [processingError, setProcessingError] = useState('');
  
  // Time series specific states
  const [timeSeriesSliderIndex, setTimeSeriesSliderIndex] = useState(0);
  const [isPlayingTimeSeries, setIsPlayingTimeSeries] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);

  // Heat map index options with descriptions
  const heatMapIndexOptions = [
    { value: 'ndvi', label: 'NDVI (Normalized Difference Vegetation Index)' },
    { value: 'evi', label: 'EVI (Enhanced Vegetation Index)' },
    { value: 'msavi2', label: 'MSAVI2 (Modified Soil Adjusted Vegetation Index 2)' },
    { value: 'sipi', label: 'SIPI (Structure Insensitive Pigment Index)' },
    { value: 'savi', label: 'SAVI (Soil-Adjusted Vegetation Index)' },
    { value: 'vari', label: 'VARI (Visible Atmospherically Resistant Index)' },
    { value: 'arvi', label: 'ARVI (Atmospherically Resistant Vegetation Index)' },
    { value: 'rgr', label: 'RGR (Ratio of Red to Green Reflectance)' },
    { value: 'psri', label: 'PSRI (Plant Senescence Reflectance Index)' },
    { value: 'ndii', label: 'NDII (Normalized Difference Infrared Index)' },
    { value: 'rendvi', label: 'RENDVI (Red-Edge NDVI)' },
    { value: 'ireci', label: 'IRECI (Inverted Red-Edge Chlorophyll Index)' },
    { value: 's2rep', label: 'S2REP (Sentinel-2 Red Edge Position)' },
    { value: 'reb_ndvi1', label: 'REB NDVI1 (Red-Edge NDVI1)' },
    { value: 'nbr', label: 'Normalized Burn Ratio' },
    { value: 'ndpi', label: 'Normalized Difference Polarization Index' },
    { value: 'sccci', label: 'SCCCI' }
  ];

  // Time series index options with descriptions
  const timeSeriesIndexOptions = [
    { value: 'ndvi', label: 'NDVI (Normalized Difference Vegetation Index)' },
    { value: 'evi', label: 'EVI (Enhanced Vegetation Index)' },
    { value: 'msavi2', label: 'MSAVI2 (Modified Soil Adjusted Vegetation Index 2)' },
    { value: 'sipi', label: 'SIPI (Structure Insensitive Pigment Index)' },
    { value: 'savi', label: 'SAVI (Soil-Adjusted Vegetation Index)' },
    { value: 'vari', label: 'VARI (Visible Atmospherically Resistant Index)' },
    { value: 'arvi', label: 'ARVI (Atmospherically Resistant Vegetation Index)' },
    { value: 'rgr', label: 'RGR (Ratio of Red to Green Reflectance)' },
    { value: 'psri', label: 'PSRI (Plant Senescence Reflectance Index)' },
    { value: 'ndii', label: 'NDII (Normalized Difference Infrared Index)' },
    { value: 'rendvi', label: 'RENDVI (Red-Edge NDVI)' },
    { value: 'ireci', label: 'IRECI (Inverted Red-Edge Chlorophyll Index)' },
    { value: 's2rep', label: 'S2REP (Sentinel-2 Red Edge Position)' },
    { value: 'reb_ndvi1', label: 'REB NDVI1 (Red-Edge NDVI1)' },
    { value: 'rvi', label: 'RADAR Vegetative Index' },
    { value: 'vhi', label: 'Vegetation Health Index' },
    { value: 'nbr', label: 'Normalized Burn Ratio' },
    { value: 'ndpi', label: 'Normalized Difference Polarization Index' },
    { value: 'sccci', label: 'SCCCI' }
  ];

  // Set default date range based on current date
  useEffect(() => {
    const currentDate = new Date();
    const threeMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1);
    
    setStartDate(threeMonthsAgo.toISOString().split('T')[0]);
    setEndDate(currentDate.toISOString().split('T')[0]);
  }, []);

  // Processing stages for time series generation
  const timeSeriesProcessingStages = [
    'Initializing time series analysis...',
    'Fetching historical satellite data...',
    'Processing vegetation indices...',
    'Generating time series data...',
    'Preparing visualization...'
  ];

  // Processing stages for crop calendar
  const cropCalendarProcessingStages = [
    'Initializing crop calendar analysis...',
    'Fetching field geometry data...',
    'Processing growing season data...',
    'Calculating growth stages...',
    'Preparing crop calendar visualization...'
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

  // Function to simulate crop calendar processing
  const simulateCropCalendarProcessing = () => {
    let currentStage = 0;
    const stageInterval = setInterval(() => {
      if (currentStage < cropCalendarProcessingStages.length) {
        setProcessingStage(cropCalendarProcessingStages[currentStage]);
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

  // Function to process crop calendar
  const processCropCalendar = async () => {
    if (!selectedField) {
      console.error('No field selected');
      return;
    }

    setIsProcessingCropCalendar(true);
    setProcessingProgress(0);
    setProcessingError('');
    setProcessingStage('Initializing crop calendar analysis...');

    const stageInterval = simulateCropCalendarProcessing();

    try {
      // Simulate the processing time for crop calendar
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      clearInterval(stageInterval);
      setProcessingProgress(100);
      setProcessingStage('Crop calendar loaded successfully!');
      
      setTimeout(() => {
        setIsProcessingCropCalendar(false);
        setProcessingProgress(0);
        setProcessingStage('');
      }, 2000);
      
    } catch (error) {
      console.error('Error processing crop calendar:', error);
      
      clearInterval(stageInterval);
      setProcessingError('Failed to load crop calendar. Please try again.');
      setProcessingStage('Error occurred');
      setProcessingProgress(0);
      
      setTimeout(() => {
        setIsProcessingCropCalendar(false);
        setProcessingError('');
        setProcessingStage('');
      }, 5000);
    }
  };

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

  // Function to generate report data
  const generateReport = async () => {
    if (!selectedField || !fieldGeoJson) {
      console.error('No field selected for report generation');
      return;
    }

    setIsGeneratingReport(true);

    try {
      // Fetch time series data for all selected indices
      const reportTimeSeriesData = {};
      
      for (const index of selectedReportIndices) {
        const response = await axios.post("https://backend.digisaka.com/api/timeseriesimages/", {
          start_date: startDate,
          end_date: endDate,
          geometry: fieldGeoJson,
          index: index.toLowerCase()
        });
        reportTimeSeriesData[index] = response.data;
      }

      const report: ReportData = {
        fieldInfo: selectedField,
        timeSeriesData: reportTimeSeriesData,
        selectedIndices: selectedReportIndices,
        analysisDate: new Date().toISOString(),
        reportType: selectedReportType
      };

      setReportData(report);
      setShowReportModal(true);
      
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleRunAnalysis = () => {
    if (activeAnalysisTab === 'heatmap') {
      fetchHeatMapData();
    } else if (activeAnalysisTab === 'timeseries') {
      fetchTimeSeriesData();
    } else if (activeAnalysisTab === 'report') {
      generateReport();
    } else if (activeAnalysisTab === 'cropcalendar') {
      processCropCalendar();
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

  // Handle multiple indices selection for report
  const handleReportIndexChange = (index: string) => {
    setSelectedReportIndices(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // Export report as PDF
  const exportReportAsPDF = () => {
    if (!reportData) return;

    // Create a new window with the report content for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const reportHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportData.reportType} - ${reportData.fieldInfo.farm_name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .field-info { background: #f5f5f5; padding: 15px; margin-bottom: 20px; }
            .chart-container { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            @media print { 
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportData.reportType}</h1>
            <h2>${reportData.fieldInfo.farm_name}</h2>
            <p>Generated on: ${new Date(reportData.analysisDate).toLocaleDateString()}</p>
          </div>
          
          <div class="field-info">
            <h3>Field Information</h3>
            <p><strong>Farm ID:</strong> ${reportData.fieldInfo.farm_id}</p>
            <p><strong>Farm Name:</strong> ${reportData.fieldInfo.farm_name}</p>
            <p><strong>Analysis Period:</strong> ${startDate} to ${endDate}</p>
            <p><strong>Indices Analyzed:</strong> ${reportData.selectedIndices.join(', ').toUpperCase()}</p>
          </div>
          
          <div class="chart-container">
            <h3>Time Series Analysis Summary</h3>
            <p>Detailed time series charts and analysis data would be rendered here in a full implementation.</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(reportHTML);
    printWindow.document.close();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
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
              <div className="flex space-x-1 mb-4 flex-wrap">
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
                  onClick={() => setActiveAnalysisTab('cropcalendar')}
                  className={`px-3 py-2 text-xs rounded ${
                    activeAnalysisTab === 'cropcalendar' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <i className="ri-calendar-line mr-1"></i>
                  Crop Calendar
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
                      {heatMapIndexOptions.map((index) => (
                        <option key={index.value} value={index.value}>{index.label}</option>
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
                      {timeSeriesIndexOptions.map((index) => (
                        <option key={index.value} value={index.value}>{index.label}</option>
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
                        {selectedIndex.toUpperCase()} Time Series
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
                            <div className="text-xs text-gray-400">Mean {selectedIndex.toUpperCase()} Value</div>
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

            {/* Crop Calendar Analysis */}
            {activeAnalysisTab === 'cropcalendar' && (
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-4">Crop Calendar</h4>
                
                {/* Processing Status */}
                {isProcessingCropCalendar && (
                  <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-emerald-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-medium text-emerald-400">Loading Crop Calendar</h5>
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

                {/* Generate Button */}
                <button
                  onClick={handleRunAnalysis}
                  disabled={!selectedField || processing || isProcessingCropCalendar}
                  className={`w-full px-4 py-2 rounded text-sm font-medium transition-all duration-300 flex items-center justify-center mb-4 ${
                    isProcessingCropCalendar
                      ? 'bg-emerald-600/50 cursor-not-allowed'
                      : !selectedField || processing
                      ? 'bg-gray-700 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 transform hover:scale-[1.02]'
                  }`}
                >
                  {isProcessingCropCalendar ? (
                    <>
                      <div className="animate-spin h-4 w-4 border border-white rounded-full border-t-transparent mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="ri-calendar-line mr-2"></i>
                      Load Crop Calendar
                    </>
                  )}
                </button>

                {/* Crop Calendar Component */}
                {!isProcessingCropCalendar && !processingError && selectedField && (
                  <CropCalendar fieldId={selectedField.farm_id} />
                )}
              </div>
            )}

            {/* Report Generation */}
            {activeAnalysisTab === 'report' && (
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-4">Generate Report</h4>
                
                {/* Indices Selection for Report */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-300 mb-2">Select Indices for Analysis</label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {timeSeriesIndexOptions.slice(0, 10).map((index) => (
                      <label key={index.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedReportIndices.includes(index.value)}
                          onChange={() => handleReportIndexChange(index.value)}
                          className="mr-2 text-emerald-600"
                        />
                        <span className="text-xs">{index.label}</span>
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
                  disabled={!selectedField || processing || isGeneratingReport || selectedReportIndices.length === 0}
                  className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors flex items-center justify-center"
                >
                  {isGeneratingReport ? (
                    <>
                      <div className="animate-spin h-4 w-4 border border-white rounded-full border-t-transparent mr-2"></div>
                      Generating Report...
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


          </div>
        )}

        {/* When collapsed, show minimal container */}
        {!showAnalysisTools && (
          <div className="p-4 text-center text-gray-400 text-sm">
            Analysis tools hidden - click arrow above to show
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && reportData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{reportData.reportType}</h2>
                <p className="text-sm text-gray-600">Generated on {new Date(reportData.analysisDate).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={exportReportAsPDF}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center text-sm"
                >
                  <i className="ri-download-line mr-2"></i>
                  Export PDF
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Field Information Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Field Information</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Farm Name</label>
                      <p className="text-sm font-semibold text-gray-800">{reportData.fieldInfo.farm_name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Farm ID</label>
                      <p className="text-sm font-semibold text-gray-800">{reportData.fieldInfo.farm_id}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Analysis Period</label>
                      <p className="text-sm font-semibold text-gray-800">{startDate} to {endDate}</p>
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-xs font-medium text-gray-600">Indices Analyzed</label>
                      <p className="text-sm font-semibold text-gray-800">
                        {reportData.selectedIndices.map(index => index.toUpperCase()).join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Field Map Placeholder */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Field Location</h3>
                <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                  <div className="text-center">
                    <i className="ri-map-2-line text-4xl text-gray-400 mb-2"></i>
                    <p className="text-gray-500">Field boundary map would be displayed here</p>
                    <p className="text-xs text-gray-400">Interactive map showing field boundaries and location</p>
                  </div>
                </div>
              </div>

              {/* Time Series Charts */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Time Series Analysis</h3>
                
                {/* Sample Chart for Each Selected Index */}
                {reportData.selectedIndices.slice(0, 3).map((indexKey) => {
                  const indexData = reportData.timeSeriesData[indexKey];
                  if (!indexData?.results) return null;

                  const chartData = indexData.results.map((item: any) => ({
                    date: item.date,
                    value: item.mean_index_value
                  }));

                  const maxVal = Math.max(...chartData.map(d => d.value));
                  const minVal = Math.min(...chartData.map(d => d.value));

                  return (
                    <div key={indexKey} className="mb-6 bg-gray-50 rounded-lg p-6">
                      <h4 className="text-md font-medium text-gray-800 mb-4">
                        {indexKey.toUpperCase()} Time Series
                      </h4>
                      
                      {/* Simple SVG Chart */}
                      <div className="relative h-64 bg-white rounded border">
                        <svg width="100%" height="100%" viewBox="0 0 600 250" className="overflow-visible">
                          {/* Grid lines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                            const y = 220 - (ratio * 180);
                            const value = minVal + (maxVal - minVal) * ratio;
                            return (
                              <g key={index}>
                                <line x1="60" y1={y} x2="580" y2={y} stroke="#e5e7eb" strokeWidth="1"/>
                                <text x="55" y={y + 3} fill="#6b7280" fontSize="12" textAnchor="end">
                                  {value.toFixed(2)}
                                </text>
                              </g>
                            );
                          })}
                          
                          {/* Chart line */}
                          <path
                            d={chartData.map((data, index) => {
                              const x = 60 + (index / (chartData.length - 1)) * 520;
                              const normalizedValue = maxVal > minVal 
                                ? ((data.value - minVal) / (maxVal - minVal))
                                : 0.5;
                              const y = 220 - (normalizedValue * 180);
                              return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2"
                          />
                          
                          {/* Data points */}
                          {chartData.map((data, index) => {
                            const x = 60 + (index / (chartData.length - 1)) * 520;
                            const normalizedValue = maxVal > minVal 
                              ? ((data.value - minVal) / (maxVal - minVal))
                              : 0.5;
                            const y = 220 - (normalizedValue * 180);
                            
                            return (
                              <circle
                                key={index}
                                cx={x}
                                cy={y}
                                r="3"
                                fill="#10b981"
                                stroke="white"
                                strokeWidth="2"
                              />
                            );
                          })}
                          
                          {/* Axes */}
                          <line x1="60" y1="40" x2="60" y2="220" stroke="#6b7280" strokeWidth="1"/>
                          <line x1="60" y1="220" x2="580" y2="220" stroke="#6b7280" strokeWidth="1"/>
                        </svg>
                      </div>

                      {/* Summary Statistics */}
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-xs text-gray-600">Average</p>
                          <p className="text-lg font-semibold text-emerald-600">
                            {(chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length).toFixed(3)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600">Maximum</p>
                          <p className="text-lg font-semibold text-blue-600">{maxVal.toFixed(3)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600">Minimum</p>
                          <p className="text-lg font-semibold text-orange-600">{minVal.toFixed(3)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Report Summary */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Analysis Summary</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    This {reportData.reportType.toLowerCase()} provides comprehensive analysis of {reportData.fieldInfo.farm_name} 
                    using {reportData.selectedIndices.length} vegetation indices over the period from {startDate} to {endDate}. 
                    The analysis includes time series visualization, statistical summaries, and field boundary mapping.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}