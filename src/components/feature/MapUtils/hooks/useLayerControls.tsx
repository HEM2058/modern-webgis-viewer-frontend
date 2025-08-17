import { useState } from 'react';

export function useLayerControls() {
  const [showLegend, setShowLegend] = useState(false);
  const [layerOpacities, setLayerOpacities] = useState({
    heatMap: 0.7,
    timeSeries: 0.7
  });

  // Adjust layer opacity
  const adjustLayerOpacity = (layerType: 'heatMap' | 'timeSeries', opacity: number) => {
    setLayerOpacities(prev => ({ ...prev, [layerType]: opacity }));
  };

  // Toggle legend visibility
  const toggleLegend = () => {
    setShowLegend(!showLegend);
  };

  // Show legend (called when analysis data is loaded)
  const showLegendPanel = () => {
    setShowLegend(true);
  };

  // Hide legend
  const hideLegend = () => {
    setShowLegend(false);
  };

  return {
    showLegend,
    layerOpacities,
    adjustLayerOpacity,
    toggleLegend,
    showLegendPanel,
    hideLegend
  };
}