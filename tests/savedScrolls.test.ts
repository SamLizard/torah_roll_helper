import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSavedScrollsStore } from '../src/stores/savedScrolls';

describe('useSavedScrollsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('adds a scroll and makes it active', () => {
    const store = useSavedScrollsStore();

    const scroll = store.addScroll({
      name: ' Main Aron ',
      torahType: 'klaf_245',
      position: {
        page: 42,
        ref: { book: 1, chapter: 12, verse: 1 },
        targetKey: 'lech_lecha',
      },
    });

    expect(scroll.name).toBe('Main Aron');
    expect(scroll.lastPosition).toMatchObject({
      page: 42,
      ref: { book: 1, chapter: 12, verse: 1 },
      targetKey: 'lech_lecha',
    });
    expect(store.activeScrollId).toBe(scroll.id);
    expect(store.activeScroll?.id).toBe(scroll.id);
  });

  it('updates a scroll position without mutating the old position object', () => {
    const store = useSavedScrollsStore();
    const scroll = store.addScroll({
      name: 'Weekday',
      torahType: 'klaf_245',
      position: {
        page: 10,
        ref: { book: 1, chapter: 5, verse: 1 },
        targetKey: null,
      },
    });

    const originalPosition = scroll.lastPosition;
    const updated = store.updateScroll(scroll.id, {
      torahType: 'klaf_248',
      position: {
        page: 12,
        ref: { book: 1, chapter: 6, verse: 9 },
        targetKey: 'noach',
      },
    });

    expect(updated?.torahType).toBe('klaf_248');
    expect(updated?.lastPosition).toMatchObject({
      page: 12,
      ref: { book: 1, chapter: 6, verse: 9 },
      targetKey: 'noach',
    });
    expect(updated?.lastPosition).not.toBe(originalPosition);
  });

  it('selects another scroll after deleting the active one', () => {
    const store = useSavedScrollsStore();
    const first = store.addScroll({
      name: 'First',
      torahType: 'klaf_245',
      position: { page: 1 },
    });
    const second = store.addScroll({
      name: 'Second',
      torahType: 'klaf_226',
      position: { page: 2 },
    });

    expect(store.activeScrollId).toBe(second.id);

    store.removeScroll(second.id);

    expect(store.activeScrollId).toBe(first.id);
    expect(store.savedScrolls).toHaveLength(1);
  });
});