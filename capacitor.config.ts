// Capacitor wraps the built web app (dist/) as Android and iOS apps.
// Native projects are not generated yet. See SETUP.md, "Mobile apps".
const config = {
  appId: 'com.mybiblegem.app',
  appName: 'MyBibleGem',
  webDir: 'dist',
  android: { allowMixedContent: false },
}
export default config
