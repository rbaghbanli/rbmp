import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { delay, filter, map, mergeMap, take } from 'rxjs/operators';

import Binary_Message from './binary-message';

export default class Connection_Port {

	constructor(
		private _conn_factory: () => any,
		private _conn_attempts: number = 5,
		private _conn_interval: number = 500
	) {
		if ( _conn_attempts < 1 ) {
			_conn_attempts = 1;
		}
		if ( _conn_interval < 10 ) {
			_conn_interval = 10;
		}
	}
	private _conn: any;
	private _msg$ = new Subject<Binary_Message>();
	private _state$ = new BehaviorSubject<boolean>( false );
	private _error$ = new Subject<string>();

	stream_state(): Observable<boolean> {
		return this._state$;
	}

	stream_error(): Observable<string> {
		return this._error$;
	}

	open(): void {
		try {
			if ( !this._conn || this._conn.readyState > 1 ) {
				const conn = this._conn = this._conn_factory();
				conn.binaryType = 'arraybuffer';
				console.debug( `Connection port: websocket [${ conn.url }] connecting...` );
				conn.onopen = () => {
					console.debug( `Connection port: websocket [${ conn.url }] connected` );
					this._state$.next( true );
				};
				conn.onclose = ( event: any ) => {
					console.debug( `Connection port: websocket [${ conn.url }] disconnected with code ${ event.code } / reason ${ event.reason }` );
					this._state$.next( false );
				};
				conn.onmessage = ( event: any ) => {
					const msg = new Binary_Message( event.data as ArrayBuffer );
					if ( msg.is_blank ) {
						console.debug( `Connection port: ping received` );
					}
					else {
						console.debug( `Connection port: message ${ msg.header_string() } received` );
						this._msg$.next( msg );
					}
				};
				conn.onerror = () => {
					console.debug( `Connection port: websocket [${ conn.url }] error ` );
					this._error$.next( `websocket [${ conn.url }] error` );
				};
			}
		}
		catch ( exc ) {
			this._state$.next( false );
		}
	}

	close(): void {
		try {
			if ( this._conn && this._conn.readyState === 1 ) {
				this._conn.close();
			}
		}
		catch ( exc ) {}
		this._conn = undefined;
		this._state$.next( false );
	}

	wait( predicate: ( msg: Binary_Message ) => boolean ): Observable<Binary_Message> {
		return this._msg$.pipe(
			filter( predicate ),
			map( msg => new Binary_Message( msg.data() ) )
		);
	}

	send( msg: Binary_Message ): Observable<void> {
		if ( this._conn && this._conn.readyState === 1 ) {
			this._conn.send( msg.data() );
			console.debug( `Connection port: message ${ msg.header_string() } sent` );
			return of( undefined );
		}
		else {
			this._state$.pipe(
				filter( on => !on ),
				delay( this._conn_interval ),
				take( this._conn_attempts )
			).subscribe( () => this.open() );
			return this._state$.pipe(
				filter( on => on ),
				mergeMap( () => this.send( msg ) ),
				take( 1 )
			);
		}
	}

	post( msg: Binary_Message ): Observable<Binary_Message> {
		return this.send( msg ).pipe(
			mergeMap( () => this.wait( m => m.match_header( msg ) ) ),
			take( 1 )
		);
	}

}
