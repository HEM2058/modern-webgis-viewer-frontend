import { useState, useEffect } from 'react';
import axios from 'axios';
import logo from "../../assets/logo.png";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onFieldSelect?: (field: any) => void;
  onDeleteField?: (fieldId: any) => void;
  onAnalysisPanelToggle?: () => void;
  selectedField?: any;
  selectedFieldId?: any;
  
  // Drawing mode props
  isDrawingMode?: boolean;
  onDrawingModeToggle?: (isDrawing: boolean) => void;
  drawnField?: any;
  onSaveDemoField?: () => void;
  onDeleteDemoField?: () => void;
  
  // Optional props for field interactions
  showData?: boolean;
  monitoringFieldId?: any;
  indexData?: any;
  vhiData?: any;
  processingFieldId?: any;
  processingType?: string;
  indexHeatMapData?: any;
  handleZoomToArea?: (fieldId: any) => void;
  handleMonitorSavedField?: (fieldId: any) => void;
  handleCloseAnalysis?: (fieldId: any) => void;
  handleGetIndexMapForDrawedField?: (fieldId: any) => void;
  setProcessingFieldId?: (fieldId: any) => void;
  setProcessingType?: (type: string) => void;
}

export default function Sidebar({ 
  isOpen, 
  onToggle,
  onFieldSelect,
  onDeleteField,
  onAnalysisPanelToggle,
  selectedField,
  selectedFieldId,
  
  // Drawing mode props
  isDrawingMode = false,
  onDrawingModeToggle,
  drawnField,
  onSaveDemoField,
  onDeleteDemoField,
  
  // Optional props
  showData,
  monitoringFieldId,
  indexData,
  vhiData,
  processingFieldId,
  processingType,
  indexHeatMapData,
  handleZoomToArea = () => {},
  handleMonitorSavedField = () => {},
  handleCloseAnalysis = () => {},
  handleGetIndexMapForDrawedField = () => {},
  setProcessingFieldId = () => {},
  setProcessingType = () => {}
}: SidebarProps) {
  // Main section toggle - 'fields' or 'layers'
  const [activeSection, setActiveSection] = useState<'fields' | 'layers'>('fields');
  
  const [activeLayer, setActiveLayer] = useState('projected-yield');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [showAllFields, setShowAllFields] = useState(false);
  
  // Replace mock filters with real API-based filtering
  const [provinces, setProvinces] = useState<any[]>([]);
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const fieldsPerPage = 5;
  
  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<any>(null);
  const [showCropCalendar, setShowCropCalendar] = useState(false);
  const [showCropReport, setShowCropReport] = useState(false);
  const [fields, setFields] = useState<any[]>([]);
  
  const mapLayers = [
    { id: 'projected-yield', name: 'Projected Yield', color: 'bg-emerald-500', active: true },
    { id: 'vegetation-health', name: 'Vegetation Health', color: 'bg-green-500', active: true },
    { id: 'surface-temperature', name: 'Surface Temperature', color: 'bg-white', active: false },
    { id: 'maize-areas', name: 'Maize Areas', color: 'bg-emerald-400', active: true },
    { id: 'sugarcane-areas', name: 'Sugarcane Areas', color: 'bg-white', active: false },
    { id: 'rice-areas', name: 'Rice Areas', color: 'bg-white', active: false },
    { id: 'june-27-ndvi', name: 'June 27 NDVI', color: 'bg-teal-500', active: true }
  ];

  // Date filter options
  const dateFilterOptions = [
    { label: "All Fields", value: null },
    { label: "Today's Fields", value: "today" },
    { label: "Last 2 Days", value: "2days" },
    { label: "Last 7 Days", value: "7days" },
    { label: "Last 30 Days", value: "30days" },
  ];

  // Fetch provinces on component mount
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const response = await axios.get("https://digisaka.app/api/mobile/explorer-avail-provinces");
        setProvinces(response.data.data);
      } catch (error) {
        console.error("Error fetching provinces:", error);
      }
    };
    fetchProvinces();
  }, []);

  // Fetch fields based on filters
  useEffect(() => {
    const fetchFields = async () => {
      setIsLoading(true);
      try {
        let response;
        
        if (dateFilter) {
          // Calculate dates based on the selected filter
          const endDate = new Date();
          let startDate = new Date(endDate);

          switch (dateFilter) {
            case "today":
              break;
            case "2days":
              startDate.setDate(endDate.getDate() - 1);
              break;
            case "7days":
              startDate.setDate(endDate.getDate() - 7);
              break;
            case "30days":
              startDate.setDate(endDate.getDate() - 29);
              break;
            default:
              break;
          }

          // Format dates as YYYY-MM-DD
          const formatDate = (date: Date) => date.toISOString().split('T')[0];
          
          const filterData = {
            startdate: formatDate(startDate),
            enddate: formatDate(endDate)
          };
       
          // Get filtered field IDs
          const filterResponse = await axios.get(
            "https://digisaka.online/api/mobile/explorer-fields-filter", 
            { params: filterData }
          );

          // Get all fields
          const detailsResponse = await axios.get(
            "https://digisaka.app/api/mobile/explorer-fields"
          );
          
          // Filter fields by both date and province
          const filteredFields = detailsResponse.data.data.filter((field: any) => {
            const fieldIdStr = field.farm_id.toString();
            const isDateMatch = filterResponse.data.data.some(
              (f: any) => f.farm_id.toString() === fieldIdStr
            );
            
            const isProvinceMatch = selectedProvince === "all" || 
              field.province_id === selectedProvince;
              
            return isDateMatch && isProvinceMatch;
          });
          
          setFields(filteredFields);
        } else if (selectedProvince && selectedProvince !== "all") {
          // Only province filter
          response = await axios.get(
            `https://digisaka.app/api/mobile/explorer-fields-provinces/${selectedProvince}`
          );
          setFields(response.data.data);
        } else {
          // No filters - load all fields
          response = await axios.get("https://digisaka.app/api/mobile/explorer-fields");
          setFields(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching fields:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFields();
  }, [selectedProvince, dateFilter, setFields]);

  // Create combined fields list with drawn field at top if it exists
  const allFields = drawnField ? [drawnField, ...fields] : fields;

  // Pagination calculations
  const totalPages = Math.ceil(allFields.length / fieldsPerPage);
  const indexOfLastField = currentPage * fieldsPerPage;
  const indexOfFirstField = indexOfLastField - fieldsPerPage;
  const currentFields = showAllFields ? allFields : allFields.slice(indexOfFirstField, indexOfLastField);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileNames = Array.from(files).map(file => file.name);
      setUploadedFiles(prev => [...prev, ...fileNames]);
    }
  };

  const toggleLayer = (layerId: string) => {
    setActiveLayer(layerId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-emerald-400';
      case 'Monitoring': return 'text-yellow-400';
      case 'Planning': return 'text-blue-400';
      case 'Harvested': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const openDeleteModal = (fieldId: any) => {
    setFieldToDelete(fieldId);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setFieldToDelete(null);
    setShowDeleteModal(false);
  };

  const confirmDeleteField = async () => {
    try {
      if (fieldToDelete === 'demo_field') {
        // Handle demo field deletion
        if (onDeleteDemoField) {
          onDeleteDemoField();
        }
      } else {
        // Handle regular field deletion
        await axios.delete(`https://digisaka.app/api/mobile/explorer-fields/${fieldToDelete}`);
        setFields(fields.filter((field: any) => field.farm_id !== fieldToDelete));
        if (onDeleteField) {
          onDeleteField(fieldToDelete);
        }
      }
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting field:", error);
      closeDeleteModal();
    }
  };

  const handleFieldClick = (field: any) => {
    if (onFieldSelect) {
      onFieldSelect(field);
    }
    if (onAnalysisPanelToggle) {
      onAnalysisPanelToggle();
    }
  };

  // Check if field is selected
  const isFieldSelected = (field: any) => {
    return selectedFieldId === field.farm_id;
  };

  const handleDrawFieldToggle = () => {
    const newDrawingMode = !isDrawingMode;
    if (onDrawingModeToggle) {
      onDrawingModeToggle(newDrawingMode);
    }
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
      
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-80 bg-gray-900 text-white transform transition-transform duration-300 z-50 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:relative lg:translate-x-0 lg:block overflow-y-auto`}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img 
              src={logo} 
              alt="Logo" 
              className="h-8 w-auto"
            /> Digisaka
          </div>
          <button 
            onClick={onToggle}
            className="lg:hidden p-1 rounded hover:bg-gray-700"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Main Section Toggle Buttons */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveSection('fields')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                activeSection === 'fields'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <i className="ri-map-pin-line mr-2"></i>
              Fields
            </button>
            <button
              onClick={() => setActiveSection('layers')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                activeSection === 'layers'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <i className="ri-stack-line mr-2"></i>
              Layers
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* Fields Section */}
          {activeSection === 'fields' && (
            <div>
              {/* Draw Field Control */}
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-3">Field Tools</h4>
                <div className="space-y-2">
                  <button
                    onClick={handleDrawFieldToggle}
                    className={`w-full flex items-center justify-center py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isDrawingMode
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <i className={`${isDrawingMode ? 'ri-stop-line' : 'ri-pencil-line'} mr-2`}></i>
                    {isDrawingMode ? 'Stop Drawing' : 'Draw New Field'}
                  </button>
                  
                  {isDrawingMode && (
                    <div className="bg-emerald-900/50 border border-emerald-600 rounded-lg p-3">
                      <div className="flex items-center text-emerald-300 text-xs mb-2">
                        <i className="ri-information-line mr-1"></i>
                        Drawing Mode Active
                      </div>
                      <p className="text-xs text-emerald-200">
                        Click on the map to start drawing your field boundary. Double-click to finish.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Saved Fields Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Saved Fields</h4>
                  <span className="text-xs text-gray-400">({allFields.length})</span>
                  <button 
                    onClick={() => setShowAllFields(!showAllFields)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer whitespace-nowrap"
                  >
                    {showAllFields ? 'Show Less' : 'Show All'}
                  </button>
                </div>

                {/* Filter Controls - only show if no demo field or when showing all */}
                {!drawnField && (
                  <div className="mb-4 space-y-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Filter by Province</label>
                      <div className="relative">
                        <select 
                          value={selectedProvince}
                          onChange={(e) => {
                            setSelectedProvince(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-xs pr-8 appearance-none"
                        >
                          <option value="all">All Provinces</option>
                          {provinces.map((province) => (
                            <option key={province.province_id} value={province.province_id}>
                              {province.province_name}
                            </option>
                          ))}
                        </select>
                        <i className="ri-arrow-down-s-line absolute right-2 top-2 text-gray-400 pointer-events-none"></i>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Filter by Date Added</label>
                      <div className="relative">
                        <select 
                          value={dateFilter || ''}
                          onChange={(e) => {
                            setDateFilter(e.target.value || null);
                            setCurrentPage(1);
                          }}
                          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-xs pr-8 appearance-none"
                        >
                          {dateFilterOptions.map((option) => (
                            <option key={option.value || 'all'} value={option.value || ''}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <i className="ri-arrow-down-s-line absolute right-2 top-2 text-gray-400 pointer-events-none"></i>
                      </div>
                    </div>
                  </div>
                )}
                
                {isLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {currentFields.length > 0 ? (
                        currentFields.map((field) => {
                          const isSelected = isFieldSelected(field);
                          const isDemoField = field.isDemo;
                          const isUnsaved = field.isUnsaved;
                          
                          return (
                            <div 
                              key={field.farm_id} 
                              className={`relative rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                                isSelected 
                                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 shadow-lg shadow-emerald-500/20 transform scale-[1.02] border-2 border-emerald-400' 
                                  : isDemoField
                                  ? 'bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-700 hover:to-blue-600'
                                  : 'bg-gray-800 hover:bg-gray-700'
                              }`}
                              onClick={() => handleFieldClick(field)}
                            >
                              {/* Selected field indicator */}
                              {isSelected && (
                                <>
                                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full flex items-center justify-center">
                                    <i className="ri-check-line text-xs text-gray-900"></i>
                                  </div>
                                  <div className="absolute inset-0 bg-emerald-400 rounded-lg opacity-10 animate-pulse"></div>
                                </>
                              )}

                              {/* Demo field indicator */}
                              {isDemoField && !isSelected && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-400 rounded-full flex items-center justify-center">
                                  <i className="ri-pencil-line text-xs text-gray-900"></i>
                                </div>
                              )}
                              
                              <div className="relative z-10">
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`text-sm font-medium truncate pr-2 ${
                                    isSelected ? 'text-white font-semibold' : 'text-white'
                                  }`}>
                                    {field.farm_name}
                                    {isSelected && (
                                      <span className="ml-2 text-xs bg-emerald-400 text-gray-900 px-2 py-0.5 rounded-full font-medium">
                                        ACTIVE
                                      </span>
                                    )}
                                    {isDemoField && !isSelected && (
                                      <span className="ml-2 text-xs bg-blue-400 text-gray-900 px-2 py-0.5 rounded-full font-medium">
                                        DEMO
                                      </span>
                                    )}
                                  </span>
                                  <div className="flex items-center space-x-2">
                                    {/* Unsaved flag */}
                                    {isUnsaved && (
                                      <span className="text-xs text-yellow-400 flex items-center">
                                        <i className="ri-save-line mr-1"></i>
                                        Unsaved
                                      </span>
                                    )}
                                    <span className={`text-xs whitespace-nowrap ${
                                      isSelected ? 'text-emerald-100' : isDemoField ? 'text-blue-100' : 'text-emerald-400'
                                    }`}>
                                      ID: {field.farm_id}
                                    </span>
                                  </div>
                                </div>
                                
                                {field.ndvi_map_notification && !isDemoField && (
                                  <div className={`flex items-center text-xs mb-1 ${
                                    isSelected ? 'text-yellow-300' : 'text-yellow-400'
                                  }`}>
                                    <i className="ri-notification-line mr-1"></i>
                                    NDVI Map Available
                                  </div>
                                )}
                                
                                <div className={`text-xs ${
                                  isSelected 
                                    ? 'text-emerald-100' 
                                    : isDemoField 
                                    ? 'text-blue-200' 
                                    : 'text-gray-400'
                                }`}>
                                  {isSelected 
                                    ? 'Currently analyzing this field' 
                                    : isDemoField
                                    ? 'Demo field - click to analyze'
                                    : 'Click to analyze this field'
                                  }
                                </div>
                                
                                {/* Demo field actions */}
                                {isDemoField && (
                                  <div className="mt-2 pt-2 border-t border-blue-500/30">
                                    <div className="flex items-center justify-between space-x-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (onSaveDemoField) {
                                            onSaveDemoField();
                                          }
                                        }}
                                        className="flex-1 text-xs bg-blue-500 hover:bg-blue-400 text-white px-2 py-1 rounded flex items-center justify-center"
                                      >
                                        <i className="ri-save-line mr-1"></i>
                                        Save Field
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openDeleteModal('demo_field');
                                        }}
                                        className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded flex items-center justify-center"
                                      >
                                        <i className="ri-delete-bin-line"></i>
                                      </button>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Additional selected field info */}
                                {isSelected && !isDemoField && (
                                  <div className="mt-2 pt-2 border-t border-emerald-500/30">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-emerald-100">Status:</span>
                                      <span className="text-emerald-300 font-medium">Under Analysis</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-4 text-gray-400 text-sm">
                          No fields found with current filters
                        </div>
                      )}
                    </div>

                    {/* Pagination Controls */}
                    {!showAllFields && allFields.length > fieldsPerPage && (
                      <div className="flex justify-center items-center mt-4 space-x-2">
                        <button
                          onClick={handlePrevPage}
                          disabled={currentPage === 1}
                          className={`px-2 py-1 rounded text-xs ${
                            currentPage === 1
                              ? "bg-gray-700 cursor-not-allowed text-gray-500"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                        >
                          Previous
                        </button>
                        <span className="text-emerald-400 text-xs">
                          {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages}
                          className={`px-2 py-1 rounded text-xs ${
                            currentPage === totalPages
                              ? "bg-gray-700 cursor-not-allowed text-gray-500"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Layers Section */}
          {activeSection === 'layers' && (
            <div>
              {/* Upload Data Section */}
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-3">Upload Data</h4>
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
                    className="inline-block mt-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs cursor-pointer"
                  >
                    Browse Files
                  </label>
                </div>
                
                {uploadedFiles.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="text-xs text-gray-400 flex items-center">
                        <i className="ri-file-line mr-2"></i>
                        {file}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex space-x-2 mt-3">
                  <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded">
                    <i className="ri-edit-line"></i>
                  </button>
                  <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded">
                    <i className="ri-pencil-line"></i>
                  </button>
                  <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded">
                    <i className="ri-delete-bin-line"></i>
                  </button>
                </div>
              </div>

              {/* Map Layers Section */}
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-3">Map Layers</h4>
                <div className="space-y-2">
                  {mapLayers.map((layer) => (
                    <div key={layer.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full ${layer.color} ${!layer.active ? 'opacity-30' : ''}`}></div>
                        <span className={`text-sm ${layer.active ? 'text-white' : 'text-gray-400'}`}>
                          {layer.name}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleLayer(layer.id)}
                        className={`w-10 h-6 rounded-full transition-colors ${
                          layer.active ? 'bg-emerald-500' : 'bg-gray-600'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          layer.active ? 'translate-x-5' : 'translate-x-1'
                        }`}></div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {fieldToDelete === 'demo_field' ? 'Delete Demo Field?' : 'Delete Field?'}
            </h3>
            <p className="text-gray-600 mb-6">
              {fieldToDelete === 'demo_field' 
                ? 'This will remove the demo field from the map. This action cannot be undone.'
                : 'This will permanently delete this field. This action cannot be undone.'
              }
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteField}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}