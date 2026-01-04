// API Configuration
// Uses environment variable in production, falls back to localhost in development

/// <reference types="vite/client" />

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Build a full API URL from a path
 * @param path - API endpoint path (e.g., '/campaigns' or 'campaigns')
 * @returns Full API URL
 */
export function apiUrl(path: string): string {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_URL}${normalizedPath}`;
}
