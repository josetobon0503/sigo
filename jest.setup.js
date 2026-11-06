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

// Native modules used by the workout session.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));

// Video player: a plain view; the player records what the component asked for.
jest.mock('expo-video', () => {
  const { View } = require('react-native');
  const React = require('react');
  const mock = {
    lastPlayer: null,
    useVideoPlayer: (source, setup) => {
      const player = { source, loop: false, muted: false, play: jest.fn(), pause: jest.fn() };
      if (setup) setup(player);
      mock.lastPlayer = player;
      return player;
    },
    VideoView: (props) => React.createElement(View, { testID: props.testID }),
  };
  return mock;
});
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-screen-orientation', () => ({
  lockAsync: jest.fn(() => Promise.resolve()),
  unlockAsync: jest.fn(() => Promise.resolve()),
  OrientationLock: { PORTRAIT_UP: 'PORTRAIT_UP' },
}));
