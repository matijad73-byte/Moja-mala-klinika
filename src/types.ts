export type ParameterCategory =
  | 'Hematologija'
  | 'Biohemija'
  | 'Lipidni status'
  | 'Enzimi jetre'
  | 'Bubrežna funkcija'
  | 'Hormoni'
  | 'Zapaljenski markeri'
  | 'Elektroliti'
  | 'Urin'
  | 'Ostalo';

export type ParameterStatus = 'normal' | 'low' | 'high' | 'critical';

export interface LabParameter {
  id: string;
  name: string;
  alias?: string;
  category: ParameterCategory;
  value: number | null;
  textValue?: string;
  unit: string;
  refMin: number | null;
  refMax: number | null;
  refText: string;
  status: ParameterStatus;
  notes?: string;
}

export interface LabReport {
  id: string;
  fileName: string;
  fileSource: 'onedrive' | 'upload' | 'sample' | 'excel';
  fileType?: 'pdf' | 'image' | 'excel';
  fileFormat?: string;
  oneDriveId?: string;
  date: string; // YYYY-MM-DD
  laboratoryName: string;
  patientName?: string;
  summary: string;
  parameters: LabParameter[];
  uploadedAt: string;
  fileSize?: string;
  fileDataUrl?: string;
  reportNumber?: number | string;
  period?: string;
}

export interface TrendDataPoint {
  date: string;
  formattedDate: string;
  value: number | null;
  textValue?: string;
  unit: string;
  status: ParameterStatus;
  reportId: string;
  labName: string;
  refMin: number | null;
  refMax: number | null;
  refText: string;
}

export interface ParameterTrend {
  name: string;
  alias?: string;
  category: ParameterCategory;
  unit: string;
  dataPoints: TrendDataPoint[];
  latestValue: number | null;
  latestStatus: ParameterStatus;
  latestDate: string;
  previousValue?: number | null;
  changePercent?: number;
  direction: 'up' | 'down' | 'stable';
  trendMeaning?: 'improving' | 'worsening' | 'stable';
  refMin: number | null;
  refMax: number | null;
  refText: string;
  hasAbnormal: boolean;
}

export interface OneDriveAccount {
  connected: boolean;
  userEmail?: string;
  userName?: string;
  folder?: string;
  totalReports?: number;
  lastSync?: string;
  configured: boolean;
  isValidFormat?: boolean;
  isPlaceholder?: boolean;
  clientId?: string;
  rawClientId?: string;
  redirectUri?: string;
}

export interface OneDriveFileItem {
  id: string;
  name: string;
  size: number;
  lastModifiedDateTime: string;
  webUrl?: string;
  downloadUrl?: string;
  isPdf: boolean;
  isImage?: boolean;
  fileFormat?: 'pdf' | 'jpg' | 'png' | 'webp';
  imported?: boolean;
}

export interface HealthTrendSummary {
  overallAssessment: string;
  keyImprovements: string[];
  keyRisksOrAlerts: string[];
  systemTrends: {
    system: string;
    description: string;
    status: 'good' | 'warning' | 'neutral';
  }[];
  questionsForDoctor: string[];
}

export type BloodPressureStatus =
  | 'optimal'
  | 'normal'
  | 'high_normal'
  | 'grade1'
  | 'grade2'
  | 'grade3'
  | 'hypotension';

export interface BloodPressureRecord {
  id: string;
  systolic: number; // mmHg (npr. 120)
  diastolic: number; // mmHg (npr. 80)
  pulse: number; // bpm (otkucaji srca, npr. 72)
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  periodOfDay?: 'jutro' | 'dan' | 'vece';
  status: BloodPressureStatus;
  statusLabel: string;
  notes?: string;
  createdAt: string;
}

export interface BodyWeightRecord {
  id: string;
  weight: number; // kg (npr. 80.5)
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  notes?: string;
  createdAt: string;
}

export interface BodyHeightRecord {
  id: string;
  height: number; // cm (npr. 182)
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}
