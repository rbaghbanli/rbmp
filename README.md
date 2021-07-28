# rbmp
Reactive Binary Messaging Protocol

Reactive implementation of binary messaging over websocket.
Can be used for client-server and server-server communication.

## Design

Every binary message includes 12 byte header, 4 bytes for topic identifier, and 8 bytes for reference value.
Multiple requests can be sent from the client on the same specific topic, and response is delivered according to reference value that is used as request identifier.
Client can subscribe for all messages for the specific topic and get them filtered by reference value on the server side avoiding excessive data traffic.

## Installation
npm install rbmp

## Creating connection in browser app
Sample code to create connection in browser app:

```ts
...
const prot = location.protocol.includes( 'https' ) ? 'wss' : 'ws';
const host = window.location.hostname;
const conn_port = new Connection_Port(
	() => new WebSocket( `${ prot }://${ host }` ),
	5 /* attempts to connect */,
	1000 /* ms between connection attempts */
);
...
```

## Creating connection in node app
Sample code to create connection in node app:

```ts
import * as WebSocket from 'ws';
...
const addr = `wss://127.0.0.1`;
const conn_port = new Connection_Port(
	() => new WebSocket( addr, { rejectUnauthorized: false } ),
	5 /* attempts to connect */,
	1000 /* ms between connection attempts */
);
...
```

## Implementing request/response call
Sample code to request some data from server:

```ts
...
const req = Message.from_header( 101010 );
req.write_num64( 101011 );
req.write_string( '101012' );
let response: Observable<Bianry_Message> =
	conn_port.post( req );
...
```

## Implementing subscription stream
Sample code to subscribe to and unsubscribe from server data stream:

```ts
...
subs_pool = new Subscription_Pool();
let stream: Observable<Binary_Message> =
	subs_pool.start( conn_port, sid, msg );
...
subs_pool.stop( conn_port, sid );
subs_pool.destroy( conn_port );
...
```
