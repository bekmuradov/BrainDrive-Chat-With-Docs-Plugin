import '@testing-library/jest-dom';

// Mock services for testing
export const mockServices = {
  api: {
    get: jest.fn().mockResolvedValue([]),
    post: jest.fn().mockResolvedValue({ success: true }),
    put: jest.fn().mockResolvedValue({ success: true }),
    delete: jest.fn().mockResolvedValue({ success: true })
  },
  theme: {
    getCurrentTheme: jest.fn().mockReturnValue('light'),
    addThemeChangeListener: jest.fn(),
    removeThemeChangeListener: jest.fn()
  },
  settings: {
    getSetting: jest.fn().mockResolvedValue(null),
    setSetting: jest.fn().mockResolvedValue(undefined)
  },
  pageContext: {
    getCurrentPageContext: jest.fn().mockReturnValue({
      pageId: 'test-page',
      pageName: 'Test Page',
      pageRoute: '/test',
      isStudioPage: false
    }),
    onPageContextChange: jest.fn().mockReturnValue(() => {})
  }
};
