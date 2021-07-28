import { forkJoin, Observable, Subject, of } from 'rxjs';
import { mergeMap, takeUntil } from 'rxjs/operators';

import Binary_Message from './binary-message';
import Connection_Port from './connection-port';

export default class Subscription_Pool {

	private _streams = new Map<number, Binary_Message>();	// subscription-id: message
	private _end$ = new Subject();

	start( conn: Connection_Port, sid: number, msg: Binary_Message ): Observable<Binary_Message> {
		const msg_ = this._streams.get( sid );
		this._streams.set( sid, msg );
		if ( msg_ ) {
			return this.unsubscribe( conn, msg_ ).pipe(
				mergeMap( () => this.subscribe( conn, msg ) )
			);
		}
		return this.subscribe( conn, msg );
	}

	stop( conn: Connection_Port, sid: number ): Observable<void> {
		const msg_ = this._streams.get( sid );
		return msg_ ? this.unsubscribe( conn, msg_ ) : of( undefined );
	}

	destroy( conn: Connection_Port ): void {
		forkJoin( Array.from( this._streams.values() ).map( m => this.unsubscribe( conn, m ) ) ).subscribe(
			() => {
				this._end$.next( null );
				this._end$.complete();
				this._end$ = new Subject();
				this._streams.clear();
				console.debug( `Subscription pool: destroyed` );
			}
		);
	}

	private subscribe( conn: Connection_Port, msg: Binary_Message ): Observable<Binary_Message> {
		console.debug( `Subscription pool: message ${ msg.topic }/${ msg.reference } subscribed` );
		return conn.send( msg ).pipe(
			mergeMap( () => conn.wait( m => m.topic === msg.topic && m.reference === msg.reference ) ),
			takeUntil( this._end$ )
		);
	}

	private unsubscribe( conn: Connection_Port, msg: Binary_Message ): Observable<void> {
		console.debug( `Subscription pool: message ${ msg.topic }/${ msg.reference } unsubscribed` );
		const msg_ = msg.clone_header();
		msg_.write_length( null );
		return conn.send( msg_ );
	}

}
