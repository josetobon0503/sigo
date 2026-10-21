import { render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { sizes } from '@/theme/tokens';

import { Chip } from '../Chip';

describe('Chip', () => {
  it('reports its selected state to accessibility', async () => {
    await render(<Chip label="Knee" selected onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Knee' })).toBeSelected();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<Chip label="Hip" onPress={onPress} />);

    await user.press(screen.getByRole('button', { name: 'Hip' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('meets the 44 pt minimum tap target', async () => {
    await render(<Chip label="Wrist" onPress={jest.fn()} testID="chip" />);

    const style = StyleSheet.flatten(screen.getByTestId('chip').props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(sizes.minTapTarget);
    expect(style.minWidth).toBeGreaterThanOrEqual(sizes.minTapTarget);
  });
});
