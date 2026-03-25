export {
  intelligentAutoFill,
  calculateAutoFillMetrics,
  batchAutoFill,
  type AutoFillResult,
  type AutoFillOptions,
} from './autoFillLogic';

export {
  isValidFieldValue,
  predictPurposeOfVisit,
  getCommonStayDuration,
  convertNationalityToDisplayName,
  formatAddressForCountry,
  getSmartDeclarationDefault,
  getCurrencyThreshold,
  extractAirlineFromFlight,
  expandAirlineName,
  getSmartSelectDefault,
} from './autoFillHelpers';
