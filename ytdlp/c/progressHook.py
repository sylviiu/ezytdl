import math

from .print import print

class progressHook:
    def __init__(self, hook):
        self.hook = hook
    
    def __call__(self, data):
        if '_default_template' in data:
            self.hook.debug("[download] " + data['_default_template'])