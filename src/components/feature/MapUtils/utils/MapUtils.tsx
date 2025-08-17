// Utility functions for map operations

export const createColorScale = (visParams: any) => {
  if (!visParams || !visParams.palette) return [];
  
  const { min, max, palette } = visParams;
  const steps = palette.length;
  const stepSize = (max - min) / (steps - 1);
  
  return palette.map((color: string, index: number) => ({
    color,
    value: min + (stepSize * index),
    label: (min + (stepSize * index)).toFixed(3)
  }));
};

export const formatCoordinates = (coordinates: [number, number]): string => {
  return `${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}`;
};

export const formatDate = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options
  });
};

export const calculateProgress = (current: number, total: number): number => {
  return Math.round(((current + 1) / total) * 100);
};

// Analysis info helper
export const getCurrentAnalysisInfo = (
  showTimeSeriesSlider: boolean,
  currentTimeSeriesImage: any,
  timeSeriesData: any,
  indexHeatMapData: any
) => {
  if (showTimeSeriesSlider && currentTimeSeriesImage) {
    return {
      type: 'Time Series',
      index: timeSeriesData?.index?.toUpperCase() || '',
      date: formatDate(currentTimeSeriesImage.date),
      value: currentTimeSeriesImage.mean_index_value?.toFixed(3)
    };
  } else if (indexHeatMapData) {
    return {
      type: 'Heat Map',
      index: indexHeatMapData.index?.toUpperCase() || '',
      date: formatDate(indexHeatMapData.firstImageDate),
      value: null
    };
  }
  return null;
};

// Get visualization parameters
export const getVisualizationParams = (timeSeriesData: any, indexHeatMapData: any) => {
  return timeSeriesData?.vis_params || indexHeatMapData?.visParams || null;
};

// Debounce function for search
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};