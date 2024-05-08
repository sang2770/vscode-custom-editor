// @ts-check
// Script run within the webview itself.
(function () {

  // @ts-ignore
  const vscode = acquireVsCodeApi();

  const noteContainer = document.querySelector(".notes");
  console.log("noteContainer", noteContainer);
  const addButtonContainer = document.querySelector(".add-button");
  addButtonContainer?.querySelector("button")?.addEventListener("click", () => {
    vscode.postMessage({
      command: "add",
    });
  });

  function updateContent(text) {
    let json;
    try {
      if (!text) {
        json = {};
      }
      json = JSON.parse(text);
    } catch (e) {
      json = {};
    }
    console.log("json", json);
    if (!noteContainer) return;
    noteContainer.innerHTML = "";
    (json.scratches ?? []).forEach((note) => {
      const element = document.createElement("div");
      element.className = "note";
      noteContainer.appendChild(element);

      const text = document.createElement("div");
      text.className = "text";
      const textContent = document.createElement("span");
      textContent.innerText = note.text;
      text.appendChild(textContent);
      element.appendChild(text);

      const created = document.createElement("div");
      created.className = "created";
      created.innerText = new Date(note.created).toUTCString();
      element.appendChild(created);

      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-button";
      deleteButton.addEventListener("click", () => {
        vscode.postMessage({ type: "delete", id: note.id });
      });
      element.appendChild(deleteButton);
    });

    !!addButtonContainer && noteContainer.appendChild(addButtonContainer);
  }


  window.addEventListener("message", (event) => {
    switch (event.data?.type){
        case "update":
            updateContent(event.data?.text);
            break;
        default:
            break;
    }
  });
})();
