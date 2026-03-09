import { test, expect } from '@playwright/test';

test.describe('Family Management Workflow', () => {
  test('family management screen shows empty state for new users', async ({ page }) => {
    // Inject completed onboarding state for primary user
    await page.addInitScript(() => {
      (window as any).__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          id: 'primary-user-123',
          givenNames: 'Alice',
          surname: 'Johnson',
          passportNumber: 'US1234567',
          nationality: 'USA',
          dateOfBirth: '1985-03-15',
          gender: 'F',
          passportExpiry: '2030-12-31',
          issuingCountry: 'USA',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        familyProfiles: []
      };
    });

    await page.goto('/family');
    
    // Should show empty state with add family member button
    await expect(page.getByText('No family members added yet')).toBeVisible();
    await expect(page.getByText('Add Family Member')).toBeVisible();
  });

  test('family management shows family members with passport expiry warnings', async ({ page }) => {
    await page.addInitScript(() => {
      const soonExpiringDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 90 days from now
      
      (window as any).__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          id: 'primary-user-123',
          givenNames: 'Alice',
          surname: 'Johnson',
          passportNumber: 'US1234567',
          nationality: 'USA',
          dateOfBirth: '1985-03-15',
          gender: 'F',
          passportExpiry: '2030-12-31',
          issuingCountry: 'USA',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        familyProfiles: [
          {
            id: 'spouse-456',
            givenNames: 'John',
            surname: 'Johnson',
            passportNumber: 'US1234568',
            nationality: 'USA',
            dateOfBirth: '1980-01-01',
            gender: 'M',
            passportExpiry: soonExpiringDate,
            issuingCountry: 'USA',
            updatedAt: '2024-01-01T00:00:00Z',
            relationship: 'spouse'
          }
        ]
      };
    });

    await page.goto('/family');
    
    // Should show family member with passport expiry warning
    await expect(page.getByText('John Johnson')).toBeVisible();
    await expect(page.getByText('Spouse')).toBeVisible();
    await expect(page.getByText('Expires soon')).toBeVisible();
  });

  test('family management shows correct relationship displays', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          id: 'primary-user-123',
          givenNames: 'Alice',
          surname: 'Johnson',
          passportNumber: 'US1234567',
          nationality: 'USA',
          dateOfBirth: '1985-03-15',
          gender: 'F',
          passportExpiry: '2030-12-31',
          issuingCountry: 'USA',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        familyProfiles: [
          {
            id: 'spouse-456',
            givenNames: 'John',
            surname: 'Johnson', 
            relationship: 'spouse'
          },
          {
            id: 'child-789',
            givenNames: 'Emma',
            surname: 'Johnson',
            relationship: 'child'
          },
          {
            id: 'parent-101',
            givenNames: 'Mary',
            surname: 'Smith',
            relationship: 'parent'
          },
          {
            id: 'sibling-102',
            givenNames: 'Tom',
            surname: 'Johnson',
            relationship: 'sibling'
          }
        ]
      };
    });

    await page.goto('/family');
    
    // Should show correct relationship labels
    await expect(page.getByText('Spouse')).toBeVisible();
    await expect(page.getByText('Child')).toBeVisible();
    await expect(page.getByText('Parent')).toBeVisible();
    await expect(page.getByText('Sibling')).toBeVisible();
  });

  test('add family member button navigates to add screen', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          id: 'primary-user-123',
          givenNames: 'Alice', 
          surname: 'Johnson',
          passportNumber: 'US1234567',
          nationality: 'USA',
          dateOfBirth: '1985-03-15',
          gender: 'F',
          passportExpiry: '2030-12-31',
          issuingCountry: 'USA',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        familyProfiles: []
      };
    });

    await page.goto('/family');
    
    // Click add family member button
    await page.getByText('Add Family Member').click();
    
    // Should navigate to add family member screen
    await expect(page.url()).toContain('/family/add');
  });

  test('family member cards are interactive', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          id: 'primary-user-123',
          givenNames: 'Alice',
          surname: 'Johnson',
          passportNumber: 'US1234567',
          nationality: 'USA',
          dateOfBirth: '1985-03-15',
          gender: 'F',
          passportExpiry: '2030-12-31',
          issuingCountry: 'USA',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        familyProfiles: [
          {
            id: 'spouse-456',
            givenNames: 'John',
            surname: 'Johnson',
            passportNumber: 'US1234568',
            nationality: 'USA',
            dateOfBirth: '1980-01-01',
            gender: 'M',
            passportExpiry: '2030-12-31',
            issuingCountry: 'USA',
            updatedAt: '2024-01-01T00:00:00Z',
            relationship: 'spouse'
          }
        ]
      };
    });

    await page.goto('/family');
    
    // Family member card should be clickable
    const familyMemberCard = page.getByText('John Johnson').locator('..');
    await familyMemberCard.click();
    
    // Should navigate to family member detail or edit screen
    // Note: The exact behavior depends on the implementation
    await page.waitForTimeout(100); // Small delay for navigation
  });

  test('passport status indicators work correctly', async ({ page }) => {
    await page.addInitScript(() => {
      const expiredDate = '2020-01-01';
      const validDate = '2030-01-01';
      
      (window as any).__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          id: 'primary-user-123',
          givenNames: 'Alice',
          surname: 'Johnson',
          passportNumber: 'US1234567',
          nationality: 'USA',
          dateOfBirth: '1985-03-15',
          gender: 'F',
          passportExpiry: validDate,
          issuingCountry: 'USA',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        familyProfiles: [
          {
            id: 'expired-member',
            givenNames: 'Expired',
            surname: 'Member',
            passportExpiry: expiredDate,
            relationship: 'spouse'
          },
          {
            id: 'valid-member',
            givenNames: 'Valid',
            surname: 'Member',
            passportExpiry: validDate,
            relationship: 'child'
          }
        ]
      };
    });

    await page.goto('/family');
    
    // Should show different status indicators for expired vs valid passports
    await expect(page.getByText('Expired Member')).toBeVisible();
    await expect(page.getByText('Valid Member')).toBeVisible();
    
    // Expired passport should show warning indicator
    await expect(page.locator('[data-testid="passport-expired-warning"]')).toBeVisible();
  });
});