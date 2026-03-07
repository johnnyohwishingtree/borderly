const React = require('react');

// Return a placeholder for any icon component
const handler = {
  get: (_target, name) => {
    if (name === '__esModule') return true;
    if (name === 'default') return new Proxy({}, handler);
    // Return a simple component that renders nothing
    return (props) => React.createElement('span', { 'data-icon': name }, null);
  },
};

module.exports = new Proxy({}, handler);
