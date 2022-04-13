
export default {
	
	models: {
		mahjong: new GLTFShape("models/mahjong.glb"),
		cubeframe: new GLTFShape("models/cubeframe.glb"),
		table: new GLTFShape("models/table.glb"),
		chessguy: new GLTFShape("models/chessguy.glb")
	},
	
	
	textures: {
		mahjong_tiles: new Texture("images/mahjong_tiles.png"),
		mahjong_tiles_2bit: new Texture("images/mahjong_tiles_2bit.png"),
		arrowhead: new Texture("images/arrowhead.png"),
        cards: new Texture("images/cards.png")

	},
	
	sounds: {
		shuffle:   new AudioClip("sounds/shuffle.mp3"),
        discard: new AudioClip("sounds/discard.mp3"),
		pung: new AudioClip("sounds/pung.mp3"),
		chow: new AudioClip("sounds/chow.mp3"),
		public_kong: new AudioClip("sounds/public-kong.mp3"),
		private_kong: new AudioClip("sounds/private-kong.mp3"),
		hule: new AudioClip("sounds/hule.mp3"),
		zimo: new AudioClip("sounds/zimo.mp3"),
		turnstart: new AudioClip("sounds/turnstart.mp3"),
        cardshuffle:   new AudioClip("sounds/cardshuffle.mp3"),
        card: new AudioClip("sounds/card.mp3"),
        greater: new AudioClip("sounds/greater.mp3"),
        iwin: new AudioClip("sounds/iwin.mp3"),
        firework: new AudioClip("sounds/firework.mp3"),
        explosion: new AudioClip("sounds/explosion.mp3"),
	}
	
}

