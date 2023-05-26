import asyncio
import actions
import threading
import util.wsHook as wsHook
from multiprocessing import Process, Queue, Pipe

def handler(websocket, send, data):
    print("New request: " + data['action'])

    send("New request [1]: " + data['action'])

    print(data)

    hook = wsHook.hook(data['id'], send)

    if hasattr(actions, data['action']):
        print("\n--------------------------\nRUNNING: " + data['action'])
        #getattr(actions, data['action'])(data['args'], hook)
        pipe = Pipe()
        p = Process(target=getattr(actions, data['action']), args=(data['args'], hook), pipe=pipe)
        p.start()
        while True:
            if pipe.poll():
                print(pipe.recv())
                break
    else:
        print("\n--------------------------\nNOT FOUND: " + data['action'])