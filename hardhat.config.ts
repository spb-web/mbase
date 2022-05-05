import 'solidity-docgen'

export default {
  docgen: {
    pages: ({canonicalName}:any) => canonicalName === 'MBaseFarm' ? 'readme.md' : undefined,
    root: process.cwd(),
    sourcesDir: 'contracts',
    outputDir: '.',
    theme: 'markdown',
    collapseNewlines: false,
    pageExtension: '.md',
  },
  solidity: {
    compilers: [
      { version: '0.8.12' },
    ],
  },
}