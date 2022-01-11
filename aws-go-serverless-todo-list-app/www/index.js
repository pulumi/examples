const apiEndpoint = `${API_ENDPOINT}/todo`

function loadToDo() {
    const req = new XMLHttpRequest();
    req.open("GET", apiEndpoint);
    req.onload = function() {
        const jsonResponse = JSON.parse(req.responseText).sort(function(a, b){
            if (a.id < b.id){
                return 1;
            }
            if (a.id > b.id){
                return -1;
            }
            return 0;
        });

        toDoListDoc = document.getElementById("to-do-list");
        toDoListDoc.innerHTML = '';
        jsonResponse.forEach(todo => {
           const toDoItem = document.createElement("div");
           toDoItem.id = todo.id;
           toDoItem.classList.add("ToDoItem");
           toDoItem.innerHTML = `<span>${todo.summary}</span>`;
           const deleteBtn = document.createElement("input");
           deleteBtn.classList.add("Btn");
           deleteBtn.classList.add("DeleteBtn");
           deleteBtn.setAttribute("type", "submit");
           deleteBtn.setAttribute("onclick", `deleteToDo(${todo.id})`);
           deleteBtn.setAttribute("value", "x");
           toDoItem.appendChild(deleteBtn);
           toDoListDoc.appendChild(toDoItem);
        });
    }
    req.send();
}

function postToDo() {
    const req = new XMLHttpRequest();
    todo = document.getElementById("new-to-do").value;
    if (todo) {
        body = {
            "summary": todo
        };
    
        req.open("POST", apiEndpoint);
        req.setRequestHeader("Content-Type", "application/json;charset=UTL-8");
        req.onload = function() {
            loadToDo();
        }
        req.send(JSON.stringify(body));
    }
}

function deleteToDo(id) {
    const req = new XMLHttpRequest();
    req.open("DELETE", apiEndpoint + `/${id}`);
    req.setRequestHeader("Content-Type", "application/json;charset=UTL-8");
    req.onload = function() {
        loadToDo();
    }
    req.send();
}