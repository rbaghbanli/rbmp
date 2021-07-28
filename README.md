# rbmp
Reactive Binary Messaging Protocol

Reactive implementation of binary messaging over websocket.
Can be used for client-server and server-server communication.

# Install

npm run rbmp

# Creating connection in browser app

```ts
conn_port = new Connection_Port(
	() => new WebSocket( `${ location.protocol.includes( 'https' ) ? 'wss' : 'ws' }://${ window.location.hostname }` ),
	5 /* attempts to connect */,
	1000 /* ms between connection attempts */
);
...
```

# Creating connection in node app

```ts
import * as WebSocket from 'ws';
...
conn_port = new Connection_Port(
	() => new WebSocket( this._is_wss ? `wss://127.0.0.1` : `ws://127.0.0.1`, { rejectUnauthorized: false } )
	5 /* attempts to connect */,
	1000 /* ms between connection attempts */
);
...
```

# Implementing request/response call

```ts
...
const req = Message.from_header( 101010 );
req.write_num64( 101011 );
req.write_string( '101012' );
let response: Observable<Bianry_Message> = conn_port.post( req );
```

# Implementing subscription stream

```ts
...
subs_pool = new Subscription_Pool();
let stream: Observable<Binary_Message> = subs_pool.start( conn_port, sid, msg );
```
