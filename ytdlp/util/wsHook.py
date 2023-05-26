import json

class hook:
    def __init__(self, id, send) -> None:
        self.id = id
        self.send = send
        self.send('Initialized queue')

    def __format(self, msg):
        o = {
            'id': self.id,
            'msg': msg
        }
        return json.dumps(o, indent = 4)
    
    def debug(self, msg):
        print(msg)
        self.send(self.__format(msg))
    
    def warning(self, msg):
        print(msg)
        self.send(self.__format(msg))
    
    def error(self, msg):
        print(msg)
        self.send(self.__format(msg))