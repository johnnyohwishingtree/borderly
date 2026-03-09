// Mock for lucide-react-native icons
// Returns null-rendering components to avoid dual-React createElement issues in webpack

function createIcon(name) {
  const Icon = function(_props) {
    return null;
  };
  Icon.displayName = name;
  return Icon;
}

module.exports = {
  Globe: createIcon('Globe'),
  Plane: createIcon('Plane'),
  Lock: createIcon('Lock'),
  Smartphone: createIcon('Smartphone'),
  Zap: createIcon('Zap'),
  ShieldCheck: createIcon('ShieldCheck'),
  HelpCircle: createIcon('HelpCircle'),
  ChevronRight: createIcon('ChevronRight'),
  ArrowRight: createIcon('ArrowRight'),
  Check: createIcon('Check'),
  X: createIcon('X'),
  Plus: createIcon('Plus'),
  Minus: createIcon('Minus'),
  Search: createIcon('Search'),
  Settings: createIcon('Settings'),
  LucideIcon: createIcon('LucideIcon'),
};
