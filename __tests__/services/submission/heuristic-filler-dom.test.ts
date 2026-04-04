/**
 * @jest-environment jsdom
 *
 * Test the heuristic fill script against a mock of Visit Japan Web's DOM.
 * Uses the jsdom test environment to simulate actual form elements.
 */
// @ts-nocheck — DOM types not in tsconfig (test-only file)

import { buildFillData, buildHeuristicFillScript } from '../../../src/services/submission/heuristicFiller';
import type { TravelerProfile } from '../../../src/types/profile';

jest.mock('../../../src/constants/countries', () => ({
  getCountryName: (code: string) => {
    const map: Record<string, string> = { USA: 'United States', AFG: 'Afghanistan' };
    return map[code] || code;
  },
}));

const testProfile: TravelerProfile = {
  id: 'test-1',
  passportNumber: 'N55512345',
  surname: 'SMITH',
  givenNames: 'EMMA',
  nationality: 'USA',
  dateOfBirth: '2010-08-03',
  gender: 'F',
  passportExpiry: '2030-05-20',
  issuingCountry: 'USA',
  email: '',
  phoneNumber: '',
  occupation: 'Company employee',
  relationship: 'self',
  defaultDeclarations: {
    hasItemsToDeclare: false, carryingCurrency: false, carryingProhibitedItems: false,
    visitedFarm: false, hasCriminalRecord: false, carryingCommercialGoods: false,
  },
  homeAddress: { country: 'AFG', city: 'Aberdeen', line1: '123 Main St', postalCode: '12345' },
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const JAPAN_FORM_HTML = `
  <div>
    <label for="textbox04">Passport number Required</label>
    <input id="textbox04" name="" type="text" value="">
  </div>
  <div>
    <label for="textbox01">Surname Required</label>
    <input id="textbox01" name="" type="text" value="">
  </div>
  <div>
    <label for="textbox02">Given name Required</label>
    <input id="textbox02" name="" type="text" value="">
  </div>
  <div>
    <label for="dropdown01">Nationality or citizenship Required</label>
    <select id="dropdown01" name="dropdown">
      <option value="">-</option>
      <option value="USA">United States</option>
      <option value="JPN">Japan</option>
    </select>
  </div>
  <div>
    <span>Date of birth Required</span>
    <div>
      <label for="dob_year">Year</label>
      <select id="dob_year" name="dropdown">
        <option value="">-</option>
        <option value="2010">2010</option>
        <option value="2011">2011</option>
      </select>
    </div>
    <div>
      <label for="dob_month">Month</label>
      <select id="dob_month" name="dropdown">
        <option value="">-</option>
        <option value="8">8</option>
        <option value="9">9</option>
      </select>
    </div>
    <div>
      <label for="dob_day">Day</label>
      <select id="dob_day" name="dropdown">
        <option value="">-</option>
        <option value="3">3</option>
        <option value="4">4</option>
      </select>
    </div>
  </div>
  <div>
    <span>Date of expiry Required</span>
    <div>
      <label for="exp_year">Year</label>
      <select id="exp_year" name="dropdown">
        <option value="">-</option>
        <option value="2030">2030</option>
        <option value="2031">2031</option>
      </select>
    </div>
    <div>
      <label for="exp_month">Month</label>
      <select id="exp_month" name="dropdown">
        <option value="">-</option>
        <option value="5">5</option>
        <option value="6">6</option>
      </select>
    </div>
    <div>
      <label for="exp_day">Day</label>
      <select id="exp_day" name="dropdown">
        <option value="">-</option>
        <option value="20">20</option>
        <option value="21">21</option>
      </select>
    </div>
  </div>
  <div>
    <label for="dropdown02">Occupation</label>
    <select id="dropdown02" name="dropdown">
      <option value="">-</option>
      <option value="1">Company employee</option>
      <option value="2">Student</option>
    </select>
  </div>
  <div>
    <label for="textbox03">Home address:Country name</label>
    <input id="textbox03" name="" type="text" placeholder="E.g.: USA" value="">
  </div>
  <div>
    <label for="textbox05">Home address:City name</label>
    <input id="textbox05" name="" type="text" value="">
  </div>
`;

describe('heuristic fill script against Japan DOM', () => {
  let messages: any[];

  beforeAll(() => {
    document.body.innerHTML = JAPAN_FORM_HTML;

    messages = [];
    (window as any).ReactNativeWebView = {
      postMessage: (msg: string) => messages.push(JSON.parse(msg)),
    };

    // Mock offsetParent — jsdom doesn't compute layout so it's always null
    // The fill script skips elements with offsetParent===null
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      get() { return document.body; },
      configurable: true,
    });

    const data = buildFillData(testProfile);
    const script = buildHeuristicFillScript(data);

    // Execute the fill script in jsdom
    eval(script);
  });

  test('fills passport number', () => {
    expect((document.getElementById('textbox04') as HTMLInputElement).value).toBe('N55512345');
  });

  test('fills surname', () => {
    expect((document.getElementById('textbox01') as HTMLInputElement).value).toBe('SMITH');
  });

  test('fills given name', () => {
    expect((document.getElementById('textbox02') as HTMLInputElement).value).toBe('EMMA');
  });

  test('fills nationality select', () => {
    expect((document.getElementById('dropdown01') as HTMLSelectElement).value).toBe('USA');
  });

  test('fills birth year', () => {
    expect((document.getElementById('dob_year') as HTMLSelectElement).value).toBe('2010');
  });

  test('fills birth month', () => {
    expect((document.getElementById('dob_month') as HTMLSelectElement).value).toBe('8');
  });

  test('fills birth day', () => {
    expect((document.getElementById('dob_day') as HTMLSelectElement).value).toBe('3');
  });

  test('fills expiry year', () => {
    expect((document.getElementById('exp_year') as HTMLSelectElement).value).toBe('2030');
  });

  test('fills expiry month', () => {
    expect((document.getElementById('exp_month') as HTMLSelectElement).value).toBe('5');
  });

  test('fills expiry day', () => {
    expect((document.getElementById('exp_day') as HTMLSelectElement).value).toBe('20');
  });

  test('fills occupation select', () => {
    const val = (document.getElementById('dropdown02') as HTMLSelectElement).value;
    expect(val).toBeTruthy();
    expect(val).not.toBe('');
  });

  test('fills home address country', () => {
    const val = (document.getElementById('textbox03') as HTMLInputElement).value;
    expect(val).toBeTruthy();
  });

  test('fills home address city', () => {
    const val = (document.getElementById('textbox05') as HTMLInputElement).value;
    expect(val).toBeTruthy();
  });

  test('postMessage reports results with details', () => {
    expect(messages.length).toBeGreaterThan(0);
    const result = messages[0];
    expect(result.type).toBe('AUTO_FILL_RESULT');
    // Log the actual results for debugging
    console.log('AUTO_FILL_RESULT:', JSON.stringify(result, null, 2));
    expect(result.filled).toBeGreaterThan(0);
  });
});
