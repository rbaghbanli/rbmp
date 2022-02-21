import { Observable } from 'rxjs';
import { Message_Data, MESSAGE_DATA_MAX_UINT32 } from './message-data';

export class Reactive_Server {

	protected readonly _ws_ready: number;
	protected readonly _ws_error: number;
	protected _subscriptions = new Map<string, Map<any, number>>();

	constructor( ws_ready: number = 1, ws_error: number = 1011 ) {
		this._ws_ready = ws_ready;
		this._ws_error = ws_error;
	}

	/**
		Sends message to the WebSocket
		@param ws WebSocket to send message to
		@param message data to send
		@returns 1 if message is successfully sent, 0 otherwise
	*/
	send( ws: any, message: Message_Data ): number {
		try {
			if ( ws && ws.readyState === this._ws_ready ) {
				ws.send( message.get_data() );
				return 1;
			}
			console.error( `Reactive server: message send error state ${ ws.readyState }` );
		}
		catch ( exc ) {
			console.error( `Reactive server: message send error ${ exc }` );
		}
		setTimeout( () => ws.close( this._ws_error ), 0 );
		return 0;
	}

	/**
		Sends identified message to the WebSocket
		@param ws WebSocket to send message to
		@param topic string message identifier
		@param message optional data to send
		@returns 1 if message is successfully sent, 0 otherwise
	*/
	post( ws: any, topic: string, message?: Message_Data ): number {
		try {
			const msg = new Message_Data();
			msg.write_string( topic );
			if ( message ) {
				msg.write_dat( message.get_data() );
			}
			return this.send( ws, msg );
		}
		catch ( exc ) {
			console.error( `Reactive server: message ${ topic } post error ${ exc }` );
		}
		return 0;
	}

	/**
		Sends publication message to all WebSockets subscribed to the topic
		@param topic string to publish
		@param message optional data to send
		@returns number of messages sent
	*/
	publish( topic: string, message?: Message_Data ): number {
		let num = 0;
		try {
			const connections = this._subscriptions.get( topic );
			if ( connections ) {
				const msg = new Message_Data();
				msg.write_string( topic );
				if ( message ) {
					msg.write_dat( message.get_data() );
				}
				for ( const [ websocket, count ] of connections ) {
					if ( this.send( websocket, msg ) ) {
						++num;
						if ( count < 1 ) {
							connections.delete( websocket );
						}
						else if ( count < MESSAGE_DATA_MAX_UINT32 ) {
							connections.set( websocket, count - 1 );
						}
					}
					else {
						connections.delete( websocket );
					}
					if ( connections.size === 0 ) {
						this._subscriptions.delete( topic );
					}
				}
			}
			console.debug( `Reactive server: message ${ topic } published to ${ num } connections` );
		}
		catch ( exc ) {
			console.error( `Reactive server: message ${ topic } publish error ${ exc }` );
		}
		return num;
	}

	/**
		Subscribes WebSocket to or unsubscribes WebSocket from the message topic
		@param ws WebSocket to subscribe or unsubscribe
		@param topic string to subscribe to or unsubscribe from
		@param message data to containing maximum number of messages to be sent to subscriber
		@returns the maximum number of messages to be sent to subscriber
	*/
	subscribe( ws: any, topic: string, message: Message_Data ): number {
		try {
			const count = message.read_uint32();
			let connections = this._subscriptions.get( topic );
			if ( count === 0 ) {	// unsubscribe connection from topic
				if ( connections ) {
					connections.delete( ws );
					if ( connections.size === 0 ) {
						this._subscriptions.delete( topic );
					}
				}
				console.debug( `Reactive server: connection unsubscribed from message ${ topic }` );
			}
			else {	// subscribe connection to topic
				if ( !connections ) {
					this._subscriptions.set( topic, connections = new Map<any, number>() );
				}
				connections.set( ws, count );
				console.debug( `Reactive server: connection subscribed to message ${ topic }` );
			}
			return count;
		}
		catch ( exc ) {
			console.error( `Reactive server: connection subscribe error ${ exc }` );
		}
		return 0;
	}

	/**
		Unsubscribes WebSocket from all topics
		@param ws WebSocket to unsubscribe
		@returns number of subscriptions removed
	*/
	unsubscribe( ws: any ): number {
		let num = 0;
		try {
			this._subscriptions.forEach( // unsubscribe connection from all topics
				( conns, topic ) => {
					if ( conns.delete( ws ) ) {
						++num;
					}
					if ( conns.size === 0 ) {
						this._subscriptions.delete( topic );
					}
				}
			);
			console.debug( `Reactive server: connection unsubscribed from ${ num } topics` );
		}
		catch ( exc ) {
			console.error( `Reactive server: connection unsubscribe error ${ exc }` );
		}
		return num;
	}

}
