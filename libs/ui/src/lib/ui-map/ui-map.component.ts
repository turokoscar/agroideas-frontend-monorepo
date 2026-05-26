import { Component, Input, OnChanges, SimpleChanges, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

@Component({
  selector: 'app-ui-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-map.component.html',
  styles: [`
    .map-container {
      height: 300px;
      width: 100%;
      border-radius: 0.5rem;
      z-index: 10;
    }
  `]
})
export class UiMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() query = '';
  @Input() label = 'Ubicación';

  private map: L.Map | undefined;
  private marker: L.Marker | undefined;
  isLoading = true;
  hasError = false;

  // Fix Leaflet's default icon paths
  private initLeafletIcons() {
    const iconRetinaUrl = 'assets/marker-icon-2x.png';
    const iconUrl = 'assets/marker-icon.png';
    const shadowUrl = 'assets/marker-shadow.png';
    const iconDefault = L.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;
  }

  ngAfterViewInit(): void {
    this.initMap();
    if (this.query) {
      this.geocodeLocation(this.query);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['query'] && !changes['query'].isFirstChange()) {
      if (this.query) {
        this.geocodeLocation(this.query);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    this.map = L.map('leaflet-map', {
      center: [-9.189967, -75.015152], // Default to Peru
      zoom: 5
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
  }

  private async geocodeLocation(searchQuery: string): Promise<void> {
    this.isLoading = true;
    this.hasError = false;

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        this.updateMap(lat, lon, searchQuery);
      } else {
        // Fallback to Peru center if not found
        console.warn(`Location not found for: ${searchQuery}`);
        this.hasError = true;
      }
    } catch (error) {
      console.error('Error geocoding location:', error);
      this.hasError = true;
    } finally {
      this.isLoading = false;
    }
  }

  private updateMap(lat: number, lng: number, popupText: string): void {
    if (!this.map) return;

    this.map.setView([lat, lng], 10); // Zoom in to region level

    if (this.marker) {
      this.map.removeLayer(this.marker);
    }

    // Default icon path workaround for Angular since assets are sometimes problematic out of the box
    const customIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    this.marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map);
    this.marker.bindPopup(`<b>${this.label}</b><br>${popupText}`).openPopup();
  }
}
