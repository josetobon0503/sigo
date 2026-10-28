// Screen tests for the first-run flow and the Profile tab.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent, within } from '@testing-library/react-native';

import ProfileScreen from '../../app/(tabs)/profile';
import AboutScreen from '../../app/onboarding/about';
import EquipmentScreen from '../../app/onboarding/equipment';
import PainStrengthScreen from '../../app/onboarding/pain-strength';
import PainWhereScreen from '../../app/onboarding/pain-where';
import ReadyScreen from '../../app/onboarding/ready';
import ScreeningScreen from '../../app/onboarding/screening';
import { SCREENING_QUESTIONS } from '@/data/screening';
import { levelsAt, makeProfile } from '@/engine/__fixtures__/profiles';
import { setLanguage } from '@/i18n';
import { useOnboardingStore } from '@/store/onboardingStore';
import type { PainSelection } from '@/store/painSelection';
import { useProfileStore } from '@/store/profileStore';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

const draft = () => useOnboardingStore.getState().draft;
const update = (patch: Parameters<ReturnType<typeof useOnboardingStore.getState>['update']>[0]) =>
  useOnboardingStore.getState().update(patch);

beforeAll(async () => {
  await setLanguage('es');
});

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useOnboardingStore.getState().reset();
  update({ language: 'es' });
  useProfileStore.setState({ profile: null });
});

