const versionRequest = new XMLHttpRequest();

versionRequest.open('GET', 'http://localhost:3000/version', true);

versionRequest.onload = () => {
    const version = versionRequest.responseText;

    document.getElementById(`version`).innerHTML = `v${version}`;
}

versionRequest.send();