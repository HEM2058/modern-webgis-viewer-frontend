import { Map } from 'ol';
import { Tile as TileLayer, Vector as VectorLayer, Image as ImageLayer } from 'ol/layer';
import { XYZ, Vector as VectorSource, TileWMS, ImageWMS } from 'ol/source';
import { GeoJSON } from 'ol/format';
import { Style, Stroke, Fill } from 'ol/style';

export interface WMSLayerConfig {
  url: string;
  layers: string;
  styles?: string;
  defaultTime: string;
  visible: boolean;
}

export interface LayerVisibilityState {
  yield: boolean;
  vhi: boolean;
  lst: boolean;
  heatMap: boolean;
  timeSeries: boolean;
}

export interface LayerOpacityState {
  yield: number;
  vhi: number;
  lst: number;
  heatMap: number;
  timeSeries: number;
}

export class MapLayerManager {
  private map: Map;
  private vectorLayer: VectorLayer | null = null;
  private heatMapLayer: TileLayer | null = null;
  private timeSeriesLayer: TileLayer | null = null;
  
  // WMS layers
  private yieldLayer: ImageLayer<ImageWMS> | null = null;
  private vhiLayer: ImageLayer<ImageWMS> | null = null;
  private lstLayer: ImageLayer<ImageWMS> | null = null;

  // Layer configurations
  private readonly wmsConfigs = {
    yield: {
      url: 'https://backend.digisaka.com/geoserver/NDVI_Yield/wms',
      layers: 'NDVI_Yield:database_for_webgis',
      styles: 'ndvi',
      defaultTime: '2024-01-01',
      visible: false
    },
    vhi: {
      url: 'https://backend.digisaka.com/geoserver/VHI/wms',
      layers: 'VHI:VHI_Exports_Monthly_2000_2024',
      styles: 'VHI',
      defaultTime: '2024-01-01',
      visible: false
    },
    lst: {
      url: 'https://backend.digisaka.com/geoserver/LST/wms',
      layers: 'LST:LST_1km_Monthly',
      styles: 'LST',
      defaultTime: '2023-01-01',
      visible: false
    }
  };

