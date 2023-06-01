import threading
import ctypes
import inspect

# https://stackoverflow.com/a/325528/21949399

def _async_raise(tid, hook, exctype):
    if not inspect.isclass(exctype):
        raise TypeError("Only types can be raised (not instances)")
    res = ctypes.pythonapi.PyThreadState_SetAsyncExc(ctypes.c_long(tid), ctypes.py_object(exctype))
    if res == 0:
        raise ValueError("invalid thread id")
    elif res != 1:
        ctypes.pythonapi.PyThreadState_SetAsyncExc(ctypes.c_long(tid), None)
        raise SystemError("PyThreadState_SetAsyncExc failed")
    else:
        hook.error("Killed.")
        hook.complete()

class killableThread(threading.Thread):
    def _get_my_tid(self):
        if not self.is_alive():
            return None

        if hasattr(self, "_thread_id"):
            return self._thread_id

        for tid, tobj in threading._active.items():
            if tobj is self:
                self._thread_id = tid
                return tid

        raise AssertionError("could not determine the thread's id")

    def setHook(self, hook):
        self.hook = hook

    def raiseExc(self, exctype):
        _async_raise( self._get_my_tid(), self.hook, exctype )