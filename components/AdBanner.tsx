import React, { useEffect, useState } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { Colors } from '../constants/colors';

let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;
let mobileAds: any = null;

// Only import AdMob on mobile platforms
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    const GoogleMobileAds = require('react-native-google-mobile-ads');
    BannerAd = GoogleMobileAds.BannerAd;
    BannerAdSize = GoogleMobileAds.BannerAdSize;
    TestIds = GoogleMobileAds.TestIds;
    mobileAds = GoogleMobileAds.default;
  } catch (error) {
    // Google Mobile Ads not available (e.g., running in Expo Go)
  }
}

const AdBanner: React.FC = () => {
  const [adInitialized, setAdInitialized] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);

  useEffect(() => {
    if (mobileAds) {
      mobileAds()
        .initialize()
        .then(() => {
          setAdInitialized(true);
        })
        .catch((error: any) => {
          setAdError(error.message);
        });
    }
  }, []);

  // Only render on mobile platforms and if BannerAd is available
  if ((Platform.OS === 'ios' || Platform.OS === 'android') && BannerAd) {
    if (!adInitialized) {
      return (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>
            {adError ? `Ad Error: ${adError}` : 'Loading ad...'}
          </Text>
        </View>
      );
    }

    return (
      <BannerAd
        unitId={
          Platform.OS === 'android'
            ? (Constants.expoConfig?.extra?.adUnitIdAndroid ?? Constants.expoConfig?.extra?.adUnitId ?? TestIds.BANNER)
            : (Constants.expoConfig?.extra?.adUnitId ?? TestIds.BANNER)
        }
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error: any) => {
          setAdError(error.message);
        }}
      />
    );
  }

  // Show placeholder if AdMob not available
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderText}>Ad Space</Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  placeholderContainer: {
    backgroundColor: Colors.primaryLight,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});

export default AdBanner;
