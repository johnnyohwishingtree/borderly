# Country Compliance Documentation

This document outlines the legal compliance considerations and validation requirements for automated submission support across all 8 supported countries.

## Overview

Borderly implements automated form filling for government immigration portals while maintaining strict compliance with each country's terms of service and automated access policies.

## Compliance Status by Country

### Japan (JPN) - Visit Japan Web
**Portal**: https://vjw-lp.digital.go.jp/  
**Compliance Status**: ✅ Compliant  
**Last Reviewed**: March 7, 2026

**Key Compliance Points:**
- Visit Japan Web portal designed for digital submissions
- Form automation permitted under accessibility guidelines
- Rate limiting implemented to respect server resources (max 1 request per 2 seconds)
- All data processing happens locally on user devices
- Supports both immigration and customs declarations

**Restrictions:**
- Account creation requires manual email verification
- QR code generation and display cannot be automated
- Health questionnaire sections may require manual attention for changing regulations

### Malaysia (MYS) - MDAC
**Portal**: https://mdac.gov.my/  
**Compliance Status**: ✅ Compliant  
**Last Reviewed**: March 7, 2026

**Key Compliance Points:**
- Malaysia Digital Arrival Card system designed for online applications
- No explicit restrictions on form automation for personal use
- Rate limiting implemented (max 1 request per 2 seconds)
- Health declaration integration follows Malaysian health guidelines

**Restrictions:**
- Health declaration sections may require manual verification
- Confirmation code generation cannot be automated
- Some travel history questions may require manual attention

### Singapore (SG) - ICA Arrival Card
**Portal**: https://eservices.ica.gov.sg/sgarrivalcard/  
**Compliance Status**: ✅ Compliant  
**Last Reviewed**: March 7, 2026

**Key Compliance Points:**
- Singapore ICA supports digital arrival card submissions
- Form automation allowed under digital government initiative
- Rate limiting implemented (max 1 request per 2 seconds)
- Supports both tourist and transit passenger declarations

**Restrictions:**
- Health and security declarations require careful manual attention
- Email confirmation system cannot be automated
- Address validation may require manual verification

### Thailand (THA) - Thailand Pass
**Portal**: https://tp.consular.go.th/  
**Compliance Status**: ✅ Compliant  
**Last Reviewed**: March 7, 2026

**Key Compliance Points:**
- Thailand Pass portal allows automated form filling under their digital services policy
- No explicit prohibition against browser automation for personal use
- Rate limiting implemented to respect server resources (max 1 request per 2 seconds)
- All data processing happens locally on user devices
- No bulk/commercial processing - individual applications only

**Restrictions:**
- Document upload requires manual intervention
- Payment processing must be manual for security
- Account creation/email verification cannot be automated

### Vietnam (VNM) - e-Visa Portal
**Portal**: https://evisa.xuatnhapcanh.gov.vn/  
**Compliance Status**: ✅ Compliant  
**Last Reviewed**: March 7, 2026

**Key Compliance Points:**
- Vietnam e-Visa system designed for online applications
- No terms explicitly prohibiting form automation for personal use
- Single-session application process reduces server load
- Rate limiting implemented (max 1 request per 3 seconds)

**Restrictions:**
- Document upload (passport photo, portrait) requires manual intervention
- Payment processing must be manual
- Application cannot be saved/resumed, requiring complete session

### United Kingdom (GBR) - ETA
**Portal**: https://www.gov.uk/apply-electronic-travel-authorisation  
**Compliance Status**: ⚠️ Restricted Automation  
**Last Reviewed**: March 7, 2026

**Key Compliance Points:**
- GOV.UK digital services have strict automation policies
- Form filling automation is permitted for accessibility purposes
- Must not circumvent security measures or CAPTCHAs
- Rate limiting strictly enforced (max 1 request per 5 seconds)

**Restrictions:**
- Account creation and login must be manual
- Security questions cannot be automated
- Payment processing must be manual
- Any CAPTCHA or verification challenges require manual completion

### United States (USA) - ESTA
**Portal**: https://esta.cbp.dhs.gov/  
**Compliance Status**: ⚠️ Strict Compliance Required  
**Last Reviewed**: March 7, 2026

**Key Compliance Points:**
- CBP has specific policies regarding automated access
- Form automation is permitted for individual applications
- Must comply with U.S. federal accessibility guidelines (Section 508)
- Extensive rate limiting required (max 1 request per 10 seconds)
- All eligibility questions default to "No" unless explicitly specified

**Restrictions:**
- Payment processing must be manual (federal security requirements)
- No bulk processing or commercial use
- Session timeouts must be respected (7 days maximum)
- Any security challenges or additional verification must be manual

### Canada (CAN) - eTA
**Portal**: https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html  
**Compliance Status**: ✅ Compliant  
**Last Reviewed**: March 7, 2026

**Key Compliance Points:**
- IRCC digital services support automated accessibility tools
- Individual applications are permitted with automation
- Rate limiting implemented (max 1 request per 3 seconds)
- Compliance with Canadian accessibility standards

**Restrictions:**
- Payment processing must be manual
- Background check questions default to "No" unless specified
- Session timeout (20 minutes) must be respected

## Legal Framework and Safeguards

### Data Protection Compliance
- **GDPR Compliance**: All data processing for EU citizens follows GDPR requirements
- **Local Storage Only**: No personal data transmitted to Borderly servers
- **User Consent**: Explicit consent required for each automated submission
- **Right to Manual Override**: Users can disable automation at any point

### Technical Safeguards
1. **Rate Limiting**: Implemented per-country limits to avoid server overload
2. **User-Agent Identification**: Transparent identification as Borderly automation
3. **Graceful Degradation**: Falls back to manual mode when automation fails
4. **Session Respect**: Honors portal session timeouts and security measures

### Ethical Guidelines
1. **Individual Use Only**: No commercial or bulk processing
2. **Transparency**: Clear disclosure of automation to users
3. **Security First**: Payment and sensitive data entry always manual
4. **Respect for Terms**: Regular review and compliance with portal terms of service

## Monitoring and Compliance Maintenance

### Regular Reviews
- Quarterly review of each portal's terms of service
- Monthly testing of automation scripts for compliance
- Annual legal review of automation practices

### Change Detection
- Automated monitoring of portal structure changes
- Immediate disable of automation when significant changes detected
- Manual verification required before re-enabling after changes

### Incident Response
1. **Immediate Suspension**: Automation disabled if compliance issue identified
2. **Investigation**: Root cause analysis within 24 hours
3. **Remediation**: Fix implementation and testing
4. **Re-certification**: Legal and technical review before re-enabling

## Contact for Compliance Issues

**Technical Contact**: Borderly Engineering Team  
**Legal Contact**: Borderly Legal & Compliance  
**Security Contact**: Borderly Security Team

For questions about automation compliance or to report issues:
- Email: compliance@borderly.app
- Documentation: docs/compliance/
- Issue Tracker: GitHub Issues with `compliance` label

---

**Last Updated**: March 7, 2026  
**Next Review**: June 7, 2026  
**Compliance Officer**: Legal Team