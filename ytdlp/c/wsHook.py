import json
import traceback

from .print import print

class logHandler:
    def __init__(self, hook, func, type, trace=False):
        self.type = type
        self.hook = hook
        self.func = func
        self.trace = trace

    def __call__(self, data):
        # print(data)
        self.func(self.hook._format(data, self.type, self.trace))
    
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
        self.error = logHandler(self, out, 'error', True)
        self.infodump = logHandler(self, out, 'infodump')

    def _format(self, msg, type, trace):
        #print(msg)
        return json.dumps({
            'id': self.id,
            'type': type,
            'content': msg,
            'trace': traceback.format_exc() if trace else None
        }, ensure_ascii=False, default=lambda o: '<not serializable>')

    def complete(self, status=None):
        print('Completed message')
        self.send(self._format(status, 'complete', False))
    
    def setKill(self, kill):
        self.kill = kill