describe('screening step', () => {
  it('shows the seven questions in Spanish and waits for every answer', async () => {
    const user = userEvent.setup();
    await render(<ScreeningScreen />);
    expect(
      screen.getByText('1. ¿Algún médico te ha dicho que tienes un problema del corazón?'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('7. ¿Algún médico te ha dicho que limites tu actividad física?'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();

    for (const id of SCREENING_QUESTIONS) await user.press(screen.getByTestId(`${id}-no`));
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled();
    expect(screen.queryByTestId('doctor-notice')).toBeNull();
  });

  it('a "yes" shows the doctor notice without blocking', async () => {
    const user = userEvent.setup();
    await render(<ScreeningScreen />);
    for (const id of SCREENING_QUESTIONS) await user.press(screen.getByTestId(`${id}-no`));
    await user.press(screen.getByTestId('fallLastYear-yes'));

    expect(screen.getByText('Habla con tu doctor antes de empezar')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Continuar' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/about');
  });
});

describe('pain strength step', () => {
  const pain = (overrides: Partial<PainSelection>): PainSelection => ({
    area: 'knee',
    side: 'left',
    intensity: 3,
    kind: 'achy',
    ...overrides,
  });

  it('shows the doctor notice for very strong pain (5), without blocking', async () => {
    update({ painAreas: [pain({ intensity: 5 })] });
    await render(<PainStrengthScreen />);
    expect(screen.getByTestId('pain-notice')).toBeOnTheScreen();
    expect(screen.getByText('Habla con tu doctor antes de empezar')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled();
  });

  it('shows the doctor notice when the pain is sharp', async () => {
    const user = userEvent.setup();
    update({ painAreas: [pain({ intensity: 2 })] });
    await render(<PainStrengthScreen />);
    expect(screen.queryByTestId('pain-notice')).toBeNull();
    await user.press(screen.getByTestId('kind-knee-sharp'));
    expect(screen.getByTestId('pain-notice')).toBeOnTheScreen();
  });

  it('no notice for strong (4) achy pain', async () => {
    update({ painAreas: [pain({ intensity: 4 })] });
    await render(<PainStrengthScreen />);
    expect(screen.queryByTestId('pain-notice')).toBeNull();
  });

  it('waits until every area has an intensity', async () => {
    const user = userEvent.setup();
    update({ painAreas: [pain({ intensity: null })] });
    await render(<PainStrengthScreen />);
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    await user.press(
      within(screen.getByTestId('faces-knee')).getByRole('radio', { name: 'Algo, 3 de 5' }),
    );
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled();
  });
});

describe('equipment step', () => {
  it('starts with chair and towel checked, and they can be unchecked', async () => {
    const user = userEvent.setup();
    await render(<EquipmentScreen />);
    expect(screen.getByRole('button', { name: 'Silla firme' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Toalla' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Pared libre' })).not.toBeSelected();

    await user.press(screen.getByRole('button', { name: 'Toalla' }));
    expect(screen.getByRole('button', { name: 'Toalla' })).not.toBeSelected();
    expect(draft().equipment).toEqual(['chair']);
  });
});

describe('about step', () => {
  it('offers "Under 50" as the first age band', async () => {
    await render(<AboutScreen />);
    const ages = ['Menos de 50', '50 a 59 años', '60 a 69 años', '70 a 79 años', '80 años o más'];
    const labels = screen
      .getAllByRole('button')
      .map((b) => b.props.accessibilityLabel)
      .filter((l: string) => ages.includes(l));
    expect(labels).toEqual(ages);
  });
});

describe("Maria's first run", () => {
  it('saves her profile with all levels at 1', async () => {
    const user = userEvent.setup();
    for (const id of SCREENING_QUESTIONS)
      update({ screeningAnswers: { ...draft().screeningAnswers, [id]: false } });

    const about = await render(<AboutScreen />);
    await user.type(screen.getByTestId('name-input'), 'María');
    await user.press(screen.getByRole('button', { name: '50 a 59 años' }));
    await user.press(screen.getByRole('button', { name: 'Continuar' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/onboarding/pain-where');
    await about.unmount();

    const where = await render(<PainWhereScreen />);
    await user.press(screen.getByRole('checkbox', { name: 'Rodilla, lado izquierdo' }));
    await user.press(screen.getByTestId('area-lower_back'));
    await user.press(screen.getByRole('button', { name: 'Continuar' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/onboarding/pain-strength');
    await where.unmount();

    const strength = await render(<PainStrengthScreen />);
    await user.press(
      within(screen.getByTestId('faces-knee')).getByRole('radio', { name: 'Algo, 3 de 5' }),
    );
    await user.press(
      within(screen.getByTestId('faces-lower_back')).getByRole('radio', { name: 'Leve, 2 de 5' }),
    );
    await user.press(screen.getByRole('button', { name: 'Continuar' }));
    await strength.unmount();

    await render(<ReadyScreen />);
    expect(screen.getByText('¡Todo listo, María!')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Ir a mi rutina' }));

    const profile = useProfileStore.getState().profile;
    expect(profile).toMatchObject({
      name: 'María',
      ageBand: '50-59',
      language: 'es',
      equipment: ['chair', 'towel'],
      levels: levelsAt(1),
      seatedOnly: false,
      screening: { anyYes: false },
      painAreas: [
        { area: 'knee', side: 'left', intensity: 3, kind: 'achy' },
        { area: 'lower_back', side: 'both', intensity: 2, kind: 'achy' },
      ],
    });
    expect(draft().name).toBe('');
    const saved = JSON.parse((await AsyncStorage.getItem('sigo-profile')) ?? '{}');
    expect(saved.state.profile.name).toBe('María');
  });

  it('nothing hurts skips the strength step', async () => {
    const user = userEvent.setup();
    await render(<PainWhereScreen />);
    expect(screen.getByTestId('no-pain')).toBeSelected();
    await user.press(screen.getByRole('button', { name: 'Continuar' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/equipment');
  });
});

describe('profile screen', () => {
  beforeEach(() => {
    useProfileStore.setState({ profile: makeProfile({ name: 'Roberto', language: 'es' }) });
  });

  it('edits the seated-only switch', async () => {
    const user = userEvent.setup();
    await render(<ProfileScreen />);
    await user.press(screen.getByRole('switch', { name: 'Solo ejercicios sentados' }));
    expect(useProfileStore.getState().profile?.seatedOnly).toBe(true);
  });

  it('can change the age band to "Under 50"', async () => {
    const user = userEvent.setup();
    await render(<ProfileScreen />);
    await user.press(screen.getByRole('button', { name: 'Menos de 50' }));
    expect(useProfileStore.getState().profile?.ageBand).toBe('under-50');
  });

  it('opens the safety tips', async () => {
    const user = userEvent.setup();
    await render(<ProfileScreen />);
    await user.press(screen.getByRole('button', { name: 'Consejos de seguridad' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/safety-tips');
  });

  it('shows "Reset onboarding" in development and it clears the profile', async () => {
    const user = userEvent.setup();
    await render(<ProfileScreen />);
    await user.press(screen.getByTestId('reset-onboarding'));
    expect(useProfileStore.getState().profile).toBeNull();
  });

  it('hides "Reset onboarding" outside development', async () => {
    const dev = (globalThis as unknown as { __DEV__: boolean }).__DEV__;
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;
    try {
      await render(<ProfileScreen />);
      expect(screen.queryByTestId('reset-onboarding')).toBeNull();
    } finally {
      (globalThis as unknown as { __DEV__: boolean }).__DEV__ = dev;
    }
  });
});
