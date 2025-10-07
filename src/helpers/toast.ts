import { escapeHtml } from '../utils/escapeHtml';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

let toastContainer: HTMLElement | null = null;
let toastCounter = 0;

/**
 * Initialize toast container - call this once when your app starts
 */
export function initToastContainer(): void {
  if (document.getElementById('toast-container')) return;
  
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'fixed bottom-8 right-4 z-100 space-y-2 pointer-events-none';
  document.body.appendChild(container);
  toastContainer = container;
}

/**
 * Show toast notification
 */
export function showToast(message: string, type: ToastType = 'info', duration = 10000): void {
  // Ensure container exists
  if (!toastContainer) {
    initToastContainer();
  }
  
  const container = toastContainer!;
  const toastId = `toast-${++toastCounter}`;
  const toast = document.createElement('div');
  
  const bgColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  };
  
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  toast.id = toastId;
  toast.className = `
    ${bgColors[type]} text-white px-4 py-3 rounded-lg shadow-lg
    transform transition-all duration-300 translate-x-full opacity-0
    pointer-events-auto cursor-pointer flex items-center space-x-2
    max-w-sm
  `.replace(/\s+/g, ' ').trim();
  
  toast.innerHTML = `
    <span class="text-sm font-medium">${icons[type]}</span>
    <span class="text-sm flex-1">${escapeHtml(message)}</span>
    <button class="ml-2 text-white hover:text-gray-200 text-lg leading-none" onclick="this.parentElement.remove()">&times;</button>
  `;
  
  // Add click-to-dismiss
  toast.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).tagName !== 'BUTTON') {
      removeToast(toast);
    }
  });
  
  container.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full', 'opacity-0');
  });
  
  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }
}

/**
 * Remove a specific toast
 */
function removeToast(toast: HTMLElement): void {
  toast.classList.add('translate-x-full', 'opacity-0');
  setTimeout(() => {
    if (toast.parentElement) {
      toast.parentElement.removeChild(toast);
    }
  }, 300);
}

/**
 * Clear all toasts
 */
export function clearAllToasts(): void {
  if (toastContainer) {
    toastContainer.innerHTML = '';
  }
}
