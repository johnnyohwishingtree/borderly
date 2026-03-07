class MockModel {
  constructor() { this.id = 'mock-id'; }
}
MockModel.table = 'mock_table';

module.exports = {
  Database: function() {
    return {
      collections: { get: () => ({ query: () => ({ fetch: () => Promise.resolve([]) }) }) },
      write: (fn) => fn(),
    };
  },
  Model: MockModel,
  appSchema: () => ({}),
  tableSchema: () => ({}),
  field: () => () => {},
  date: () => () => {},
  readonly: () => () => {},
};
