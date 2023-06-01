import json

import yt_dlp
import sys

def printHeader():
    versionObj = {
        'Python': {
            'version': sys.version.split(' ')[0],
            'implementation': sys.implementation.name,
        },
        'yt-dlp': {
            'channel': yt_dlp.version.CHANNEL,
            'version': yt_dlp.version.__version__,
            'commit': yt_dlp.version.RELEASE_GIT_HEAD
        }
    }

    print(json.dumps(versionObj), flush=True)