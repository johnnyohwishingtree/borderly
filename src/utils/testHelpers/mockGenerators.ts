/**
 * Mock Generators - Creates mock data for testing
 */

export class MockGenerators {
  /**
   * Generates random passport data for testing
   */
  static generateMockPassportData(): {
    surname: string;
    givenName: string;
    documentNumber: string;
    nationality: string;
    dateOfBirth: string;
    gender: string;
    expiryDate: string;
  } {
    const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    const givenNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Jessica'];
    const genders = ['M', 'F'];

    return {
      surname: surnames[Math.floor(Math.random() * surnames.length)],
      givenName: givenNames[Math.floor(Math.random() * givenNames.length)],
      documentNumber: 'A' + Math.floor(Math.random() * 9999999).toString().padStart(7, '0'),
      nationality: 'USA',
      dateOfBirth: '1990-01-15',
      gender: genders[Math.floor(Math.random() * genders.length)],
      expiryDate: '2030-12-31'
    };
  }

  /**
   * Generates random travel details for testing
   */
  static generateMockTravelData(): {
    arrivalDate: string;
    departureDate: string;
    flightNumber: string;
    accommodation: string;
    purposeOfVisit: string;
  } {
    const airlines = ['NH', 'JL', 'UA', 'DL', 'AA'];
    const purposes = ['Tourism', 'Business', 'Transit', 'Visiting Friends'];

    const arrivalDate = new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000);
    const departureDate = new Date(arrivalDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);

    return {
      arrivalDate: arrivalDate.toISOString().split('T')[0],
      departureDate: departureDate.toISOString().split('T')[0],
      flightNumber: airlines[Math.floor(Math.random() * airlines.length)] + Math.floor(Math.random() * 9999),
      accommodation: 'Test Hotel ' + Math.floor(Math.random() * 100),
      purposeOfVisit: purposes[Math.floor(Math.random() * purposes.length)]
    };
  }

  /**
   * Generates mock submission errors for testing
   */
  static generateMockErrors(count: number = 3): Array<{
    field: string;
    type: string;
    message: string;
  }> {
    const errorTypes = [
      { field: 'surname', type: 'required', message: 'Surname is required' },
      { field: 'passportNumber', type: 'format', message: 'Invalid passport number format' },
      { field: 'arrivalDate', type: 'validation', message: 'Arrival date must be in the future' },
      { field: 'email', type: 'format', message: 'Invalid email address' },
      { field: 'phone', type: 'format', message: 'Invalid phone number format' }
    ];

    return errorTypes
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
  }
}
