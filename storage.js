const Storage = {
  async getRules() {
    const rules = await browser.storage.local.get();
    return rules;
  },

  async addRule(bookmarkId, name, pattern) {
    if (!bookmarkId || !pattern) throw new Error('Missing required fields');
    
    const ruleId = crypto.randomUUID();
    await browser.storage.local.set({
      [ruleId]: {
        bookmarkId,
        name: name || `Rule ${ruleId.slice(0,8)}`,
        pattern,
        enabled: true,
        lastUpdated: new Date().toISOString()
      }
    });
    return ruleId;
  },

  async updateRule(ruleId, updates) {
    const existing = await browser.storage.local.get(ruleId);
    if (!existing[ruleId]) throw new Error('Rule not found');
    
    const updated = {...existing[ruleId], ...updates};
    await browser.storage.local.set({[ruleId]: updated});
    return updated;
  },

  async deleteRule(ruleId) {
    await browser.storage.local.remove(ruleId);
  }
};

// Replace window attachment with proper exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Storage;
} else {
  window.Storage = Storage;
}
