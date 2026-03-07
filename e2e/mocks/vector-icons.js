const React = require('react');

// Mock for react-native-vector-icons
// Each alias (MaterialIcons, Ionicons, etc.) points to this file.
// Since `import X from 'react-native-vector-icons/X'` expects a default export,
// we export a single component function as module.exports directly.

const IconComponent = (props) => {
  const { name, size = 24, color = '#000', style, ...rest } = props;
  return React.createElement('span', {
    'data-icon': name,
    style: {
      fontSize: size,
      color: color,
      display: 'inline-block',
      verticalAlign: 'middle',
      ...style,
    },
    ...rest,
  }, name);
};

module.exports = IconComponent;
module.exports.default = IconComponent;
