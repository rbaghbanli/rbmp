import Binary_Message from './binary-message';

const __WS_INTERNAL_ERROR = 1011;

export default class Publication_Service {

	private _conns = new Map<string, Set<any>>();

	subscribe( conn: any, msg?: Binary_Message ): number | undefined {
		try {
			if ( msg ) {
				const count = msg.read_length();
				let conns = this._conns.get( msg.topic );
				if ( count == 0 ) {	// unsubscribe connection from topic
					if ( conns ) {
						conns!.delete( conn );
						if ( conns!.size === 0 ) {
							this._conns.delete( msg.topic );
						}
					}
				}
				else {	// subscribe connection to topic
					if ( !conns ) {
						this._conns.set( msg.topic, conns = new Set<any>() );
					}
					Publication_Service.set_publication_count( conn, count );
					conns.add( conn );
				}
				return count;
			}
			else {	// unsubscribe connection from all topics
				this._conns.forEach(
					( conns, topic ) => {
						conns.delete( conn );
						if ( conns.size === 0 ) {
							this._conns.delete( topic );
						}
					}
				);
				return 0;
			}
		}
		catch ( exc ) {
			console.error( `Publication service: failed to subscribe connection ${ Publication_Service.get_connection_token( conn ) } on error ${ exc }` );
		}
		return;
	}

	publish( msg: Binary_Message, token?: string ): void {
		try {
			let conns = this._conns.get( msg.topic );
			if ( conns ) {
				conns.forEach(
					conn => {
						if ( token == null || token === Publication_Service.get_connection_token( conn ) ) {
							if ( this.send( conn, msg ) ) {
								const count = Publication_Service.get_publication_count( conn );
								if ( count === 1 ) {
									conns!.delete( conn );
								}
								else if ( count > 1 ) {
									Publication_Service.set_publication_count( conn, count - 1 );
								}
							}
							else {
								conns!.delete( conn );
							}
							if ( conns!.size === 0 ) {
								this._conns.delete( msg.topic );
							}
						}
					}
				);
			}
		}
		catch ( exc ) {
			console.error( `Publication service: failed to publish message ${ msg.topic } on error ${ exc }` );
		}
	}

	ping( token?: string ): number | undefined {
		try {
			let num = 0;
			const msg = new Binary_Message();
			const processed = new Set<WebSocket>();
			this._conns.forEach(
				( conns, topic ) => {
					conns.forEach(
						conn => {
							if ( ( token == null || token === Publication_Service.get_connection_token( conn ) ) && !processed.has( conn ) ) {
								processed.add( conn );
								if ( this.send( conn, msg ) ) {
									++num;
								}
								else {
									conns.delete( conn );
									if ( conns.size === 0 ) {
										this._conns.delete( topic );
									}
								}
							}
						}
					);
				}
			);
			return num;
		}
		catch ( exc ) {
			console.error( `Publication service: failed to ping connection on error ${ exc }` );
		}
		return;
	}

	send( conn: any, msg: Binary_Message ): boolean {
		if ( conn.readyState === 1 ) {
			try {
				conn.send( msg.to_buffer() );
				return true;
			}
			catch ( exc ) {
				console.error( `Publication service: failed to send message ${ msg.topic } on error ${ exc }` );
			}
		}
		else {
			console.error( `Publication service: failed to send message ${ msg.topic } on websocket state ${ conn.readyState }` );
		}
		setTimeout( () => conn.close( __WS_INTERNAL_ERROR ), 0 );
		return false;
	}

	static get_publication_count( conn: any ): number {
		return conn[ 'publication-count' ];
	}

	static set_publication_count( conn: any, count: number ): void {
		conn[ 'publication-count' ] = count;
	}

	static get_connection_token( conn: any ): string {
		return conn[ 'connection-token' ];
	}

	static set_connection_token( conn: any, token: string ): void {
		conn[ 'connection-token' ] = token;
	}

	static get_connection_address( conn: any ): string {
		return conn[ 'connection-address' ];
	}

	static set_connection_address( conn: any, address: string ): void {
		conn[ 'connection-address' ] = address;
	}

}
