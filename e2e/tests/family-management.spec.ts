import { test, expect } from '@playwright/test';

test.describe('Family Management Workflow', () => {
  test('family management screen shows empty state for new users', async ({ page }) => {
    // Inject completed onboarding state for primary user
    await page.addInitScript(() => {
      window.__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          id: 'primary-user-123',
          givenNames: 'Jane',
          surname: 'Smith',
          passportNumber: 'CD9876543',
          nationality: 'CA',
          dateOfBirth: '1985-05-15',
          gender: 'F',
          passportExpiry: '2030-12-31',
          updatedAt: '2024-01-01T00:00:00Z'
        },
      };
    });

    await page.goto('/profile/family-management');

    // Check header elements
    await expect(page.getByText('Family Members')).toBeVisible();
    await expect(page.getByText('Manage your family travel profiles')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Member' })).toBeVisible();

    // Primary user should be shown as "self"
    await expect(page.getByText('Jane Smith')).toBeVisible();
    await expect(page.getByText('Primary Traveler')).toBeVisible();
    await expect(page.getByText('CD9876543')).toBeVisible();

    // Information card should be present
    await expect(page.getByText('About Family Profiles')).toBeVisible();
    await expect(page.getByText('Each family member gets their own secure profile')).toBeVisible();
    await expect(page.getByText('All data is stored locally on your device')).toBeVisible();
  });

  test('add family member button navigates to add family member screen', async ({ page }) => {
    await page.addInitScript(() => {
      window.__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          id: 'primary-user-123',
          givenNames: 'Jane',
          surname: 'Smith',
          passportNumber: 'CD9876543',
          nationality: 'CA',
          dateOfBirth: '1985-05-15',
          gender: 'F',
          passportExpiry: '2030-12-31',
          updatedAt: '2024-01-01T00:00:00Z'
        },
      };
    });

    await page.goto('/profile/family-management');
    
    // Click add member button
    await page.getByRole('button', { name: 'Add Member' }).click();

    // Should navigate to add family member screen
    await expect(page.getByText('Add Family Member')).toBeVisible();
  });

  test('family member card shows passport expiry warnings', async ({ page }) => {
    const expiringSoonDate = new Date();
    expiringSoonDate.setMonth(expiringSoonDate.getMonth() + 3); // 3 months from now

    await page.addInitScript((expDate) => {
      window.__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          id: 'primary-user-123',
          givenNames: 'John',
          surname: 'Doe',
          passportNumber: 'AB1234567',
          nationality: 'US',
          dateOfBirth: '1980-01-01',
          gender: 'M',
          passportExpiry: expDate,
          updatedAt: '2024-01-01T00:00:00Z'
        },
      };
    }, expiringSoonDate.toISOString().split('T')[0]);

    await page.goto('/profile/family-management');

    // Should show passport expiry warning
    await expect(page.getByText('Passport Expiring')).toBeVisible();
    await expect(page.getByText('⚠ Expiring Soon')).toBeVisible();
  });

  test('edit button for primary user navigates to edit profile', async ({ page }) => {
    await page.addInitScript(() => {
      window.__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          id: 'primary-user-123',
          givenNames: 'Jane',
          surname: 'Smith',
          passportNumber: 'CD9876543',
          nationality: 'CA',
          dateOfBirth: '1985-05-15',
          gender: 'F',
          passportExpiry: '2030-12-31',
          updatedAt: '2024-01-01T00:00:00Z'
        },
      };
    });

    await page.goto('/profile/family-management');
    
    // Click edit button for primary user
    await page.getByRole('button', { name: 'Edit' }).click();

    // Should navigate to edit profile screen
    await expect(page.getByText('Edit Profile')).toBeVisible();
  });

  test('family management accessible via navigation', async ({ page }) => {
    await page.addInitScript(() => {
      window.__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          id: 'primary-user-123',
          givenNames: 'Jane',
          surname: 'Smith',
          passportNumber: 'CD9876543',
          nationality: 'CA',
          dateOfBirth: '1985-05-15',
          gender: 'F',
          passportExpiry: '2030-12-31',
          updatedAt: '2024-01-01T00:00:00Z'
        },
      };
    });

    await page.goto('/');
    
    // Navigate to profile tab
    await page.getByRole('button', { name: 'Profile' }).click();
    
    // Navigate to family management
    await page.getByText('Family Members').click();
    
    // Should show family management screen
    await expect(page.getByText('Manage your family travel profiles')).toBeVisible();
  });

  test('family member loading state shows properly', async ({ page }) => {
    await page.addInitScript(() => {
      // Simulate slow loading by not providing profile immediately
      window.__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: null, // No profile initially
      };
    });

    await page.goto('/profile/family-management');

    // Should show loading spinner initially
    await expect(page.getByText('Loading family members...')).toBeVisible();
  });

  test('family member relationships display correctly', async ({ page }) => {
    await page.addInitScript(() => {
      window.__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          id: 'primary-user-123',
          givenNames: 'Jane',
          surname: 'Smith',
          passportNumber: 'CD9876543',
          nationality: 'CA',
          dateOfBirth: '1985-05-15',
          gender: 'F',
          passportExpiry: '2030-12-31',
          updatedAt: '2024-01-01T00:00:00Z',
          relationship: 'self'
        },
        familyMembers: [
          {
            id: 'spouse-456',
            givenNames: 'John',
            surname: 'Smith',
            passportNumber: 'CD9876544',
            nationality: 'CA',
            dateOfBirth: '1982-03-10',
            gender: 'M',
            passportExpiry: '2030-12-31',
            updatedAt: '2024-01-01T00:00:00Z',
            relationship: 'spouse'
          },
          {
            id: 'child-789',
            givenNames: 'Emma',
            surname: 'Smith',
            passportNumber: 'CD9876545',
            nationality: 'CA',
            dateOfBirth: '2015-07-20',
            gender: 'F',
            passportExpiry: '2030-12-31',
            updatedAt: '2024-01-01T00:00:00Z',
            relationship: 'child'
          }
        ]
      };
    });

    await page.goto('/profile/family-management');

    // Check relationship displays
    await expect(page.getByText('Primary Traveler')).toBeVisible(); // self
    await expect(page.getByText('Spouse')).toBeVisible();
    await expect(page.getByText('Child')).toBeVisible();

    // All family members should be visible
    await expect(page.getByText('Jane Smith')).toBeVisible();
    await expect(page.getByText('John Smith')).toBeVisible();
    await expect(page.getByText('Emma Smith')).toBeVisible();
  });
});