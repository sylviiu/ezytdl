import asyncio

class asyncWebsocketMessageQueue:
    def __init__(self, ws, ctx):
        self.ws = ws
        self.queue = asyncio.Queue()
        self._task = asyncio.create_task(self._run())
        
        def put(msg):
            print("put called: " + msg)
            self.queue.put_nowait(msg)
        
        self.put = put
        
        ctx['send'] = put

    async def _run(self):
        while True:
            print("Awaiting queue...")
            message = await self.queue.get()
            print("sending ws msg: " + message)
            await self.ws.send(message)
            print("sent ws msg: " + message)
            await asyncio.sleep(0)

    async def close(self):
        await self.queue.join()
        self._task.cancel()
        await self._task