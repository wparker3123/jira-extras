const getActiveJiraStories = async () => {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", "YOUR_TOKEN_HERE");

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
                            status: jiraStory.fields?.status?.name
                        }
                    });
                    console.log(newArray);
                    resolve(newArray);
                })
                .catch((error) => {
                    console.error(error);
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

    // const statusOptions = [
    //     "To Do",
    //     "Backlog",
    //     "In Progress",
    //     "Ready for QA",
    //     "Testing",
    //     "Accepted",
    //     "Completed",
    //     "Blocked"
    // ];

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
        div.innerHTML += `<br>${ticket.summary}`;
        div.dataset.id = ticket.id;
        div.addEventListener('click', () => {
            ticketIdInput.value = ticket.id;
            ticketSummaryInput.value = ticket.summary;
            ticketStatusSlider.noUiSlider.set(statusOptions.indexOf(ticket.status));
            console.log('Assignee: ', ticket.assignee);
            populateAssignees(ticket.assignee);
            // ticketAssigneeInput.value = ticket.assignee;
            // ticketAssigneeInput.innerHTML = ticket.assignee;
            ticketDetailsSection.style.display = 'block';
            // ticketDetailsSection.scrollIntoView({ behavior: 'smooth' });

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
                ticketDetailsSection.scrollIntoView({ behavior: 'smooth' });
            });
        });
        containerDiv.appendChild(div);
        if (ticket.status === 'In Progress' || ticket.status === 'Testing') {
            activeTickets.appendChild(containerDiv);
        }
        else if (ticket.status === 'Ready for QA') {
            completedTickets.appendChild(containerDiv);
        }
        else {
            ticketList.appendChild(containerDiv);
        }
    });

    // Update ticket status and assignee
    document.getElementById('update-status').addEventListener('click', () => {
        const ticketId = ticketIdInput.value;
        const newStatus = statusOptions[ticketStatusSlider.noUiSlider.get()];
        const newAssignee = ticketAssigneeInput.value;
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket) {
            ticket.status = newStatus;
            ticket.assignee = newAssignee;
            alert(`Status and assignee of ${ticketId} updated to ${newStatus} and ${newAssignee}`);
        }
    });

    document.getElementById('close-details').addEventListener('click', () => {
        ticketDetailsSection.style.display = 'none';
    });
};

const getJiraTransitions = async (ticketId) => {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", "YOUR_TOKEN_HERE");

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
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", "YOUR_TOKEN_HERE");

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
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", "YOUR_TOKEN_HERE");

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
    await getAssigneesFromBoard(YOUR_BOARD_ID).then(rawAssignees => rawAssignees.map(JSON.parse))
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

document.addEventListener('DOMContentLoaded', async () => {
    // Set loading, replace this with spinner
    document.getElementById('tickets').innerHTML = "Loading...";

    await getActiveJiraStories().then((tickets) => {
        document.getElementById('tickets').innerHTML = "";
        if (!tickets?.length) {
            console.log('No active Jira stories found or error fetching active Jira stories');
            return;
        }
        populateTickets(tickets);
    }).catch((error) => {
        console.error("Error fetching active Jira stories: ", error);
    });

    console.log('DOM fully loaded and parsed');
});