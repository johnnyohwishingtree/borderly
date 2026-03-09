# Release Notes

## Version 1.0.0 - Initial Release
*Release Date: [TBD]*

### 🎉 Welcome to Borderly

Borderly is now available! The universal travel declaration app that lets you scan your passport once and auto-generate customs forms for 8 countries across Asia, Europe, and North America.

### ✨ Features

**Passport Scanning**
- Scan your passport with your phone's camera
- Automatic MRZ (Machine Readable Zone) detection
- Secure biometric-locked storage on your device

**Smart Form Generation**
- Auto-fill forms for 8 countries using your stored profile
- Only answer country-specific questions (3-25 fields vs. 30-45+)
- Real-time validation and helpful guidance
- Multi-country trip support with intelligent form sequencing

**Supported Countries**
- 🇯🇵 **Japan** - Visit Japan Web (immigration + customs)
- 🇲🇾 **Malaysia** - Malaysia Digital Arrival Card (MDAC)
- 🇸🇬 **Singapore** - SG Arrival Card via ICA
- 🇹🇭 **Thailand** - Thailand Pass with health declarations
- 🇻🇳 **Vietnam** - e-Visa portal with document uploads
- 🇬🇧 **United Kingdom** - Electronic Travel Authorisation (ETA)
- 🇺🇸 **United States** - ESTA (Electronic System for Travel Authorization)
- 🇨🇦 **Canada** - eTA (Electronic Travel Authorization)

**Trip Management**
- Create multi-country itineraries
- Track form completion status per destination
- Seamless leg-to-leg workflow

**QR Code Wallet**
- Store QR codes from submitted forms
- Offline access for e-Gate entry
- Organized by trip and country

**Privacy-First Design**
- 100% local storage - your data never leaves your phone
- Biometric authentication for passport access
- No server, no accounts, no tracking

**Guided Submission**
- Step-by-step walkthrough for each government portal
- One-tap copy for pre-filled data
- Screenshots and tips for smooth submission

**Performance & Scalability**
- Sub-100ms form generation for any country
- Handles complex 8-country trips efficiently  
- Optimized for low memory usage and battery life
- Comprehensive test coverage with 500+ test scenarios

### 🔒 Security & Privacy

- Passport data encrypted in iOS Keychain/Android Keystore
- Biometric unlock required for sensitive information
- No cloud sync, no analytics, no third-party tracking
- Data excluded from device backups for maximum security

### 📱 Technical Details

- **iOS**: Requires iOS 15.0 or later
- **Android**: Requires Android 7.0 (API 24) or later
- **Languages**: English
- **Size**: ~12 MB
- **Permissions**: Camera (passport scanning), Biometric (data security)

### 🎯 Perfect For

- Global travelers visiting multiple countries
- Business travelers with tight schedules  
- Privacy-conscious users who want control over their data
- Anyone tired of filling the same forms on different government websites
- Multi-destination trip planners
- Digital nomads and frequent flyers

---

## Future Release Template

### Version X.Y.Z - [Release Name]
*Release Date: YYYY-MM-DD*

### 🆕 New Features
- Feature description
- Another feature

### ✅ Improvements
- Performance enhancement
- UI polish

### 🐛 Bug Fixes
- Fixed issue description
- Resolved problem

### 🔧 Technical Updates
- Dependency updates
- Security improvements

### 📋 Supported Countries
- [List any new countries added]

---

## Release Notes Guidelines

### Writing Good Release Notes

**User-Focused Language**
- Write for travelers, not developers
- Explain the benefit, not just the feature
- Use clear, non-technical language

**Structure Each Release**
1. **Version & Date** - Clear identification
2. **Overview** - Brief summary of the release theme
3. **New Features** - What's new and exciting
4. **Improvements** - Enhancements to existing features
5. **Bug Fixes** - Issues resolved (if user-facing)
6. **Technical** - Platform requirements, breaking changes

**Content Guidelines**
- Start with user benefits
- Use active voice ("You can now..." vs. "It is now possible to...")
- Include emoji sparingly for visual appeal
- Keep technical details minimal
- Focus on what users can do differently

### Examples of Good vs. Bad Release Notes

**Good:**
```
🎯 New: Smart Form Validation
Forms now check for common mistakes before you submit. No more rejected applications due to missing middle names or invalid passport numbers.
```

**Bad:**
```
Added client-side validation using Zod schemas for form fields with real-time error checking implementation.
```

**Good:**
```
🇹🇭 Added Support for Thailand
Visit Thailand with ease! The app now supports the Thailand Pass system for tourist and business visas.
```

**Bad:**
```
Implemented THA.json country schema with 23 form fields including accommodation validation and COVID-19 certificate requirements.
```

### Release Process

1. **Draft Release Notes** - Start during development
2. **Internal Review** - Team feedback on user clarity
3. **Stakeholder Approval** - Business and legal review
4. **Localization** - Translate for international markets (future)
5. **Publication** - App Store and GitHub release notes
6. **Communication** - Blog posts, social media, email (future)

### Version Numbering

Follow semantic versioning (semver):
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes, major feature additions
- **MINOR** (1.0.0 → 1.1.0): New features, new country support
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, minor improvements

### Legal & Compliance Notes

Always include when relevant:
- New data collection practices (unlikely for this app)
- Changed permissions or system requirements
- Deprecated features with migration paths
- Third-party service integrations
- Regional availability changes

### Platform-Specific Notes

**iOS App Store**
- "What's New" section limit: 4,000 characters
- Focus on top 3-5 changes users will notice
- Include version number and release date

**Google Play Store**  
- "What's new" section limit: 500 characters
- Very concise, highlight top 1-2 features
- Auto-translated to user's language

**GitHub Releases**
- More technical detail acceptable
- Include full changelog
- Link to issues and pull requests