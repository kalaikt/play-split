import React, { Component, useState } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import Constants from 'expo-constants';

let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

try {
  const ads = require('react-native-google-mobile-ads');
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
  TestIds = ads.TestIds;
} catch (e) {
  console.warn('react-native-google-mobile-ads not available:', e);
}

// Error boundary to prevent ad crashes from taking down the app
class AdErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('Ad error boundary caught:', error.message);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const AdBannerInner: React.FC = () => {
  const [adError, setAdError] = useState<string | null>(null);

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return null;
  }

  // Native module not available — skip silently
  if (!BannerAd || !BannerAdSize) {
    return null;
  }

  // Use test ads in development, real ads in production
  const adUnitId = __DEV__
    ? TestIds?.ADAPTIVE_BANNER
    : Platform.OS === 'android'
      ? Constants.expoConfig?.extra?.adUnitIdAndroid
      : Constants.expoConfig?.extra?.adUnitId;

  // No ad unit configured — skip
  if (!adUnitId) return null;

  // If ad failed to load, hide the container entirely in production
  if (adError && !__DEV__) return null;

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

      {/* Only show error text in dev mode */}
      {__DEV__ && adError && (
        <Text style={styles.errorText}>Ad Error: {adError}</Text>
      )}
    </View>
  );
};

const AdBanner: React.FC = () => (
  <AdErrorBoundary>
    <AdBannerInner />
  </AdErrorBoundary>
);

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
