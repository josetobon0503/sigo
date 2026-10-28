import { fireEvent, render, screen, userEvent, within } from '@testing-library/react-native';
import type { TFunction } from 'i18next';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, StyleSheet } from 'react-native';

import i18n, { setLanguage } from '@/i18n';
import { sizes } from '@/theme/tokens';

import { BodyMap } from '../BodyMap';
import { FacesScale } from '../FacesScale';
import { ONBOARDING_TOTAL_STEPS, OnboardingStep } from '../OnboardingStep';
import { ReminderEditor, formatTime } from '../ReminderEditor';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));

beforeAll(async () => {
  await setLanguage('es');
});

describe('FacesScale', () => {
  it('shows five faces with text labels', async () => {
    await render(<FacesScale value={null} onChange={jest.fn()} accessibilityLabel="Rodilla" />);
    for (const label of ['Nada', 'Leve', 'Algo', 'Fuerte', 'Muy fuerte']) {
      expect(screen.getByText(label)).toBeOnTheScreen();
    }
    expect(screen.getByRole('radio', { name: 'Muy fuerte, 5 de 5' })).toBeOnTheScreen();
  });

  it('uses the English labels too', async () => {
    await setLanguage('en');
    await render(<FacesScale value={4} onChange={jest.fn()} accessibilityLabel="Knee" />);
    expect(screen.getByText('Very strong')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Strong, 4 of 5' })).toBeChecked();
    await setLanguage('es');
  });

  it('reports the chosen value', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<FacesScale value={null} onChange={onChange} accessibilityLabel="Rodilla" />);
    await user.press(screen.getByRole('radio', { name: 'Algo, 3 de 5' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });
});

describe('OnboardingStep', () => {
  it('announces the progress and hides Back on the first step', async () => {
    await render(<OnboardingStep step={1} title="Hola" onNext={jest.fn()} />);
    expect(screen.getByLabelText(`Paso 1 de ${ONBOARDING_TOTAL_STEPS}`)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Atrás' })).toBeNull();
  });

  it('shows big Continue and Back buttons', async () => {
    const onBack = jest.fn();
    const user = userEvent.setup();
    await render(<OnboardingStep step={3} title="Hola" onNext={jest.fn()} onBack={onBack} />);
    const back = screen.getByRole('button', { name: 'Atrás' });
    expect(StyleSheet.flatten(back.props.style).minHeight).toBeGreaterThanOrEqual(
      sizes.primaryButton,
    );
    await user.press(back);
    expect(onBack).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeOnTheScreen();
  });

  it('disables Continue when asked', async () => {
    await render(<OnboardingStep step={2} title="Hola" onNext={jest.fn()} nextDisabled />);
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });
});

describe('BodyMap', () => {
  it('labels zones with their side and marks them selected', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<BodyMap value={[]} onChange={onChange} />);
    await user.press(screen.getByRole('checkbox', { name: 'Rodilla, lado izquierdo' }));
    expect(onChange).toHaveBeenCalledWith([
      { area: 'knee', side: 'left', intensity: null, kind: 'achy' },
    ]);
  });

  it('every zone is at least 44 pt', async () => {
    await render(<BodyMap value={[]} onChange={jest.fn()} />);
    for (const zone of screen.getAllByRole('checkbox')) {
      const style = StyleSheet.flatten(zone.props.style);
      expect(style.width).toBeGreaterThanOrEqual(sizes.minTapTarget);
      expect(style.height).toBeGreaterThanOrEqual(sizes.minTapTarget);
    }
  });
});

describe('ReminderEditor', () => {
  const t = i18n.t.bind(i18n) as TFunction;
  const value = { enabled: true, hour: 9, minute: 0, days: [1] };
  const editor = (onChange = jest.fn(), v = value) => (
    <ReminderEditor
      value={v}
      onChange={onChange}
      enableLabel="Recordatorio"
      timeLabel="Hora"
      daysLabel="Días"
    />
  );

  it('formats the time in 12 or 24 hours', () => {
    expect(formatTime(9, 0, t, false)).toBe('9:00 a. m.');
    expect(formatTime(0, 15, t, false)).toBe('12:15 a. m.');
    expect(formatTime(18, 45, t, false)).toBe('6:45 p. m.');
    expect(formatTime(9, 5, t, true)).toBe('09:05');
    expect(formatTime(18, 45, t, true)).toBe('18:45');
  });

  it('on iOS shows the native wheel in 5-minute steps, with the time written above', async () => {
    await render(editor());
    const picker = screen.getByTestId('time-picker');
    expect(picker.props.mode).toBe('time');
    expect(picker.props.display).toBe('spinner');
    expect(picker.props.minuteInterval).toBe(5);
    expect(picker.props.accessibilityLabel).toBe('Hora');
    expect(screen.getByTestId('reminder-time')).toHaveTextContent(/^(9:00 a\. m\.|09:00)$/);
  });

  it('saves the time picked on the wheel', async () => {
    const onChange = jest.fn();
    await render(editor(onChange));
    fireEvent(
      screen.getByTestId('time-picker'),
      'onChange',
      { type: 'set' },
      new Date(2000, 0, 1, 18, 35),
    );
    expect(onChange).toHaveBeenCalledWith({ ...value, hour: 18, minute: 35 });
  });

  it('ignores a dismissed picker', async () => {
    const onChange = jest.fn();
    await render(editor(onChange));
    fireEvent(screen.getByTestId('time-picker'), 'onChange', { type: 'dismissed' }, undefined);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('on Android opens the native time dialog from a big button', async () => {
    const user = userEvent.setup();
    jest.replaceProperty(Platform, 'OS', 'android');
    try {
      await render(editor());
      expect(screen.queryByTestId('time-picker')).toBeNull();
      await user.press(screen.getByRole('button', { name: 'Cambiar la hora' }));
      expect(DateTimePickerAndroid.open).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'time', is24Hour: expect.any(Boolean) }),
      );
    } finally {
      jest.restoreAllMocks();
    }
  });

  it('toggles days and the reminder switch', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(editor(onChange));
    await user.press(screen.getByRole('button', { name: 'Miércoles' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...value, days: [1, 3] });
    await user.press(screen.getByRole('switch', { name: 'Recordatorio' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...value, enabled: false });
  });

  it('hides time and days when the reminder is off', async () => {
    await render(editor(jest.fn(), { enabled: false, hour: 9, minute: 0, days: [] }));
    expect(screen.queryByText('Hora')).toBeNull();
    expect(screen.queryByTestId('time-picker')).toBeNull();
    expect(within(screen.getByRole('switch')).queryByText('Recordatorio')).toBeOnTheScreen();
  });
});
