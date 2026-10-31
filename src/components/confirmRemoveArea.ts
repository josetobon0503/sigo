import type { TFunction } from 'i18next';
import { Alert } from 'react-native';

import type { BodyArea } from '@/engine/types';

// "Remove knee?" with Cancel / Remove. Shared by the Pain tab list and the area editor.
export function confirmRemoveArea(t: TFunction, area: BodyArea, onConfirm: () => void): void {
  const name = t(`bodyArea.${area}`);
  Alert.alert(t('pain.removeTitle', { area: name }), t('pain.removeBody'), [
    { text: t('pain.cancel'), style: 'cancel' },
    { text: t('pain.removeConfirm'), style: 'destructive', onPress: onConfirm },
  ]);
}
