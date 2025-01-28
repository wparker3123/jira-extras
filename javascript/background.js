chrome.runtime.onInstalled.addListener(async () => {
    chrome.contextMenus.create({
        id: "openJiraLink",
        title: "Open in JIRA",
        type: 'normal',
        contexts: ['selection'],
        visible: false
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'showContextMenu') {
        chrome.contextMenus.update("openJiraLink", {
            visible: true,
            onclick: () => {
                const jiraUrl = `https://jira.service.tools-pi.com/browse/${message.selection}`;
                chrome.tabs.create({ url: jiraUrl });
            }
        });
    } else if (message.action === 'hideContextMenu') {
        chrome.contextMenus.update("openJiraLink", { visible: false });
    }
});