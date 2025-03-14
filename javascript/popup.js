let isOffline = false;
const defaultSettings = {
    collapseDescription: true,
};

const loadSettings = (callback) => {
    chrome.storage.sync.get('settings', (result) => {
        const settings = result?.settings || defaultSettings;
        callback(settings);
    });
};

const saveSetting = (setting, newVal) => {
    loadSettings(currentSettings => {
        if (!currentSettings.hasOwnProperty(setting)) { return };

        currentSettings[setting] = newVal;
        chrome.storage.sync.set({ settings: currentSettings });
        applySetting(setting, newVal);
    });
}

const getHeaders = () => {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", "YOUR_TOKEN_HERE");

    return myHeaders;
}

const getJiraStoryCache = () => {
    const storyCache = localStorage.getItem('jiraStoryCache');

    return storyCache ? JSON.parse(storyCache) : [];

};

const updateJiraStoryCache = (stories) => {
    localStorage.setItem('jiraStoryCache', JSON.stringify({ stories: stories, timestamp: new Date().getTime() }));
};

const populatedFromCache = () => {
    const storyCache = getJiraStoryCache();
    if (!storyCache?.timestamp) { return false; }

    const cacheTimestamp = new Date(storyCache.timestamp);
    const currentTimestamp = new Date();
    const diff = currentTimestamp - cacheTimestamp;
    const diffSeconds = diff / 1000;

    if (diffSeconds > 120) { return false; }
    if (!storyCache.stories?.length) { return false; }

    populateTickets(storyCache.stories);
    return true;
};

const getActiveJiraStories = async () => {
    const myHeaders = getHeaders();

    const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
    };
    return new Promise((resolve, reject) => {
        try {
            fetch("https://YOUR_JIRA_DOMAIN/rest/agile/1.0/board/YOUR_BOARD_ID/issue?jql=assignee=currentUser() AND sprint in openSprints()", requestOptions)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Get Active Jira Stories response was not ok");
                    }
                    return response.json();
                })
                .then((respBody) => {
                    var issues = respBody.issues;
                    newArray = issues.map((jiraStory) => {
                        return {
                            id: jiraStory.key,
                            summary: jiraStory.fields?.summary,
                            assignee: jiraStory.fields?.assignee?.displayName,
                            status: jiraStory.fields?.status?.name,
                            description: jiraStory.fields?.description
                        }
                    });
                    resolve(newArray);
                })
                .catch((error) => {
                    console.error("Error fetching active Jira stories: ", error);
                    reject(error);
                });
        }
        catch (error) {
            console.error("Error fetching active Jira stories: ", error);
            reject(error);
        }
    });
}

const createSlider = (sliderContainer, defaultStatusOptions) => {
    noUiSlider.create(sliderContainer, {
        start: 0,
        step: 1,
        range: {
            'min': 0,
            'max': defaultStatusOptions.length - 1
        },
        format: {
            to: function (value) {
                return Math.round(value);
            },
            from: function (value) {
                return Number(value);
            }
        },
        tooltips: false,
        pips: {
            mode: 'steps',
            density: 100,
            format: {
                to: function (value) {
                    return defaultStatusOptions[value];
                }
            }
        }
    });
};

const addSliderEvents = (sliderContainer, statusOptions, tickets, ticketId) => {
    const ticketStatusLabel = document.getElementById('ticket-status-label');

    sliderContainer.noUiSlider.on('update', (values, handle) => {
        const value = values[handle];
        ticketStatusLabel.textContent = statusOptions[value];
    });

    sliderContainer.noUiSlider.on('change', (values, handle) => {
        console.log('Slider updated');
        const value = values[handle];

        getJiraTransitions(ticketId.value)
            .then((currentStatuses) => {
                if (!currentStatuses.length) { throw new Error("No transitions found for Jira ticket"); }
                console.log('Transitions: ', currentStatuses);
                return currentStatuses.find(transition => transition.name === statusOptions[value])?.id;
            })
            .then((statusId) => {
                updateJiraStatus(ticketId.value, statusId)
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error("Error updating Jira status: ", response);
                        }
                        console.log(`Jira status updated to ${statusOptions[value]}`);
                        //update in tickets array too
                        const ticket = tickets.find(t => t.id === ticketId.value);
                        if (ticket) {
                            ticket.status = statusOptions[value];
                        }
                    })
                    .catch((error) => {
                        console.error("Error updating Jira status: ", error);
                    });
            })
            .catch((error) => {
                console.error("Error fetching Jira transitions: ", error);
            });
    });
};

