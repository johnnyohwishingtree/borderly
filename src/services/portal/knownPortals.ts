/**
 * Known portal definitions and signature matching
 */

import type { PortalSignature } from './portalTypes';

export function initializeKnownPortals(): Map<string, PortalSignature> {
  const knownPortals = new Map<string, PortalSignature>();

  knownPortals.set('japan_vjw', {
    name: 'Visit Japan Web',
    countryCode: 'JP',
    version: '1.0',
    domains: ['vjw-lp.digital.go.jp', 'vjw.digital.go.jp'],
    urlPatterns: ['/vjw/', '/visit-japan-web/'],
    titlePatterns: ['Visit Japan Web', 'VJW'],
    bodyTextPatterns: ['入国手続', 'Immigration', 'Customs Declaration'],
    elementSelectors: ['#vjw-form', '.vjw-container'],
    cssClasses: ['vjw-page', 'immigration-form'],
    metaTags: [{ name: 'application-name', content: 'Visit Japan Web' }]
  });

  knownPortals.set('malaysia_mdac', {
    name: 'Malaysia Digital Arrival Card',
    countryCode: 'MY',
    version: '1.0',
    domains: ['mdac.gov.my', 'mdac.immigration.gov.my'],
    urlPatterns: ['/mdac/', '/digital-arrival/'],
    titlePatterns: ['MDAC', 'Digital Arrival Card', 'Malaysia Immigration'],
    bodyTextPatterns: ['Malaysia Digital Arrival Card', 'MDAC', 'Immigration Malaysia'],
    elementSelectors: ['#mdac-form', '.immigration-form'],
    cssClasses: ['mdac-portal', 'arrival-card'],
    metaTags: [{ name: 'description', content: 'Malaysia Digital Arrival Card' }]
  });

  knownPortals.set('singapore_ica', {
    name: 'Singapore ICA eServices',
    countryCode: 'SG',
    version: '1.0',
    domains: ['eservices.ica.gov.sg', 'checkport.ica.gov.sg'],
    urlPatterns: ['/ica/', '/eservices/', '/arrival-card/'],
    titlePatterns: ['ICA', 'Singapore Immigration', 'SG Arrival Card'],
    bodyTextPatterns: ['Immigration & Checkpoints Authority', 'SG Arrival Card'],
    elementSelectors: ['.ica-form', '#arrival-card-form'],
    cssClasses: ['ica-portal', 'sg-gov'],
    metaTags: [{ name: 'generator', content: 'ICA' }]
  });

  return knownPortals;
}

export function calculateSignatureMatch(pageInfo: any, signature: PortalSignature): number {
  let score = 0;
  let maxScore = 0;

  maxScore += 30;
  if (signature.domains.some(domain => pageInfo.domain.includes(domain))) {
    score += 30;
  }

  maxScore += 20;
  if (signature.urlPatterns.some(pattern => pageInfo.pathname.includes(pattern))) {
    score += 20;
  }

  maxScore += 20;
  if (signature.titlePatterns.some(pattern => pageInfo.title.includes(pattern))) {
    score += 20;
  }

  return maxScore > 0 ? score / maxScore : 0;
}
