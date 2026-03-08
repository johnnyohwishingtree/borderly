/**
 * Shared portal URLs 
 * 
 * Single source of truth for portal URLs used throughout the application
 * and tests to prevent drift and maintain consistency.
 */
export const PORTAL_URLS = {
  VIETNAM: 'https://evisa.xuatnhapcanh.gov.vn/',
  JAPAN: 'https://vjw-lp.digital.go.jp/en/',
  MALAYSIA: 'https://imigresen-online.imi.gov.my/mdac/main',
  SINGAPORE: 'https://eservices.ica.gov.sg/sgarrivalcard/',
  THAILAND: 'https://tp.consular.go.th/',
} as const;