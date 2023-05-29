import json

class hook:
    def __init__(self, id, send) -> None:
        self.id = id
        self.send = send

    def __format(self, msg, type):
        #print(msg)
        return json.dumps({
            'id': self.id,
            'type': type,
            'content': msg
        }, indent = 4, default=lambda o: '<not serializable>')

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