import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';

// Utilidad para estilos específicos por plataforma
export const platformStyles = (webStyles, nativeStyles) => {
  return isWeb ? webStyles : nativeStyles;
};