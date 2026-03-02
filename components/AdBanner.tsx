import React, { useState } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';

const AdBanner: React.FC = () => {
  const [adError, setAdError] = useState<string | null>(null);

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return null;
  }

  // Use test ads in development, real ads in production
  const adUnitId = __DEV__
    ? TestIds.ADAPTIVE_BANNER
    : Platform.OS === 'android'
      ? Constants.expoConfig?.extra?.adUnitIdAndroid
      : Constants.expoConfig?.extra?.adUnitId;

  return (
    <View style={styles.adContainer}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdLoaded={() => console.log('Banner loaded')}
        onAdFailedToLoad={(error: any) => {
          console.log('Banner error:', error);
          setAdError(error.message);
        }}
      />

      {adError && <Text style={styles.errorText}>Ad Error: {adError}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  adContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 12,
    color: 'red',
    marginTop: 4,
  },
});

export default AdBanner;
