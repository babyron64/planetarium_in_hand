// This function must not be async.
function initUI() {
   const progress_pane = document.querySelector(".prog_pane");  
   progress_pane.remove();
   plContainer.add("progress_pane", progress_pane);
}

function enterProgress() {
    const progress_pane = plContainer.get("progress_pane");
    if (!document.body.contains(progress_pane)) {
        document.body.appendChild(progress_pane);
    }
}

function exitProgress() {
    const progress_pane = plContainer.get("progress_pane");
    if (document.body.contains(progress_pane)) {
        progress_pane.remove();
    }
}