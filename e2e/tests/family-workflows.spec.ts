import { test, expect } from '@playwright/test';

test.describe('Family Workflow Integration', () => {
  test('family profile creation preserves single user workflow', async ({ page }) => {
    // Start with single user journey
    await page.goto('/');
    
    // Complete onboarding as single user
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await page.getByRole('button', { name: 'Enter Manually' }).click();

    // Fill primary user profile
    await page.getByRole('textbox', { name: 'Passport Number' }).fill('US9876543');
    await page.getByRole('textbox', { name: 'Surname (Family Name)' }).fill('Anderson');
    await page.getByRole('textbox', { name: 'Given Names' }).fill('Maria Elena');
    await page.getByRole('textbox', { name: 'Nationality' }).fill('USA');
    await page.getByRole('textbox', { name: 'Date of Birth' }).fill('1988-09-12');
    await page.getByRole('button', { name: 'Female' }).first().click();
    await page.getByRole('textbox', { name: 'Passport Expiry' }).fill('2031-03-20');

    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Skip for now' }).click(); // Skip biometrics

    // Verify single user workflow still works
    await expect(page.getByText('My Trips')).toBeVisible();
    
    // Create a single-user trip to verify preservation
    await page.getByRole('button', { name: 'Create Trip' }).click();
    await page.getByRole('textbox', { name: 'Trip Name' }).fill('Solo Japan Adventure');
    await page.getByRole('textbox', { name: 'Start Date' }).fill('2024-10-01');
    await page.getByRole('textbox', { name: 'End Date' }).fill('2024-10-10');
    await page.getByRole('button', { name: 'Add Destination' }).click();
    await page.getByRole('textbox', { name: 'Search countries' }).fill('Japan');
    await page.getByText('Japan').click();
    await page.getByRole('button', { name: 'Save Trip' }).click();

    // Trip should be created for single user
    await expect(page.getByText('Solo Japan Adventure')).toBeVisible();
    await expect(page.getByText('1 traveler')).toBeVisible();

    // Now transition to family profiles
    await page.getByRole('button', { name: 'Profile' }).click();
    await page.getByText('Family Members').click();

    // Primary user should appear as family member
    await expect(page.getByText('Maria Elena Anderson')).toBeVisible();
    await expect(page.getByText('Primary Traveler')).toBeVisible();

    // Add family member
    await page.getByRole('button', { name: 'Add Member' }).click();
    await page.getByRole('button', { name: 'Child' }).click();
    
    await page.getByRole('button', { name: 'Enter Manually' }).click();
    await page.getByRole('textbox', { name: 'Passport Number' }).fill('US9876544');
    await page.getByRole('textbox', { name: 'Surname (Family Name)' }).fill('Anderson');
    await page.getByRole('textbox', { name: 'Given Names' }).fill('Sofia');
    await page.getByRole('textbox', { name: 'Nationality' }).fill('USA');
    await page.getByRole('textbox', { name: 'Date of Birth' }).fill('2016-04-08');
    await page.getByRole('button', { name: 'Female' }).first().click();
    await page.getByRole('textbox', { name: 'Passport Expiry' }).fill('2026-04-08');

    await page.getByRole('button', { name: 'Save Family Member' }).click();

    // Verify both family members exist
    await expect(page.getByText('Maria Elena Anderson')).toBeVisible();
    await expect(page.getByText('Sofia Anderson')).toBeVisible();
    await expect(page.getByText('Child')).toBeVisible();

    // Verify original trip still exists and single-user workflow preserved
    await page.getByRole('button', { name: 'Trips' }).click();
    await expect(page.getByText('Solo Japan Adventure')).toBeVisible();

    // Create new family trip to verify family workflow
    await page.getByRole('button', { name: 'Create Trip' }).click();
    await page.getByRole('textbox', { name: 'Trip Name' }).fill('Family Thailand Trip');
    await page.getByRole('textbox', { name: 'Start Date' }).fill('2024-12-15');
    await page.getByRole('textbox', { name: 'End Date' }).fill('2024-12-25');

    // Select both travelers
    await page.getByText('Select Travelers').click();
    await page.getByRole('checkbox', { name: 'Maria Elena Anderson' }).check();
    await page.getByRole('checkbox', { name: 'Sofia Anderson' }).check();
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByRole('button', { name: 'Add Destination' }).click();
    await page.getByRole('textbox', { name: 'Search countries' }).fill('Thailand');
    await page.getByText('Thailand').click();
    await page.getByRole('button', { name: 'Save Trip' }).click();

    // Verify family trip created
    await expect(page.getByText('Family Thailand Trip')).toBeVisible();
    await expect(page.getByText('2 travelers')).toBeVisible();

    // Verify both trips coexist
    await expect(page.getByText('Solo Japan Adventure')).toBeVisible();
    await expect(page.getByText('Family Thailand Trip')).toBeVisible();
  });

  test('multi-traveler form generation with family members', async ({ page }) => {
    // Setup family with multiple members
    await page.addInitScript(() => {
      window.__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          id: 'primary-123',
          givenNames: 'Robert',
          surname: 'Chen',
          passportNumber: 'CA9876543',
          nationality: 'CAN',
          dateOfBirth: '1979-11-25',
          gender: 'M',
          passportExpiry: '2030-11-25',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        familyMembers: [
          {
            id: 'spouse-456',
            givenNames: 'Linda',
            surname: 'Chen',
            passportNumber: 'CA9876544',
            nationality: 'CAN',
            dateOfBirth: '1981-06-18',
            gender: 'F',
            passportExpiry: '2029-12-10',
            updatedAt: '2024-01-01T00:00:00Z',
            relationship: 'spouse'
          },
          {
            id: 'child-789',
            givenNames: 'Alex',
            surname: 'Chen',
            passportNumber: 'CA9876545',
            nationality: 'CAN',
            dateOfBirth: '2014-03-12',
            gender: 'M',
            passportExpiry: '2024-03-12',
            updatedAt: '2024-01-01T00:00:00Z',
            relationship: 'child'
          }
        ],
        currentTrip: {
          id: 'family-trip-singapore',
          name: 'Singapore Family Vacation',
          travelers: ['primary-123', 'spouse-456', 'child-789'],
          countries: ['SGP'],
          startDate: '2024-08-15',
          endDate: '2024-08-25'
        }
      };
    });

    await page.goto('/trips/family-trip-singapore');

    // Should show trip with family travelers
    await expect(page.getByText('Singapore Family Vacation')).toBeVisible();
    await expect(page.getByText('3 travelers')).toBeVisible();

    // Access Singapore forms
    await page.getByText('Singapore').click();
    await expect(page.getByText('SG Arrival Card')).toBeVisible();

    // Should have traveler selector
    await expect(page.getByText('Select Traveler')).toBeVisible();
    await expect(page.getByText('Robert Chen')).toBeVisible();
    await expect(page.getByText('Linda Chen')).toBeVisible();
    await expect(page.getByText('Alex Chen')).toBeVisible();

    // Test switching between travelers and auto-fill
    await page.getByText('Robert Chen').click();
    await expect(page.getByRole('textbox', { name: 'Passport Number' })).toHaveValue('CA9876543');
    await expect(page.getByRole('textbox', { name: 'Given Names' })).toHaveValue('Robert');
    await expect(page.getByText('Auto-filled from profile')).toBeVisible();

    // Switch to spouse
    await page.getByText('Linda Chen').click();
    await expect(page.getByRole('textbox', { name: 'Passport Number' })).toHaveValue('CA9876544');
    await expect(page.getByRole('textbox', { name: 'Given Names' })).toHaveValue('Linda');

    // Switch to child
    await page.getByText('Alex Chen').click();
    await expect(page.getByRole('textbox', { name: 'Passport Number' })).toHaveValue('CA9876545');
    await expect(page.getByRole('textbox', { name: 'Given Names' })).toHaveValue('Alex');
    
    // Child should also show passport expiry warning
    await expect(page.getByText('⚠ Expiring Soon')).toBeVisible();
  });

  test('family member validation and error handling', async ({ page }) => {
    // Setup with existing primary user
    await page.addInitScript(() => {
      window.__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          id: 'primary-123',
          givenNames: 'Sarah',
          surname: 'Wilson',
          passportNumber: 'AU9876543',
          nationality: 'AUS',
          dateOfBirth: '1986-07-14',
          gender: 'F',
          passportExpiry: '2032-01-15',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      };
    });

    await page.goto('/profile/family-management');

    // Add family member with validation errors
    await page.getByRole('button', { name: 'Add Member' }).click();
    await page.getByRole('button', { name: 'Spouse' }).click();
    await page.getByRole('button', { name: 'Enter Manually' }).click();

    // Try to save without required fields
    await page.getByRole('button', { name: 'Save Family Member' }).click();

    // Should show validation errors
    await expect(page.getByText('Given names are required')).toBeVisible();
    await expect(page.getByText('Surname is required')).toBeVisible();
    await expect(page.getByText('Passport number is required')).toBeVisible();

    // Fill with invalid data
    await page.getByRole('textbox', { name: 'Given Names' }).fill('J'); // Too short
    await page.getByRole('textbox', { name: 'Passport Number' }).fill('123'); // Too short
    await page.getByRole('textbox', { name: 'Date of Birth' }).fill('2025-01-01'); // Future date
    await page.getByRole('textbox', { name: 'Passport Expiry' }).fill('2023-01-01'); // Expired

    await page.getByRole('button', { name: 'Save Family Member' }).click();

    // Should show specific validation errors
    await expect(page.getByText('Date of birth cannot be in the future')).toBeVisible();
    await expect(page.getByText('Passport has already expired')).toBeVisible();
    await expect(page.getByText('Passport number length seems unusual')).toBeVisible();

    // Fill with valid data
    await page.getByRole('textbox', { name: 'Given Names' }).fill('Michael');
    await page.getByRole('textbox', { name: 'Surname (Family Name)' }).fill('Wilson');
    await page.getByRole('textbox', { name: 'Passport Number' }).fill('AU9876544');
    await page.getByRole('textbox', { name: 'Nationality' }).fill('AUS');
    await page.getByRole('textbox', { name: 'Date of Birth' }).fill('1984-03-22');
    await page.getByRole('button', { name: 'Male' }).first().click();
    await page.getByRole('textbox', { name: 'Passport Expiry' }).fill('2031-09-15');

    await page.getByRole('button', { name: 'Save Family Member' }).click();

    // Should successfully save and return to family management
    await expect(page.getByText('Michael Wilson')).toBeVisible();
    await expect(page.getByText('Spouse')).toBeVisible();
  });

  test('family member removal and data cleanup', async ({ page }) => {
    // Setup family with multiple members
    await page.addInitScript(() => {
      window.__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          id: 'primary-123',
          givenNames: 'Jennifer',
          surname: 'Taylor',
          passportNumber: 'GB9876543',
          nationality: 'GBR',
          dateOfBirth: '1990-04-18',
          gender: 'F',
          passportExpiry: '2030-12-31',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        familyMembers: [
          {
            id: 'parent-456',
            givenNames: 'Margaret',
            surname: 'Taylor',
            passportNumber: 'GB9876544',
            nationality: 'GBR',
            dateOfBirth: '1960-08-25',
            gender: 'F',
            passportExpiry: '2028-11-10',
            updatedAt: '2024-01-01T00:00:00Z',
            relationship: 'parent'
          },
          {
            id: 'sibling-789',
            givenNames: 'David',
            surname: 'Taylor',
            passportNumber: 'GB9876545',
            nationality: 'GBR',
            dateOfBirth: '1988-12-03',
            gender: 'M',
            passportExpiry: '2029-06-20',
            updatedAt: '2024-01-01T00:00:00Z',
            relationship: 'sibling'
          }
        ]
      };
    });

    await page.goto('/profile/family-management');

    // Verify all family members are present
    await expect(page.getByText('Jennifer Taylor')).toBeVisible();
    await expect(page.getByText('Margaret Taylor')).toBeVisible();
    await expect(page.getByText('David Taylor')).toBeVisible();

    // Remove sibling
    await page.getByTestId('family-member-sibling-789').getByRole('button', { name: 'Remove' }).click();
    
    // Confirm removal
    await page.getByRole('button', { name: 'Remove' }).click();

    // Sibling should be removed
    await expect(page.getByText('David Taylor')).not.toBeVisible();
    
    // Other family members should remain
    await expect(page.getByText('Jennifer Taylor')).toBeVisible();
    await expect(page.getByText('Margaret Taylor')).toBeVisible();

    // Cannot remove primary profile
    const primaryCard = page.getByTestId('family-member-primary-123');
    await expect(primaryCard.getByRole('button', { name: 'Remove' })).not.toBeVisible();
  });

  test('family profile access control and security', async ({ page }) => {
    await page.addInitScript(() => {
      window.__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          id: 'primary-123',
          givenNames: 'Administrator',
          surname: 'Account',
          passportNumber: 'US9876543',
          nationality: 'USA',
          dateOfBirth: '1975-01-15',
          gender: 'F',
          passportExpiry: '2030-12-31',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        familyMembers: [
          {
            id: 'child-456',
            givenNames: 'Protected',
            surname: 'Child',
            passportNumber: 'US9876544',
            nationality: 'USA',
            dateOfBirth: '2010-05-20',
            gender: 'M',
            passportExpiry: '2025-05-20',
            updatedAt: '2024-01-01T00:00:00Z',
            relationship: 'child'
          }
        ]
      };
    });

    await page.goto('/profile/family-management');

    // Primary account holder should have access to all family member data
    await expect(page.getByText('Administrator Account')).toBeVisible();
    await expect(page.getByText('Protected Child')).toBeVisible();

    // Should display sensitive information appropriately
    await expect(page.getByText('US9876543')).toBeVisible(); // Primary passport
    await expect(page.getByText('US9876544')).toBeVisible(); // Child passport

    // Access individual family member details
    await page.getByText('Protected Child').click();
    
    // Should show detailed view with appropriate access controls
    await expect(page.getByText('Child')).toBeVisible();
    await expect(page.getByText('Born 2010')).toBeVisible();

    // Verify biometric/security context is maintained
    await page.goto('/settings');
    await expect(page.getByText('Security')).toBeVisible();
    
    // Family data should be included in security considerations
    await page.getByText('Data & Privacy').click();
    await expect(page.getByText('All family member data is stored locally')).toBeVisible();
  });

  test('backward compatibility with existing single user data', async ({ page }) => {
    // Simulate upgrading from single user to family profiles
    await page.addInitScript(() => {
      // Legacy single user state
      window.__BORDERLY_STATE__ = {
        preferences: { 
          onboardingComplete: true,
          theme: 'light',
          notifications: true 
        },
        profile: {
          id: 'legacy-user-123',
          givenNames: 'Legacy',
          surname: 'User',
          passportNumber: 'LEGACY123',
          nationality: 'CAN',
          dateOfBirth: '1980-01-01',
          gender: 'M',
          passportExpiry: '2030-01-01',
          updatedAt: '2023-01-01T00:00:00Z'
        },
        trips: [
          {
            id: 'legacy-trip-1',
            name: 'Pre-Family Trip',
            countries: ['JPN'],
            startDate: '2024-03-01',
            endDate: '2024-03-10',
            travelers: ['legacy-user-123']
          }
        ]
      };
    });

    await page.goto('/');

    // Should show existing trip
    await expect(page.getByText('Pre-Family Trip')).toBeVisible();

    // Navigate to family management
    await page.getByRole('button', { name: 'Profile' }).click();
    await page.getByText('Family Members').click();

    // Legacy user should appear as primary profile
    await expect(page.getByText('Legacy User')).toBeVisible();
    await expect(page.getByText('Primary Traveler')).toBeVisible();

    // Add new family member to verify upgrade path
    await page.getByRole('button', { name: 'Add Member' }).click();
    await page.getByRole('button', { name: 'Spouse' }).click();

    // Complete family member addition
    await page.getByRole('button', { name: 'Enter Manually' }).click();
    await page.getByRole('textbox', { name: 'Given Names' }).fill('New');
    await page.getByRole('textbox', { name: 'Surname (Family Name)' }).fill('User');
    await page.getByRole('textbox', { name: 'Passport Number' }).fill('LEGACY124');
    await page.getByRole('textbox', { name: 'Nationality' }).fill('CAN');
    await page.getByRole('textbox', { name: 'Date of Birth' }).fill('1982-05-15');
    await page.getByRole('button', { name: 'Female' }).first().click();
    await page.getByRole('textbox', { name: 'Passport Expiry' }).fill('2030-05-15');

    await page.getByRole('button', { name: 'Save Family Member' }).click();

    // Both profiles should exist
    await expect(page.getByText('Legacy User')).toBeVisible();
    await expect(page.getByText('New User')).toBeVisible();

    // Navigate back to trips and verify legacy data preserved
    await page.getByRole('button', { name: 'Trips' }).click();
    await expect(page.getByText('Pre-Family Trip')).toBeVisible();

    // Open legacy trip to verify it still works
    await page.getByText('Pre-Family Trip').click();
    await expect(page.getByText('Japan')).toBeVisible();

    // Should show single traveler (legacy)
    await expect(page.getByText('1 traveler')).toBeVisible();
  });
});