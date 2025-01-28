injectScript = (file) => {
    const script = document.createElement("script");
    try {
        script.src = chrome.runtime.getURL(file);
        (document.head || document.documentElement).appendChild(script);
    }
    catch (e) {
        console.log("sn_do_more: error injecting script");
    }
};

checkForJiraStory = (highlightedText) => {
    //expected format is like YOUR_PROJECT_KEY-3752 or YOUR_PROJECT_KEY-3784
    const jiraRegex = /YOUR_PROJECT_KEY-\d{4}/g; // can add more teams later
    const jiraMatches = highlightedText.replace(/\s/g, "").match(jiraRegex);

    if (jiraMatches) {
        chrome.runtime.sendMessage({ action: 'showContextMenu', selection: jiraMatches[0] });
    }
    else {
        chrome.runtime.sendMessage({ action: 'hideContextMenu' });
    }
};

document.addEventListener("selectionchange", (event) => {
    const selection = window.getSelection().toString();

    if (selection.length == 0) { return; }

    checkForJiraStory(selection);
});