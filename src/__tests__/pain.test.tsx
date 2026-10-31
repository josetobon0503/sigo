// Screen tests for the Pain tab and the area editor.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, screen, userEvent, within } from '@testing-library/react-native';
import { Alert } from 'react-native';

import PainScreen from '../../app/(tabs)/pain';
import PainAreaScreen from '../../app/pain-area';
import { makeProfile, pain } from '@/engine/__fixtures__/profiles';
import { setLanguage } from '@/i18n';
import { useDevStore } from '@/store/devStore';
import { useProfileStore } from '@/store/profileStore';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

const painAreas = () => useProfileStore.getState().profile!.painAreas;

let user: ReturnType<typeof userEvent.setup>;

beforeAll(async () => {
  await setLanguage('es');
});

beforeEach(async () => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 28, 10, 0, 0));
  user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  mockParams = {};
  await AsyncStorage.clear();
  useDevStore.setState({ dayOffset: 0 });
  useProfileStore.setState({
    profile: makeProfile({ painAreas: [pain('knee', 3, 'achy', 'left'), pain('lower_back', 2)] }),
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Pain tab', () => {
  it('lists my areas with side, intensity and kind, and marks them on the map', async () => {
    await render(<PainScreen />);
    expect(screen.getByTestId('pain-card-knee')).toHaveTextContent(
      /Rodilla: Izquierdo.*Algo · Molestia/,
    );
    expect(screen.getByTestId('pain-card-lower_back')).toHaveTextContent(/Espalda baja.*Leve/);
    expect(screen.getByRole('checkbox', { name: 'Rodilla, lado izquierdo' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Rodilla, lado derecho' })).not.toBeChecked();
  });

  it('says so when there are no areas', async () => {
    useProfileStore.setState({ profile: makeProfile({ painAreas: [] }) });
    await render(<PainScreen />);
    expect(screen.getByTestId('pain-empty')).toBeOnTheScreen();
  });

  it('a tap on the map opens the editor for that zone', async () => {
    await render(<PainScreen />);
    await user.press(screen.getByRole('checkbox', { name: 'Hombro, lado derecho' }));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/pain-area',
      params: { area: 'shoulder', side: 'right' },
    });
  });

  it('"Edit" and "Add an area" open the editor', async () => {
    await render(<PainScreen />);
    await user.press(screen.getByRole('button', { name: 'Editar Rodilla' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith({
      pathname: '/pain-area',
      params: { area: 'knee' },
    });
    await user.press(screen.getByRole('button', { name: 'Agregar zona' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/pain-area', params: {} });
  });

  it('asks before removing an area', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await render(<PainScreen />);
    await user.press(screen.getByRole('button', { name: 'Quitar Rodilla' }));
    expect(alert).toHaveBeenCalledWith('¿Quitar Rodilla?', expect.any(String), expect.any(Array));
    const buttons = alert.mock.calls[0][2]!;
    await act(async () => {
      buttons.find((b) => b.style === 'destructive')!.onPress!();
    });
    expect(painAreas().map((p) => p.area)).toEqual(['lower_back']);
    expect(screen.queryByTestId('pain-card-knee')).toBeNull();
  });
});

describe('area editor', () => {
  it('adds a new area', async () => {
    await render(<PainAreaScreen />);
    expect(screen.getByText('Agregar zona')).toBeOnTheScreen();
    // Areas already in the list are not offered again.
    expect(screen.queryByTestId('pain-area-knee')).toBeNull();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();

    await user.press(screen.getByRole('button', { name: 'Hombro' }));
    await user.press(screen.getByRole('button', { name: 'Derecho' }));
    await user.press(
      within(screen.getByTestId('pain-intensity')).getByRole('radio', { name: 'Leve, 2 de 5' }),
    );
    await user.press(screen.getByRole('button', { name: 'Rígido' }));
    await user.press(screen.getByRole('button', { name: 'Guardar' }));

    expect(painAreas()[2]).toEqual({
      area: 'shoulder',
      side: 'right',
      intensity: 2,
      kind: 'stiff',
      updatedAt: '2026-10-28',
    });
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('starts on the side tapped on the map', async () => {
    mockParams = { area: 'shoulder', side: 'left' };
    await render(<PainAreaScreen />);
    expect(screen.getByRole('button', { name: 'Izquierdo' })).toBeSelected();
  });

  it('edits an existing area with its current values', async () => {
    mockParams = { area: 'knee' };
    await render(<PainAreaScreen />);
    expect(screen.getByText('Rodilla')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Izquierdo' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Algo, 3 de 5' })).toBeChecked();

    await user.press(screen.getByRole('radio', { name: 'Leve, 2 de 5' }));
    await user.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(painAreas()[0]).toMatchObject({ area: 'knee', side: 'left', intensity: 2 });
    expect(painAreas()).toHaveLength(2);
  });

  it('suggests seeing a doctor for sharp or very strong pain', async () => {
    mockParams = { area: 'knee' };
    await render(<PainAreaScreen />);
    expect(screen.queryByTestId('pain-notice')).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Punzante' }));
    expect(screen.getByTestId('pain-notice')).toBeOnTheScreen();
  });

  it('"Remove" asks first, then removes the area and closes', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    mockParams = { area: 'knee' };
    await render(<PainAreaScreen />);
    await user.press(screen.getByRole('button', { name: 'Quitar Rodilla' }));
    expect(alert).toHaveBeenCalledWith('¿Quitar Rodilla?', expect.any(String), expect.any(Array));
    expect(painAreas()).toHaveLength(2); // nothing changes before the answer
    const buttons = alert.mock.calls[0][2]!;
    await act(async () => {
      buttons.find((b) => b.style === 'destructive')!.onPress!();
    });
    expect(painAreas().map((p) => p.area)).toEqual(['lower_back']);
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('a new area has no "Remove"', async () => {
    await render(<PainAreaScreen />);
    expect(screen.queryByRole('button', { name: /^Quitar/ })).toBeNull();
  });

  it('saving "None" removes the area', async () => {
    mockParams = { area: 'knee' };
    await render(<PainAreaScreen />);
    await user.press(screen.getByRole('radio', { name: 'Nada, 1 de 5' }));
    await user.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(painAreas().map((p) => p.area)).toEqual(['lower_back']);
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('unpaired areas have no side', async () => {
    mockParams = { area: 'lower_back' };
    await render(<PainAreaScreen />);
    expect(screen.queryByRole('button', { name: 'Izquierdo' })).toBeNull();
  });
});
