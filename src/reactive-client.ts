import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { delay, filter, finalize, map, mergeMap, take } from 'rxjs/operators';
import { Binary_Message, BINARY_MESSAGE_MAX_UINT32 } from './binary-message';

export class Reactive_Client {

	protected _websocket: any;
	protected _state$ = new BehaviorSubject<boolean | undefined>( undefined );
	protected _error$ = new Subject<string>();
	protected _message$ = new Subject<Binary_Message>();

	constructor( ws_factory: () => any, min_reconnect_delay: number = 100, max_reconnect_delay: number = 60000 ) {
		const min_delay = min_reconnect_delay > 10 ? min_reconnect_delay : 10;
		const max_delay = max_reconnect_delay > 1000 ? max_reconnect_delay : 1000;
		let interval = 0;
		this._state$.pipe(
			filter( state => state === undefined && !this._websocket ),
			delay( interval ),
		).subscribe( {
			next: () => {
				try {
					this._websocket = ws_factory();
					this._websocket.binaryType = 'arraybuffer';
					const url = this._websocket.url;
					console.debug( `Reactive client: websocket [${ url }] connecting...` );
					const ts = new Date().getTime();
					this._websocket.onopen = () => {
						console.debug( `Reactive client: websocket [${ url }] connected in ${ new Date().getTime() - ts }ms` );
						interval = 0;
						this._state$.next( true );
					};
					this._websocket.onclose = ( event: any ) => {
						console.debug( `Reactive client: websocket [${ url }] disconnected with code ${ event.code ?? JSON.stringify( event ) }` );
						interval = Math.max( min_delay, Math.min( max_delay, interval << 1 ) );
						this._websocket = undefined;
						if ( this._state$.value !== false ) {
							this._state$.next( undefined );
						}
					};
					this._websocket.onerror = ( event: any ) => {
						console.debug( `Reactive client: websocket [${ url }] failed on ${ event.type ?? JSON.stringify( event ) }` );
						this._error$.next( `websocket [${ url }] failed on ${ event.type ?? JSON.stringify( event ) }` );
					};
					this._websocket.onmessage = ( event: any ) => {
						const msg = new Binary_Message( event.data as ArrayBuffer );
						this._message$.next( msg );
					};
				}
				catch ( exc ) {
					console.error( `Reactive client: websocket error ${ exc }` );
					this._error$.next( `websocket error ${ exc }` );
					interval = Math.max( min_delay, Math.min( max_delay, interval << 1 ) );
					this._websocket = undefined;
					if ( this._state$.value !== false ) {
						this._state$.next( undefined );
					}
				}
			}
		} );
	}

	/**
		WebSocket
	*/
	get websocket(): any {
		return this._websocket;
	}

	/**
		Reconnects WebSocket
	*/
	reconnect(): void {
		this.disconnect();
		this._state$.next( undefined );
	}

	/**
		Disconnects WebSocket
	*/
	disconnect(): void {
		this._state$.next( false );
		if ( this._websocket ) {
			this._websocket.close();
			this._websocket = undefined;
		}
	}

	/**
		Returns observable of WebSocket connection state
		@returns observable of boolean or undefined: true if connected, false if disconnected, undefined if neither
	*/
	state(): Observable<boolean | undefined> {
		return this._state$;
	}

	/**
	 	Returns the observable of of errors
		@returns observable of string containing the error message
	*/
	error(): Observable<string> {
		return this._error$;
	}

	/**
		Returns the observable of incoming messages
		@returns observable of messages
	*/
	emit(): Observable<Binary_Message> {
		return this._message$.pipe(
			map( m => new Binary_Message( m ) )
		);
	}

	/**
		Sends the message thru WebSocket
		@param message data to send
		@returns observable of the completion event
	*/
	send( message: Binary_Message ): Observable<void> {
		return this._state$.pipe(
			filter( state => !!state ),
			map( () => this._websocket.send( message.get_data() ) ),
			take( 1 )
		);
	}

	/**
		Sends message thru WebSocket and awaits on single response message
		@param message data to include in the request
		@returns observable of the response message
	*/
	post( message: Binary_Message ): Observable<Binary_Message> {
		return this.send( message ).pipe(
			mergeMap( () => this.emit() ),
			filter( m => m.topic === message.topic ),
			take( 1 )
		);
	}

	/**
		Sends message to subscribe to or unsubscribe from the topic and awaits on published messages
		@param topic string message identifier for published messages
		@param count optional maximum number of messages for publisher to send;
			if count is omitted then there is no limit on number of messages;
			if count is 0 then unsubscribes from the topic.
		@returns observable of the published messages
	*/
	subscribe( topic: string, count?: number ): Observable<Binary_Message> {
		const cnt = count ?? BINARY_MESSAGE_MAX_UINT32;
		const msg = new Binary_Message( topic );
		msg.write_uint32( cnt );
		return this.send( msg ).pipe(
			mergeMap( () => this.emit() ),
			filter( m => m.topic === topic ),
			take( cnt ),
			finalize( () => {
				if ( cnt > 0 ) {
					this.subscribe( topic, 0 ).subscribe();
				}
			} )
		);
	}

}
