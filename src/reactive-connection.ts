import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { delay, filter, finalize, map, mergeMap, take } from 'rxjs/operators';
import { Binary_Message, __MSG_MAX_NAT32_VALUE } from './binary-message';

export class Reactive_Connection {

	protected _websocket$ = new BehaviorSubject<any>( undefined );
	protected _message$ = new Subject<Binary_Message>();
	protected _error$ = new Subject<string>();

	constructor( ws_factory: () => any, connection_attempts = 10, reconnection_interval = 100 ) {
		const attempts = Math.max( connection_attempts, 1 );
		let interval = Math.max( reconnection_interval, 10 );
		this._websocket$.pipe(
			filter( ws => ws == null ),
			map(
				() => {
					try {
						const ws = ws_factory();
						ws.binaryType = 'arraybuffer';
						const url = ws.url;
						console.debug( `Reactive connection: websocket [${ url }] connecting...` );
						ws.onopen = () => {
							console.debug( `Reactive connection: websocket [${ url }] connected` );
							this._websocket$.next( ws );
						};
						ws.onclose = ( event: any ) => {
							console.debug( `Reactive connection: websocket [${ url }] disconnected with code ${ event.code } / reason ${ event.reason }` );
							this._websocket$.next( undefined );
						};
						ws.onmessage = ( event: any ) => {
							const msg = Binary_Message.from_buffer( event.data as ArrayBuffer );
							if ( msg.is_blank ) {
								console.debug( `Reactive connection: ping received` );
							}
							else {
								console.debug( `Reactive connection: received message ${ msg.topic }` );
								this._message$.next( msg );
							}
						};
						ws.onerror = () => {
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
			),
			delay( interval ),
			take( attempts )
		).subscribe(
			() => {
				interval <<= 1;
			}
		);
	}

	/**
		The observable of underlying WebSocket
	*/
	get websocket(): Observable<any> {
		return this._websocket$;
	}

	/**
		The observable of binary messages
	*/
	get message(): Observable<Binary_Message> {
		return this._message$;
	}

	/**
	 	The observable of errors
	*/
	get error(): Observable<string> {
		return this._error$;
	}

	/**
		Closes reactive connection if open
	*/
	close(): void {
		this._websocket$.pipe(
			take( 1 )
		).subscribe(
			{
				next: ws => {
					try {
						if ( ws != null ) {
							ws.close();
						}
					}
					catch ( exc ) {
						console.error( `Reactive connection: failed to close websocket on error ${ exc }` );
						this._error$.next( `failure to close connection` );
					}
				}
			}
		);
	}

	/**
		Gets the observable of incoming messages
		@param predicate function to filter incoming messages
		@returns the observable of filtered messages
	*/
	emit( predicate: ( msg: Binary_Message, index: number ) => boolean ): Observable<Binary_Message> {
		return this._message$.pipe(
			filter( predicate ),
			map( msg => new Binary_Message( msg.topic, msg.data ) )
		);
	}

	/**
		Sends message thru reactive connection
		@param msg binary message to send
		@returns the observable of the completion event
	*/
	send( msg: Binary_Message ): Observable<void> {
		return this._websocket$.pipe(
			filter( ws => ws != null ),
			map( ws => ws.send( msg.to_buffer() ) ),
			take( 1 )
		);
	}

	/**
		Sends request message to receive a single response message back
		@param msg request binary message
		@returns the observable of the response message
	*/
	post( msg: Binary_Message ): Observable<Binary_Message> {
		return this.send( msg ).pipe(
			mergeMap( () => this.emit( m => m.topic === msg.topic ) ),
			take( 1 )
		);
	}

	/**
		Subscribes to or unsubscribes from the topic
		@param topic string to subscribe to or unsubscribe from
		@param count optional maximum number of messages for publisher to send
			if count is omitted then there is no limit on number of messages
			if count is 0 then unsubscribes from the topic
		@returns the observable of the subscription messages
	*/
	subscribe( topic: string, count: number = __MSG_MAX_NAT32_VALUE ): Observable<Binary_Message> {
		const msg = new Binary_Message( topic );
		msg.write_length( count );
		return this.send( msg ).pipe(
			mergeMap(
				() => {
					if ( count > 0 ) {
						console.debug( `Reactive connection: subscribed to message ${ msg.topic }` );
					}
					else {
						console.debug( `Reactive connection: unsubscribed from message ${ msg.topic }` );
					}
					return this.emit( m => m.topic === topic );
				}
			),
			take( count ),
			finalize(
				() => {
					if ( count > 0 ) {
						this.subscribe( topic, 0 ).subscribe();
					}
				}
			)
		);
	}

}
