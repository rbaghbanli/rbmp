import Binary_Message from './binary-message';

const __WS_INTERNAL_ERROR = 1011;

export class Publication_Service {

	private _conns = new Map<bigint, Set<any>>();

	subscribe( conn: any, msg?: Binary_Message ): number | null {
		if ( msg ) {
			const topic = msg.get_nat128_header();
			const count = msg.read_length();
			let conns = this._conns.get( topic );
			if ( count == null ) {	// unsubscribe connection from topic
				if ( conns ) {
					conns!.delete( conn );
					if ( conns!.size === 0 ) {
						this._conns.delete( topic );
					}
				}
			}
			else {	// subscribe connection to topic
				if ( !conns ) {
					this._conns.set( topic, conns = new Set<any>() );
				}
				Publication_Service.set_subscription_count( conn, count );
				conns.add( conn );
			}
			return count;
		}
		else {	// unsubscribe connection from all keys
			this._conns.forEach(
				( conns, topic ) => {
					conns.delete( conn );
					if ( conns.size === 0 ) {
						this._conns.delete( topic );
					}
				}
			);
			return null;
		}
	}

	publish( msg: Binary_Message, token?: string ): void {
		const topic = msg.get_nat128_header();
		let conns = this._conns.get( topic );
		if ( conns ) {
			conns.forEach(
				conn => {
					if ( token == null || token === Publication_Service.get_connection_token( conn ) ) {
						if ( this.send( conn, msg ) ) {
							const count = Publication_Service.get_subscription_count( conn );
							if ( count === 1 ) {
								conns!.delete( conn );
							}
							else if ( count > 1 ) {
								Publication_Service.set_subscription_count( conn, count - 1 );
							}
						}
						else {
							conns!.delete( conn );
						}
						if ( conns!.size === 0 ) {
							this._conns.delete( topic );
						}
					}
				}
			);
		}
	}

	ping( token?: string ): number {
		let num = 0;
		const processed = new Set<WebSocket>();
		this._conns.forEach(
			( conns, topic ) => {
				conns.forEach(
					conn => {
						if ( ( token == null || token === Publication_Service.get_connection_token( conn ) ) && !processed.has( conn ) ) {
							processed.add( conn );
							if ( this.send( conn, Publication_Service.ping_msg ) ) {
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

	send( conn: any, msg: Binary_Message ): boolean {
		if ( conn.readyState === 1 ) {
			try {
				conn.send( msg.data() );
				return true;
			}
			catch {}
		}
		setTimeout( () => conn.close( __WS_INTERNAL_ERROR ), 0 );
		return false;
	}

	static get_subscription_count( conn: any ): number {
		return conn[ 'subscription-count' ];
	}

	static set_subscription_count( conn: any, count: number ): void {
		conn[ 'subscription-count' ] = count;
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

	private static ping_msg = new Binary_Message();

}
