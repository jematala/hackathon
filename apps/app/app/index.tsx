import { useAuth } from '@clerk/expo';
import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';

export default function HomeScreen() {
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText type='default'>Loading...</ThemedText>
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href='/(app)/map' />;
  }

  return <Redirect href='/(auth)/sign-in' />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
