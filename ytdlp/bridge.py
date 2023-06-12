import json
import threading
import actions
import sys
import traceback
import builtins

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
                builtins.print(data + '\n\r', flush=True)
                #sys.stdout.write(data + '\n\r')
                #sys.stdout.flush()
            
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