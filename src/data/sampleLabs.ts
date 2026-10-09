import { LabReport } from '../types';
import { FULL_30_LAB_REPORTS } from './reportsArchive';

// Export all 30 authentic chronological reports
export const SAMPLE_LAB_REPORTS: LabReport[] = FULL_30_LAB_REPORTS;

// Supplementary samples pool (for compatibility)
export const ADDITIONAL_ONEDRIVE_SAMPLES: LabReport[] = FULL_30_LAB_REPORTS.slice(10, 25);
