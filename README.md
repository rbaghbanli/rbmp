# rbmp
Reactive Binary Messaging Protocol

Reactive implementation of binary messaging over websocket.
Can be used for client-server and server-server communication.


## Binary Message
Binary message is a byte sequence designed for compact data representation and minimal transmission footprint.
Every binary message is identified by topic string to enable various messaging patterns, such as request/response and publish/subscribe.


## Reacive Connection
Reactive connection provides functionality to establish websocket connection in reactive way.
Constructor takes factory method to instantiate websocket instance as the first parameter.
Reactive connection is used to send binary message over websocket connection,
 send binary message as a request and await on response,
 and wait for all messages on specific topic.


## Reactive Subscription
Reactive subscription provides management of subscription stream of publication service.


## Creating connection in browser app
Sample code to create connection in browser app:

```ts
...
const prot = location.protocol.includes( 'https' ) ? 'wss' : 'ws';
const host = window.location.hostname;
const conn = new Reactive_Connection(
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
const conn = new Reactive_Connection(
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
const req = new Binary_Message( 'Topic 101010' );
req.write_num64( 101011 );
req.write_string( '101012' );
// observable of response message will be invoked no more than once
let response: Observable<Binary_Message> =
	conn.post( req );
...
```


## Implementing subscription streams
Sample code to subscribe to and unsubscribe from server data stream:

```ts
...
// create subscription pool
const subs1 = new Reactive_Subscription( conn, 'MyTopic' );
// stream first 500 messages on topic
const stream_500: Observable<Binary_Message> =
	subs1.start( 500 );
// stream all messages on topic
const subs2 = new Reactive_Subscription( conn, 'MyTopic2' );
const stream_all: Observable<Binary_Message> =
	subs2.start();
...
// unsubscribe from streams
subs1.stop();
subs2.stop();
...
```