const formatJiraDescription = (text) => {
    if (!text) return '';
    text = String(text);

    // Headers
    text = text.replace(/^h1\.\s*(.*?)$/gm, '<h1>$1</h1>');
    text = text.replace(/^h2\.\s*(.*?)$/gm, '<h2>$1</h2>');
    text = text.replace(/^h3\.\s*(.*?)$/gm, '<h3>$1</h3>');

    // Lists
    text = text.replace(/^[-*]\s*(.*?)$/gm, '<li>$1</li>');
    text = text.replace(/^#\s*(.*?)$/gm, '<li>$1</li>');

    // Text styling
    text = text.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>');
    text = text.replace(/_([^_\n]+)_/g, '<em>$1</em>');

    // Links
    text = text.replace(/\[([^|]+)\|([^\]]+)\]/g, '<a href="$2" target="_blank">$1</a>');

    // Line breaks
    // text = text.replace(/\n/g, '<br>');

    return text;
};

const populateTickets = (tickets) => {
    const ticketList = document.getElementById('tickets');
    const activeTickets = document.getElementById('active-tickets');
    const completedTickets = document.getElementById('completed-tickets');
    const ticketDetailsSection = document.getElementById('ticket-details');
    const ticketForm = document.getElementById('ticket-form');
    const ticketIdInput = document.getElementById('ticket-id');
    const ticketSummaryInput = document.getElementById('ticket-summary');
    const ticketStatusSlider = document.getElementById('ticket-status-slider');
    const ticketAssigneeInput = document.getElementById('ticket-assignee');
    const ticketDescription = document.getElementById('ticket-description');
    const ticketNotes = document.getElementById('ticket-notes');

    const defaultStatusOptions = ["Loading..."];
    const statusOptions = [];

    createSlider(ticketStatusSlider, defaultStatusOptions);
    addSliderEvents(ticketStatusSlider, statusOptions, tickets, ticketIdInput);

    // Populate ticket list
    tickets.forEach(ticket => {
        const containerDiv = document.createElement('div');
        containerDiv.className = 'ticket-container';

        const div = document.createElement('div');
        const ticketLink = document.createElement('a');
        ticketLink.href = `https://YOUR_JIRA_DOMAIN/browse/${ticket.id}`;
        ticketLink.target = '_blank';
        ticketLink.innerHTML = `<strong>${ticket.id}</strong>`;
        div.appendChild(ticketLink);
        div.className = 'ticket';
        div.innerHTML += `<br><p>${ticket.summary}</p>`;
        div.dataset.id = ticket.id;
        div.addEventListener('click', () => {
            ticketIdInput.value = ticket.id;
            ticketSummaryInput.value = ticket.summary;
            ticketStatusSlider.noUiSlider.set(statusOptions.indexOf(ticket.status));
            ticketDescription.innerHTML = formatJiraDescription(ticket.description);
            console.log('Assignee: ', ticket.assignee);
            populateAssignees(ticket.assignee);
            showForm();
            //ticketDetailsSection.style.display = 'block';
            //ticketDetailsSection.scrollIntoView({ behavior: 'smooth' });
            handleUserNotes(ticketNotes, ticket.id);

            if (isOffline) {
                ticketStatusSlider.style.display = 'none';
                ticketAssigneeInput.style.display = 'none';
                document.getElementById('update-assignee').style.display = 'none';
            }

            getJiraTransitions(ticket.id).then(transitions => {
                const newStatusOptions = transitions.map(transition => transition.name);
                if (newStatusOptions.length !== statusOptions.length
                    || newStatusOptions.every((value, index) => value !== statusOptions[index])) {
                    statusOptions.splice(0, statusOptions.length, ...newStatusOptions);
                }

                ticketStatusSlider.noUiSlider.updateOptions({
                    range: {
                        'min': 0,
                        'max': statusOptions.length - 1
                    },
                    pips: {
                        mode: 'steps',
                        density: 100,
                        format: {
                            to: function (value) {
                                return statusOptions[value];
                            }
                        }
                    }
                });
                ticketStatusSlider.noUiSlider.set(statusOptions.indexOf(ticket.status));
            });
        });
        containerDiv.appendChild(div);
        if (ticket.status === 'In Progress' || ticket.status === 'Testing') {
            activeTickets.appendChild(containerDiv);
        }
        else if (['Done', 'Ready for QA', 'Accepted'].includes(ticket.status)) {
            completedTickets.appendChild(containerDiv);
        }
        else {
            ticketList.appendChild(containerDiv);
        }
    });

    // Update ticket status and assignee
    document.getElementById('update-assignee').addEventListener('click', () => {
        const ticketId = ticketIdInput.value;
        const newAssignee = ticketAssigneeInput.value;
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket) {
            ticket.assignee = newAssignee;
            updateJiraAssignee(ticketId, newAssignee);
            alert(`Assignee of ${ticketId} updated to ${newAssignee}`);
        }
    });

    document.getElementById('close-details').addEventListener('click', () => {
        hideForm();
    });
};

