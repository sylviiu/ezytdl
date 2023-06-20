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

        if out is not None and hasattr(out, 'name') and type(out.name) is str:
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

            output = s.encode(enc, 'replace')
            getattr(self.wsHook, logFunc)(json.dumps(output, ensure_ascii=False, default=lambda o: '<not serializable>') if type(output) is dict else output.decode(enc, 'replace') if hasattr(output, 'decode') else output)