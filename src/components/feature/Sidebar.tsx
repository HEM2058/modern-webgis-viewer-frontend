import { useState } from 'react';
import logo from "../../assets/logo.jpg";
import FieldsPanel from './FieldsPanel';
import LayersPanel from './LayersPanel';

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

  // Layer-specific props
  onLayerToggle?: (layerId: string, active: boolean) => void;
  onFileUpload?: (files: File[]) => void;
  initialLayers?: any[];
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
  setProcessingType = () => {},

  // Layer props
  onLayerToggle,
  onFileUpload,
  initialLayers
}: SidebarProps) {
  // Main section toggle - 'fields' or 'layers'
  const [activeSection, setActiveSection] = useState<'fields' | 'layers'>('fields');

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
            />
            <span className="font-semibold">Digisaka</span>
          </div>
          <button 
            onClick={onToggle}
            className="lg:hidden p-1 rounded hover:bg-gray-700 transition-colors"
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

        {/* Content based on active section */}
        {activeSection === 'fields' ? (
          <FieldsPanel
            onFieldSelect={onFieldSelect}
            onDeleteField={onDeleteField}
            onAnalysisPanelToggle={onAnalysisPanelToggle}
            selectedField={selectedField}
            selectedFieldId={selectedFieldId}
            isDrawingMode={isDrawingMode}
            onDrawingModeToggle={onDrawingModeToggle}
            drawnField={drawnField}
            onSaveDemoField={onSaveDemoField}
            onDeleteDemoField={onDeleteDemoField}
            showData={showData}
            monitoringFieldId={monitoringFieldId}
            indexData={indexData}
            vhiData={vhiData}
            processingFieldId={processingFieldId}
            processingType={processingType}
            indexHeatMapData={indexHeatMapData}
            handleZoomToArea={handleZoomToArea}
            handleMonitorSavedField={handleMonitorSavedField}
            handleCloseAnalysis={handleCloseAnalysis}
            handleGetIndexMapForDrawedField={handleGetIndexMapForDrawedField}
            setProcessingFieldId={setProcessingFieldId}
            setProcessingType={setProcessingType}
          />
        ) : (
          <LayersPanel
            onLayerToggle={onLayerToggle}
            onFileUpload={onFileUpload}
            initialLayers={initialLayers}
          />
        )}
      </div>
    </>
  );
}