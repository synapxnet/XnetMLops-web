import { describe, expect, it } from 'vitest';

import { sanitizeTabbarSession } from './tabbar-session';

function createStorage(initialValue: null | string) {
  let value = initialValue;
  return {
    getItem: () => value,
    removeItem: () => {
      value = null;
    },
    setItem: (_key: string, nextValue: string) => {
      value = nextValue;
    },
    value: () => value,
  };
}

describe('sanitizeTabbarSession', () => {
  it('removes volatile task pages and duplicate restored tabs', () => {
    const storage = createStorage(
      JSON.stringify({
        tabs: [
          { fullPath: '/analytics', path: '/analytics' },
          { fullPath: '/MTP/train/index', path: '/MTP/train/index' },
          { fullPath: '/MTP/train/index', path: '/MTP/train/index' },
          {
            fullPath: '/MTP/train/job?id=job-1',
            path: '/MTP/train/job',
          },
          { fullPath: '/MTP/train/task', path: '/MTP/train/task' },
        ],
      }),
    );

    sanitizeTabbarSession('XnetMLops-test', storage);

    expect(JSON.parse(storage.value() as string).tabs).toEqual([
      { fullPath: '/analytics', path: '/analytics' },
      { fullPath: '/MTP/train/index', path: '/MTP/train/index' },
    ]);
  });

  it('drops corrupted persisted state so startup can recover', () => {
    const storage = createStorage('{invalid-json');

    sanitizeTabbarSession('XnetMLops-test', storage);

    expect(storage.value()).toBeNull();
  });
});
