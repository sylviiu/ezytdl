import asyncio
import json
import handler
import threading
import util.wsQueue as queue

from websockets.server import serve

async def wsHandler(websocket):
    ctx = {}

    threading.Thread(target=queue.asyncWebsocketMessageQueue(websocket, ctx), name="WS QUEUE").start()

    send = ctx["send"]

    send('testing')

    ip = websocket.remote_address[0]
    port = websocket.remote_address[1]

    print("New connection: " + ip + ":" + str(port))
    
    while True:
        print("Waiting for request...")
        data = await websocket.recv()
        data = json.loads(data)

        print("New request: " + data['action'])

        threading.Thread(target=handler.handler(websocket, send, data), name="WS CONNECTION ID: " + str(data['id'])).start()

async def main():
    async with serve(wsHandler, "localhost", 8765):
        print("-- SERVER IS NOW RUNNING --")
        await asyncio.Future()  # run forever

asyncio.run(main())