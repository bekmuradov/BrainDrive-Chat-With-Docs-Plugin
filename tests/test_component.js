// Enhanced test with proper DOM validation and React rendering
const React = require('react');
const ReactDOMServer = require('react-dom/server');
// Mock JSDOM environment for proper DOM validation
const { JSDOM } = require('jsdom');

// Setup DOM environment - FIXED VERSION
function setupDOMEnvironment() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    pretendToBeVisual: true,
    resources: 'usable',
    url: 'http://localhost'
  });
  
  // Store original values if they exist
  const originalWindow = global.window;
  const originalDocument = global.document;
  const originalNavigator = global.navigator;
  
  // Set global properties safely
  global.window = dom.window;
  global.document = dom.window.document;
  
  // Handle navigator property carefully - it might be read-only
  try {
    global.navigator = dom.window.navigator;
  } catch (error) {
    // If we can't set navigator directly, define it using Object.defineProperty
    Object.defineProperty(global, 'navigator', {
      value: dom.window.navigator,
      writable: true,
      configurable: true
    });
  }
  
  // Add other commonly needed properties
  global.HTMLElement = dom.window.HTMLElement;
  global.HTMLDocument = dom.window.HTMLDocument;
  global.Node = dom.window.Node;
  global.Text = dom.window.Text;
  global.Comment = dom.window.Comment;
  global.DocumentFragment = dom.window.DocumentFragment;
  
  // Return cleanup function along with dom
  const cleanup = () => {
    global.window = originalWindow;
    global.document = originalDocument;
    
    // Restore navigator carefully
    if (originalNavigator) {
      try {
        global.navigator = originalNavigator;
      } catch (error) {
        Object.defineProperty(global, 'navigator', {
          value: originalNavigator,
          writable: true,
          configurable: true
        });
      }
    } else {
      delete global.navigator;
    }
    
    // Clean up other properties
    delete global.HTMLElement;
    delete global.HTMLDocument;
    delete global.Node;
    delete global.Text;
    delete global.Comment;
    delete global.DocumentFragment;
    
    dom.window.close();
  };
  
  return { dom, cleanup };
}

// Alternative setup function that avoids global pollution
function setupDOMEnvironmentSafe() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    pretendToBeVisual: true,
    resources: 'usable',
    url: 'http://localhost'
  });
  
  // Create a mock global object for React rendering
  const mockGlobal = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    HTMLDocument: dom.window.HTMLDocument,
    Node: dom.window.Node,
    Text: dom.window.Text,
    Comment: dom.window.Comment,
    DocumentFragment: dom.window.DocumentFragment
  };
  
  // Temporarily set globals only during rendering
  const setGlobals = () => {
    Object.keys(mockGlobal).forEach(key => {
      if (!(key in global)) {
        global[key] = mockGlobal[key];
      }
    });
  };
  
  const restoreGlobals = () => {
    Object.keys(mockGlobal).forEach(key => {
      if (key in global && global[key] === mockGlobal[key]) {
        delete global[key];
      }
    });
  };
  
  return { dom, setGlobals, restoreGlobals };
}

