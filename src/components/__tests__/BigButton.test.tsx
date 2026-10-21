import { render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { sizes } from '@/theme/tokens';

import { BigButton } from '../BigButton';

describe('BigButton', () => {
  it('renders the label and calls onPress', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<BigButton label="Start" onPress={onPress} />);

    await user.press(screen.getByRole('button', { name: 'Start' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses a custom accessibility label when given', async () => {
    await render(<BigButton label="Go" accessibilityLabel="Start workout" onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Start workout' })).toBeTruthy();
  });

  it('is at least 56 pt tall for primary and secondary', async () => {
    await render(
      <>
        <BigButton label="Primary" onPress={jest.fn()} testID="primary" />
        <BigButton label="Secondary" variant="secondary" onPress={jest.fn()} testID="secondary" />
      </>,
    );

    for (const id of ['primary', 'secondary']) {
      const style = StyleSheet.flatten(screen.getByTestId(id).props.style);
      expect(style.minHeight).toBeGreaterThanOrEqual(sizes.primaryButton);
    }
  });

  it('is at least 64 pt tall for the alert variant', async () => {
    await render(<BigButton label="It hurts" variant="alert" onPress={jest.fn()} testID="alert" />);

    const style = StyleSheet.flatten(screen.getByTestId('alert').props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(sizes.hurtButton);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<BigButton label="Start" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Start' });
    await user.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });
});
