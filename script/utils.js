async function loadFileText(fileurl) {
    const response = await fetch(fileurl);
    return response.text();
}

async function loadFileJSON(fileurl) {
    const response = await fetch(fileurl);
    return response.json();
}