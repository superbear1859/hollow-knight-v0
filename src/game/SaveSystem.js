export class SaveSystem {
  static SAVE_KEY = 'hollow_knight_v0_save';

  static getInitialData() {
    return {
      geo: 0,
      maxMasks: 5,
      masks: 5,
      soul: 100, // Start with full soul vessel
      maxSoul: 100,
      unlockedAbilities: {
        dash: false,
        shadowDash: false,
        wallJump: false,
        vengefulSpirit: false
      },
      charmsOwned: ['WAYWARD_COMPASS'],
      charmsEquipped: ['WAYWARD_COMPASS'],
      notchCount: 3,
      visitedRooms: ['dirtmouth_01'],
      bossesDefeated: {
        falseKnight: false,
        hornet: false
      },
      lastBenchRoom: 'dirtmouth_01',
      lastBenchX: 700,
      lastBenchY: 580
    };
  }

  static load() {
    try {
      const dataStr = localStorage.getItem(this.SAVE_KEY);
      if (!dataStr) return this.getInitialData();
      const loaded = { ...this.getInitialData(), ...JSON.parse(dataStr) };

      // Sanitize old save data with invalid sky spawn coordinates
      if (loaded.lastBenchRoom === 'dirtmouth_01' && (loaded.lastBenchY < 500 || loaded.lastBenchX < 500)) {
        loaded.lastBenchX = 700;
        loaded.lastBenchY = 580;
      }
      return loaded;
    } catch (e) {
      console.warn('Failed to load save state', e);
      return this.getInitialData();
    }
  }

  static save(data) {
    try {
      localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save game state', e);
    }
  }

  static reset() {
    try {
      localStorage.removeItem(this.SAVE_KEY);
    } catch (e) {
      console.warn('Failed to reset save', e);
    }
  }
}
