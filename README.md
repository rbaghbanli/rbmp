# rbmp
Reactive Binary Messaging Protocol

Reactive implementation of binary messaging over websocket.
This library may be used for lean browser-to-server and server-to-server communication.


## Binary Message
Binary message is a byte sequence designed for compact data representation and minimal transmission footprint.
Every binary message is identified by topic string to enable various messaging patterns, such as request/response and publish/subscribe.


## Reacive Connection
Reactive connection provides functionality to establish reactive websocket connection.
Constructor takes factory method to instantiate websocket instance as the first parameter to allow for browseror or nodejs websocket.
Reactive connection is used to send binary message over websocket connection,
 wait for all messages on specific topic,
 send binary message as a request and await on response,
 and subscribe to/unsubscribe from messages being published by the reactive publication.


## Reactive Publication
Reactive publication implements server functionality to subscribe/unsubscribe websocket connections,
 and publish messages to subscribed websocket connections.


## Creating connection in browser app
Sample code to create connection in browser app:

```ts
...
const prot = location.protocol.includes( 'https' ) ? 'wss' : 'ws';
const host = window.location.hostname;
const conn = new Reactive_Connection(
	() => new WebSocket( `${ prot }://${ host }` ),
	WebSocket.OPEN,
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
	WebSocket.OPEN,
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
// send request and subscribe to response message
conn.post( req ).subscribe( () => console.log( 'Response' ) );
...
// subscribe to all messages on topic 'Topic1'
conn.wait( msg => msg.topic === 'Topic1' ).subscribe( () => console.log( 'Message' ) );
...
```


## Implementing server managed subscriptions
Sample code to subscribe to and unsubscribe from server data streams:

```ts
...
// subscribe to messages on topic 'MyTopic' and unsubscribe after 1 second
const sub =  conn.subscribe( 'MyTopic' ).subscribe( msg => console.log( `Message ${ msg.topic }` ) );
timer( 1000 ).subscribe( () => sub.unsubscribe() );
...
// subscribe to first 500 messages on topic 'OtherTopic'
conn.subscribe( 'OtherTopic', 500 ).subscribe( msg => console.log( `Message ${ msg.topic }` ) );
...
```
