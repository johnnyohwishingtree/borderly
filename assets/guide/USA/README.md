# USA ESTA Manual Guide Assets

This directory contains visual assets and screenshots for the Electronic System for Travel Authorization (ESTA) manual submission guide.

## About ESTA

The Electronic System for Travel Authorization (ESTA) is an automated system used to determine the eligibility of visitors to travel to the United States under the Visa Waiver Program (VWP). Authorization via ESTA does not determine admissibility upon arrival in the United States.

**Key Facts:**
- Required for citizens of VWP countries
- Valid for 2 years or until passport expires
- Allows multiple entries of up to 90 days each
- Application fee: $21 USD
- Processing time: Usually minutes to hours, can take up to 72 hours

## Required Screenshots

### Application Process Screenshots

1. **01-esta-homepage.png** - Official ESTA website homepage (esta.cbp.dhs.gov)
2. **02-disclaimer-terms.png** - ESTA disclaimer and terms acceptance page
3. **03-application-type.png** - Individual vs. group application selection
4. **04-personal-info.png** - Personal information form (name, DOB, gender, birth details)
5. **05-passport-info.png** - Passport details section
6. **06-citizenship-info.png** - Citizenship and other nationality questions
7. **07-contact-info.png** - Home address and contact information
8. **08-employment-info.png** - Employment details and occupation
9. **09-parent-info.png** - Parent names (optional section)
10. **10-travel-info.png** - Travel plans and accommodation in the U.S.
11. **11-contact-usa.png** - Emergency contact person in the U.S.
12. **12-eligibility-questions.png** - Security and eligibility questionnaire
13. **13-review-application.png** - Application review and verification page
14. **14-payment-processing.png** - Credit card payment form ($21 fee)
15. **15-esta-pending.png** - Application submitted - pending status
16. **16-esta-approved.png** - ESTA authorization approved confirmation
17. **17-esta-print.png** - Final authorization document/receipt

### Error and Edge Cases

18. **error-invalid-passport.png** - Error when passport country not in VWP
19. **error-payment-failed.png** - Payment processing error screen
20. **error-eligibility-issue.png** - Eligibility questions causing denial
21. **maintenance-page.png** - System maintenance notification

## File Naming Convention

- Use descriptive names with leading numbers for chronological ordering
- PNG format preferred for screenshots (better text clarity)
- Target resolution: 1366x768 (common laptop resolution)
- Compress images to keep file sizes under 500KB each
- Include both desktop and mobile views where applicable

## Screenshot Guidelines

### What to Include
- Clear view of form fields and labels
- Navigation elements (breadcrumbs, progress indicators)
- Important instructions and help text
- Error messages and validation feedback
- Confirmation messages and success indicators

### What to Avoid
- Personal information (use fictional test data)
- Actual payment information
- Real passport numbers or sensitive details
- Browser-specific elements (focus on content)

## Mobile Responsiveness

For mobile screenshots, capture:
- Portrait orientation (375x812 iPhone X size)
- Key form sections that may wrap differently
- Mobile-specific navigation elements
- Touch-friendly button sizes

## Accessibility Considerations

Ensure screenshots show:
- High contrast text and backgrounds
- Clear form field labels
- Error messages that are clearly visible
- Keyboard navigation indicators where applicable

## Update Process

Screenshots should be updated when:
- ESTA portal undergoes significant design changes
- New form fields are added or removed
- Error handling changes
- Mobile experience is modified
- Accessibility improvements are made

## Usage in App

These screenshots are referenced in:
- `submissionGuide` section of USA.json schema
- React Native app's manual submission walkthrough
- Error handling and troubleshooting screens
- Offline help documentation

## Legal Notice

Screenshots are for educational purposes only. Users must always access the official ESTA website (esta.cbp.dhs.gov) for actual applications. Borderly is not affiliated with U.S. Customs and Border Protection.