import sys
import builtins

def print(msg, flush=True):
    sys.stderr.write(str(msg) + "\n\r")
    sys.stderr.flush()
    #builtins.print(msg, file=sys.stderr, flush=flush)