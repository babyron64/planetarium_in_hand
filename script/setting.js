async function loadSettingPane() {
    const html_text = await loadFileText("/page/setting.html");
    const setting = document.createElement("div");
    setting.className = "setting";
    setting.innerHTML = html_text;
    initSettingPane(setting);
    document.body.appendChild(setting);
    return setting;
}

function initSettingPane(element) {
    // allow user to scroll
    element.addEventListener("touchmove", e => {
        e.stopPropagation();
    });
}

function settingPaneOnEnable(element) {
    element.querySelector("#ok_button").style.visibility = "visible";
}

function settingPaneOnDisable(element) {
    element.querySelector("#ok_button").style.visibility = "hidden";
}