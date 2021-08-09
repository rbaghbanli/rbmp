# rbmp
Reactive Binary Messaging Protocol

Reactive implementation of binary messaging over websocket.
Can be used for client-server and server-server communication.


## Binary Message
Binary message is a byte sequence designed for compact data representation and minimal transmission footprint.
Every binary message is prefixed with 12 byte message header to enable various messaging patterns.
Message header consists of 4 bytes of topic identifier, and 8 bytes of reference value.


## Connection Port
Connection port provides functionality to establish websocket connection in reactive way.
Constructor takes factory method to instantiate websocket instance as the first parameter.
Connection port can be used to send binary message over websocket connection.
It also can be used to send binary message as a request and await on response.
Multiple requests can be sent from the client on the same topic, and response is delivered according to reference value that is used as request identifier.
Connection port can also wait for all messages on specific topic and optional reference value.


## Subscription Pool
Subscription pool provides management of subscription observables.
Client can subscribe for all messages for the specific topic, or subscribe for messages for the specific topic and get them filtered by reference value on the server side.


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


## Creating connection in nodejs app
Sample code to create connection in nodejs app:

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


## Implementing request/response calls
Sample code to request some data from server:

```ts
...
// create binary message for request on topic 101010
const req = Message.from_header( 101010 );
req.write_num64( 101011 );
req.write_string( '101012' );
// observable of response message will be invoked no more than once
let response: Observable<Binary_Message> =
	conn_port.post( req );
...
```


## Implementing subscription streams
Sample code to subscribe to and unsubscribe from server data stream:

```ts
...
// create subscription pool
subs_pool = new Subscription_Pool();
// stream all messages on topic 101010
let stream_all: Observable<Binary_Message> =
	subs_pool.start( conn_port, 365, Message.from_header( 101010 ) );
// stream messages on topic 20 filtered by reference value 100
let stream_100: Observable<Binary_Message> =
	subs_pool.start( conn_port, 720, Message.from_header( 20, 100 ) );
...
// unsubscribe from stream number 365
subs_pool.stop( conn_port, 365 );
...
// unsubscribe from all streams and destroy pool
subs_pool.destroy( conn_port );
...
```
