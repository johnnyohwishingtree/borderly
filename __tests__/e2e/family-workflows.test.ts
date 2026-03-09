/**
 * E2E Family Workflow Tests
 * 
 * Tests complete family onboarding and trip creation workflows to ensure
 * family features work seamlessly without disrupting single-traveler flows.
 */

import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    __BORDERLY_STATE__?: Record<string, unknown>;
  }
}

test.describe('Family Onboarding Workflow', () => {
  test('complete family onboarding from single user to family group', async ({ page }) => {
    // Start with fresh user state
    await page.goto('/');

    // Complete onboarding for primary user
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await page.getByRole('button', { name: 'Enter Manually' }).click();

    // Fill out primary user profile
    await page.getByRole('textbox', { name: 'Passport Number' }).fill('AB1234567');
    await page.getByRole('textbox', { name: 'Surname (Family Name)' }).fill('Johnson');
    await page.getByRole('textbox', { name: 'Given Names' }).fill('Sarah Marie');
    await page.getByRole('textbox', { name: 'Nationality' }).fill('USA');
    await page.getByRole('textbox', { name: 'Date of Birth' }).fill('1985-03-15');
    await page.getByRole('button', { name: 'Female' }).first().click();
    await page.getByRole('textbox', { name: 'Passport Expiry' }).fill('2030-12-31');

    await page.getByRole('button', { name: 'Continue' }).click();

    // Skip biometric setup for testing
    await page.getByRole('button', { name: 'Skip for now' }).click();

    // Should be on trip list as completed user
    await expect(page.getByText('My Trips')).toBeVisible();

    // Navigate to profile to add family members
    await page.getByRole('button', { name: 'Profile' }).click();
    await expect(page.getByText('Sarah Marie Johnson')).toBeVisible();

    // Navigate to family management
    await page.getByText('Family Members').click();
    await expect(page.getByText('Manage your family travel profiles')).toBeVisible();

    // Add first family member (spouse)
    await page.getByRole('button', { name: 'Add Member' }).click();
    await expect(page.getByText('Add Family Member')).toBeVisible();

    // Select relationship
    await page.getByRole('button', { name: 'Spouse' }).click();

    // Fill out spouse passport via manual entry
    await page.getByRole('button', { name: 'Enter Manually' }).click();
    await page.getByRole('textbox', { name: 'Passport Number' }).fill('AB1234568');
    await page.getByRole('textbox', { name: 'Surname (Family Name)' }).fill('Johnson');
    await page.getByRole('textbox', { name: 'Given Names' }).fill('Michael David');
    await page.getByRole('textbox', { name: 'Nationality' }).fill('USA');
    await page.getByRole('textbox', { name: 'Date of Birth' }).fill('1982-08-22');
    await page.getByRole('button', { name: 'Male' }).first().click();
    await page.getByRole('textbox', { name: 'Passport Expiry' }).fill('2029-11-15');

    await page.getByRole('button', { name: 'Save Family Member' }).click();

    // Should return to family management with new member
    await expect(page.getByText('Michael David Johnson')).toBeVisible();
    await expect(page.getByText('Spouse')).toBeVisible();

    // Add child family member
    await page.getByRole('button', { name: 'Add Member' }).click();
    await page.getByRole('button', { name: 'Child' }).click();

    await page.getByRole('button', { name: 'Enter Manually' }).click();
    await page.getByRole('textbox', { name: 'Passport Number' }).fill('AB1234569');
    await page.getByRole('textbox', { name: 'Surname (Family Name)' }).fill('Johnson');
    await page.getByRole('textbox', { name: 'Given Names' }).fill('Emma Rose');
    await page.getByRole('textbox', { name: 'Nationality' }).fill('USA');
    await page.getByRole('textbox', { name: 'Date of Birth' }).fill('2015-12-03');
    await page.getByRole('button', { name: 'Female' }).first().click();
    await page.getByRole('textbox', { name: 'Passport Expiry' }).fill('2025-12-03');

    await page.getByRole('button', { name: 'Save Family Member' }).click();

    // Verify family setup is complete
    await expect(page.getByText('Sarah Marie Johnson')).toBeVisible();
    await expect(page.getByText('Michael David Johnson')).toBeVisible();
    await expect(page.getByText('Emma Rose Johnson')).toBeVisible();
    await expect(page.getByText('Primary Traveler')).toBeVisible();
    await expect(page.getByText('Spouse')).toBeVisible();
    await expect(page.getByText('Child')).toBeVisible();
  });

  test('family member addition preserves existing single user data', async ({ page }) => {
    // Start with existing single user
    await page.addInitScript(() => {
      (window as any).__BORDERLY_STATE__ = {
        preferences: { 
          onboardingComplete: true,
          theme: 'dark',
          notifications: true 
        },
        profile: {
          id: 'primary-user-123',
          givenNames: 'Alice',
          surname: 'Cooper',
          passportNumber: 'GB9876543',
          nationality: 'GBR',
          dateOfBirth: '1990-05-20',
          gender: 'F',
          passportExpiry: '2028-03-15',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        trips: [
          {
            id: 'trip-1',
            name: 'Europe Trip',
            startDate: '2024-06-01',
            endDate: '2024-06-15',
            countries: ['FRA', 'ITA']
          }
        ]
      };
    });

    await page.goto('/profile/family-management');

    // Verify existing user data is intact
    await expect(page.getByText('Alice Cooper')).toBeVisible();
    await expect(page.getByText('Primary Traveler')).toBeVisible();
    await expect(page.getByText('GB9876543')).toBeVisible();

    // Add family member
    await page.getByRole('button', { name: 'Add Member' }).click();
    await page.getByRole('button', { name: 'Parent' }).click();
    
    // Fill minimal family member data
    await page.getByRole('button', { name: 'Enter Manually' }).click();
    await page.getByRole('textbox', { name: 'Given Names' }).fill('Mary');
    await page.getByRole('textbox', { name: 'Surname (Family Name)' }).fill('Cooper');
    await page.getByRole('textbox', { name: 'Passport Number' }).fill('GB9876544');
    await page.getByRole('textbox', { name: 'Nationality' }).fill('GBR');
    await page.getByRole('textbox', { name: 'Date of Birth' }).fill('1965-02-10');
    await page.getByRole('button', { name: 'Female' }).first().click();
    await page.getByRole('textbox', { name: 'Passport Expiry' }).fill('2027-08-30');

    await page.getByRole('button', { name: 'Save Family Member' }).click();

    // Verify both profiles exist
    await expect(page.getByText('Alice Cooper')).toBeVisible();
    await expect(page.getByText('Mary Cooper')).toBeVisible();

    // Navigate to trips to verify they're preserved
    await page.getByRole('button', { name: 'Trips' }).click();
    await expect(page.getByText('Europe Trip')).toBeVisible();

    // Navigate back to profile to verify settings preserved
    await page.getByRole('button', { name: 'Profile' }).click();
    await expect(page.getByText('Alice Cooper')).toBeVisible(); // Primary profile intact
  });
});

test.describe('Family Trip Creation Workflow', () => {
  test('create trip with multiple family members', async ({ page }) => {
    // Set up family with multiple members
    await page.addInitScript(() => {
      (window as any).__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          id: 'primary-user-123',
          givenNames: 'David',
          surname: 'Wilson',
          passportNumber: 'CA1234567',
          nationality: 'CAN',
          dateOfBirth: '1978-11-12',
          gender: 'M',
          passportExpiry: '2029-05-20',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        familyMembers: [
          {
            id: 'spouse-456',
            givenNames: 'Jennifer',
            surname: 'Wilson',
            passportNumber: 'CA1234568',
            nationality: 'CAN',
            dateOfBirth: '1980-07-08',
            gender: 'F',
            passportExpiry: '2028-12-10',
            updatedAt: '2024-01-01T00:00:00Z',
            relationship: 'spouse'
          },
          {
            id: 'child-789',
            givenNames: 'Oliver',
            surname: 'Wilson',
            passportNumber: 'CA1234569',
            nationality: 'CAN',
            dateOfBirth: '2012-04-15',
            gender: 'M',
            passportExpiry: '2027-04-15',
            updatedAt: '2024-01-01T00:00:00Z',
            relationship: 'child'
          }
        ]
      };
    });

    await page.goto('/');

    // Create new trip
    await page.getByRole('button', { name: 'Create Trip' }).click();
    await expect(page.getByText('Create New Trip')).toBeVisible();

    // Fill trip details
    await page.getByRole('textbox', { name: 'Trip Name' }).fill('Family Japan Adventure');
    await page.getByRole('textbox', { name: 'Start Date' }).fill('2024-07-01');
    await page.getByRole('textbox', { name: 'End Date' }).fill('2024-07-14');

    // Select travelers - should show family member selector
    await page.getByText('Select Travelers').click();
    await expect(page.getByText('Choose who is traveling')).toBeVisible();

    // Select all family members
    await page.getByRole('checkbox', { name: 'David Wilson' }).check();
    await page.getByRole('checkbox', { name: 'Jennifer Wilson' }).check();
    await page.getByRole('checkbox', { name: 'Oliver Wilson' }).check();

    await page.getByRole('button', { name: 'Continue' }).click();

    // Add Japan as destination
    await page.getByRole('button', { name: 'Add Destination' }).click();
    await page.getByRole('textbox', { name: 'Search countries' }).fill('Japan');
    await page.getByText('Japan').click();

    await page.getByRole('button', { name: 'Save Trip' }).click();

    // Verify trip created with family members
    await expect(page.getByText('Family Japan Adventure')).toBeVisible();
    await expect(page.getByText('3 travelers')).toBeVisible();
    await expect(page.getByText('Japan')).toBeVisible();
  });

  test('family trip form generation for each member', async ({ page }) => {
    // Set up trip with family members
    await page.addInitScript(() => {
      (window as any).__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          id: 'primary-user-123',
          givenNames: 'Lisa',
          surname: 'Chen',
          passportNumber: 'US1234567',
          nationality: 'USA',
          dateOfBirth: '1987-09-25',
          gender: 'F',
          passportExpiry: '2030-01-15',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        familyMembers: [
          {
            id: 'child-456',
            givenNames: 'Kevin',
            surname: 'Chen',
            passportNumber: 'US1234568',
            nationality: 'USA',
            dateOfBirth: '2010-12-03',
            gender: 'M',
            passportExpiry: '2025-12-03',
            updatedAt: '2024-01-01T00:00:00Z',
            relationship: 'child'
          }
        ],
        currentTrip: {
          id: 'trip-singapore-123',
          name: 'Singapore Family Trip',
          travelers: ['primary-user-123', 'child-456'],
          countries: ['SGP'],
          startDate: '2024-08-15',
          endDate: '2024-08-22'
        }
      };
    });

    await page.goto('/trips/trip-singapore-123');

    // Should show trip details with family members
    await expect(page.getByText('Singapore Family Trip')).toBeVisible();
    await expect(page.getByText('2 travelers')).toBeVisible();

    // View Singapore forms for family
    await page.getByText('Singapore').click();
    await expect(page.getByText('SG Arrival Card')).toBeVisible();

    // Should show traveler selector for forms
    await expect(page.getByText('Select Traveler')).toBeVisible();
    await expect(page.getByText('Lisa Chen')).toBeVisible();
    await expect(page.getByText('Kevin Chen')).toBeVisible();

    // Fill form for primary user (Lisa)
    await page.getByText('Lisa Chen').click();
    await expect(page.getByText('Auto-filled from profile')).toBeVisible(); // Auto-fill indicator

    // Switch to child's form
    await page.getByText('Kevin Chen').click();
    await expect(page.getByText('Auto-filled from profile')).toBeVisible(); // Should also be auto-filled

    // Verify child-specific fields if any
    await expect(page.getByRole('textbox', { name: 'Passport Number' })).toHaveValue('US1234568');
    await expect(page.getByRole('textbox', { name: 'Given Names' })).toHaveValue('Kevin');
  });

  test('family member form validation and error handling', async ({ page }) => {
    // Set up family member with expiring passport
    const expiredDate = new Date();
    expiredDate.setFullYear(expiredDate.getFullYear() - 1); // 1 year ago

    await page.addInitScript((expDate) => {
      (window as any).__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          id: 'primary-user-123',
          givenNames: 'Robert',
          surname: 'Taylor',
          passportNumber: 'AU1234567',
          nationality: 'AUS',
          dateOfBirth: '1975-02-14',
          gender: 'M',
          passportExpiry: '2031-06-30',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        familyMembers: [
          {
            id: 'spouse-456',
            givenNames: 'Amanda',
            surname: 'Taylor',
            passportNumber: 'AU1234568',
            nationality: 'AUS',
            dateOfBirth: '1977-11-20',
            gender: 'F',
            passportExpiry: expDate.split('T')[0], // Expired passport
            updatedAt: '2024-01-01T00:00:00Z',
            relationship: 'spouse'
          }
        ]
      };
    }, expiredDate.toISOString());

    await page.goto('/profile/family-management');

    // Should show expired passport warning for spouse
    await expect(page.getByText('Amanda Taylor')).toBeVisible();
    await expect(page.getByText('Passport Expiring')).toBeVisible();

    // Try to create trip with expired passport member
    await page.getByRole('button', { name: 'Trips' }).click();
    await page.getByRole('button', { name: 'Create Trip' }).click();

    // Select both travelers
    await page.getByText('Select Travelers').click();
    await page.getByRole('checkbox', { name: 'Robert Taylor' }).check();
    await page.getByRole('checkbox', { name: 'Amanda Taylor' }).check();

    // Should show validation warning about expired passport
    await expect(page.getByText('⚠ Some family members have passport issues')).toBeVisible();
    await expect(page.getByText('Amanda Taylor has an expired passport')).toBeVisible();

    // Should still allow trip creation with warning acknowledgment
    await page.getByRole('button', { name: 'Continue Anyway' }).click();
  });

  test('family trip deletion and data cleanup', async ({ page }) => {
    // Set up family trip
    await page.addInitScript(() => {
      (window as any).__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          id: 'primary-user-123',
          givenNames: 'Patricia',
          surname: 'Martinez',
          passportNumber: 'ES1234567',
          nationality: 'ESP',
          dateOfBirth: '1983-04-18',
          gender: 'F',
          passportExpiry: '2029-09-22',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        trips: [
          {
            id: 'family-trip-123',
            name: 'Family Thailand Trip',
            travelers: ['primary-user-123', 'child-456'],
            countries: ['THA'],
            startDate: '2024-09-01',
            endDate: '2024-09-10',
            formData: {
              'primary-user-123': { /* form data */ },
              'child-456': { /* form data */ }
            }
          }
        ]
      };
    });

    await page.goto('/trips/family-trip-123');

    // Delete trip
    await page.getByRole('button', { name: 'More Options' }).click();
    await page.getByRole('button', { name: 'Delete Trip' }).click();

    // Confirm deletion
    await page.getByRole('button', { name: 'Delete' }).click();

    // Should return to trips list without the deleted trip
    await expect(page.getByText('My Trips')).toBeVisible();
    await expect(page.getByText('Family Thailand Trip')).not.toBeVisible();

    // Verify family profiles are still intact
    await page.getByRole('button', { name: 'Profile' }).click();
    await page.getByText('Family Members').click();
    await expect(page.getByText('Patricia Martinez')).toBeVisible(); // Primary profile preserved
  });
});