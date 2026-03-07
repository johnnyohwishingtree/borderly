const React = require('react');

// Mock for react-native-vector-icons
// Returns a simple span with the icon name as data attribute

const createIconSet = (iconMap, fontFamily) => {
  return (props) => {
    const { name, size = 24, color = '#000', style, ...rest } = props;
    return React.createElement('span', {
      'data-icon': name,
      'data-family': fontFamily,
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
};

// Export common icon sets
const MaterialIcons = createIconSet({}, 'MaterialIcons');
const Ionicons = createIconSet({}, 'Ionicons');
const Feather = createIconSet({}, 'Feather');
const FontAwesome = createIconSet({}, 'FontAwesome');
const Entypo = createIconSet({}, 'Entypo');

// Default export for the main module
module.exports = {
  default: MaterialIcons,
  MaterialIcons,
  Ionicons,
  Feather,
  FontAwesome,
  Entypo,
  createIconSet,
};

// Also support individual imports
module.exports.MaterialIcons = MaterialIcons;
module.exports.Ionicons = Ionicons;
module.exports.Feather = Feather;
module.exports.FontAwesome = FontAwesome;
module.exports.Entypo = Entypo;