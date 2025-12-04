export interface RestaurantTheme {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

// Convert hex to HSL
function hexToHSL(hex: string): string {
  // Remove the hash if present
  hex = hex.replace(/^#/, '');

  // Parse the hex values
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  const lValue = Math.round(l * 100);

  return `${h} ${s}% ${lValue}%`;
}

export const applyRestaurantTheme = (theme: RestaurantTheme) => {
  const root = document.documentElement;

  if (theme.primary_color) {
    root.style.setProperty('--restaurant-primary', hexToHSL(theme.primary_color));
  }
  if (theme.secondary_color) {
    root.style.setProperty('--restaurant-secondary', hexToHSL(theme.secondary_color));
  }
  if (theme.accent_color) {
    root.style.setProperty('--restaurant-accent', hexToHSL(theme.accent_color));
  }
};

export const resetRestaurantTheme = () => {
  const root = document.documentElement;
  root.style.removeProperty('--restaurant-primary');
  root.style.removeProperty('--restaurant-secondary');
  root.style.removeProperty('--restaurant-accent');
};

// Set favicon dynamically
export const setFavicon = (logoUrl: string | null) => {
  const link: HTMLLinkElement = document.querySelector("link[rel~='icon']") || document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/x-icon';
  link.href = logoUrl || '/favicon.ico';
  document.head.appendChild(link);
};

// Reset favicon to default
export const resetFavicon = () => {
  const link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
  if (link) {
    link.href = '/favicon.ico';
  }
};