const showForm = () => {
    document.getElementById('ticket-list').style.display = 'none';
    document.getElementById('ticket-details').style.display = 'block';
    document.querySelector('div.settings-bar').style.display = 'none';
};

const hideForm = () => {
    document.getElementById('ticket-details').style.display = 'none';
    document.getElementById('ticket-list').style.display = 'block';
    document.querySelector('div.settings-bar').style.display = 'flex';
};

const getJiraTransitions = async (ticketId) => {
    if (isOffline) {
        console.log('Offline mode - skipping transition fetch');
        return [];
    }

    const myHeaders = getHeaders();

    const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
    };

    return new Promise((resolve, reject) => {
        try {
            fetch(`https://YOUR_JIRA_DOMAIN/rest/api/2/issue/${ticketId}/transitions`, requestOptions)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Get Jira Transitions response was not ok");
                    }
                    return response.json();
                })
                .then((respBody) => {
                    if (!respBody.transitions?.length) {
                        reject("No transitions found for Jira ticket");
                    } else {
                        console.log(respBody.transitions);
                        const transitions = respBody.transitions.map(transition => {
                            return {
                                id: transition.id,
                                name: transition.name
                            };
                        });
                        resolve(transitions);
                    }


                    //resolve(respBody);
                })
                .catch((error) => {
                    console.error(error);
                    reject(error);
                });
        }
        catch (error) {
            console.error("Error fetching Jira transitions: ", error);
            reject(error);
        }
    });
}

const updateJiraStatus = async (ticketId, statusId) => {
    if (isOffline) {
        console.log('Offline mode - skipping transition fetch');
        return Promise.reject(new Error('Cannot update status while offline'));
    }

    const myHeaders = getHeaders();

    const raw = JSON.stringify({
        "transition": {
            "id": statusId
        }
    });

    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
    };

    return new Promise((resolve, reject) => {
        try {
            fetch(`https://YOUR_JIRA_DOMAIN/rest/api/2/issue/${ticketId}/transitions`, requestOptions)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Update Jira Status response was not ok");
                    }
                    localStorage.removeItem('jiraStoryCache');
                    resolve(response);
                })
                .catch((error) => {
                    console.error(error);
                    reject(error);
                });
        }
        catch (error) {
            console.error("Error updating Jira status: ", error);
            reject(error);
        }
    });
}

const getAssigneesFromBoard = async (boardId) => {
    if (isOffline) {
        console.log('Offline mode - skipping assignee fetch');
        return [];
    }

    const myHeaders = getHeaders();

    const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
    };

    return new Promise((resolve, reject) => {
        try {
            fetch(`https://YOUR_JIRA_DOMAIN/rest/agile/1.0/board/${boardId}/issue`, requestOptions)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Get Board Issues response was not ok");
                    }
                    return response.json();
                })
                .then((respBody) => {
                    const issues = respBody.issues;
                    const assignees =
                        [...new Set(issues.map(issue => {
                            return JSON.stringify({
                                name: issue.fields?.assignee?.displayName,
                                userName: issue.fields?.assignee?.name
                            });
                        }).filter(Boolean))];
                    resolve(assignees);
                })
                .catch((error) => {
                    console.error(error);
                    reject(error);
                });
        } catch (error) {
            console.error("Error fetching board issues: ", error);
            reject(error);
        }
    });
};

