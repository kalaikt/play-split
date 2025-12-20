import React from 'react';
import { Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const AdBanner: React.FC = () => {
  // Use test IDs for development
  const adUnitId = __DEV__
    ? TestIds.BANNER
    : Platform.select({
        ios: 'ca-app-pub-XXXXX/XXXXX', // Replace with your iOS ad unit ID
        android: 'ca-app-pub-XXXXX/XXXXX', // Replace with your Android ad unit ID
      }) || TestIds.BANNER;

  return (
    <BannerAd
      unitId={adUnitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{
        requestNonPersonalizedAdsOnly: true,
      }}
    />
  );
};

export default AdBanner;
