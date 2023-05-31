import json
import threading
import sys
import actions
import asyncio
from concurrent.futures import ProcessPoolExecutor
from multiprocessing import Process, current_process

processName = current_process().name

import c.wsHook as wsHook

from websocket_server import WebsocketServer

print("Creating bridge...")
print("Process name: " + processName, flush=True)
print("Argv: " + str(sys.argv), flush=True)

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

if processName == 'MainProcess':
    server = WebsocketServer(host='127.0.0.1', port=8765)
    server.set_fn_new_client(wsHandler)
    server.set_fn_message_received(recv)
    print("Bridge ready", flush=True)
    server.run_forever()