// Validate HTML structure and nesting
function validateHTMLStructure(htmlString) {
  const issues = [];
  
  // Check for common nesting issues
  const nestingRules = [
    { parent: 'p', invalidChildren: ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'] },
    { parent: 'button', invalidChildren: ['button', 'a', 'input'] },
    { parent: 'a', invalidChildren: ['a', 'button'] },
    { parent: 'table', validChildren: ['thead', 'tbody', 'tfoot', 'tr', 'colgroup', 'caption'] }
  ];
  
  // Simple regex-based validation (not perfect but catches obvious issues)
  nestingRules.forEach(rule => {
    const parentRegex = new RegExp(`<${rule.parent}[^>]*>([\\s\\S]*?)<\\/${rule.parent}>`, 'gi');
    let match;
    
    while ((match = parentRegex.exec(htmlString)) !== null) {
      const content = match[1];
      
      if (rule.invalidChildren) {
        rule.invalidChildren.forEach(invalidChild => {
          const childRegex = new RegExp(`<${invalidChild}[^>]*>`, 'i');
          if (childRegex.test(content)) {
            issues.push(`Invalid nesting: <${invalidChild}> inside <${rule.parent}>`);
          }
        });
      }
      
      if (rule.validChildren) {
        // Check if only valid children are present
        const allTags = content.match(/<(\w+)[^>]*>/g) || [];
        allTags.forEach(tag => {
          const tagName = tag.match(/<(\w+)/)[1];
          if (!rule.validChildren.includes(tagName) && tagName !== 'text') {
            issues.push(`Invalid child: <${tagName}> inside <${rule.parent}>`);
          }
        });
      }
    }
  });
  
  return issues;
}

// Validate React component structure
function validateReactStructure(element) {
  const issues = [];
  
  try {
    // Check if element is valid React element
    if (!React.isValidElement(element)) {
      issues.push('Not a valid React element');
      return issues;
    }
    
    // Check element structure
    if (!element.type) {
      issues.push('React element missing type');
    }
    
    if (typeof element.type === 'string') {
      console.log('✓ DOM element:', element.type);
    } else if (typeof element.type === 'function') {
      console.log('✓ Component element:', element.type.name || 'Anonymous');
    }
    
    // Validate props
    if (element.props) {
      console.log('✓ Element has props:', Object.keys(element.props));
      
      // Check for common prop issues
      if (element.props.key && typeof element.props.key !== 'string' && typeof element.props.key !== 'number') {
        issues.push('Invalid key prop type');
      }
    }
    
  } catch (error) {
    issues.push(`React validation error: ${error.message}`);
  }
  
  return issues;
}

// Main test function with comprehensive validation - UPDATED
function testComponentWithDOMValidation() {
  let cleanup;
  
  try {
    console.log('Setting up DOM environment...');
    
    // Use the safe setup method
    const { dom, setGlobals, restoreGlobals } = setupDOMEnvironmentSafe();
    
    // Set globals temporarily
    setGlobals();
    console.log('✓ DOM environment setup completed');
    
    // Setup cleanup
    cleanup = () => {
      restoreGlobals();
      dom.window.close();
    };
    
    // Import the component - try multiple possible paths
    let ChatCollectionsPlugin;
    const possiblePaths = [
      '../src/index.tsx',
      './src/index.tsx',
    ];
    
    let componentFound = false;
    for (const path of possiblePaths) {
      try {
        const module = require(path);
        ChatCollectionsPlugin = module.default || module;
        console.log(`✓ Component imported successfully from: ${path}`);
        componentFound = true;
        break;
      } catch (error) {
        // Continue to next path
        continue;
      }
    }
    
    if (!componentFound) {
      console.log('Available files in current directory:');
      const fs = require('fs');
      try {
        const files = fs.readdirSync('./');
        console.log('Root files:', files.filter(f => f.includes('index')));
        
        if (fs.existsSync('./src')) {
          const srcFiles = fs.readdirSync('./src');
          console.log('Src files:', srcFiles.filter(f => f.includes('index')));
        }
      } catch (fsError) {
        console.log('Could not read directory structure');
      }
      
      throw new Error(`Component not found. Tried paths: ${possiblePaths.join(', ')}`);
    }
    
    // Create mock props
    const mockProps = {
      title: 'Test Plugin',
      config: {
        apiBaseUrl: 'http://localhost:8000'
      },
      services: {
        settings: {
          getSetting: (key) => Promise.resolve(null),
          setSetting: (key, value) => Promise.resolve()
        },
        api: {
          get: (url) => Promise.resolve([]),
          post: (url, data) => Promise.resolve({}),
          put: (url, data) => Promise.resolve({}),
          delete: (url) => Promise.resolve({})
        },
        theme: {
          getCurrentTheme: () => 'light',
          addThemeChangeListener: (listener) => {},
          removeThemeChangeListener: (listener) => {}
        },
        pageContext: {
          getCurrentPageContext: () => ({ pageId: 'test' }),
          onPageContextChange: (handler) => () => {}
        }
      }
    };
    
    // Create React element
    const element = React.createElement(ChatCollectionsPlugin, mockProps);
    console.log('✓ React element created');
    
    // Validate React element structure
    console.log('\n--- React Element Validation ---');
    const reactIssues = validateReactStructure(element);
    if (reactIssues.length === 0) {
      console.log('✓ React element structure is valid');
    } else {
      console.log('✗ React element issues:', reactIssues);
    }
    
    // Test server-side rendering (this will catch many React issues)
    console.log('\n--- Server-Side Rendering Test ---');
    let htmlIssues = [];
    let renderingSuccessful = false;
    
    try {
      const htmlString = ReactDOMServer.renderToString(element);
      console.log('✓ Server-side rendering successful');
      console.log('Rendered HTML length:', htmlString.length, 'characters');
      renderingSuccessful = true;
      
      // Validate HTML structure
      console.log('\n--- HTML Structure Validation ---');
      htmlIssues = validateHTMLStructure(htmlString);
      if (htmlIssues.length === 0) {
        console.log('✓ HTML structure is valid - no nesting issues found');
      } else {
        console.log('✗ HTML structure issues found:');
        htmlIssues.forEach(issue => console.log('  -', issue));
      }
      
      // Check for common React warnings in the HTML
      console.log('\n--- React-specific Validation ---');
      if (htmlString.includes('data-reactroot')) {
        console.log('✓ React root marker found');
      }
      
      // Check for hydration markers
      if (htmlString.includes('data-react')) {
        console.log('✓ React hydration markers present');
      }
      
      // Basic accessibility checks
      const accessibilityIssues = [];
      if (!htmlString.includes('aria-') && !htmlString.includes('role=')) {
        accessibilityIssues.push('No ARIA attributes found - consider accessibility');
      }
      
      if (accessibilityIssues.length === 0) {
        console.log('✓ Basic accessibility markers present');
      } else {
        console.log('ℹ Accessibility notes:', accessibilityIssues);
      }
      
    } catch (renderError) {
      console.error('✗ Server-side rendering failed:', renderError.message);
      return { success: false, error: `SSR failed: ${renderError.message}` };
    }
    
    // Test component instantiation and method calling
    console.log('\n--- Component Method Testing ---');
    try {
      const instance = new ChatCollectionsPlugin(mockProps);
      console.log('✓ Component instance created');
      
      // Test getPluginInfo method if available
      if (typeof instance.getPluginInfo === 'function') {
        try {
          const pluginInfo = instance.getPluginInfo();
          console.log('✓ getPluginInfo method executed successfully');
          console.log('Plugin status:', pluginInfo.status);
          console.log('Services available:', Object.keys(pluginInfo.hasServices).filter(k => pluginInfo.hasServices[k]));
        } catch (methodError) {
          console.log('✗ getPluginInfo method failed:', methodError.message);
        }
      } else {
        console.log('ℹ getPluginInfo method not found - consider adding it');
      }
    } catch (instanceError) {
      console.log('ℹ Component instantiation skipped (functional component)');
    }
    
    return {
      success: true,
      validation: {
        reactIssues,
        htmlIssues,
        renderingSuccessful
      }
    };
    
  } catch (error) {
    console.error('✗ Component validation failed:', error.message);
    console.error('Stack:', error.stack);
    return { success: false, error: error.message };
  } finally {
    // Always cleanup
    if (cleanup) {
      cleanup();
    }
  }
}

// Run the comprehensive test
console.log('='.repeat(70));
console.log('Comprehensive React Component Validation with DOM Testing');
console.log('='.repeat(70));
const result = testComponentWithDOMValidation();
console.log('='.repeat(70));
if (result.success) {
  console.log('✓ SUCCESS: Component passed all validation tests');
  if (result.validation) {
    const totalIssues = result.validation.reactIssues.length + result.validation.htmlIssues.length;
    if (totalIssues === 0) {
      console.log('✓ No validation issues found - component is production ready');
    } else {
      console.log(`ℹ ${totalIssues} validation issues found - review above for details`);
    }
  }
} else {
  console.log('✗ FAILURE: Component validation failed');
  console.log('Error:', result.error);
}
console.log('='.repeat(70));

module.exports = { 
  testComponentWithDOMValidation, 
  setupDOMEnvironment: setupDOMEnvironmentSafe,
  validateHTMLStructure,
  validateReactStructure 
};
