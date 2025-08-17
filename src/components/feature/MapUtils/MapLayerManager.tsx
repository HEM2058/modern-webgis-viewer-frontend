import { Map } from 'ol';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { XYZ, Vector as VectorSource } from 'ol/source';
import { GeoJSON } from 'ol/format';
import { Style, Stroke, Fill } from 'ol/style';

export class MapLayerManager {
  private map: Map;
  private vectorLayer: VectorLayer | null = null;
  private heatMapLayer: TileLayer | null = null;
  private timeSeriesLayer: TileLayer | null = null;

  constructor(map: Map) {
    this.map = map;
  }

  // Create base layers
  static createBaseLayers() {
    return {
      satellite: new TileLayer({
        source: new XYZ({
          url: 'http://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
          crossOrigin: 'anonymous',
        }),
      }),
      hybrid: new TileLayer({
        source: new XYZ({
          url: 'http://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          crossOrigin: 'anonymous',
        }),
      }),
      terrain: new TileLayer({
        source: new XYZ({
          url: 'http://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
          crossOrigin: 'anonymous',
        }),
      })
    };
  }

  // Initialize vector layer for GeoJSON
  initializeVectorLayer(): VectorLayer {
    const vectorSource = new VectorSource();
    this.vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        stroke: new Stroke({
          color: '#10b981',
          width: 3,
        }),
        fill: new Fill({
          color: 'rgba(16, 185, 129, 0.15)',
        }),
      }),
    });

    this.map.addLayer(this.vectorLayer);
    return this.vectorLayer;
  }

  // Update GeoJSON visualization
  updateGeoJsonLayer(fieldGeoJson: any, selectedField?: any) {
    if (!this.vectorLayer || !fieldGeoJson) return;

    const vectorSource = this.vectorLayer.getSource();
    if (!vectorSource) return;

    try {
      vectorSource.clear();

      const format = new GeoJSON({
        featureProjection: 'EPSG:3857',
      });

      const feature = format.readFeature(fieldGeoJson);
      
      // Enhanced styling for selected field
      feature.setStyle(new Style({
        stroke: new Stroke({
          color: selectedField ? '#10b981' : '#3b82f6',
          width: selectedField ? 4 : 3,
        }),
        fill: new Fill({
          color: selectedField ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.15)',
        }),
      }));

      vectorSource.addFeature(feature);

      // Auto-fit to field if it's newly selected
      if (selectedField) {
        const extent = feature.getGeometry()?.getExtent();
        if (extent) {
          this.map.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            maxZoom: 18,
            duration: 1000,
          });
        }
      }
    } catch (error) {
      console.error('Error adding GeoJSON to map:', error);
    }
  }

  // Update heat map layer
  updateHeatMapLayer(indexHeatMapData: any, opacity: number = 0.7) {
    // Remove existing heat map layer
    if (this.heatMapLayer) {
      this.map.removeLayer(this.heatMapLayer);
      this.heatMapLayer = null;
    }

    // Add new heat map layer if we have tile URL
    if (indexHeatMapData?.tileUrl) {
      this.heatMapLayer = new TileLayer({
        source: new XYZ({
          url: indexHeatMapData.tileUrl,
          crossOrigin: 'anonymous',
        }),
        opacity: opacity,
      });

      this.map.addLayer(this.heatMapLayer);
    }
  }

  // Update time series layer
  updateTimeSeriesLayer(imageData: any, opacity: number = 0.7) {
    // Remove existing time series layer
    if (this.timeSeriesLayer) {
      this.map.removeLayer(this.timeSeriesLayer);
      this.timeSeriesLayer = null;
    }

    // Add new time series layer
    if (imageData?.tile_url) {
      this.timeSeriesLayer = new TileLayer({
        source: new XYZ({
          url: imageData.tile_url,
          crossOrigin: 'anonymous',
        }),
        opacity: opacity,
      });

      this.map.addLayer(this.timeSeriesLayer);
    }
  }

  // Toggle layer visibility
  toggleLayerVisibility(layerType: 'heatMap' | 'timeSeries', originalOpacity: number) {
    const layer = layerType === 'heatMap' ? this.heatMapLayer : this.timeSeriesLayer;
    if (layer) {
      const currentOpacity = layer.getOpacity();
      const newOpacity = currentOpacity > 0 ? 0 : originalOpacity;
      layer.setOpacity(newOpacity);
    }
  }

  // Adjust layer opacity
  adjustLayerOpacity(layerType: 'heatMap' | 'timeSeries', opacity: number) {
    const layer = layerType === 'heatMap' ? this.heatMapLayer : this.timeSeriesLayer;
    if (layer) {
      layer.setOpacity(opacity);
    }
  }

  // Change base layer
  changeBaseLayer(newBaseLayer: 'satellite' | 'hybrid' | 'terrain') {
    const layers = this.map.getLayers().getArray();
    const baseLayer = layers[0];
    
    const baseLayers = MapLayerManager.createBaseLayers();
    
    this.map.removeLayer(baseLayer);
    this.map.getLayers().insertAt(0, baseLayers[newBaseLayer]);
  }

  // Zoom to field extent
  zoomToField() {
    if (this.vectorLayer) {
      const source = this.vectorLayer.getSource();
      const features = source?.getFeatures();
      if (features && features.length > 0) {
        const extent = features[0].getGeometry()?.getExtent();
        if (extent) {
          this.map.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            maxZoom: 18,
            duration: 1000,
          });
        }
      }
    }
  }

  // Get vector layer
  getVectorLayer(): VectorLayer | null {
    return this.vectorLayer;
  }

  // Get heat map layer
  getHeatMapLayer(): TileLayer | null {
    return this.heatMapLayer;
  }

  // Get time series layer
  getTimeSeriesLayer(): TileLayer | null {
    return this.timeSeriesLayer;
  }

  // Cleanup layers
  cleanup() {
    if (this.heatMapLayer) {
      this.map.removeLayer(this.heatMapLayer);
      this.heatMapLayer = null;
    }
    if (this.timeSeriesLayer) {
      this.map.removeLayer(this.timeSeriesLayer);
      this.timeSeriesLayer = null;
    }
    if (this.vectorLayer) {
      this.map.removeLayer(this.vectorLayer);
      this.vectorLayer = null;
    }
  }
}