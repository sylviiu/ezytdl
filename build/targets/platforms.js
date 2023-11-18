module.exports = {
    "win": {
        "icon": "res/packageIcons/icon-512x512.ico",
        "target": [
            "nsis",
            "zip"
        ]
    },
    "linux": {
        "icon": "res/packageIcons/icon-512x512.png",
        "category": "Utility",
        "target": [
            "tar.gz",
            "AppImage",
            "flatpak"
        ]
    },
    "mac": {
        "icon": "res/packageIcons/icon.icns",
        "category": "public.app-category.utilities",
        "target": [
            "dmg",
        ]
    },
};