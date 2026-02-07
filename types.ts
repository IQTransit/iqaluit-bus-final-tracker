
export interface Stop {
  id: number;
  name: string;
  tag: string;
  description: string;
  x: number; // For the SVG map representation
  y: number; // For the SVG map representation
  lat: number; // Real world latitude
  lng: number; // Real world longitude
}

export interface TransitState {
  busStopIndex: number;
  userStopIndex: number;
  lastUpdated: Date;
  isMoving: boolean;
}

export interface AIAdvice {
  message: string;
  urgency: 'low' | 'medium' | 'high';
  eta: string;
  isQuotaError?: boolean;
  timestamp?: number;
}
