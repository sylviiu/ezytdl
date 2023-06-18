import json
from c.print import print

def printHeader():
    from constants import BUILD_DATE
    import yt_dlp
    import sys

    versionObj = {
        'ezytdl-pybridge': {
            'Built': BUILD_DATE,
            'Python Version': sys.version.split(' ')[0],
            'Python Implementation': sys.implementation.name,
        },
        'yt-dlp': {
            'Channel': yt_dlp.version.CHANNEL,
            'Version': yt_dlp.version.__version__,
            'Commit': yt_dlp.version.RELEASE_GIT_HEAD
        }
    }

    print(json.dumps(versionObj, ensure_ascii=False), flush=True)