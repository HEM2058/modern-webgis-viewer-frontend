import { useState } from 'react';

export default function SaveFieldModal({ drawnField, onClose, onSave }) {
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
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formValues.name.trim()) {
      newErrors.name = 'Field name is required';
    }
    
    if (formValues.farmer_id && isNaN(parseInt(formValues.farmer_id))) {
      newErrors.farmer_id = 'Farmer ID must be a number';
    }
    
    if (formValues.total_land_area && isNaN(parseFloat(formValues.total_land_area))) {
      newErrors.total_land_area = 'Total land area must be a number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveField = async () => {
    if (!validateForm()) {
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
             data: {
        geometry: {
          coordinates: geometry.geometry.coordinates[0],
        }
      }
      };

      console.log('Saving field with payload:', payload);

      const response = await fetch('https://digisaka.app/api/mobile/explorer-fields-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Field saved successfully:', data);
      onSave(data);
    } catch (error) {
      console.error('Error saving field:', error);
      
      // Handle specific error messages
      if (error.message) {
        alert(`Failed to save field: ${error.message}`);
      } else {
        alert('Failed to save field. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Save Field</h3>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          {/* Field Name - Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Name *
            </label>
            <input
              type="text"
              name="name"
              value={formValues.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter field name"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Farmer ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Farmer ID
            </label>
            <input
              type="number"
              name="farmer_id"
              value={formValues.farmer_id}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                errors.farmer_id ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter farmer ID"
              disabled={isLoading}
            />
            {errors.farmer_id && (
              <p className="mt-1 text-sm text-red-600">{errors.farmer_id}</p>
            )}
          </div>

          {/* Location Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Region
              </label>
              <input
                type="text"
                name="region"
                value={formValues.region}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Region"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Province
              </label>
              <input
                type="text"
                name="province"
                value={formValues.province}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Province"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Municipality
              </label>
              <input
                type="text"
                name="municipality"
                value={formValues.municipality}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Municipality"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Barangay
              </label>
              <input
                type="text"
                name="barangay"
                value={formValues.barangay}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Barangay"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Total Land Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Land Area (hectares)
            </label>
            <input
              type="number"
              step="0.01"
              name="total_land_area"
              value={formValues.total_land_area}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                errors.total_land_area ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="0.00"
              disabled={isLoading}
            />
            {errors.total_land_area && (
              <p className="mt-1 text-sm text-red-600">{errors.total_land_area}</p>
            )}
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="ndvi_notification"
                checked={formValues.ndvi_notification === '1'}
                onChange={(e) => setFormValues(prev => ({
                  ...prev,
                  ndvi_notification: e.target.checked ? '1' : '0'
                }))}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <label className="ml-2 block text-sm text-gray-700">
                Enable NDVI notifications
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_jas"
                checked={formValues.is_jas === '1'}
                onChange={(e) => setFormValues(prev => ({
                  ...prev,
                  is_jas: e.target.checked ? '1' : '0'
                }))}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <label className="ml-2 block text-sm text-gray-700">
                JAS certified field
              </label>
            </div>
          </div>

          {/* Field Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">
              <p className="font-medium">Field Information:</p>
              <p>Type: {drawnField?.isUnsaved ? 'Drawn Field' : 'Uploaded Field'}</p>
              <p>Geometry: Available</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveField}
            disabled={isLoading || !formValues.name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>{isLoading ? 'Saving...' : 'Save Field'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}