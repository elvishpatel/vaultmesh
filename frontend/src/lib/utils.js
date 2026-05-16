import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function getStatusColor(status) {
  const map = {
    healthy: 'badge-healthy',
    distributed: 'badge-healthy',
    degraded: 'badge-degraded',
    uploading: 'badge-data',
    chunking: 'badge-data',
    encrypting: 'badge-data',
    distributing: 'badge-data',
    offline: 'badge-offline',
    failed: 'badge-offline',
    lost: 'badge-offline',
    corrupted: 'badge-offline',
  };
  return map[status] || 'badge-data';
}
