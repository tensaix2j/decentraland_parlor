

export class Txsound extends Entity {
	
	public parent;
	public sndClip;

	constructor( parent, audioclip ) {

		super();
		this.parent = parent;
		this.setParent( parent );
		engine.addEntity( this );
		
		this.sndClip = new AudioSource( audioclip );
		this.addComponent( this.sndClip );		
		this.addComponent( new Transform() );

	}

	
	playOnce() {
		this.sndClip.playOnce();
		
	}

	playLoop() {
		this.sndClip.loop = true;
		this.sndClip.playing = true;
	}

	playNoLoop() {
		this.sndClip.playing = true;
		this.sndClip.loop = false;
	}


	stopLoop() {
		this.sndClip.loop = false;
	}

	stop() {
		this.sndClip.playing = false;
	}

	setVolume(vol) {
		this.sndClip.volume = vol;
	}
}
