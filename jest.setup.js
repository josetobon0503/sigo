/* global jest */
// Global test setup.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Native time picker: a plain view that keeps its props, so tests can call onChange.
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  const React = require('react');
  const DateTimePicker = (props) => React.createElement(View, props);
  return { __esModule: true, default: DateTimePicker, DateTimePickerAndroid: { open: jest.fn() } };
});

// Icons load a font through expo-asset, which is not available in Jest.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { View } = require('react-native');
  const React = require('react');
  const Ionicons = (props) => React.createElement(View, { testID: `icon-${props.name}` });
  return { __esModule: true, default: Ionicons };
});
