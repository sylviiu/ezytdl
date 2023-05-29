import asyncio
from eventemitter import EventEmitter, EventIterable

class asyncWebsocketMessageQueue:
    emitter = EventEmitter()

    def __init__(self, ws, ctx):
        self.ws = ws
        self._task = asyncio.create_task(self._run())
        
        def put(msg):
            #print("put called: " + msg)
            self.emitter.emit('put', msg)
        
        ctx['send'] = put

    async def _run(self):
        print("Starting ws queue...")

        async for message in EventIterable(self.emitter, 'put'):
            #print("sending ws msg: " + message)
            await self.ws.send(message)
            #print("sent ws msg: " + message)

    async def close(self):
        await self.queue.join()
        self._task.cancel()
        await self._task