import json
import threading
import actions

from websocket_server import WebsocketServer

print("Creating bridge...")

hooks = {}

def recv(client, websocket, message):
    data = json.loads(message)

    if 'type' in data:
        print("Has type: " + data['type'])

        targetId = data['targetID'] if 'targetID' in data else data['id']

        print("ID: " + data['id'])
        print("Target ID: " + targetId)

        if(hasattr(actions, data['type'])):
            threading.Thread(target=getattr(actions, data['type'])(hooks[data[targetId]] if data[targetId] in hooks else None, data), name="ACTION THREAD / " + data[targetId], daemon=True).start()
        else:
            print("Unknown message type: " + data['type'])
    else:
        if data['id'] in hooks:
            hook = hooks[data['id']]
        else:
            hook = actions.hook(data['id'], websocket.send_message_to_all)
            hooks[data['id']] = hook
        
        def complete():
            hooks[data['id']].complete()
            del hooks[data['id']]
            print("Completed task: " + data['id'])

        threading.Thread(target=actions.exec(hook, data, complete), name="ACTION THREAD / " + data['id'], daemon=True).start()

server = WebsocketServer(host='127.0.0.1', port=8765)
server.set_fn_message_received(recv)
print("Bridge ready", flush=True)
server.run_forever()