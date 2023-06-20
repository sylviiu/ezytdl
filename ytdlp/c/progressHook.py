import math
import json
from .print import print

class progressHook:
    def __init__(self, hook):
        self.hook = hook
    
    sent_info = False

    def __call__(self, data):
        if '_default_template' in data:
            self.hook.debug("[download] " + data['_default_template'])
        if 'info_dict' in data and not self.sent_info:
            self.hook.infodump(json.dumps(data['info_dict'], ensure_ascii=False, default=lambda o: '<not serializable>'))
            self.sent_info = True