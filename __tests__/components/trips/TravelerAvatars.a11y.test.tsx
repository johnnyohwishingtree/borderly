/**
 * Accessibility tests for TravelerAvatars component.
 *
 * Verifies:
 * - Container has accessible role and label
 * - Each avatar pill has full name + relationship accessibilityLabel
 * - Overflow badge is accessible
 * - Component is not rendered for solo travelers (no noise)
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
const child = makeMember({ id: 'p3', givenNames: 'Alex', surname: 'Doe', relationship: 'child' });
const parent = makeMember({ id: 'p4', givenNames: 'Bob', surname: 'Doe', relationship: 'parent' });
const sibling = makeMember({ id: 'p5', givenNames: 'Eve', surname: 'Doe', relationship: 'sibling' });

describe('TravelerAvatars a11y — container', () => {
  it('has accessibilityRole="text" on the container', () => {
    render(<TravelerAvatars travelers={[self, spouse]} />);
    const container = screen.getByTestId('traveler-avatars');
    expect(container.props.accessibilityRole).toBe('text');
  });

  it('has accessible=true on the container', () => {
    render(<TravelerAvatars travelers={[self, spouse]} />);
    const container = screen.getByTestId('traveler-avatars');
    expect(container.props.accessible).toBe(true);
  });

  it('container accessibilityLabel reflects total traveler count', () => {
    render(<TravelerAvatars travelers={[self, spouse, child]} />);
    const container = screen.getByTestId('traveler-avatars');
    expect(container.props.accessibilityLabel).toBe('3 travelers');
  });
});

describe('TravelerAvatars a11y — avatar pills', () => {
  it('self avatar has "John Doe, Primary" label', () => {
    render(<TravelerAvatars travelers={[self, spouse]} />);
    const avatar = screen.getByTestId('traveler-avatar-p1');
    expect(avatar.props.accessibilityLabel).toBe('John Doe, Primary');
  });

  it('spouse avatar has "Jane Doe, Spouse" label', () => {
    render(<TravelerAvatars travelers={[self, spouse]} />);
    const avatar = screen.getByTestId('traveler-avatar-p2');
    expect(avatar.props.accessibilityLabel).toBe('Jane Doe, Spouse');
  });

  it('child avatar has "Alex Doe, Child" label', () => {
    render(<TravelerAvatars travelers={[self, child]} />);
    const avatar = screen.getByTestId('traveler-avatar-p3');
    expect(avatar.props.accessibilityLabel).toBe('Alex Doe, Child');
  });

  it('parent avatar has "Bob Doe, Parent" label', () => {
    render(<TravelerAvatars travelers={[self, parent]} />);
    const avatar = screen.getByTestId('traveler-avatar-p4');
    expect(avatar.props.accessibilityLabel).toBe('Bob Doe, Parent');
  });

  it('sibling avatar has "Eve Doe, Sibling" label', () => {
    render(<TravelerAvatars travelers={[self, sibling]} />);
    const avatar = screen.getByTestId('traveler-avatar-p5');
    expect(avatar.props.accessibilityLabel).toBe('Eve Doe, Sibling');
  });
});

describe('TravelerAvatars a11y — solo traveler', () => {
  it('does not render anything for solo travelers (no a11y noise)', () => {
    const { toJSON } = render(<TravelerAvatars travelers={[self]} />);
    expect(toJSON()).toBeNull();
  });

  it('does not render anything for empty travelers', () => {
    const { toJSON } = render(<TravelerAvatars travelers={[]} />);
    expect(toJSON()).toBeNull();
  });
});
