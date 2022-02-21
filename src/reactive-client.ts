import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { delay, filter, finalize, map, mergeMap, take } from 'rxjs/operators';
import { Message_Data, MESSAGE_DATA_MAX_UINT32 } from './message-data';

export class Reactive_Client {

	protected _websocket$ = new BehaviorSubject<any>( undefined );
	protected _message$ = new Subject<ArrayBuffer>();
	protected _error$ = new Subject<string>();

	constructor( ws_factory: () => any, min_reconnect_delay: number = 100, max_reconnect_delay: number = 60000 ) {
		const min_delay = min_reconnect_delay > 10 ? min_reconnect_delay : 10;
		const max_delay = max_reconnect_delay > 1000 ? max_reconnect_delay : 1000;
		let interval = 0;
		this._websocket$.pipe(
			filter( ws => ws == null ),
			delay( interval ),
		).subscribe(
			() => {
				try {
					const ws = ws_factory();
					ws.binaryType = 'arraybuffer';
					const url = ws.url;
					console.debug( `Reactive client: websocket [${ url }] connecting...` );
					const ts = new Date().getTime();
					ws.onopen = () => {
						console.debug( `Reactive client: websocket [${ url }] connected in ${ new Date().getTime() - ts }ms` );
						this._websocket$.next( ws );
					};
					ws.onclose = ( event: any ) => {
						console.debug( `Reactive client: websocket [${ url }] disconnected with code ${ event.code } reason ${ event.reason }` );
						this._websocket$.next( undefined );
					};
					ws.onerror = ( event: any ) => {
						console.debug( `Reactive client: websocket [${ url }] error ${ event }` );
						this._error$.next( `websocket [${ url }] error ${ event }` );
					};
					ws.onmessage = ( event: any ) => {
						const message = event.data as ArrayBuffer;
						console.debug( `Reactive client: received message ${ message.byteLength }` );
						this._message$.next( message );
					};
				}
				catch ( exc ) {
					console.error( `Reactive client: websocket connect error ${ exc }` );
					this._error$.next( `websocket connect error ${ exc }` );
					this.close();
				}
				interval = Math.max( min_delay, Math.min( max_delay, interval << 1 ) );
			}
		);
	}

	/**
		The observable of WebSocket
	*/
	get websocket(): Observable<any> {
		return this._websocket$;
	}

	/**
		The observable of messages
	*/
	get message(): Observable<ArrayBuffer> {
		return this._message$;
	}

	/**
	 	The observable of errors
	*/
	get error(): Observable<string> {
		return this._error$;
	}

	/**
		Closes WebSocket if open
	*/
	close(): void {
		this._websocket$.pipe(
			take( 1 )
		).subscribe(
			ws => {
				try {
					if ( ws != null ) {
						ws.close();
					}
				}
				catch ( exc ) {
					console.error( `Reactive client: websocket disconnect error ${ exc }` );
					this._error$.next( `websocket disconnect error ${ exc }` );
				}
			}
		);
	}

	/**
		Returns the observable of incoming messages
	*/
	emit(): Observable<Message_Data> {
		return this._message$.pipe(
			map( m => Message_Data.from_buffer( m ) )
		);
	}

	/**
		Sends the message thru WebSocket
		@param message data to send
		@returns the observable of the completion event
	*/
	send( message: Message_Data ): Observable<void> {
		return this._websocket$.pipe(
			filter( ws => ws != null ),
			map( ws => ws.send( message.get_data() ) ),
			take( 1 )
		);
	}

	/**
		Sends identified message thru WebSocket
		@param topic string message identifier
		@param message optional data to include in the request
		@returns the observable of the completion event
	*/
	post( topic: string, message?: Message_Data ): Observable<void> {
		const msg = new Message_Data();
		msg.write_string( topic );
		if ( message ) {
			msg.write_dat( message.get_data() );
		}
		return this.send( msg );
	}

	/**
		Sends identified message thru WebSocket and awaits on single response message
		@param topic string message identifier for request and response
		@param message optional data to include in the request
		@returns the observable of the response message
	*/
	request( topic: string, message?: Message_Data ): Observable<Message_Data> {
		const msg = new Message_Data();
		msg.write_string( topic );
		if ( message ) {
			msg.write_dat( message.get_data() );
		}
		return this.send( msg ).pipe(
			mergeMap( () => this.emit() ),
			filter( d => d.read_string() === topic ),
			map( d => new Message_Data( d.get_unread_data() ) ),
			take( 1 )
		);
	}

	/**
		Sends message to subscribe to or unsubscribe from the topic and awaits on published messages
		@param topic string message identifier for published messages
		@param count optional maximum number of messages for publisher to send;
			if count is omitted then there is no limit on number of messages;
			if count is 0 then unsubscribes from the topic.
		@returns the observable of the published messages
	*/
	subscribe( topic: string, count?: number ): Observable<Message_Data> {
		const cnt = count ?? MESSAGE_DATA_MAX_UINT32;
		const msg = new Message_Data();
		msg.write_string( topic );
		msg.write_uint32( cnt );
		return this.send( msg ).pipe(
			mergeMap( () => this.emit() ),
			filter( d => d.read_string() === topic ),
			map( d => new Message_Data( d.get_unread_data() ) ),
			take( cnt ),
			finalize(
				() => {
					if ( cnt > 0 ) {
						this.subscribe( topic, 0 ).subscribe();
					}
				}
			)
		);
	}

}
