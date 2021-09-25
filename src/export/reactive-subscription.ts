import { Observable, Subject } from 'rxjs';
import { mergeMap, takeUntil, tap } from 'rxjs/operators';
import Binary_Message from './binary-message';
import Reactive_Connection from './reactive-connection';

const __MAX_PUBLICATION_COUNT = 0xffffffff;

export default class Reactive_Subscription {

	protected _end$ = new Subject();
	protected _conn: Reactive_Connection;
	protected _topic: string;

	constructor(
		conn: Reactive_Connection,
		topic: string
	) {
		this._conn = conn;
		this._topic = topic;
	}

	start( count: number = __MAX_PUBLICATION_COUNT ): Observable<Binary_Message> {
		const msg = new Binary_Message( this._topic );
		msg.write_length( count );
		return this._conn.send( msg ).pipe(
			tap( () => console.debug( `Reactive subscription: started streaming message ${ msg.topic }` ) ),
			mergeMap( () => this._conn.wait( m => m.topic === msg.topic ) ),
			takeUntil( this._end$ )
		);
	}

	stop(): Observable<void> {
		const msg = new Binary_Message( this._topic );
		msg.write_length( 0 );
		return this._conn.send( msg ).pipe(
			tap(
				() => {
					this._end$.next( undefined );
					this._end$.complete();
					this._end$ = new Subject();
					console.debug( `Reactive subscription: stopped streaming message ${ msg.topic }` )
				}
			)
		);
	}

}