// jest.config.js
export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.m?js$': 'babel-jest'
  },
  setupFiles: ['./jest.setup.js']
};