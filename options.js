// DOM Elements
const rulesList = document.getElementById('rules-list');
const bookmarksList = document.getElementById('bookmarks-list');
const saveRulesButton = document.getElementById('save-rules');

// Load initial data
document.addEventListener('DOMContentLoaded', async () => {
  await loadRules();
  await loadAllBookmarks();
});

async function loadRules() {
  try {
    const rules = await window.Storage.getRules();
    rulesList.innerHTML = '';

    for (const [ruleId, rule] of Object.entries(rules)) {
      const ruleElement = createRuleElement(ruleId, rule);
      rulesList.appendChild(ruleElement);
    }
  } catch (error) {
    showError('Failed to load rules: ' + error.message);
  }
}

async function loadAllBookmarks() {
  try {
    const bookmarks = await browser.bookmarks.getTree();
    bookmarksList.innerHTML = '';
    flattenBookmarks(bookmarks).forEach(bookmark => {
      if (bookmark.url) {
        const bookmarkElement = createBookmarkElement(bookmark);
        bookmarksList.appendChild(bookmarkElement);
      }
    });
  } catch (error) {
    showError('Failed to load bookmarks: ' + error.message);
  }
}

function createRuleElement(ruleId, rule) {
  const element = document.createElement('div');
  element.className = 'rule-item';
  element.dataset.ruleId = ruleId;
  element.innerHTML = `
    <div class="header-group">
      <input type="text" value="${escapeHTML(rule.name)}" data-field="name">
    </div>
    <div class="header-group">
      <input type="text" value="${escapeHTML(rule.includePattern)}" data-field="include-pattern">
    </div>
    <div class="header-group">
      <input type="text" value="${escapeHTML(rule.excludePattern)}" data-field="exclude-pattern">
    </div>
    <div class="header-group">
      <p>${rule.bookmarkId}</p>
    </div>
    <div class="header-group">
      <input type="checkbox" ${rule.enabled ? 'checked' : ''} data-field="enabled">
    </div>
    <button class="button delete-rule">Delete</button>
  `;

  element.querySelector('.delete-rule').addEventListener('click', async () => {
    try {
      await window.Storage.deleteRule(ruleId);
      element.remove();
    } catch (error) {
      showError('Failed to delete rule: ' + error.message);
    }
  });

  return element;
}

function createBookmarkElement(bookmark) {
  const element = document.createElement('div');
  element.className = 'bookmark-item';
  element.innerHTML = `
    <div class="header-group">
      <div><strong>${bookmark.title}</strong></div>
      <div class="url">${bookmark.url}</div>
      <div class="id">ID: ${bookmark.id}</div>
    </div>
    <button class="button add-bookmark-rule">Add Rule</button>
  `;

  element.querySelector('.add-bookmark-rule').addEventListener('click', async () => {
    try {
      const hostname = new URL(bookmark.url).hostname;
      const includePattern = `^https?://${hostname.replace(/\./g, '\\.')}`;
      const excludePattern = '';

      await window.Storage.addRule(
          bookmark.id,
          bookmark.title,
          includePattern,
          excludePattern,
      );

      await loadRules();
    } catch (error) {
      showError('Failed to create rule: ' + error.message);
    }
  });

  return element;
}

// Helper functions
function flattenBookmarks(bookmarkNodes) {
  let bookmarks = [];
  bookmarkNodes.forEach(node => {
    if (node.children) {
      bookmarks = bookmarks.concat(flattenBookmarks(node.children));
    } else if (node.url) {
      bookmarks.push(node);
    }
  });
  return bookmarks;
}

function showError(message) {
  const errorElement = document.createElement('div');
  errorElement.className = 'error-message';
  errorElement.textContent = message;
  document.body.prepend(errorElement);
  setTimeout(() => errorElement.remove(), 5000);
}

function showSuccess(message) {
  const successElement = document.createElement('div');
  successElement.className = 'success-message';
  successElement.textContent = message;
  document.body.prepend(successElement);
  setTimeout(() => successElement.remove(), 5000);
}

saveRulesButton.addEventListener('click', async () => {
  try {
    const updatePromises = [];

    document.querySelectorAll('.rule-item').forEach(element => {
      const ruleId = element.dataset.ruleId;
      const ruleData = {
        name: element.querySelector('[data-field="name"]').value,
        includePattern: element.querySelector('[data-field="include-pattern"]').value,
        excludePattern: element.querySelector('[data-field="exclude-pattern"]').value,
        enabled: element.querySelector('[data-field="enabled"]').checked
      };
      updatePromises.push(window.Storage.updateRule(ruleId, ruleData));
    });

    await Promise.all(updatePromises);
    showSuccess('All changes saved successfully!');
  } catch (error) {
    showError('Failed to save rules: ' + error.message);
  }
});

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}
