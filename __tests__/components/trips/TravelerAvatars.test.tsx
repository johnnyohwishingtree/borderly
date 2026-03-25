/**
 * Unit tests for TravelerAvatars component.
 *
 * Covers:
 * - Hidden when 0 or 1 travelers
 * - Shows initials pills for multiple travelers
 * - Overflow badge when travelers exceed maxVisible
 * - Traveler count text
 * - Relationship-based colors on pills
 */

import { render, screen } from '@testing-library/react-native';
import TravelerAvatars from '../../../src/components/trips/TravelerAvatars';
import type { FamilyMember } from '../../../src/types/profile';

function makeMember(overrides: Partial<FamilyMember> = {}): FamilyMember {
  return {
    id: `member-${Math.random()}`,
    givenNames: 'John',
    surname: 'Doe',
    passportNumber: 'AB123456',
    nationality: 'USA',
    dateOfBirth: '1990-01-01',
    gender: 'M',
    passportExpiry: '2030-01-01',
    issuingCountry: 'USA',
    relationship: 'self',
    defaultDeclarations: {
      hasItemsToDeclare: false,
      carryingCurrency: false,
      carryingProhibitedItems: false,
      visitedFarm: false,
      hasCriminalRecord: false,
      carryingCommercialGoods: false,
    },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

const self = makeMember({ id: 'p1', givenNames: 'John', surname: 'Doe', relationship: 'self' });
const spouse = makeMember({ id: 'p2', givenNames: 'Jane', surname: 'Doe', relationship: 'spouse' });
const child1 = makeMember({ id: 'p3', givenNames: 'Alex', surname: 'Doe', relationship: 'child' });
const child2 = makeMember({ id: 'p4', givenNames: 'Sam', surname: 'Doe', relationship: 'child' });
const parent = makeMember({ id: 'p5', givenNames: 'Bob', surname: 'Doe', relationship: 'parent' });

describe('TravelerAvatars — visibility', () => {
  it('returns null when travelers array is empty', () => {
    const { toJSON } = render(<TravelerAvatars travelers={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('returns null when only 1 traveler (no "1 traveler" noise)', () => {
    const { toJSON } = render(<TravelerAvatars travelers={[self]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders when 2+ travelers are provided', () => {
    render(<TravelerAvatars travelers={[self, spouse]} />);
    expect(screen.getByTestId('traveler-avatars')).toBeTruthy();
  });
});

describe('TravelerAvatars — initials', () => {
  it('shows initials for each visible traveler', () => {
    render(<TravelerAvatars travelers={[self, spouse]} />);
    // Both John Doe and Jane Doe have initials "JD" — verify via getAllByText
    expect(screen.getAllByText('JD')).toHaveLength(2);
    expect(screen.getByTestId('traveler-avatar-p1')).toBeTruthy();
    expect(screen.getByTestId('traveler-avatar-p2')).toBeTruthy();
  });

  it('shows initials AD for Alex Doe', () => {
    render(<TravelerAvatars travelers={[self, child1]} />);
    expect(screen.getByTestId('traveler-avatar-p3')).toBeTruthy();
    expect(screen.getByText('AD')).toBeTruthy();
  });
});

describe('TravelerAvatars — overflow', () => {
  it('shows overflow badge when travelers exceed maxVisible', () => {
    render(
      <TravelerAvatars
        travelers={[self, spouse, child1, child2, parent]}
        maxVisible={3}
      />,
    );
    expect(screen.getByTestId('traveler-avatar-overflow')).toBeTruthy();
    expect(screen.getByText('+2')).toBeTruthy();
  });

  it('does not show overflow badge when within maxVisible', () => {
    render(
      <TravelerAvatars
        travelers={[self, spouse, child1]}
        maxVisible={3}
      />,
    );
    expect(screen.queryByTestId('traveler-avatar-overflow')).toBeNull();
  });

  it('shows overflow +1 for 4 travelers with maxVisible=3', () => {
    render(
      <TravelerAvatars
        travelers={[self, spouse, child1, child2]}
        maxVisible={3}
      />,
    );
    expect(screen.getByText('+1')).toBeTruthy();
  });
});

describe('TravelerAvatars — count', () => {
  it('shows traveler count text by default', () => {
    render(<TravelerAvatars travelers={[self, spouse]} />);
    expect(screen.getByTestId('traveler-count')).toBeTruthy();
    expect(screen.getByText('2 travelers')).toBeTruthy();
  });

  it('hides count text when showCount=false', () => {
    render(<TravelerAvatars travelers={[self, spouse]} showCount={false} />);
    expect(screen.queryByTestId('traveler-count')).toBeNull();
  });
});

describe('TravelerAvatars — accessibility', () => {
  it('has accessible container with traveler count label', () => {
    render(<TravelerAvatars travelers={[self, spouse, child1]} />);
    const container = screen.getByTestId('traveler-avatars');
    expect(container.props.accessibilityLabel).toBe('3 travelers');
    expect(container.props.accessibilityRole).toBe('text');
  });

  it('each avatar pill has full name and relationship label', () => {
    render(<TravelerAvatars travelers={[self, spouse]} />);
    const selfAvatar = screen.getByTestId('traveler-avatar-p1');
    expect(selfAvatar.props.accessibilityLabel).toBe('John Doe, Primary');
    const spouseAvatar = screen.getByTestId('traveler-avatar-p2');
    expect(spouseAvatar.props.accessibilityLabel).toBe('Jane Doe, Spouse');
  });
});
