import json

class logHandler:
    def __init__(self, hook, type):
        self.hook = hook
        self.type = type

    def __call__(self, data):
        # print(data)
        self.hook.send(self.hook._format(data, self.type))
    
    data = ""

    def write(self, data):
        self.data += data
        if '\n' in data:
            self.__call__(self.data)
            self.data = ""

class hook:
    def __init__(self, id, send):
        self.id = id
        self.send = send

        self.debug = logHandler(self, 'info')
        self.warning = logHandler(self, 'warning')
        self.error = logHandler(self, 'error')

    def _format(self, msg, type):
        #print(msg)
        return json.dumps({
            'id': self.id,
            'type': type,
            'content': msg
        }, indent = 4, default=lambda o: '<not serializable>')

    def complete(self, status=None):
        #print('Completed ws message')
        self.send(self._format(status, 'complete'))
    
    def setKill(self, kill):
        self.kill = kill