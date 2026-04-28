import { Gesture } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';

const TABS = ['index', 'reminders', 'settings', 'profile'] as const;

export function useSwipeNavigation(currentIndex: number) {
  const navigation = useNavigation();

  return Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onEnd((event) => {
      const { translationX } = event;
      if (translationX < -60 && currentIndex < TABS.length - 1) {
        navigation.navigate(TABS[currentIndex + 1] as never);
      } else if (translationX > 60 && currentIndex > 0) {
        navigation.navigate(TABS[currentIndex - 1] as never);
      }
    });
}
