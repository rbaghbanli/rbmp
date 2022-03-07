# rbmp
Reactive Binary Messaging Protocol

Reactive implementation of binary messaging over websocket.
This library may be used for lean browser-to-server and server-to-server communication.


## Binary Message
Binary message is a big-endian byte sequence designed for compact data representation and minimal transmission footprint.
Every binary message is identified by topic string to enable filtering and various messaging patterns,
 such as request/response and publish/subscribe.


## Reacive Connection
Reactive connection provides functionality to establish reactive websocket connection.
It can be instantiated in browser or nodejs.
Reactive connection emits incoming binary messages,
 sends message over websocket connection,
 posts message as a request and to emit a response for that topic,
 and subscribes/unsubscribes connection to publisher driven messages.


## Reactive Publication
Reactive publication implements publisher functionality in browser or nodejs.
It can be instantiated in browser or nodejs.
Reactive publication sends binary message to websocket connection,
 pings subscribed connections,
 publishes message to all subscribed connections,
 and subscribes/unsubscribes connection by the message topic.


## Creating connection in browser app
Sample code to create connection in browser app:

```ts
...
const prot = location.protocol.includes( 'https' ) ? 'wss' : 'ws';
const host = window.location.hostname;
const conn = new Reactive_Client( () => new WebSocket( `${ prot }://${ host }` ) );
...
```


## Creating connection in nodejs app
Sample code to create connection in nodejs app:

```ts
import * as WebSocket from 'ws';
...
const addr = `wss://127.0.0.1`;
const conn = new Reactive_Client( () => new WebSocket( addr, { rejectUnauthorized: false } ) );
...
```


## Implementing request/response calls
Sample code to request some data from publisher:

```ts
...
// create message for request on topic 101010
const req = new Message_Data( 'Topic 101010' );
req.write_int32( 101011 );
req.write_string( 'text' );
// post request and subscribe to response message
conn.post( req ).subscribe( () => console.log( 'Response' ) );
...
// subscribe to all messages on topic 'Topic1'
conn.emit().pipe( filter( msg => msg.topic === 'Topic1' ) ).subscribe( () => console.log( `Message ${ msg.topic }` ) );
...
```


## Implementing publisher managed subscriptions
Sample code to subscribe to publisher data streams:

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
