import json

class hook:
    def __init__(self, id, send) -> None:
        self.id = id
        self.send = send

    def __format(self, msg, type):
        #print(msg)
        o = {
            'id': self.id,
            'type': type,
            'content': msg
        }
        return json.dumps(o, indent = 4)

    def complete(self):
        #print('Completed ws message')
        self.send(self.__format('Completed', 'complete'))
    
    def debug(self, msg):
        #print(msg)
        self.send(self.__format(msg, 'info'))
    
    def warning(self, msg):
        #print(msg)
        self.send(self.__format(msg, 'warn'))
    
    def error(self, msg):
        #print(msg)
        self.send(self.__format(msg, 'error'))