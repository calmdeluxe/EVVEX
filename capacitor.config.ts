import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.evex.mobile',
  appName: 'EVVEX',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
    allowNavigation: ['localhost']
  },
  android: {
    buildOptions: {
      keystorePath: 'calmreader-release-key.jks',
      keystoreAlias: 'calmreader',
      // Split APKs by ABI to reduce size down from 61MB to ~8MB
      abi: 'arm64-v8a'
    }
  }
};

export default config;

