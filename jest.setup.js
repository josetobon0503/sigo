/* global jest */
// Global test setup.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Icons load a font through expo-asset, which is not available in Jest.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { View } = require('react-native');
  const React = require('react');
  const Ionicons = (props) => React.createElement(View, { testID: `icon-${props.name}` });
  return { __esModule: true, default: Ionicons };
});
