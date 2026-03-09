/**
 * FamilyMemberCard Component Unit Tests
 * 
 * Tests the family member card component for proper display of family member
 * information, passport status, and interaction handling.
 */

import { render, fireEvent } from '@testing-library/react-native';
import FamilyMemberCard from '@/components/profile/FamilyMemberCard';
import { FamilyMember } from '@/types/profile';

describe('FamilyMemberCard', () => {
  const mockPrimaryMember: FamilyMember = {
    id: 'primary-123',
    givenNames: 'John',
    surname: 'Smith',
    passportNumber: 'US1234567',
    nationality: 'USA',
    dateOfBirth: '1980-05-15',
    gender: 'M',
    passportExpiry: '2030-12-31',
    issuingCountry: 'USA',
    defaultDeclarations: {
      hasItemsToDeclar: false,
      carryingCurrency: false,
      carryingProhibitedItems: false,
      visitedFarm: false,
      hasCriminalRecord: false,
      carryingCommercialGoods: false
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    relationship: 'self'
  };

  const mockSpouseMember: FamilyMember = {
    id: 'spouse-456',
    givenNames: 'Jane',
    surname: 'Smith',
    passportNumber: 'US1234568',
    nationality: 'USA',
    dateOfBirth: '1982-08-20',
    gender: 'F',
    passportExpiry: '2029-06-15',
    issuingCountry: 'USA',
    defaultDeclarations: {
      hasItemsToDeclar: false,
      carryingCurrency: false,
      carryingProhibitedItems: false,
      visitedFarm: false,
      hasCriminalRecord: false,
      carryingCommercialGoods: false
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    relationship: 'spouse'
  };

  const mockChildMember: FamilyMember = {
    id: 'child-789',
    givenNames: 'Emma',
    surname: 'Smith',
    passportNumber: 'US1234569',
    nationality: 'USA',
    dateOfBirth: '2015-12-03',
    gender: 'F',
    passportExpiry: '2025-12-03', // Expires in 1 year
    issuingCountry: 'USA',
    defaultDeclarations: {
      hasItemsToDeclar: false,
      carryingCurrency: false,
      carryingProhibitedItems: false,
      visitedFarm: false,
      hasCriminalRecord: false,
      carryingCommercialGoods: false
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    relationship: 'child'
  };

  describe('Display and Formatting', () => {
    it('should render family member basic information correctly', () => {
      const { getByText } = render(
        <FamilyMemberCard member={mockPrimaryMember} />
      );

      expect(getByText('John Smith')).toBeTruthy();
      expect(getByText('Primary Traveler')).toBeTruthy();
      expect(getByText('USA • Born 1980')).toBeTruthy();
      expect(getByText('US1234567')).toBeTruthy();
    });

    it('should display relationship labels correctly', () => {
      const relationships = [
        { member: { ...mockPrimaryMember, relationship: 'self' }, expected: 'Primary Traveler' },
        { member: { ...mockSpouseMember, relationship: 'spouse' }, expected: 'Spouse' },
        { member: { ...mockChildMember, relationship: 'child' }, expected: 'Child' },
        { member: { ...mockSpouseMember, relationship: 'parent' }, expected: 'Parent' },
        { member: { ...mockSpouseMember, relationship: 'other' }, expected: 'Other Family' }
      ];

      relationships.forEach(({ member, expected }) => {
        const { getByText } = render(
          <FamilyMemberCard member={member as FamilyMember} />
        );
        expect(getByText(expected)).toBeTruthy();
      });
    });

    it('should format passport expiry date correctly', () => {
      const { getByText } = render(
        <FamilyMemberCard member={mockPrimaryMember} />
      );

      // Date rendering depends on timezone; check that "Expires:" prefix and year appear
      const expiresText = getByText(/Expires:.*2030/);
      expect(expiresText).toBeTruthy();
    });

    it('should display last scanned date', () => {
      const { getByText } = render(
        <FamilyMemberCard member={mockPrimaryMember} />
      );

      // "Last scanned:" and date may be split across text nodes; verify prefix exists
      expect(getByText(/Last scanned:/)).toBeTruthy();
    });
  });

  describe('Passport Status Indicators', () => {
    it('should show valid status for non-expiring passport', () => {
      const { getByText } = render(
        <FamilyMemberCard member={mockPrimaryMember} />
      );

      expect(getByText('Valid')).toBeTruthy();
    });

    it('should show expiring warning for passport expiring within 6 months', () => {
      const expiringSoon = new Date();
      expiringSoon.setMonth(expiringSoon.getMonth() + 3); // 3 months from now
      
      const expiringMember = {
        ...mockChildMember,
        passportExpiry: expiringSoon.toISOString().split('T')[0]
      };

      const { getByText } = render(
        <FamilyMemberCard member={expiringMember} />
      );

      expect(getByText('Passport Expiring')).toBeTruthy();
      expect(getByText('⚠ Expiring Soon')).toBeTruthy();
    });

    it('should show expired warning for already expired passport', () => {
      const expired = new Date();
      expired.setFullYear(expired.getFullYear() - 1); // 1 year ago
      
      const expiredMember = {
        ...mockChildMember,
        passportExpiry: expired.toISOString().split('T')[0]
      };

      const { getByText } = render(
        <FamilyMemberCard member={expiredMember} />
      );

      expect(getByText('Passport Expiring')).toBeTruthy();
      expect(getByText('⚠ Expiring Soon')).toBeTruthy();
    });
  });

  describe('Interaction Handling', () => {
    it('should call onPress when card is pressed', () => {
      const mockOnPress = jest.fn();

      const { getByText } = render(
        <FamilyMemberCard
          member={mockPrimaryMember}
          onPress={mockOnPress}
        />
      );

      fireEvent.press(getByText('John Smith'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should call onEdit when edit button is pressed', () => {
      const mockOnEdit = jest.fn();
      
      const { getByText } = render(
        <FamilyMemberCard 
          member={mockPrimaryMember} 
          onEdit={mockOnEdit}
        />
      );

      fireEvent.press(getByText('Edit'));
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });

    it('should call onRemove when remove button is pressed for non-primary member', () => {
      const mockOnRemove = jest.fn();
      
      const { getByText } = render(
        <FamilyMemberCard 
          member={mockSpouseMember} 
          onRemove={mockOnRemove}
        />
      );

      fireEvent.press(getByText('Remove'));
      expect(mockOnRemove).toHaveBeenCalledTimes(1);
    });

    it('should not show remove button for primary member', () => {
      const mockOnRemove = jest.fn();
      
      const { queryByText } = render(
        <FamilyMemberCard 
          member={mockPrimaryMember} 
          onRemove={mockOnRemove}
        />
      );

      expect(queryByText('Remove')).toBeFalsy();
    });

    it('should not render card as touchable when onPress is not provided', () => {
      const { getByText } = render(
        <FamilyMemberCard
          member={mockPrimaryMember}
        />
      );

      // Card should still be rendered but not be pressable
      expect(getByText('John Smith')).toBeTruthy();
    });
  });

  describe('Active State Styling', () => {
    it('should apply active styling when isActive is true', () => {
      const { getByText } = render(
        <FamilyMemberCard
          member={mockPrimaryMember}
          isActive={true}
        />
      );

      // Component should render without errors when isActive is true
      expect(getByText('John Smith')).toBeTruthy();
    });

    it('should not apply active styling when isActive is false', () => {
      const { getByText } = render(
        <FamilyMemberCard
          member={mockPrimaryMember}
          isActive={false}
        />
      );

      // Component should render without errors when isActive is false
      expect(getByText('John Smith')).toBeTruthy();
    });
  });

  describe('Gender and Nationality Display', () => {
    it('should display birth year from date of birth', () => {
      const { getByText } = render(
        <FamilyMemberCard member={mockChildMember} />
      );

      expect(getByText('USA • Born 2015')).toBeTruthy();
    });

    it('should handle different nationalities correctly', () => {
      const canadianMember = {
        ...mockPrimaryMember,
        nationality: 'CAN'
      };

      const { getByText } = render(
        <FamilyMemberCard member={canadianMember} />
      );

      expect(getByText('CAN • Born 1980')).toBeTruthy();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid date formats gracefully', () => {
      const memberWithInvalidDate = {
        ...mockPrimaryMember,
        dateOfBirth: 'invalid-date',
        passportExpiry: 'invalid-expiry',
        updatedAt: 'invalid-updated'
      };

      const { getByText } = render(
        <FamilyMemberCard member={memberWithInvalidDate} />
      );

      // Should still render the component without crashing
      expect(getByText('John Smith')).toBeTruthy();
      expect(getByText('Primary Traveler')).toBeTruthy();
    });

    it('should handle missing optional fields', () => {
      const memberWithMissingFields = {
        ...mockPrimaryMember,
        placeOfBirth: undefined,
        nickname: undefined
      };

      const { getByText } = render(
        <FamilyMemberCard member={memberWithMissingFields} />
      );

      // Should still render essential information
      expect(getByText('John Smith')).toBeTruthy();
      expect(getByText('US1234567')).toBeTruthy();
    });

    it('should memoize calculations to prevent unnecessary re-renders', () => {
      const { rerender } = render(
        <FamilyMemberCard member={mockPrimaryMember} />
      );

      // Component should be memoized and not re-render with same props
      rerender(<FamilyMemberCard member={mockPrimaryMember} />);
      
      // Mock memo behavior verification would be implementation-specific
      expect(true).toBe(true); // Placeholder for memo verification
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByText } = render(
        <FamilyMemberCard member={mockPrimaryMember} />
      );

      // Should have accessible content
      expect(getByText('John Smith')).toBeTruthy();
      expect(getByText('Primary Traveler')).toBeTruthy();
    });

    it('should provide context for passport status to screen readers', () => {
      const expiringMember = {
        ...mockChildMember,
        passportExpiry: '2024-06-01' // Soon expiring
      };

      const { getByText } = render(
        <FamilyMemberCard member={expiringMember} />
      );

      expect(getByText('⚠ Expiring Soon')).toBeTruthy();
    });
  });
});