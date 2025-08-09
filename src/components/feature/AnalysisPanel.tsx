import { useState } from 'react';

interface AnalysisPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedField?: any;
}

export default function AnalysisPanel({ isOpen, onToggle, selectedField }: AnalysisPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState('NDVI');
  const [selectedTimeRange, setSelectedTimeRange] = useState('Last Month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAnalysisTools, setShowAnalysisTools] = useState(true);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState('heatmap');
  const [observationDate, setObservationDate] = useState('2024-01-15');
  const [processing, setProcessing] = useState(false);

  // Mock chart data
  const chartData = [
    { period: 'Week 1', value: 0.2 },
    { period: 'Week 2', value: 0.35 },
    { period: 'Week 3', value: 0.6 },
    { period: 'Week 4', value: 0.75 },
    { period: 'Week 5', value: 0.65 },
    { period: 'Week 6', value: 0.45 },
    { period: 'Week 7', value: 0.3 }
  ];

  const maxValue = Math.max(...chartData.map(d => d.value));

  const indexOptions = ['NDVI', 'EVI', 'SAVI', 'NDWI', 'GNDVI', 'MSAVI'];

  const handleRunAnalysis = () => {
    setProcessing(true);
    // Simulate API call
    setTimeout(() => {
      setProcessing(false);
    }, 2000);
  };

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
      <div className={`fixed right-0 top-0 h-full w-96 bg-gray-900 text-white transform transition-transform duration-300 z-50 ${
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
          <button 
            onClick={onToggle}
            className="lg:hidden p-1 rounded hover:bg-gray-700"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
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
                  <label className="block text-xs text-gray-300 mb-2">Observation Date</label>
                  <input
                    type="date"
                    value={observationDate}
                    onChange={(e) => setObservationDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
                  />
                </div>

                {/* Index Selection */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-300 mb-2">Index Type</label>
                  <div className="relative">
                    <select 
                      value={selectedIndex}
                      onChange={(e) => setSelectedIndex(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm pr-8 appearance-none"
                    >
                      {indexOptions.map((index) => (
                        <option key={index} value={index}>{index}</option>
                      ))}
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-2 top-2.5 text-gray-400 pointer-events-none"></i>
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
                      Processing...
                    </>
                  ) : (
                    'Generate Heat Map'
                  )}
                </button>
              </div>
            )}

            {/* Time Series Analysis */}
            {activeAnalysisTab === 'timeseries' && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium">Time Series Analysis</h4>
                  <button 
                    onClick={handleRunAnalysis}
                    className="text-emerald-400 hover:text-emerald-300 text-xs"
                  >
                    <i className="ri-refresh-line mr-1"></i>
                    Refresh
                  </button>
                </div>

                {/* Index Type */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-300 mb-2">Index Type</label>
                  <div className="relative">
                    <select 
                      value={selectedIndex}
                      onChange={(e) => setSelectedIndex(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm pr-8 appearance-none"
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
                    />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  
                  {/* Time range buttons */}
                  <div className="flex space-x-1 mb-4">
                    {['Last Week', 'Last Month', 'Last Year'].map((range) => (
                      <button
                        key={range}
                        onClick={() => setSelectedTimeRange(range)}
                        className={`px-2 py-1 text-xs rounded ${
                          selectedTimeRange === range 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chart */}
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <div className="h-32 flex items-end space-x-1">
                    {chartData.map((data, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-emerald-500 rounded-t"
                          style={{ height: `${(data.value / maxValue) * 100}%` }}
                        ></div>
                        <span className="text-xs text-gray-400 mt-1 transform -rotate-45 origin-left">
                          {data.period}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Y-axis labels */}
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>0</span>
                    <span>0.2</span>
                    <span>0.4</span>
                    <span>0.6</span>
                    <span>0.8</span>
                  </div>
                </div>

                <button
                  onClick={handleRunAnalysis}
                  disabled={!selectedField || processing}
                  className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors flex items-center justify-center mb-4"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin h-4 w-4 border border-white rounded-full border-t-transparent mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    'Run Time Series Analysis'
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
                      className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
                    />
                    <input
                      type="date"
                      placeholder="End Date"
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
                      Generating...
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
            {selectedField && (
              <div className="mb-6 p-3 bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Analysis Results</h4>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>Current NDVI: 0.65</div>
                  <div>Health Status: Good</div>
                  <div>Last Updated: 2 hours ago</div>
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