import { TravelerProfile } from '../../src/types/profile';

/**
 * Test fixture profiles for comprehensive form engine testing.
 * Covers various nationalities, demographics, and edge cases.
 */

export const usaProfile: TravelerProfile = {
  id: 'usa-profile-001',
  passportNumber: 'L898902C3',
  surname: 'JOHNSON',
  givenNames: 'JOHNNY',
  nationality: 'USA',
  dateOfBirth: '1990-04-08',
  gender: 'M',
  passportExpiry: '2030-04-08',
  issuingCountry: 'USA',
  email: 'johnny.johnson@example.com',
  phoneNumber: '+12125551234',
  homeAddress: {
    line1: '123 Broadway',
    line2: 'Apt 5B',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
  },
  occupation: 'Software Engineer',
  defaultDeclarations: {
    hasItemsToDeclar: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-15T12:30:00Z',
};

export const ukProfile: TravelerProfile = {
  id: 'uk-profile-001',
  passportNumber: '925665384',
  surname: 'SMITH-JONES',
  givenNames: 'EMILY CATHERINE',
  nationality: 'GBR',
  dateOfBirth: '1985-12-25',
  gender: 'F',
  passportExpiry: '2029-08-15',
  issuingCountry: 'GBR',
  email: 'emily.smith-jones@example.co.uk',
  phoneNumber: '+447700123456',
  homeAddress: {
    line1: '42 Downing Street',
    city: 'London',
    state: 'England',
    postalCode: 'SW1A 2AA',
    country: 'GBR',
  },
  occupation: 'Marketing Director',
  defaultDeclarations: {
    hasItemsToDeclar: false,
    carryingCurrency: true, // Business traveler with cash
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: true, // Carrying business samples
  },
  createdAt: '2025-01-02T10:15:00Z',
  updatedAt: '2025-01-20T09:45:00Z',
};

export const australianProfile: TravelerProfile = {
  id: 'aus-profile-001',
  passportNumber: 'N1234567',
  surname: 'WONG',
  givenNames: 'KEVIN JAMES',
  nationality: 'AUS',
  dateOfBirth: '1978-07-03',
  gender: 'M',
  passportExpiry: '2027-11-20',
  issuingCountry: 'AUS',
  email: 'k.wong@example.com.au',
  phoneNumber: '+61412345678',
  homeAddress: {
    line1: '88 Collins Street',
    line2: 'Level 25',
    city: 'Melbourne',
    state: 'VIC',
    postalCode: '3000',
    country: 'AUS',
  },
  occupation: 'Doctor',
  defaultDeclarations: {
    hasItemsToDeclar: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: true, // Medical professional who visited rural clinics
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2025-01-03T14:22:00Z',
  updatedAt: '2025-01-25T16:10:00Z',
};

export const studentProfile: TravelerProfile = {
  id: 'student-profile-001',
  passportNumber: 'C12345678',
  surname: 'GARCIA',
  givenNames: 'MARIA SOFIA',
  nationality: 'CAN',
  dateOfBirth: '2002-03-15',
  gender: 'F',
  passportExpiry: '2032-01-10',
  issuingCountry: 'CAN',
  email: 'maria.garcia.student@university.ca',
  phoneNumber: '+14165551234',
  homeAddress: {
    line1: '567 University Avenue',
    city: 'Toronto',
    state: 'ON',
    postalCode: 'M5G 1X8',
    country: 'CAN',
  },
  occupation: 'Student',
  defaultDeclarations: {
    hasItemsToDeclar: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2025-01-04T08:30:00Z',
  updatedAt: '2025-01-28T11:15:00Z',
};

export const minimialProfile: TravelerProfile = {
  id: 'minimal-profile-001',
  passportNumber: 'X1234567',
  surname: 'DOE',
  givenNames: 'JOHN',
  nationality: 'USA',
  dateOfBirth: '1995-01-01',
  gender: 'M',
  passportExpiry: '2028-01-01',
  issuingCountry: 'USA',
  // No optional fields provided
  defaultDeclarations: {
    hasItemsToDeclar: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2025-01-05T12:00:00Z',
  updatedAt: '2025-01-05T12:00:00Z',
};

export const businessTravelerProfile: TravelerProfile = {
  id: 'business-profile-001',
  passportNumber: 'B9876543',
  surname: 'TANAKA',
  givenNames: 'HIROSHI',
  nationality: 'JPN',
  dateOfBirth: '1975-11-22',
  gender: 'M',
  passportExpiry: '2026-09-30',
  issuingCountry: 'JPN',
  email: 'h.tanaka@company.co.jp',
  phoneNumber: '+819012345678',
  homeAddress: {
    line1: '1-1-1 Shibuya',
    city: 'Tokyo',
    state: 'Tokyo',
    postalCode: '150-0002',
    country: 'JPN',
  },
  occupation: 'Sales Manager',
  defaultDeclarations: {
    hasItemsToDeclar: true, // Carrying expensive electronics for demos
    carryingCurrency: true, // Business expenses in cash
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: true, // Product samples and marketing materials
  },
  createdAt: '2025-01-06T09:45:00Z',
  updatedAt: '2025-01-30T14:20:00Z',
};

/**
 * Test profiles organized by use case for easy access in tests.
 */
export const testProfiles = {
  usa: usaProfile,
  uk: ukProfile,
  australian: australianProfile,
  student: studentProfile,
  minimal: minimialProfile,
  business: businessTravelerProfile,
};

/**
 * Profiles organized by nationality for country-specific testing.
 */
export const profilesByNationality = {
  USA: [usaProfile, minimialProfile],
  GBR: [ukProfile],
  AUS: [australianProfile],
  CAN: [studentProfile],
  JPN: [businessTravelerProfile],
};

/**
 * Edge case profiles for testing boundary conditions.
 */
export const edgeCaseProfiles = {
  // Profile with missing optional data
  noOptionalData: minimialProfile,
  
  // Profile with hyphenated name
  hyphenatedName: ukProfile,
  
  // Profile with multiple middle names
  multipleMiddleNames: studentProfile,
  
  // Profile with business declarations
  businessWithDeclarations: businessTravelerProfile,
  
  // Profile from Asian country (different name conventions)
  asianProfile: businessTravelerProfile,
};