let loadingOverlay: HTMLElement | null = null;

/**
 * Initialize loading overlay - call this once when your app starts
 */
export function initLoadingOverlay(): void {
  if (document.getElementById('loading-overlay')) return;
  
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.className = `
    fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center hidden
    backdrop-blur-sm
  `.replace(/\s+/g, ' ').trim();
  
  overlay.innerHTML = `
    <div class="bg-white rounded-lg p-6 flex items-center space-x-4 shadow-xl">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="text-gray-700 font-medium">Loading...</span>
    </div>
  `;
  
  document.body.appendChild(overlay);
  loadingOverlay = overlay;
}

/**
 * Show loading overlay
 */
export function showLoading(message = 'Loading...'): void {
  if (!loadingOverlay) {
    initLoadingOverlay();
  }
  
  const messageEl = loadingOverlay!.querySelector('span');
  if (messageEl) {
    messageEl.textContent = message;
  }
  
  loadingOverlay!.classList.remove('hidden');
}

/**
 * Hide loading overlay
 */
export function hideLoading(): void {
  if (loadingOverlay) {
    loadingOverlay.classList.add('hidden');
  }
}
