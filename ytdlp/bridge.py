import json
import handler
import threading

from websocket_server import WebsocketServer

print("Creating bridge...")

def recv(client, websocket, message):
    def send(msg):
        #print("send called: " + msg)
        websocket.send_message_to_all(msg)
    
    print("recv called: " + message)
    
    data = json.loads(message)

    threading.Thread(target=handler.handler(websocket, send, data), name="WS CONNECTION ID: " + str(data['id'])).start()

def wsHandler(client, websocket):
    ip = client['address'][0]
    port = client['address'][1]

    print("New connection: " + ip + ":" + str(port))

server = WebsocketServer(host='127.0.0.1', port=8765)
server.set_fn_new_client(wsHandler)
server.set_fn_message_received(recv)
print("Bridge ready", flush=True)
server.run_forever()