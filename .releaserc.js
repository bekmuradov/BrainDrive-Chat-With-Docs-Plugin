module.exports = {
  branches: ['main'],
  plugins: [
    // 1) determine bump from your commit messages
    '@semantic-release/commit-analyzer',
    // 2) generate release notes
    '@semantic-release/release-notes-generator',
    // 3) publish to GitHub & attach built artifacts
    ['@semantic-release/github', {
      assets: [
        { path: 'dist/**/*.zip', label: 'ZIP archive' },
        { path: 'dist/**/*.tar.gz', label: 'Tarball' }
      ]
    }]
  ]
}
