document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('info').innerHTML = 'This app is using:<br>' +
      `Node.js ${process.versions.node}<br>` +
      `Chromium ${process.versions.chrome}<br>` +
      `Electron ${process.versions.electron}`
  })