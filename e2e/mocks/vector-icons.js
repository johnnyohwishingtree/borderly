// Mock for react-native-vector-icons
// Returns null to avoid dual-React createElement issues in webpack

const IconComponent = (_props) => null;

module.exports = IconComponent;
module.exports.default = IconComponent;
