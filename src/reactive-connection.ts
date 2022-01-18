import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { delay, filter, finalize, map, mergeMap, take, tap } from 'rxjs/operators';
import { Binary_Message, __MSG_MAX_NAT32_VALUE } from './binary-message';

export class Reactive_Connection {

	protected readonly _conn_factory: () => any;
	protected readonly _conn_ready: number;
	protected readonly _conn_attempts: number;
	protected readonly _conn_interval: number;
	protected _message$ = new Subject<Binary_Message>();
	protected _error$ = new Subject<string>();
	protected _state$ = new BehaviorSubject<boolean>( false );
	protected _conn: any;

	constructor( conn_factory: () => any, conn_ready: number = 1, conn_attempts = 10, conn_interval = 1000 ) {
		this._conn_factory = conn_factory;
		this._conn_ready = conn_ready;
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
		Opens reactive connection if closed
		Any call to send/post/subscribe/unsubscribe will attempt to open connection if closed
	*/
	open(): void {
		if ( !this._conn ) {
			try {
				this._conn = this._conn_factory();
				this._conn.binaryType = 'arraybuffer';
				const url = this._conn.url;
				console.debug( `Reactive connection: websocket [${ url }] connecting...` );
				this._conn.onopen = () => {
					console.debug( `Reactive connection: websocket [${ url }] connected` );
					this._state$.next( true );
				};
				this._conn.onclose = ( event: any ) => {
					console.debug( `Reactive connection: websocket [${ url }] disconnected with code ${ event.code } / reason ${ event.reason }` );
					this._conn = undefined;
					this._state$.next( false );
				};
				this._conn.onmessage = ( event: any ) => {
					const msg = Binary_Message.from_buffer( event.data as ArrayBuffer );
					if ( msg.is_blank ) {
						console.debug( `Reactive connection: ping received` );
					}
					else {
						console.debug( `Reactive connection: received message ${ msg.topic }` );
						this._message$.next( msg );
					}
				};
				this._conn.onerror = () => {
					console.debug( `Reactive connection: websocket [${ url }] error` );
					this._error$.next( `websocket [${ url }] error` );
				};
			}
			catch ( exc ) {
				console.error( `Reactive connection: failed to open websocket on error ${ exc }` );
				this._error$.next( `failure to open connection` );
				this.close();
			}
		}
	}

	/**
		Closes reactive connection
	*/
	close(): void {
		try {
			if ( this._conn ) {
				this._conn.close();
			}
		}
		catch ( exc ) {
			console.error( `Reactive connection: failed to close websocket on error ${ exc }` );
			this._error$.next( `failure to close connection` );
		}
		this._conn = undefined;
		this._state$.next( false );
	}

	/**
		Gets the observable of incoming messages
		@param predicate function to filter messages
		@returns the stream of filtered messages
	*/
	wait( predicate: ( msg: Binary_Message ) => boolean ): Observable<Binary_Message> {
		return this._message$.pipe(
			filter( predicate ),
			map( msg => msg.clone() )
		);
	}

	/**
		Sends message thru reactive connection
		@param msg the message to send
		@returns the observable of the completion event
	*/
	send( msg: Binary_Message ): Observable<void> {
		if ( this._conn && this._conn.readyState === this._conn_ready ) {
			this._conn.send( msg.to_buffer() );
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
		Sends request message to receive a single response message back
		@param msg the request message
		@returns the observable of the response message
	*/
	post( msg: Binary_Message ): Observable<Binary_Message> {
		return this.send( msg ).pipe(
			mergeMap( () => this.wait( m => m.topic === msg.topic ) ),
			take( 1 )
		);
	}

	/**
		Subscribes to server message stream
		@param topic the topic to subscribe to
		@param count optional maximum number of messages for server to send
			if parameter omitted there will be no limit on sent messages
		@returns the subscription message stream
	*/
	subscribe( topic: string, count: number = __MSG_MAX_NAT32_VALUE ): Observable<Binary_Message> {
		const msg = new Binary_Message( topic );
		msg.write_length( count );
		return this._conn.send( msg ).pipe(
			tap( () => console.debug( `Reactive connection: subscribed to message ${ msg.topic }` ) ),
			mergeMap( () => this.wait( m => m.topic === topic ) ),
			take( count ),
			finalize( () => this.unsubscribe( topic ).subscribe() )
		);
	}

	/**
		Unsubscribes from server message stream
		@param topic the topic to unsubscribe from
		@returns the observable of the completion event
	*/
	unsubscribe( topic: string ): Observable<void> {
		const msg = new Binary_Message( topic );
		msg.write_length( 0 );
		return this._conn.send( msg ).pipe(
			tap( () => console.debug( `Reactive connection: unsubscribed from message ${ msg.topic }` ) )
		);
	}

}
