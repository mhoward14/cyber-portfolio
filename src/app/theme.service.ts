import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDarkMode = signal(true);

  constructor() {
    const saved = localStorage.getItem('theme');
    const prefersDark = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'light' || (!saved && !prefersDark)) {
      this.isDarkMode.set(false);
      document.body.classList.add('light-mode');
    }
  }

  toggle() {
    const goingLight = this.isDarkMode();
    this.isDarkMode.set(!goingLight);
    document.body.classList.toggle('light-mode', goingLight);
    localStorage.setItem('theme', goingLight ? 'light' : 'dark');
  }
}
