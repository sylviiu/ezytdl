import json
import threading
import actions
import sys
import io
import builtins

enc = 'charmap'

#sys.stdout = open(sys.stdout.fileno(), mode='w', encoding=enc, buffering=1)
new_stdout = io.TextIOWrapper(sys.stdout.detach(), encoding=enc)
sys.stdout = new_stdout

#sys.stderr = open(sys.stderr.fileno(), mode='w', encoding=enc, buffering=1)
new_stderr = io.TextIOWrapper(sys.stderr.detach(), encoding=enc)
sys.stderr = new_stderr

from c.print import print

import versionHeader

if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    versionHeader.printHeader()
else:
    print("Running in development mode. Versions will not be printed.", flush=True)

print("Creating bridge...")

hooks = {}

def recv(message):
    data = json.loads(message)

    if 'type' in data:
        print("Has type: " + data['type'])

        targetId = data['targetID'] if 'targetID' in data else data['id']

        print("ID: " + data['id'])
        print("Target ID: " + targetId)

        if(hasattr(actions, data['type'])):
            threading.Thread(target=getattr(actions, data['type'])(hooks[targetId] if targetId in hooks else None, data), name="ACTION THREAD / " + targetId, daemon=True).start()
        else:
            print("Unknown message type: " + data['type'])
    else:
        if data['id'] in hooks:
            hook = hooks[data['id']]
        else:
            def out(data):
                if hasattr(data, 'decode'):
                    data = data.decode(enc, 'replace')
                
                if(type(data) != 'str'):
                    data = str(data)
                
                data = data.encode(enc, 'replace').decode(enc, 'replace')
                
                sys.stdout.write(data + '\n\r')
                #sys.stdout.write((data.encode('utf-8', 'replace') if hasattr(data, 'encode') else data + '\n\r').decode('utf-8', 'replace'))
                sys.stdout.flush()
            
            hook = actions.hook(data['id'], out)
            hooks[data['id']] = hook
        
        def complete():
            hooks[data['id']].complete()
            del hooks[data['id']]
            print("Completed task: " + data['id'])

        threading.Thread(target=actions.exec(hook, data, complete), name="ACTION THREAD / " + data['id'], daemon=True).start()

print("Bridge ready", flush=True)

def handleGlobalException(exc_type, exc_value, exc_traceback):
    print("Error in bridge (global exception): " + str(exc_type) + " - " + str(exc_value) + " - " + str(exc_traceback))

sys.excepthook = handleGlobalException

for line in sys.stdin:
    try:
        recv(line)
    except:
        exc_info = sys.exc_info()
        handleGlobalException(exc_info[0], exc_info[1], exc_info[2])