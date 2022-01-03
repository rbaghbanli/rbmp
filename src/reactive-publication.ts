import { Binary_Message } from './binary-message';

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
		}
		catch ( exc ) {
			console.error( `Reactive publication: failed to ping connections on error ${ exc }` );
		}
		return sent.size;
	}

	/**
		Sends message to all subscribed connections
		@param msg binary message to send
		@returns the number of messages sent to connections subscribed to message topic
	*/
	publish( msg: Binary_Message ): number {
		let num = 0;
		try {
			const conns = this._subs.get( msg.topic );
			if ( conns ) {
				for ( const [ conn, count ] of conns ) {
					if ( this.send( conn, msg ) ) {
						if ( count > 1 ) {
							conns.set( conn, count - 1 );
						}
						else {
							conns.delete( conn );
						}
						++num;
					}
					else {
						conns.delete( conn );
					}
					if ( conns.size === 0 ) {
						this._subs.delete( msg.topic );
					}
				}
			}
		}
		catch ( exc ) {
			console.error( `Reactive publication: failed to publish message ${ msg.topic } on error ${ exc }` );
		}
		return num;
	}

	/**
		Subscribes or unsubscribes connection
		@param conn connection to subscribe or unsubscribe
		@param msg optional binary message to subscribe,
			if omitted the connection is unsubscribed from all messages
		@returns the maximum number of messages subsctiption requires as defined in the message
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
				}
				else {	// subscribe connection to topic
					if ( !conns ) {
						this._subs.set( msg.topic, conns = new Map<any, number>() );
					}
					conns.set( conn, count );
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
		}
		catch ( exc ) {
			console.error( `Reactive publication: failed to subscribe connection on error ${ exc }` );
		}
		return 0;
	}

	/**
		Sends message to connection
		@param conn connection to send message to
		@param msg binary message to send
		@returns 1 is message is successfully sent, 0 otherwise
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
