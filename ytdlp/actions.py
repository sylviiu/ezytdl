import yt_dlp
import threading
from c.writeStringWrapper import writeStringWrapper

def parseOptions(opt):
    parsedOptions = yt_dlp.parse_options(opt)

    returnOptions = {
        'options': parsedOptions[3],
        'resources': parsedOptions[2]
    }

    returnOptions['options']['progress_with_newline'] = True
    returnOptions['options']['no_color'] = True

    return returnOptions

def exec(args, hook):
    parsed = parseOptions(args)

    write_string = writeStringWrapper(hook)
    yt_dlp.write_string = write_string
    yt_dlp.utils.write_string = write_string

    with yt_dlp.YoutubeDL(parsed['options']) as ytdl:

        ytdl._write_string = write_string
        ytdl.write_string = write_string
        ytdl.write_debug = write_string

        def execDownload():
            ytdl.download(parsed['resources'])
            hook.complete()

        t = threading.Thread(target=execDownload, name="YTDL THREAD", daemon=True)
        t.start()