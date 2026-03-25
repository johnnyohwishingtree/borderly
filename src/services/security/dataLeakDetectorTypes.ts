export interface DataLeakDetectionResult {
  leaksDetected: boolean;
  leakCount: number;
  leaks: DataLeak[];
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  recommendations: DataLeakRecommendation[];
  lastScanDate: Date;
}

export interface DataLeak {
  id: string;
  type: 'pii' | 'passport' | 'financial' | 'location' | 'biometric' | 'government_id';
  severity: 'critical' | 'high' | 'medium' | 'low';
  location: string;
  description: string;
  detectedValue: string; // Redacted for logging
  fullMatch: boolean;
  confidence: number; // 0-1
  remediation: string;
}

export interface DataLeakRecommendation {
  priority: 'immediate' | 'urgent' | 'standard' | 'advisory';
  title: string;
  description: string;
  actions: string[];
  impact: string;
}

export interface PIIPattern {
  pattern: RegExp;
  type: DataLeak['type'];
  severity: DataLeak['severity'];
  description: string;
}
