import {
  combinePresetAndAppleSplashScreens,
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: combinePresetAndAppleSplashScreens(
    {
      ...minimal2023Preset,
      apple: {
        ...minimal2023Preset.apple,
        favicons: [[180, 'apple-touch-icon.png']],
      },
    },
    {
      padding: 0.3,
      resizeOptions: { background: 'white', fit: 'contain' },
      // by default, dark splash screens are exluded
      // darkResizeOptions: { background: 'black' },
      linkMediaOptions: {
        // will log the links you need to add to your html pages
        log: true,
        // add screen to media attribute link?
        // by default:
        // <link rel="apple-touch-startup-image" href="..." media="screen and ...">
        addMediaScreen: true,
        basePath: '/',
        // add closing link tag?
        // by default:
        // <link rel="apple-touch-startup-image" href="..." media="...">
        // with xhtml enabled:
        // <link rel="apple-touch-startup-image" href="..." media="..." />
        xhtml: false,
      },
      png: {
        compressionLevel: 9,
        quality: 60,
      },
      name: (landscape, size, dark) => {
        return `apple-splash-${landscape ? 'landscape' : 'portrait'}-${typeof dark === 'boolean' ? (dark ? 'dark-' : 'light-') : ''}${size.width}x${size.height}.png`
      },
    },
    ['iPad Air 9.7"'],
  ),
  images: ['public/favicon.svg'],
})
