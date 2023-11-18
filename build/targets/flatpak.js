module.exports = {
    flatpak: {
        base: "org.electronjs.Electron2.BaseApp",
        baseVersion: "23.08",
        runtime: "org.freedesktop.Platform",
        runtimeVersion: "23.08",
        finishArgs: [
            "--socket=wayland", 
            "--socket=x11", 
            "--share=ipc", 
            "--device=dri",  
            "--socket=pulseaudio", 
            "--filesystem=home", 
            "--share=network", 
            "--talk-name=org.freedesktop.Notifications", 
            "--filesystem=xdg-videos:ro",
            "--filesystem=xdg-pictures:ro",
            "--filesystem=xdg-download",
            "--talk-name=org.kde.StatusNotifierWatcher",
            "--talk-name=com.canonical.AppMenu.Registrar",
            "--talk-name=com.canonical.indicator.application",
            "--talk-name=com.canonical.Unity.LauncherEntry",
            "--own-name=org.kde.*",
        ],
    }
}