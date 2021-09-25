import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { delay, filter, map, mergeMap, take, tap } from 'rxjs/operators';
import Binary_Message from './binary-message';

export default class Reactive_Connection {

	protected _msg$ = new Subject<Binary_Message>();
	protected _state$ = new BehaviorSubject<boolean>( false );
	protected _error$ = new Subject<string>();
	protected _conn_factory: () => any;
	protected _conn_attempts: number;
	protected _conn_interval: number;
	protected _conn: any;

	constructor(
		conn_factory: () => any,
		conn_attempts: number = 5,
		conn_interval: number = 500
	) {
		this._conn_factory = conn_factory;
		this._conn_attempts = Math.max( conn_attempts, 1 );
		this._conn_interval = Math.max( conn_interval, 10 );
	}

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
				console.debug( `Reactive connection: websocket [${ conn.url }] connecting...` );
				conn.onopen = () => {
					console.debug( `Reactive connection: websocket [${ conn.url }] connected` );
					this._state$.next( true );
				};
				conn.onclose = ( event: any ) => {
					console.debug( `Reactive connection: websocket [${ conn.url }] disconnected with code ${ event.code } / reason ${ event.reason }` );
					this._state$.next( false );
				};
				conn.onmessage = ( event: any ) => {
					const msg = Binary_Message.from_buffer( event.data as ArrayBuffer );
					if ( msg.is_blank ) {
						console.debug( `Reactive connection: ping received` );
					}
					else {
						console.debug( `Reactive connection: received message ${ msg.topic }` );
						this._msg$.next( msg );
					}
				};
				conn.onerror = () => {
					console.debug( `Reactive connection: websocket [${ conn.url }] error ` );
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
			map( msg => msg.clone() )
		);
	}

	send( msg: Binary_Message ): Observable<void> {
		if ( this._conn && this._conn.readyState === 1 ) {
			this._conn.send( msg.to_buffer() );
			console.debug( `Reactive connection: sent message ${ msg.topic }` );
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
			mergeMap( () => this.wait( m => m.topic === msg.topic ) ),
			take( 1 )
		);
	}

}