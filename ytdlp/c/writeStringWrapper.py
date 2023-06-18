import json
import yt_dlp

from .print import print

class writeStringWrapper:
    def __init__(self, wsHook, type='info'):
        self.wsHook = wsHook
        self.type = type
    
    _printed_messages = set()
    
    def __call__(self, s, out=None, encoding=None, only_once=False):
        assert isinstance(s, str)
        logFunc = 'error'

        if only_once and s in self._printed_messages:
            return
        self._printed_messages.add(s)

        if out is not None and hasattr(out, 'name'):
            if 'stdout' in out.name:
                logFunc = 'debug'
            elif 'stderr' in out.name:
                logFunc  = 'error'
            else:
                logFunc = 'debug'

        enc, buffer = None, out
        if 'b' in getattr(out, 'mode', ''):
            enc = encoding or yt_dlp.preferredencoding()
        elif hasattr(out, 'buffer'):
            buffer = out.buffer
            enc = encoding or getattr(out, 'encoding', None) or yt_dlp.preferredencoding()

        output = s.encode(enc, 'ignore') if enc else s
        
        #buffer.write(s.encode(enc, 'ignore') if enc else s)
        getattr(self.wsHook, logFunc)(json.dumps(output, ensure_ascii=False, encoding='utf-8', default=lambda o: '<not serializable>') if type(output) is dict else output.decode('utf-8', 'ignore') if hasattr(output, 'decode') else output)