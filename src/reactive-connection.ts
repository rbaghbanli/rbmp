import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { delay, filter, map, mergeMap, take } from 'rxjs/operators';
import { Binary_Message } from './binary-message';

export class Reactive_Connection {

	protected _msg$ = new Subject<Binary_Message>();
	protected _state$ = new BehaviorSubject<boolean>( false );
	protected _error$ = new Subject<string>();
	protected _conn_factory: () => any;
	protected _conn_attempts: number;
	protected _conn_interval: number;
	protected _conn: any;

	constructor( conn_factory: () => any, conn_attempts = 5, conn_interval = 500 ) {
		this._conn_factory = conn_factory;
		this._conn_attempts = Math.max( conn_attempts, 1 );
		this._conn_interval = Math.max( conn_interval, 10 );
	}

	/**
	 	Gets the observable of reactive connection state changes
		@returns the stream of reactive connection state changes
	*/
	stream_state(): Observable<boolean> {
		return this._state$;
	}

	/**
	 	Gets the observable of reactive connection errors
		@returns the stream of reactive connection errors
	*/
	stream_error(): Observable<string> {
		return this._error$;
	}

	/**
		Opens reactive connection
	*/
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

	/**
		Closes reactive connection
	*/
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

	/**
		Gets the observable of reactive connection messages
		@param predicate function to filter messages
		@returns the stream of filtered binary messages
	*/
	wait( predicate: ( msg: Binary_Message ) => boolean ): Observable<Binary_Message> {
		return this._msg$.pipe(
			filter( predicate ),
			map( msg => msg.clone() )
		);
	}

	/**
		Sends message thru reactive connection
		@param msg binary message to send
		@returns the observable of the completion event
	*/
	send( msg: Binary_Message ): Observable<void> {
		if ( this._conn && this._conn.readyState === 1 ) {
			this._conn.send( msg.to_buffer() );
			console.debug( `Reactive connection: sent message ${ msg.topic }` );
			return of( undefined );
		}
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

	/**
		Sends request message thru reactive conneciton
		@param msg binary message to send as a request
		@returns the observable of a response message
	*/
	post( msg: Binary_Message ): Observable<Binary_Message> {
		return this.send( msg ).pipe(
			mergeMap( () => this.wait( m => m.topic === msg.topic ) ),
			take( 1 )
		);
	}

}
