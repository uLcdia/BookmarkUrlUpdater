browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  console.debug('[Debug] Tab updated event received', { tabId, changeInfo, tab });

  if (changeInfo.status !== 'complete' || !tab.url) {
    console.debug('[Debug] Skipping - status not complete or no URL');
    return;
  }

  if (typeof tab.frameId !== 'undefined' && tab.frameId !== 0) {
    console.debug(`[Debug] Skipping frame ${tab.frameId} (main=0)`);
    return;
  }

  try {
    const storageData = await browser.storage.local.get();
    console.debug(`[Debug] Loaded ${Object.keys(storageData).length} rules from storage`);
    const currentUrl = tab.url;
    console.debug(`[Debug] Processing URL: ${currentUrl}`);

    for (const [ruleId, rule] of Object.entries(storageData)) {
      console.debug(`[Debug] Processing rule ${ruleId}`, rule);

      if (!rule.enabled) {
        console.debug(`[Debug] Rule ${ruleId} is disabled - skipping`);
        continue;
      }

      try {
        console.debug(`[Debug] Creating RegExp from include pattern: ${rule.includePattern}`);
        const includePatternRegex = new RegExp(rule.includePattern);
        const includePatternMatch = includePatternRegex.test(currentUrl);
        console.debug(`[Debug] Include pattern test result: ${includePatternMatch}`);

        console.debug(`[Debug] Creating RegExp from exclude pattern: ${rule.excludePattern}`);
        const excludePatternRegex = new RegExp(rule.excludePattern);
        const excludePatternMatch = !rule.excludePattern ? false : excludePatternRegex.test(currentUrl);
        console.debug(`[Debug] Exclude pattern test result: ${excludePatternMatch}`);

        if (includePatternMatch && !excludePatternMatch) {
          console.debug(`[Debug] Pattern matched - checking bookmark ${rule.bookmarkId}`);
          const bookmark = await browser.bookmarks.get(rule.bookmarkId);
          const existingUrl = bookmark[0]?.url;

          if (existingUrl === currentUrl) {
            console.debug(`[Debug] Bookmark URL unchanged - skipping update`);
            continue;
          }

          console.debug(`[Debug] Updating bookmark from ${existingUrl} to ${currentUrl}`);
          await browser.bookmarks.update(rule.bookmarkId, { url: currentUrl });
          console.log(`[Info] Updated bookmark ${rule.bookmarkId}`);
        } else {
          console.debug(`[Debug] Pattern not matched - skipping bookmark check`);
        }
      } catch (error) {
        console.error(`[Error] Rule ${ruleId}:`, error);
      }
    }
  } catch (error) {
    console.error('[Error] Storage access:', error);
  }
  console.debug('[Debug] Finished processing tab update');
});
