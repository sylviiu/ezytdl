import asyncio
import actions
import threading
import util.wsHook as wsHook
from multiprocessing import Process, Queue, Pipe

def handler(websocket, send, data):
    hook = wsHook.hook(data['id'], send)

    print("\n--------------------------\nRUNNING")
    threading.Thread(target=actions.exec(data['args'], hook), name="ACTION THREAD / " + data['id']).start()