const populateAssignees = async (currentAssignee) => {
    const assigneeSelect = document.getElementById('ticket-assignee');
    assigneeSelect.options.length = 0;
    await getAssigneesFromBoard(YOUR_BOARD_ID)
        .then(rawAssignees => {
            const assignees = rawAssignees.map(JSON.parse);
            return [...new Set(assignees)];
        })
        .then(assignees => {
            assignees.forEach(assignee => {
                if (assignee.name.includes("[X]")) { return; }
                const option = document.createElement('option');
                option.value = assignee.userName;
                option.innerHTML = assignee.name;
                assigneeSelect.appendChild(option);

                assigneeSelect.value = "";
                assigneeSelect.value = currentAssignee;
            });
        }).catch((error) => {
            console.error("Error fetching assignees: ", error);
        });
};

const updateJiraAssignee = async (ticketId, assigneeUserName) => {
    if (isOffline) {
        console.log('Offline mode - skipping assignee update');
        return Promise.reject(new Error('Cannot update assignee while offline'));
    }

    const myHeaders = getHeaders();

    const raw = JSON.stringify({ "name": assigneeUserName });

    const requestOptions = {
        method: "PUT",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
    };

    return new Promise((resolve, reject) => {
        try {
            fetch(`https://YOUR_JIRA_DOMAIN/rest/api/2/issue/${ticketId}/assignee`, requestOptions)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Update Jira Assignee response was not ok");
                    }
                    localStorage.removeItem('jiraStoryCache');
                    resolve(response);
                })
                .catch((error) => {
                    console.error(error);
                    reject(error);
                });
        }
        catch (error) {
            console.error("Error updating Jira assignee: ", error);
            reject(error);
        }
    });
};

const handleUserNotes = (noteElement, storyId) => {
    noteElement.removeEventListener('keyup', noteElement.saveNote);
    const saveStatus = document.getElementById('save-status');
    noteElement.value = localStorage.getItem(`notes-${storyId}`) || '';

    document.getElementById('note-container').open = !!noteElement.value;

    let noteTakingTimeout;
    noteElement.saveNote = ('keyup', () => {
        clearTimeout(noteTakingTimeout);
        console.log('Note taking timeout cleared');
        noteTakingTimeout = setTimeout(() => {
            localStorage.setItem(`notes-${storyId}`, noteElement.value);
            saveStatus.innerHTML = "Note saved!";
            setTimeout(() => {
                saveStatus.innerHTML = "";
            }, 1500);
        }, 1500);
    });

    noteElement.addEventListener('keyup', noteElement.saveNote);

};

const prepareMainSection = async () => {
    if (populatedFromCache()) { return; }

    document.getElementById('tickets').innerHTML = "<h1>Loading...</h1>";
    await getActiveJiraStories().then((tickets) => {
        document.getElementById('tickets').innerHTML = "";
        if (!tickets?.length) {
            console.log('No active Jira stories found or error fetching active Jira stories');
            return;
        }
        updateJiraStoryCache(tickets);
        populateTickets(tickets);
    }).catch((error) => {
        console.log("Error fetching active Jira stories: ", error);
        isOffline = true;
        document.getElementById('tickets').innerHTML = "<h1>Loading from cache...</h1>";
        const cachedTickets = getJiraStoryCache();
        if (!cachedTickets.stories?.length) {
            console.error('No cached Jira stories found');
            document.getElementById('tickets').innerHTML = "<h1>Offline mode - No cached Jira stories found</h1>";
            return;
        }
        setTimeout(() => {
            document.getElementById('tickets').innerHTML = "";
            populateTickets(cachedTickets.stories);
        }, 1000);
    });
};

const prepareSettingsUI = () => {
    const settingsInputElems = document.getElementsByClassName('settings-input');
    [...settingsInputElems].forEach((elem) => {
        loadSettings(settings => {
            elem.checked = settings[elem.id];
            applySetting(elem.id, elem.checked);
        });
        elem.addEventListener('change', (event) => {
            saveSetting(event.target.id, event.target.checked);
        });
    })
};

const applySetting = (setting, userChoice) => {
    switch (setting) {
        case 'collapseDescription':
            collapseDescription(userChoice);
    }
};

const collapseDescription = (isCollapsed) => {
    document.querySelector('details.description-container').open = !isCollapsed;
};

const reloadContent = () => {
    document.getElementById('tickets').innerHTML = "<h1>Reloading...</h1>";

    setTimeout(prepareMainSection(), 2000);
};

document.addEventListener('DOMContentLoaded', () => {
    prepareSettingsUI();
    prepareMainSection();
});