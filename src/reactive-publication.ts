import { Binary_Message, __MSG_MAX_NAT32_VALUE } from './binary-message';

export class Reactive_Publication {

	protected readonly _ws_ready: number;
	protected readonly _ws_error: number;
	protected _subscriptions = new Map<string, Map<any, number>>();

	constructor( ws_ready: number = 1, ws_error: number = 1011 ) {
		this._ws_ready = ws_ready;
		this._ws_error = ws_error;
	}

	/**
		Sends binary message to the connection
		@param ws WebSocket to send message to
		@param msg the message to send
		@returns 1 if message is successfully sent, 0 otherwise
	*/
	send( ws: any, msg: Binary_Message ): number {
		try {
			if ( ws && ws.readyState === this._ws_ready ) {
				ws.send( msg.to_buffer() );
				return 1;
			}
			console.error( `Reactive publication: failed to send message ${ msg.topic } on websocket state ${ ws.readyState }` );
		}
		catch ( exc ) {
			console.error( `Reactive publication: failed to send message ${ msg.topic } on error ${ exc }` );
		}
		setTimeout( () => ws.close( this._ws_error ), 0 );
		return 0;
	}

	/**
		Pings the connection or all connections
		@param ws optional WebSocket to ping
		@returns the number of pinged connections
	*/
	ping( ws?: any ): number {
		const sent = new Set<any>();
		try {
			const msg = new Binary_Message();
			if ( ws && this.send( ws, msg ) ) {
				sent.add( ws );
			}
			else {
				for ( const [ topic, connections ] of this._subscriptions ) {
					for ( const [ websocket, count ] of connections ) {
						if ( !sent.has( websocket ) ) {
							if ( this.send( websocket, msg ) ) {
								sent.add( websocket );
							}
							else {
								connections.delete( websocket );
								if ( connections.size === 0 ) {
									this._subscriptions.delete( topic );
								}
							}
						}
					}
				}
			}
			console.debug( `Reactive publication: pinged ${ sent.size } connections` );
		}
		catch ( exc ) {
			console.error( `Reactive publication: failed to ping connections on error ${ exc }` );
		}
		return sent.size;
	}

	/**
		Publishes the binary message to all connections subscribed to the message topic
		@param msg message to publish
		@returns the number of messages sent to connections subscribed to the message topic
	*/
	publish( msg: Binary_Message ): number {
		const sent = new Set<any>();
		try {
			const connections = this._subscriptions.get( msg.topic );
			if ( connections ) {
				for ( const [ websocket, count ] of connections ) {
					if ( this.send( websocket, msg ) ) {
						if ( count < 1 ) {
							connections.delete( websocket );
						}
						else if ( count < __MSG_MAX_NAT32_VALUE ) {
							connections.set( websocket, count - 1 );
						}
						sent.add( websocket );
					}
					else {
						connections.delete( websocket );
					}
					if ( connections.size === 0 ) {
						this._subscriptions.delete( msg.topic );
					}
				}
			}
			console.debug( `Reactive publication: published message ${ msg.topic } to ${ sent.size } connections` );
		}
		catch ( exc ) {
			console.error( `Reactive publication: failed to publish message ${ msg.topic } on error ${ exc }` );
		}
		return sent.size;
	}

	/**
		Subscribes connection to or unsubscribes connection from the message topic
		@param ws WebSocket to subscribe or unsubscribe
		@param msg optional message to define topic and message count
			if message count is 0 then connection is unsubscribed from the message topic
			if message is omitted the connection is unsubscribed from all topics
		@returns the maximum number of messages to be sent to subscriber
	*/
	subscribe( ws: any, msg?: Binary_Message ): number {
		try {
			if ( msg ) {
				const count = msg.read_length();
				let connections = this._subscriptions.get( msg.topic );
				if ( count === 0 ) {	// unsubscribe connection from topic
					if ( connections ) {
						connections.delete( ws );
						if ( connections.size === 0 ) {
							this._subscriptions.delete( msg.topic );
						}
					}
					console.debug( `Reactive publication: unsubscribed connection from message ${ msg.topic }` );
				}
				else {	// subscribe connection to topic
					if ( !connections ) {
						this._subscriptions.set( msg.topic, connections = new Map<any, number>() );
					}
					connections.set( ws, count );
					console.debug( `Reactive publication: subscribed connection to message ${ msg.topic }` );
				}
				return count;
			}
			this._subscriptions.forEach( // unsubscribe connection from all topics
				( conns, topic ) => {
					conns.delete( ws );
					if ( conns.size === 0 ) {
						this._subscriptions.delete( topic );
					}
				}
			);
			console.debug( `Reactive publication: unsubscribed connection from all messages` );
		}
		catch ( exc ) {
			console.error( `Reactive publication: failed to subscribe connection on error ${ exc }` );
		}
		return 0;
	}

}
