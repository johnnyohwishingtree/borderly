import { formatSupportedCountryList } from '@/constants/countries';

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

export interface HelpCategory {
  label: string;
  value: string;
}

export const FAQ_DATA: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'How do I scan my passport?',
    answer: 'Go to Profile → Edit Profile and tap "Scan Passport". Point your camera at the bottom of your passport where the two-line code (MRZ) is located. Make sure the text is clear and well-lit.',
    category: 'passport',
    tags: ['passport', 'scan', 'mrz', 'camera'],
  },
  {
    id: 'faq-2',
    question: 'Which countries are supported?',
    answer: `Borderly currently supports ${formatSupportedCountryList()}. These countries cover popular travel corridors across Asia, North America, and Europe.`,
    category: 'countries',
    tags: ['countries', 'japan', 'malaysia', 'singapore', 'supported'],
  },
  {
    id: 'faq-3',
    question: 'Is my passport data secure?',
    answer: 'Yes! Your passport data is stored locally on your device using the secure OS Keychain. It never leaves your device unless you explicitly share it. No cloud storage or server sync is used.',
    category: 'security',
    tags: ['security', 'privacy', 'keychain', 'local', 'data'],
  },
  {
    id: 'faq-4',
    question: 'How do I create a trip?',
    answer: 'Go to the Trips tab and tap "Create Trip". Add your destinations in order, select dates, and the app will generate the required forms for each country.',
    category: 'trips',
    tags: ['trips', 'create', 'destinations', 'forms'],
  },
  {
    id: 'faq-5',
    question: 'What if a form field is not auto-filled?',
    answer: 'Some fields require manual input as they are country-specific or not available in your passport. The app shows you only the fields that need your attention.',
    category: 'forms',
    tags: ['forms', 'autofill', 'manual', 'fields'],
  },
  {
    id: 'faq-6',
    question: 'How do I submit forms to government portals?',
    answer: 'After filling out a form, use the Submission Guide feature. It provides step-by-step instructions and pre-filled values you can copy and paste into the official government website.',
    category: 'submission',
    tags: ['submission', 'government', 'portal', 'copy', 'paste'],
  },
  {
    id: 'faq-7',
    question: 'What are QR codes for?',
    answer: 'After submitting forms to government portals, you often receive QR codes for entry. Save these in your QR Wallet for easy access at borders and airports.',
    category: 'qr',
    tags: ['qr', 'codes', 'wallet', 'entry', 'borders'],
  },
  {
    id: 'faq-8',
    question: 'Can I use the app offline?',
    answer: 'Yes! Borderly is designed to work offline. All your data and country schemas are stored locally. You only need internet when accessing government portals for submission.',
    category: 'offline',
    tags: ['offline', 'internet', 'local', 'schemas'],
  },
  {
    id: 'faq-9',
    question: 'How do I enable biometric authentication?',
    answer: 'Go to Settings → Security & Privacy → Biometric Authentication. This adds an extra layer of security when viewing passport data.',
    category: 'security',
    tags: ['biometric', 'authentication', 'settings', 'security'],
  },
  {
    id: 'faq-10',
    question: 'The app is running slowly. What can I do?',
    answer: 'Go to Settings → Data Management → Clear Cache. This will remove temporary files and improve performance. Your profile and trip data will not be affected.',
    category: 'performance',
    tags: ['performance', 'slow', 'cache', 'clear'],
  },
];

export const HELP_CATEGORIES: HelpCategory[] = [
  { label: 'All Topics', value: 'all' },
  { label: 'Passport & Scanning', value: 'passport' },
  { label: 'Security & Privacy', value: 'security' },
  { label: 'Trips & Countries', value: 'trips' },
  { label: 'Forms & Submission', value: 'forms' },
  { label: 'QR Codes', value: 'qr' },
  { label: 'Performance', value: 'performance' },
];