  constructor(map: Map) {
    this.map = map;
    this.initializeWMSLayers();
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

  // Initialize WMS layers
  private initializeWMSLayers() {
    console.log('MapLayerManager: Initializing WMS layers...');

    // Yield Layer - Enhanced with better caching control
    this.yieldLayer = new ImageLayer({
      source: new ImageWMS({
        url: this.wmsConfigs.yield.url,
        params: {
          'LAYERS': this.wmsConfigs.yield.layers,
          'FORMAT': 'image/png',
          'TRANSPARENT': true,
          'TIME': this.wmsConfigs.yield.defaultTime,
          'STYLES': this.wmsConfigs.yield.styles || '',
          'VERSION': '1.1.1',
          'SRS': 'EPSG:3857',
          'TILED': true,
          'CQL_FILTER': undefined // Remove any default filters
        },
        serverType: 'geoserver',
        crossOrigin: 'anonymous',
        // Disable caching to ensure fresh requests
        imageLoadFunction: undefined,
        // Add random parameter to prevent caching issues
        imageLoadFunction: (image, src) => {
          const imgElement = image.getImage() as HTMLImageElement;
          const separator = src.includes('?') ? '&' : '?';
          const cacheBuster = `${separator}_=${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          imgElement.src = src + cacheBuster;
        }
      }),
      visible: this.wmsConfigs.yield.visible,
      opacity: 0.8,
    });

    // VHI Layer
    this.vhiLayer = new ImageLayer({
      source: new ImageWMS({
        url: this.wmsConfigs.vhi.url,
        params: {
          'LAYERS': this.wmsConfigs.vhi.layers,
          'FORMAT': 'image/png',
          'TRANSPARENT': true,
          'TIME': this.wmsConfigs.vhi.defaultTime,
          'STYLES': this.wmsConfigs.vhi.styles,
          'VERSION': '1.1.1',
          'SRS': 'EPSG:3857',
          'TILED': true
        },
        serverType: 'geoserver',
        crossOrigin: 'anonymous',
      }),
      visible: this.wmsConfigs.vhi.visible,
      opacity: 0.8,
    });

    // LST Layer
    this.lstLayer = new ImageLayer({
      source: new ImageWMS({
        url: this.wmsConfigs.lst.url,
        params: {
          'LAYERS': this.wmsConfigs.lst.layers,
          'FORMAT': 'image/png',
          'TRANSPARENT': true,
          'TIME': this.wmsConfigs.lst.defaultTime,
          'STYLES': this.wmsConfigs.lst.styles,
          'VERSION': '1.1.1',
          'SRS': 'EPSG:3857',
          'TILED': true
        },
        serverType: 'geoserver',
        crossOrigin: 'anonymous',
      }),
      visible: this.wmsConfigs.lst.visible,
      opacity: 0.8,
    });

    // Add WMS layers to map with proper z-index
    this.yieldLayer.setZIndex(100);
    this.vhiLayer.setZIndex(101);
    this.lstLayer.setZIndex(102);

    this.map.addLayer(this.yieldLayer);
    this.map.addLayer(this.vhiLayer);
    this.map.addLayer(this.lstLayer);

    console.log('MapLayerManager: WMS layers initialized and added to map');
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
      zIndex: 1000, // High z-index to ensure field boundaries are visible
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

  // UPDATED: Toggle WMS layer visibility - Only one layer active at a time with zoom level 9
  toggleWMSLayer(layerType: 'yield' | 'vhi' | 'lst', visible: boolean) {
    console.log(`MapLayerManager: Toggling ${layerType} layer to ${visible ? 'visible' : 'hidden'}`);
    
    const targetLayer = this.getWMSLayer(layerType);
    if (!targetLayer) {
      console.error(`MapLayerManager: ${layerType} layer not found!`);
      return;
    }

    if (visible) {
      // Hide all other WMS layers first (mutual exclusivity)
      const allLayers: ('yield' | 'vhi' | 'lst')[] = ['yield', 'vhi', 'lst'];
      
      allLayers.forEach(otherLayerType => {
        if (otherLayerType !== layerType) {
          const otherLayer = this.getWMSLayer(otherLayerType);
          if (otherLayer && otherLayer.getVisible()) {
            console.log(`MapLayerManager: Hiding ${otherLayerType} layer to show ${layerType}`);
            otherLayer.setVisible(false);
          }
        }
      });

      // Show the target layer
      targetLayer.setVisible(true);
      
      // Set zoom to level 9 when showing any WMS layer
      const currentZoom = this.map.getView().getZoom() || 16;
      console.log(`MapLayerManager: Current zoom: ${currentZoom}, setting to 9 for WMS layer ${layerType}`);
      
      this.map.getView().animate({
        zoom: 9,
        duration: 500
      });
      
      // Force refresh the layer to trigger network requests
      const source = targetLayer.getSource() as ImageWMS;
      if (source) {
        console.log(`MapLayerManager: Refreshing ${layerType} layer source`);
        
        // For yield layer, add additional cache-busting
        if (layerType === 'yield') {
          const currentParams = source.getParams();
          const timestamp = Date.now();
          const random = Math.random().toString(36).substr(2, 9);
          
          // Update params with cache buster
          source.updateParams({
            ...currentParams,
            '_t': timestamp,
            '_r': random
          });
          
          console.log(`MapLayerManager: ${layerType} cache-busted params:`, source.getParams());
        }
        
        // Force refresh
        source.refresh();
        
        // Log the current WMS parameters for debugging
        const params = source.getParams();
        console.log(`MapLayerManager: ${layerType} WMS params:`, params);
        
        // Generate sample URL for debugging
        const url = source.getUrl();
        console.log(`MapLayerManager: ${layerType} WMS base URL:`, url);
        
        // Log the constructed request URL
        const extent = this.map.getView().calculateExtent();
        const resolution = this.map.getView().getResolution();
        const projection = this.map.getView().getProjection();
        
        if (extent && resolution && projection) {
          console.log(`MapLayerManager: ${layerType} request extent:`, extent);
          console.log(`MapLayerManager: ${layerType} resolution:`, resolution);
        }
      }
    } else {
      // Simply hide the layer
      targetLayer.setVisible(false);
    }
    
    // Trigger map render
    this.map.render();
  }

  // Update WMS layer time parameter with enhanced cache busting
  updateWMSLayerTime(layerType: 'yield' | 'vhi' | 'lst', dateTime: string) {
    console.log(`MapLayerManager: Updating ${layerType} layer time to: ${dateTime}`);
    
    const layer = this.getWMSLayer(layerType);
    if (layer && layer.getSource()) {
      const source = layer.getSource() as ImageWMS;
      
      const updateParams: any = { 'TIME': dateTime };
      
      // Add cache busting for yield layer
      if (layerType === 'yield') {
        updateParams['_t'] = Date.now();
        updateParams['_r'] = Math.random().toString(36).substr(2, 9);
      }
      
      // Update the TIME parameter and cache busters
      source.updateParams(updateParams);
      
      console.log(`MapLayerManager: ${layerType} layer time updated, params:`, source.getParams());
      
      // Force refresh to trigger new request
      source.refresh();
      
      // Trigger map render
      this.map.render();
    } else {
      console.error(`MapLayerManager: Cannot update time for ${layerType} layer - layer or source not found`);
    }
  }

  // Set WMS layer opacity
  setWMSLayerOpacity(layerType: 'yield' | 'vhi' | 'lst', opacity: number) {
    console.log(`MapLayerManager: Setting ${layerType} layer opacity to: ${opacity}`);
    
    const layer = this.getWMSLayer(layerType);
    if (layer) {
      layer.setOpacity(opacity);
      this.map.render();
    }
  }

  // Get WMS layer by type
  private getWMSLayer(layerType: 'yield' | 'vhi' | 'lst'): ImageLayer<ImageWMS> | null {
    switch (layerType) {
      case 'yield':
        return this.yieldLayer;
      case 'vhi':
        return this.vhiLayer;
      case 'lst':
        return this.lstLayer;
      default:
        console.error(`MapLayerManager: Unknown layer type: ${layerType}`);
        return null;
    }
  }

  // Get WMS legend URL
  getWMSLegendUrl(layerType: 'yield' | 'vhi' | 'lst'): string {
    const config = this.wmsConfigs[layerType];
    return `${config.url}?REQUEST=GetLegendGraphic&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=${config.layers}&STYLE=${config.styles}`;
  }

  // UPDATED: Check if any WMS layer is visible (now only one can be visible at a time)
  isAnyWMSLayerVisible(): boolean {
    return (
      (this.yieldLayer?.getVisible() ?? false) ||
      (this.vhiLayer?.getVisible() ?? false) ||
      (this.lstLayer?.getVisible() ?? false)
    );
  }

  // UPDATED: Get the currently active WMS layer (since only one can be active)
  getActiveWMSLayer(): 'yield' | 'vhi' | 'lst' | null {
    if (this.yieldLayer?.getVisible()) return 'yield';
    if (this.vhiLayer?.getVisible()) return 'vhi';
    if (this.lstLayer?.getVisible()) return 'lst';
    return null;
  }

  // Get current layer visibility state
  getLayerVisibility(): LayerVisibilityState {
    return {
      yield: this.yieldLayer?.getVisible() ?? false,
      vhi: this.vhiLayer?.getVisible() ?? false,
      lst: this.lstLayer?.getVisible() ?? false,
      heatMap: (this.heatMapLayer?.getOpacity() ?? 0) > 0,
      timeSeries: (this.timeSeriesLayer?.getOpacity() ?? 0) > 0,
    };
  }

  // Get current layer opacity state
  getLayerOpacity(): LayerOpacityState {
    return {
      yield: this.yieldLayer?.getOpacity() ?? 0.8,
      vhi: this.vhiLayer?.getOpacity() ?? 0.8,
      lst: this.lstLayer?.getOpacity() ?? 0.8,
      heatMap: this.heatMapLayer?.getOpacity() ?? 0.7,
      timeSeries: this.timeSeriesLayer?.getOpacity() ?? 0.7,
    };
  }

  // UPDATED: Hide all WMS layers
  hideAllWMSLayers() {
    console.log('MapLayerManager: Hiding all WMS layers');
    
    const allLayers: ('yield' | 'vhi' | 'lst')[] = ['yield', 'vhi', 'lst'];
    
    allLayers.forEach(layerType => {
      const layer = this.getWMSLayer(layerType);
      if (layer && layer.getVisible()) {
        layer.setVisible(false);
        console.log(`MapLayerManager: Hidden ${layerType} layer`);
      }
    });
    
    this.map.render();
  }

  // Debug method to log current WMS layer states
  debugWMSLayers() {
    console.log('MapLayerManager: Current WMS layer states:');
    ['yield', 'vhi', 'lst'].forEach(layerType => {
      const layer = this.getWMSLayer(layerType as 'yield' | 'vhi' | 'lst');
      if (layer) {
        const source = layer.getSource() as ImageWMS;
        console.log(`${layerType}:`, {
          visible: layer.getVisible(),
          opacity: layer.getOpacity(),
          params: source.getParams(),
          url: source.getUrl()
        });
      }
    });
  }

  // Force refresh all visible WMS layers (utility method)
  refreshAllVisibleWMSLayers() {
    ['yield', 'vhi', 'lst'].forEach(layerType => {
      const layer = this.getWMSLayer(layerType as 'yield' | 'vhi' | 'lst');
      if (layer && layer.getVisible()) {
        const source = layer.getSource() as ImageWMS;
        if (source) {
          console.log(`Refreshing ${layerType} layer`);
          source.refresh();
        }
      }
    });
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
        zIndex: 500,
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
        zIndex: 500,
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
    if (this.yieldLayer) {
      this.map.removeLayer(this.yieldLayer);
      this.yieldLayer = null;
    }
    if (this.vhiLayer) {
      this.map.removeLayer(this.vhiLayer);
      this.vhiLayer = null;
    }
    if (this.lstLayer) {
      this.map.removeLayer(this.lstLayer);
      this.lstLayer = null;
    }
    if (this.vectorLayer) {
      this.map.removeLayer(this.vectorLayer);
      this.vectorLayer = null;
    }
  }
}