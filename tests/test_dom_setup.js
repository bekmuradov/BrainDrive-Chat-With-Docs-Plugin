// test_setup.js - Enhanced for DOM testing
// Setup for running TypeScript/React tests with DOM validation

// Handle CSS imports
require.extensions['.css'] = () => {};
require.extensions['.scss'] = () => {};
require.extensions['.sass'] = () => {};

// Configure ts-node for React/TypeScript
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    jsx: 'react-jsx',
    target: 'es2020',
    lib: ['es2020', 'dom'],
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    skipLibCheck: true
  }
});

// Mock lucide-react icons for testing
const mockLucideIcons = {
  MessageSquare: 'MessageSquare',
  FileText: 'FileText',
  Loader2: 'Loader2',
  ArrowLeft: 'ArrowLeft',
  AlertCircle: 'AlertCircle',
  Upload: 'Upload',
  Trash2: 'Trash2',
  Send: 'Send',
  Plus: 'Plus',
  Download: 'Download',
  Edit: 'Edit',
  Settings: 'Settings'
};

// Create a mock module for lucide-react
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(...args) {
  if (args[0] === 'lucide-react') {
    // Return mock components that render as simple divs
    const mockComponents = {};
    Object.keys(mockLucideIcons).forEach(iconName => {
      mockComponents[iconName] = ({ className, ...props }) => {
        const React = originalRequire.call(this, 'react');
        return React.createElement('div', {
          className: `mock-icon ${iconName.toLowerCase()} ${className || ''}`,
          'data-testid': `icon-${iconName.toLowerCase()}`,
          ...props
        }, iconName);
      };
    });
    return mockComponents;
  }
  return originalRequire.call(this, ...args);
};

// Suppress React warnings in test environment
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  // Filter out known React testing warnings
  const message = args.join(' ');
  if (
    message.includes('validateDOMNesting') ||
    message.includes('Warning: ReactDOMServer') ||
    message.includes('useLayoutEffect does nothing on the server')
  ) {
    return; // Suppress these warnings in test
  }
  originalConsoleWarn.apply(console, args);
};

console.log('Enhanced test setup with DOM validation completed');
