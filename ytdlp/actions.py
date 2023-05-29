import yt_dlp as yt
import threading
import concurrent.futures
import json

def parseOptions(opt, hook):
    returnOptions = {
        'action': 'download',
        'options': {
            'logger': hook,
            'verbose': True,
        },
        'resources': []
    }

    skipOpt = False

    for o in opt:
        print(o)
        if skipOpt:
            skipOpt = False
            continue
        else:
            match o:
                case '-o':
                    returnOptions['options']['outtmpl'] = opt[opt.index(o) + 1]
                    skipOpt = True
                case '-f':
                    returnOptions['options']['format'] = opt[opt.index(o) + 1]
                    skipOpt = True
                case '-c':
                    returnOptions['options']['continue_dl'] = True
                case '-r':
                    returnOptions['options']['retries'] = opt[opt.index(o) + 1]
                    skipOpt = True
                case '-R':
                    returnOptions['options']['retries'] = 10
                case '-s':
                    returnOptions['options']['simulate'] = True
                case '-S':
                    returnOptions['options']['writesubtitles'] = True
                case '-x':
                    returnOptions['options']['extractaudio'] = True
                case '-p':
                    returnOptions['options']['proxy'] = opt[opt.index(o) + 1]
                    skipOpt = True
                case '--dump-single-json':
                    returnOptions['action'] = 'extract_info'
                    returnOptions['options']['logtostderr'] = True
                case _:
                    print('Assuming URL / query: ' + o)
                    returnOptions['resources'].append(o)
    
    if(returnOptions['action'] != 'download'):
        returnOptions['options']['skip_download'] = True
        returnOptions['options']['simulate'] = True

    print(opt)
    print(returnOptions)

    hook.debug("Parsed options: " + json.dumps(returnOptions['options'], indent=4, default=lambda o: '<not serializable>'))
    hook.debug("Parsed resource(s): [ " + ", ".join(returnOptions['resources']) + " ]")
    hook.debug("Parsed action: " + returnOptions['action'])

    return returnOptions

def exec(args, hook):
    parsed = parseOptions(args, hook)

    with yt.YoutubeDL(parsed['options']) as ytdl:
        print("Created ytdl object (ACTION: " + parsed['action'] + ")")
        """
        thread = threading.Thread(target=getattr(ytdl, parsed['action']), args=(parsed['resources']), name="YTDL PROCESS")
        print("Started ytdl download thread")
        thread.start()
        thread.join()
        print("Done.")
        hook.complete()
        """
        
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(getattr(ytdl, parsed['action']), parsed['resources'][0])
            print("Started ytdl download thread")
            result = future.result()
            print("Done.")

            if result is not None:
                hook.debug(json.dumps(result, indent=4, default=lambda o: '<not serializable>'))

            hook.complete()