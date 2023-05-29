import asyncio
import actions
import threading
import c.wsHook as wsHook
from multiprocessing import Process, Queue, Pipe

def handler(websocket, send, data):
    hook = wsHook.hook(data['id'], send)
    threading.Thread(target=actions.exec(data['args'], hook), name="ACTION THREAD / " + data['id']).start()