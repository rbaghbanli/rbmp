import { Binary_Message, __MSG_MAX_NAT32_VALUE } from './binary-message';

export class Reactive_Publication {

	protected readonly _conn_ready: number;
	protected readonly _conn_error: number;
	protected _subs = new Map<string, Map<any, number>>();

	constructor( conn_ready: number = 1, conn_error = 1011 ) {
		this._conn_ready = conn_ready;
		this._conn_error = conn_error;
	}

	/**
		Pings all connections for all subscriptions
		@returns the number of pinged connections
	*/
	ping( conn?: any ): number {
		const sent = new Set<any>();
		try {
			const msg = new Binary_Message();
			if ( conn && this.send( conn, msg ) ) {
				sent.add( conn );
			}
			else {
				for ( const [ topic, conns ] of this._subs ) {
					for ( const [ conn, count ] of conns ) {
						if ( !sent.has( conn ) ) {
							if ( this.send( conn, msg ) ) {
								sent.add( conn );
							}
							else {
								conns.delete( conn );
								if ( conns.size === 0 ) {
									this._subs.delete( topic );
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
		Sends message to all subscribed connections
		@param msg the message to send
		@returns the number of messages sent to connections subscribed to message topic
	*/
	publish( msg: Binary_Message ): number {
		const sent = new Set<any>();
		try {
			const conns = this._subs.get( msg.topic );
			if ( conns ) {
				for ( const [ conn, count ] of conns ) {
					if ( this.send( conn, msg ) ) {
						if ( count < 1 ) {
							conns.delete( conn );
						}
						else if ( count < __MSG_MAX_NAT32_VALUE ) {
							conns.set( conn, count - 1 );
						}
						sent.add( conn );
					}
					else {
						conns.delete( conn );
					}
					if ( conns.size === 0 ) {
						this._subs.delete( msg.topic );
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
		Subscribes or unsubscribes connection on topic defined in the message
		@param conn connection to subscribe or unsubscribe
		@param msg optional message to subscribe,
			if parameter omitted the connection is unsubscribed from all messages
		@returns the maximum number of messages subscription requested in the message
	*/
	subscribe( conn: any, msg?: Binary_Message ): number {
		try {
			if ( msg ) {
				const count = msg.read_length();
				let conns = this._subs.get( msg.topic );
				if ( count === 0 ) {	// unsubscribe connection from topic
					if ( conns ) {
						conns.delete( conn );
						if ( conns.size === 0 ) {
							this._subs.delete( msg.topic );
						}
					}
					console.debug( `Reactive publication: unsubscribed connection from message ${ msg.topic }` );
				}
				else {	// subscribe connection to topic
					if ( !conns ) {
						this._subs.set( msg.topic, conns = new Map<any, number>() );
					}
					conns.set( conn, count );
					console.debug( `Reactive publication: subscribed connection to message ${ msg.topic }` );
				}
				return count;
			}
			this._subs.forEach( // unsubscribe connection from all topics
				( conns, topic ) => {
					conns.delete( conn );
					if ( conns.size === 0 ) {
						this._subs.delete( topic );
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

	/**
		Sends message to connection
		@param conn connection to send message to
		@param msg the message to send
		@returns 1 if message is successfully sent, 0 otherwise
	*/
	send( conn: any, msg: Binary_Message ): number {
		try {
			if ( conn && conn.readyState === this._conn_ready ) {
				conn.send( msg.to_buffer() );
				return 1;
			}
			console.error( `Reactive publication: failed to send message ${ msg.topic } on websocket state ${ conn.readyState }` );
		}
		catch ( exc ) {
			console.error( `Reactive publication: failed to send message ${ msg.topic } on error ${ exc }` );
		}
		setTimeout( () => conn.close( this._conn_error ), 0 );
		return 0;
	}

}
