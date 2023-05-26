import yt_dlp as yt
import json
import asyncio
import threading

def parseOptions(opt, hook):
    options = {
        #"quiet": True,
        "logger": hook,
    }

    resources = []

    skipOpt = False

    for o in opt:
        print(o)
        if skipOpt:
            skipOpt = False
            continue
        else:
            match o:
                case '-o':
                    options['outtmpl'] = opt[opt.index(o) + 1]
                    skipOpt = True
                case '-f':
                    options['format'] = opt[opt.index(o) + 1]
                    skipOpt = True
                case '-c':
                    options['continue_dl'] = True
                case '-r':
                    options['retries'] = opt[opt.index(o) + 1]
                    skipOpt = True
                case '-R':
                    options['retries'] = 10
                case '-s':
                    options['simulate'] = True
                case '-S':
                    options['writesubtitles'] = True
                case '-x':
                    options['extractaudio'] = True
                case '-p':
                    options['proxy'] = opt[opt.index(o) + 1]
                    skipOpt = True
                case '--dump-single-json':
                    options['dump_single_json'] = True
                case _:
                    print('Assuming URL / query: ' + o)
                    resources.append(o)
    
    print(opt)
    print(options)

    returnOptions = {
        'options': options,
        'resources': resources
    }

    print("Created returnOptions")
    print(returnOptions)

    return returnOptions

def download(args, hook):
    parsed = parseOptions(args, hook)

    with yt.YoutubeDL(parsed['options']) as ytdl:
        print("Created ytdl object")
        thread = threading.Thread(target=ytdl.download, args=(parsed['resources']), name="YTDL PROCESS")
        print("Started ytdl download thread")
        thread.start()