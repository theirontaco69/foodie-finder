import 'dotenv/config';
export default {
  expo: {
    name: 'Foodie Finder',
    slug: 'foodie-finder',
    scheme: 'foodiefinder',
    ios: { bundleIdentifier: 'com.foodiefinder.app' },
    android: { package: 'com.foodiefinder.app' },
    plugins: ['expo-router'],
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY
    },
    experiments: { typedRoutes: true }
  }
};
