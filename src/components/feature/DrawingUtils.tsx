// DrawingUtils.ts - Utility functions for handling drawing on OpenLayers maps

import { Draw, Modify, Snap } from 'ol/interaction';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { Style, Fill, Stroke, Circle } from 'ol/style';
import { GeoJSON } from 'ol/format';
import { Map } from 'ol';

export class DrawingManager {
  private map: Map;
  private drawSource: VectorSource;
  private drawLayer: VectorLayer<VectorSource>;
  private drawInteraction: Draw | null = null;
  private modifyInteraction: Modify | null = null;
  private snapInteraction: Snap | null = null;
  private onFeatureDrawn?: (geoJsonFeature: any) => void;

  constructor(map: Map, onFeatureDrawn?: (geoJsonFeature: any) => void) {
    this.map = map;
    this.onFeatureDrawn = onFeatureDrawn;
    this.initializeDrawingLayer();
  }

  private initializeDrawingLayer() {
    // Create drawing source and layer
    this.drawSource = new VectorSource();

    this.drawLayer = new VectorLayer({
      source: this.drawSource,
      style: new Style({
        fill: new Fill({
          color: 'rgba(59, 130, 246, 0.3)', // Blue with transparency
        }),
        stroke: new Stroke({
          color: '#3B82F6', // Blue
          width: 2,
        }),
        image: new Circle({
          radius: 6,
          fill: new Fill({
            color: '#3B82F6',
          }),
          stroke: new Stroke({
            color: '#FFFFFF',
            width: 2,
          }),
        }),
      }),
    });

    this.map.addLayer(this.drawLayer);
    this.initializeInteractions();
  }

  private initializeInteractions() {
    // Create draw interaction for polygons
    this.drawInteraction = new Draw({
      source: this.drawSource,
      type: 'Polygon',
      style: new Style({
        fill: new Fill({
          color: 'rgba(59, 130, 246, 0.2)',
        }),
        stroke: new Stroke({
          color: '#3B82F6',
          width: 3,
          lineDash: [10, 10],
        }),
        image: new Circle({
          radius: 6,
          fill: new Fill({
            color: '#3B82F6',
          }),
          stroke: new Stroke({
            color: '#FFFFFF',
            width: 2,
          }),
        }),
      }),
    });

    // Create modify interaction
    this.modifyInteraction = new Modify({ 
      source: this.drawSource,
      style: new Style({
        image: new Circle({
          radius: 8,
          fill: new Fill({
            color: '#FF6B6B',
          }),
          stroke: new Stroke({
            color: '#FFFFFF',
            width: 2,
          }),
        }),
      }),
    });

    // Create snap interaction
    this.snapInteraction = new Snap({ source: this.drawSource });

    // Handle draw end event
    this.drawInteraction.on('drawend', (event) => {
      const feature = event.feature;
      const geometry = feature.getGeometry();
      
      if (geometry && this.onFeatureDrawn) {
        // Convert to GeoJSON
        const geoJsonFormat = new GeoJSON();
        const geoJsonFeature = geoJsonFormat.writeFeatureObject(feature, {
          featureProjection: this.map.getView().getProjection(),
          dataProjection: 'EPSG:4326',
        });

        console.log('Feature drawn:', geoJsonFeature);
        this.onFeatureDrawn(geoJsonFeature);
      }
    });
  }

  enableDrawing() {
    if (this.drawInteraction) {
      this.map.addInteraction(this.drawInteraction);
    }
    if (this.modifyInteraction) {
      this.map.addInteraction(this.modifyInteraction);
    }
    if (this.snapInteraction) {
      this.map.addInteraction(this.snapInteraction);
    }
    
    // Change cursor
    this.map.getTargetElement().style.cursor = 'crosshair';
  }

  disableDrawing() {
    if (this.drawInteraction) {
      this.map.removeInteraction(this.drawInteraction);
    }
    if (this.modifyInteraction) {
      this.map.removeInteraction(this.modifyInteraction);
    }
    if (this.snapInteraction) {
      this.map.removeInteraction(this.snapInteraction);
    }
    
    // Reset cursor
    this.map.getTargetElement().style.cursor = '';
  }

  clearDrawing() {
    this.drawSource.clear();
  }

  cleanup() {
    this.disableDrawing();
    if (this.drawLayer) {
      this.map.removeLayer(this.drawLayer);
    }
  }

  // Get drawn features as GeoJSON
  getDrawnFeatures(): any[] {
    const geoJsonFormat = new GeoJSON();
    const features = this.drawSource.getFeatures();
    
    return features.map(feature => 
      geoJsonFormat.writeFeatureObject(feature, {
        featureProjection: this.map.getView().getProjection(),
        dataProjection: 'EPSG:4326',
      })
    );
  }

  // Load existing GeoJSON feature for editing
  loadGeoJsonFeature(geoJsonFeature: any) {
    const geoJsonFormat = new GeoJSON();
    const feature = geoJsonFormat.readFeature(geoJsonFeature, {
      featureProjection: this.map.getView().getProjection(),
      dataProjection: 'EPSG:4326',
    });
    
    this.drawSource.addFeature(feature);
  }
}

// Helper function to calculate area of a polygon in hectares
export function calculatePolygonAreaHectares(geoJsonFeature: any): number {
  if (!geoJsonFeature.geometry || geoJsonFeature.geometry.type !== 'Polygon') {
    return 0;
  }

  // Simple area calculation (this is approximate for small areas)
  // For more accurate calculations, you might want to use a proper geodesic library
  const coordinates = geoJsonFeature.geometry.coordinates[0];
  let area = 0;
  
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [x1, y1] = coordinates[i];
    const [x2, y2] = coordinates[i + 1];
    area += (x1 * y2 - x2 * y1);
  }
  
  area = Math.abs(area) / 2;
  
  // Convert from degrees to approximate hectares (very rough approximation)
  // 1 degree ≈ 111 km, so 1 square degree ≈ 12321 km² ≈ 1,232,100 hectares
  const hectares = area * 1232100;
  
  return Math.round(hectares * 100) / 100; // Round to 2 decimal places
}

// Helper function to get centroid of a polygon
export function getPolygonCentroid(geoJsonFeature: any): [number, number] | null {
  if (!geoJsonFeature.geometry || geoJsonFeature.geometry.type !== 'Polygon') {
    return null;
  }

  const coordinates = geoJsonFeature.geometry.coordinates[0];
  let x = 0, y = 0;
  
  for (const [lng, lat] of coordinates) {
    x += lng;
    y += lat;
  }
  
  return [x / coordinates.length, y / coordinates.length];
}

// Helper function to validate GeoJSON polygon
export function isValidPolygon(geoJsonFeature: any): boolean {
  if (!geoJsonFeature.geometry || geoJsonFeature.geometry.type !== 'Polygon') {
    return false;
  }

  const coordinates = geoJsonFeature.geometry.coordinates;
  
  // Check if it has at least one ring
  if (!coordinates || coordinates.length === 0) {
    return false;
  }

  // Check if the first ring has at least 4 points (3 unique + closing point)
  const outerRing = coordinates[0];
  if (!outerRing || outerRing.length < 4) {
    return false;
  }

  // Check if the first and last points are the same (closed ring)
  const firstPoint = outerRing[0];
  const lastPoint = outerRing[outerRing.length - 1];
  
  return (
    firstPoint[0] === lastPoint[0] && 
    firstPoint[1] === lastPoint[1]
  );
}