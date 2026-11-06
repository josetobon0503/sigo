import { render, screen, userEvent } from '@testing-library/react-native';
import * as Speech from 'expo-speech';

import { MuscleMap } from '@/components/MuscleMap';
import { VideoBox } from '@/components/VideoBox';
import { exercises } from '@/data/exercises';
import { makeProfile } from '@/engine/__fixtures__/profiles';
import { setLanguage } from '@/i18n';
import { useProfileStore } from '@/store/profileStore';

const user = userEvent.setup();
const bridge = exercises.find((e) => e.id === 'glute-bridge')!;

beforeEach(async () => {
  await setLanguage('es');
  jest.clearAllMocks();
  useProfileStore.setState({ profile: makeProfile() });
});

describe('VideoBox', () => {
  it('plays the clip muted and in a loop on "How to do it" (the dev clip in development)', async () => {
    await render(<VideoBox exercise={bridge} lang="es" />);
    expect(screen.getByTestId('video', { includeHiddenElements: true })).toBeOnTheScreen();
    const player = (jest.requireMock('expo-video') as { lastPlayer: Record<string, unknown> })
      .lastPlayer;
    expect(player).toMatchObject({ loop: true, muted: true });
    expect(player.play).toHaveBeenCalled();
    expect(screen.queryByTestId('avoid-badge')).toBeNull();
    await user.press(screen.getByRole('tab', { name: 'Cómo NO hacerlo' }));
    expect(screen.getByTestId('video', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('Evita esto')).toBeOnTheScreen();
  });

  it('shows the written steps or mistakes when there is no clip', async () => {
    const g = global as unknown as { __DEV__: boolean };
    const dev = g.__DEV__;
    g.__DEV__ = false;
    try {
      await render(<VideoBox exercise={bridge} lang="es" />);
      expect(screen.queryByTestId('video', { includeHiddenElements: true })).toBeNull();
      expect(screen.getByText(`1. ${bridge.steps.es[0]}`)).toBeOnTheScreen();
      await user.press(screen.getByRole('tab', { name: 'Cómo NO hacerlo' }));
      expect(screen.getByText(`• ${bridge.mistakes.es[0]}`)).toBeOnTheScreen();
      expect(screen.getByText('Evita esto')).toBeOnTheScreen();
    } finally {
      g.__DEV__ = dev;
    }
  });

  it('"What it\'s for" reads the purpose aloud in the user\'s language and shows the muscles', async () => {
    await render(<VideoBox exercise={bridge} lang="en" />);
    await setLanguage('en');
    await user.press(screen.getByRole('tab', { name: "What it's for" }));
    expect(screen.queryByTestId('video', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByText(bridge.purpose.en)).toBeOnTheScreen();
    expect(screen.getByText('Works: glutes')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Listen' }));
    expect(Speech.speak).toHaveBeenCalledWith(
      bridge.purpose.en,
      expect.objectContaining({ language: 'en-US' }),
    );
    await user.press(screen.getByRole('button', { name: 'Stop' }));
    expect(Speech.stop).toHaveBeenCalled();
  });

  it('the small muscle map opens a bigger one', async () => {
    await render(<VideoBox exercise={bridge} lang="es" />);
    const small = screen.getByRole('button', {
      name: 'Músculos que trabaja: glúteos, isquiotibiales y espalda baja',
    });
    await user.press(small);
    expect(screen.getByRole('header', { name: 'Músculos que trabaja' })).toBeOnTheScreen();
    await user.press(screen.getByTestId('muscle-modal-close'));
  });
});

describe('MuscleMap', () => {
  it('says the muscles in words, primary first', async () => {
    await render(<MuscleMap primary={['abs']} secondary={['obliques']} height={100} testID="m" />);
    expect(screen.getByTestId('m')).toHaveProp(
      'accessibilityLabel',
      'Músculos que trabaja: abdomen y oblicuos',
    );
  });
});
