import yt_dlp
import threading
import concurrent.futures
import json
from c.writeStringWrapper import writeStringWrapper

def parseOptions(opt, hook):
    parsedOptions = yt_dlp.parse_options(opt)

    returnOptions = {
        'options': parsedOptions[3],
        'resources': parsedOptions[2]
    }

    returnOptions['options']['no_color'] = True

    return returnOptions

def exec(args, hook):
    parsed = parseOptions(args, hook)

    yt_dlp.write_string = writeStringWrapper(hook)

    with yt_dlp.YoutubeDL(parsed['options']) as ytdl:
        #print(ytdl._write_string)
        ytdl._write_string = writeStringWrapper(hook)
        
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(ytdl.download, parsed['resources'])
            #print("Started ytdl download thread")
            result = future.result()
            #print("Done.")
            hook.complete()