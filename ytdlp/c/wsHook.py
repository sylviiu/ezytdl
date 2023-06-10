import json

from .print import print

class logHandler:
    def __init__(self, hook, func, type):
        self.type = type
        self.hook = hook
        self.func = func

    def __call__(self, data):
        # print(data)
        self.func(self.hook._format(data, self.type))
    
    data = ""

    def write(self, data):
        self.data += data
        if '\n' in data:
            self.__call__(self.data)
            self.data = ""

class hook:
    def __init__(self, id, out):
        self.id = id
        self.send = out

        self.debug = logHandler(self, out, 'info')
        self.warning = logHandler(self, out, 'warning')
        self.error = logHandler(self, out, 'error')

    def _format(self, msg, type):
        #print(msg)
        return json.dumps({
            'id': self.id,
            'type': type,
            'content': msg
        }, default=lambda o: '<not serializable>')

    def complete(self, status=None):
        print('Completed message')
        self.send(self._format(status, 'complete'))
    
    def setKill(self, kill):
        self.kill = kill