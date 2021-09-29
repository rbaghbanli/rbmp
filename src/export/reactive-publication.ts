import Binary_Message from './binary-message';

const __WS_INTERNAL_ERROR = 1011;

export default class Reactive_Publication {

	protected _subs = new Map<string, Map<any, number>>();

	ping(): number {
		try {
			const msg = new Binary_Message();
			const sent = new Set<any>();
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
			return sent.size;
		}
		catch ( exc ) {
			console.error( `Reactive publication: failed to ping connections on error ${ exc }` );
		}
		return 0;
	}

	publish( msg: Binary_Message, single?: boolean ): boolean {
		try {
			let conns = this._subs.get( msg.topic );
			if ( conns ) {
				for ( const [ conn, count ] of conns ) {
					if ( this.send( conn, msg ) ) {
						if ( count === 1 ) {
							conns.delete( conn );
						}
						else if ( count > 1 ) {
							conns.set( conn, count - 1 );
						}
						if ( single ) {
							return false;
						}
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
		return true;
	}

	subscribe( conn: object, msg?: Binary_Message ): number {
		try {
			if ( msg ) {
				const count = msg.read_length();
				let conns = this._subs.get( msg.topic );
				if ( count == 0 ) {	// unsubscribe connection from topic
					if ( conns ) {
						conns.delete( conn );
						if ( conns.size === 0 ) {
							this._subs.delete( msg.topic );
						}
					}
				}
				else {	// subscribe connection to topic
					if ( !conns ) {
						this._subs.set( msg.topic, conns = new Map<WebSocket, number>() );
					}
					conns.set( conn, count );
				}
				return count;
			}
			else {	// unsubscribe connection from all topics
				this._subs.forEach(
					( conns, topic ) => {
						conns.delete( conn );
						if ( conns.size === 0 ) {
							this._subs.delete( topic );
						}
					}
				);
			}
		}
		catch ( exc ) {
			console.error( `Reactive publication: failed to subscribe connection on error ${ exc }` );
		}
		return 0;
	}

	send( conn: any, msg: Binary_Message ): boolean {
		try {
			if ( conn.readyState === WebSocket.OPEN ) {
				conn.send( msg.to_buffer() );
				return true;
			}
			else {
				console.error( `Reactive publication: failed to send message ${ msg.topic } on websocket state ${ conn.readyState }` );
			}
		}
		catch ( exc ) {
			console.error( `Reactive publication: failed to send message ${ msg.topic } on error ${ exc }` );
		}
		setTimeout( () => conn.close( __WS_INTERNAL_ERROR ), 0 );
		return false;
	}

}
