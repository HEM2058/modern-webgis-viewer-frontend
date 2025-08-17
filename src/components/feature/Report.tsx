import React, { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import { Map, View } from 'ol';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { XYZ, Vector as VectorSource } from 'ol/source';
import { GeoJSON } from 'ol/format';
import { Style, Stroke, Fill } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';

interface ReportData {
  fieldInfo: any;
  timeSeriesData: any;
  selectedIndices: string[];
  analysisDate: string;
  reportType: string;
  startDate: string;
  endDate: string;
  fieldGeoJson?: any;
}

interface ReportProps {
  reportData: ReportData;
  onClose: () => void;
  onExport: () => void;
}

export default function Report({ reportData, onClose, onExport }: ReportProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const [selectedIndexForChart, setSelectedIndexForChart] = useState(reportData.selectedIndices[0] || 'ndvi');

  // Initialize mini map in report
  useEffect(() => {
    if (!mapRef.current || !reportData.fieldGeoJson) return;

    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: 'http://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        crossOrigin: 'anonymous',
      }),
    });

    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        stroke: new Stroke({
          color: '#10b981',
          width: 3,
        }),
        fill: new Fill({
          color: 'rgba(16, 185, 129, 0.2)',
        }),
      }),
    });

    const map = new Map({
      target: mapRef.current,
      layers: [satelliteLayer, vectorLayer],
      view: new View({
        center: fromLonLat([120.86, 15.59]),
        zoom: 16,
      }),
      controls: defaultControls({ zoom: false, attribution: false }),
    });

    // Add field geometry
    try {
      const format = new GeoJSON({
        featureProjection: 'EPSG:3857',
      });

      const feature = format.readFeature(reportData.fieldGeoJson);
      vectorSource.addFeature(feature);

      const extent = feature.getGeometry()?.getExtent();
      if (extent) {
        map.getView().fit(extent, {
          padding: [20, 20, 20, 20],
          maxZoom: 16,
        });
      }
    } catch (error) {
      console.error('Error adding GeoJSON to mini map:', error);
    }

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, [reportData.fieldGeoJson]);

  // Helper function to get index description
  const getIndexDescription = (index: string) => {
    const descriptions = {
      ndvi: 'Normalized Difference Vegetation Index - Measures vegetation health and density',
      evi: 'Enhanced Vegetation Index - Improved vegetation monitoring with atmospheric correction',
      msavi2: 'Modified Soil Adjusted Vegetation Index 2 - Reduces soil background influence',
      sipi: 'Structure Insensitive Pigment Index - Measures carotenoid to chlorophyll ratio',
      savi: 'Soil-Adjusted Vegetation Index - Minimizes soil brightness influences',
      vari: 'Visible Atmospherically Resistant Index - Uses visible light bands',
      arvi: 'Atmospherically Resistant Vegetation Index - Reduces atmospheric effects',
      rgr: 'Ratio of Red to Green Reflectance - Simple vegetation indicator',
      psri: 'Plant Senescence Reflectance Index - Detects plant aging and stress',
      ndii: 'Normalized Difference Infrared Index - Measures plant water stress',
      rendvi: 'Red-Edge NDVI - Uses red-edge band for improved sensitivity',
      ireci: 'Inverted Red-Edge Chlorophyll Index - Estimates chlorophyll content',
      s2rep: 'Sentinel-2 Red Edge Position - Red edge inflection point',
      reb_ndvi1: 'Red-Edge NDVI1 - Red-edge based vegetation index',
      rvi: 'RADAR Vegetative Index - Uses SAR data for vegetation monitoring',
      vhi: 'Vegetation Health Index - Combines temperature and vegetation conditions',
      nbr: 'Normalized Burn Ratio - Detects burned areas and fire severity',
      ndpi: 'Normalized Difference Polarization Index - SAR-based index',
      sccci: 'SCCCI - Specialized crop condition index'
    };
    return descriptions[index] || `${index.toUpperCase()} - Vegetation index for crop monitoring`;
  };

  // Create chart data for selected index
  const createChartData = (indexKey: string) => {
    const indexData = reportData.timeSeriesData[indexKey];
    if (!indexData?.results) return [];
    
    return indexData.results.map((item: any) => ({
      date: item.date,
      value: item.mean_index_value,
      formattedDate: new Date(item.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }));
  };

  // Calculate statistics
  const calculateStats = (data: any[]) => {
    if (!data.length) return { mean: 0, max: 0, min: 0, trend: 'stable' };
    
    const values = data.map(d => d.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    // Simple trend calculation
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstMean = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    let trend = 'stable';
    if (secondMean > firstMean * 1.05) trend = 'increasing';
    else if (secondMean < firstMean * 0.95) trend = 'decreasing';
    
    return { mean, max, min, trend };
  };

  // SVG Chart Component
  const SVGChart = ({ data, indexKey }: { data: any[], indexKey: string }) => {
    if (!data.length) return <div className="h-48 flex items-center justify-center text-gray-500">No data available</div>;

    const maxVal = Math.max(...data.map(d => d.value));
    const minVal = Math.min(...data.map(d => d.value));
    const range = maxVal - minVal || 1;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium text-gray-800">{indexKey.toUpperCase()} Time Series</h4>
          <div className="text-sm text-gray-500">{data.length} observations</div>
        </div>
        
        <svg width="100%" height="200" viewBox="0 0 600 200" className="mb-4">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const y = 180 - (ratio * 140);
            const value = minVal + range * ratio;
            return (
              <g key={index}>
                <line x1="50" y1={y} x2="580" y2={y} stroke="#e5e7eb" strokeWidth="1"/>
                <text x="45" y={y + 4} fill="#6b7280" fontSize="12" textAnchor="end">
                  {value.toFixed(2)}
                </text>
              </g>
            );
          })}
          
          {/* Chart line */}
          <path
            d={data.map((item, index) => {
              const x = 50 + (index / (data.length - 1)) * 530;
              const y = 180 - ((item.value - minVal) / range) * 140;
              return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
          />
          
          {/* Data points */}
          {data.map((item, index) => {
            const x = 50 + (index / (data.length - 1)) * 530;
            const y = 180 - ((item.value - minVal) / range) * 140;
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
          <line x1="50" y1="40" x2="50" y2="180" stroke="#6b7280" strokeWidth="1"/>
          <line x1="50" y1="180" x2="580" y2="180" stroke="#6b7280" strokeWidth="1"/>
          
          {/* X-axis labels */}
          {data.map((item, index) => {
            if (index % Math.max(1, Math.floor(data.length / 6)) === 0 || index === data.length - 1) {
              const x = 50 + (index / (data.length - 1)) * 530;
              return (
                <text
                  key={index}
                  x={x}
                  y="195"
                  fill="#6b7280"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </text>
              );
            }
            return null;
          })}
        </svg>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          {(() => {
            const stats = calculateStats(data);
            return (
              <>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Average</div>
                  <div className="text-lg font-semibold text-emerald-600">
                    {stats.mean.toFixed(3)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Maximum</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {stats.max.toFixed(3)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Minimum</div>
                  <div className="text-lg font-semibold text-orange-600">
                    {stats.min.toFixed(3)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Trend</div>
                  <div className={`text-lg font-semibold flex items-center justify-center ${
                    stats.trend === 'increasing' ? 'text-green-600' : 
                    stats.trend === 'decreasing' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    <i className={`ri-arrow-${
                      stats.trend === 'increasing' ? 'up' : 
                      stats.trend === 'decreasing' ? 'down' : 'right'
                    }-line mr-1`}></i>
                    {stats.trend}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{reportData.reportType}</h1>
            <p className="text-sm text-gray-600">
              Generated on {new Date(reportData.analysisDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onExport}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center text-sm font-medium transition-colors"
            >
              <i className="ri-download-line mr-2"></i>
              Export Report
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Executive Summary */}
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Executive Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600 mb-2">{reportData.selectedIndices.length}</div>
                <div className="text-sm text-gray-600">Indices Analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {Math.ceil((new Date(reportData.endDate).getTime() - new Date(reportData.startDate).getTime()) / (1000 * 60 * 60 * 24))}
                </div>
                <div className="text-sm text-gray-600">Days Analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {Object.values(reportData.timeSeriesData).reduce((total, data: any) => {
                    return total + (data?.results?.length || 0);
                  }, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Observations</div>
              </div>
            </div>
          </div>

          {/* Field Information */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Field Information</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Field Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Farm Name:</span>
                    <span className="font-medium text-gray-800">{reportData.fieldInfo.farm_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Farm ID:</span>
                    <span className="font-medium text-gray-800">{reportData.fieldInfo.farm_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Analysis Period:</span>
                    <span className="font-medium text-gray-800">
                      {new Date(reportData.startDate).toLocaleDateString()} - {new Date(reportData.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Report Type:</span>
                    <span className="font-medium text-gray-800">{reportData.reportType}</span>
                  </div>
                </div>
              </div>

              {/* Field Location Map */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Field Location</h3>
                <div className="relative h-48 bg-gray-200 rounded-lg overflow-hidden">
                  <div ref={mapRef} className="w-full h-full"></div>
                  <div className="absolute top-2 left-2 bg-white rounded px-2 py-1 text-xs font-medium">
                    Field Boundary
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Index Analysis */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Vegetation Index Analysis</h2>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">View Index:</label>
                <select
                  value={selectedIndexForChart}
                  onChange={(e) => setSelectedIndexForChart(e.target.value)}
                  className="bg-white border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {reportData.selectedIndices.map(index => (
                    <option key={index} value={index}>{index.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Current Index Description */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <h4 className="text-sm font-medium text-blue-800 mb-1">
                {selectedIndexForChart.toUpperCase()} - About This Index
              </h4>
              <p className="text-sm text-blue-700">
                {getIndexDescription(selectedIndexForChart)}
              </p>
            </div>

            {/* Time Series Chart */}
            <SVGChart 
              data={createChartData(selectedIndexForChart)} 
              indexKey={selectedIndexForChart}
            />
          </div>

          {/* All Indices Overview */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">All Indices Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportData.selectedIndices.map((indexKey) => {
                const data = createChartData(indexKey);
                const stats = calculateStats(data);
                
                return (
                  <div key={indexKey} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-800">{indexKey.toUpperCase()}</h4>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        stats.trend === 'increasing' ? 'bg-green-100 text-green-800' :
                        stats.trend === 'decreasing' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {stats.trend}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Average:</span>
                        <span className="font-medium">{stats.mean.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Range:</span>
                        <span className="font-medium">{stats.min.toFixed(3)} - {stats.max.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Observations:</span>
                        <span className="font-medium">{data.length}</span>
                      </div>
                    </div>
                    
                    {/* Mini sparkline */}
                    <div className="mt-3">
                      <svg width="100%" height="30" viewBox="0 0 200 30">
                        <path
                          d={data.map((item, index) => {
                            const x = (index / (data.length - 1)) * 200;
                            const y = 25 - ((item.value - stats.min) / (stats.max - stats.min)) * 20;
                            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                          }).join(' ')}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Recommendations & Insights</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-lg font-medium text-green-800 mb-2">Positive Indicators</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Vegetation indices show consistent monitoring coverage</li>
                  <li>• Multiple indices provide comprehensive field assessment</li>
                  <li>• Time series data enables trend analysis</li>
                </ul>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="text-lg font-medium text-amber-800 mb-2">Areas for Attention</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Monitor vegetation health trends regularly</li>
                  <li>• Consider seasonal variations in analysis</li>
                  <li>• Correlate with weather and farming practices</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Technical Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Data Sources</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>• Satellite imagery from multiple sensors</li>
                  <li>• Cloud-filtered observations</li>
                  <li>• Geometric and atmospheric corrections applied</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Processing Details</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>• Mean values calculated per observation date</li>
                  <li>• Field boundary masking applied</li>
                  <li>• Quality assurance filtering implemented</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Report generated by DigiSaka Analytics Platform
            </div>
            <div>
              {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}