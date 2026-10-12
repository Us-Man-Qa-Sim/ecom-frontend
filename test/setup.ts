import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  // Some test files run in the node environment, where there is no DOM.
  if (typeof document === 'undefined') return;
  cleanup();
  localStorage.clear();
});
