module.exports = {
  getString: () => Promise.resolve(''),
  setString: () => {},
  hasString: () => Promise.resolve(false),
  default: {
    getString: () => Promise.resolve(''),
    setString: () => {},
    hasString: () => Promise.resolve(false),
  },
};
