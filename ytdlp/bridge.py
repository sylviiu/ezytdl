import json
import threading
import actions

import c.wsHook as wsHook

from websocket_server import WebsocketServer

print("Creating bridge...")

def recv(client, websocket, message):
    print("recv called: " + message)
    data = json.loads(message)

    if hasattr(data, 'content'):
        websocket.send_message_to_all(message)
    else:
        hook = wsHook.hook(data['id'], websocket.send_message_to_all)
        threading.Thread(target=actions.exec(data['args'], hook), name="ACTION THREAD / " + data['id'], daemon=True).start()

def wsHandler(client, websocket):
    ip = client['address'][0]
    port = client['address'][1]

    print("New connection: " + ip + ":" + str(port))

server = WebsocketServer(host='127.0.0.1', port=8765)
server.set_fn_new_client(wsHandler)
server.set_fn_message_received(recv)
print("Bridge ready", flush=True)
server.run_forever()