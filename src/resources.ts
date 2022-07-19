
export default {
	
	models: {
		mahjong: new GLTFShape("models/mahjong.glb"),
		cubeframe: new GLTFShape("models/cubeframe.glb"),
		table: new GLTFShape("models/table.glb"),
		chessguy: new GLTFShape("models/chessguy.glb"),
        sicbo_base: new GLTFShape("models/sicbo_base.glb"),
        sicbo_cup: new GLTFShape("models/sicbo_cup.glb"),
        dice: new GLTFShape("models/dice.glb"),
        chip: new GLTFShape("models/chip.glb"),
        mahjong_tile_31: new GLTFShape("models/mahjong_tile_31.glb"),
        mahjong_tile_32: new GLTFShape("models/mahjong_tile_32.glb"),
        mahjong_tile_33: new GLTFShape("models/mahjong_tile_33.glb"), 
        poapdispenser : new GLTFShape("models/poapdispenser.glb"),
        carrom_piece_red: new GLTFShape("models/carrom_piece_red.glb"),
        carrom_piece_brown: new GLTFShape("models/carrom_piece_brown.glb"),
        carrom_piece_black: new GLTFShape("models/carrom_piece_black.glb"),  
        carrom_piece_striker: new GLTFShape("models/carrom_piece_striker.glb"),  
	},
	
	
	textures: {
		mahjong_tiles: new Texture("images/mahjong_tiles.png"),
		mahjong_tiles_2bit: new Texture("images/mahjong_tiles_2bit.png"),
		arrowhead: new Texture("images/arrowhead.png"),
        cards: new Texture("images/cards.png"),
        sicbo_pad: new Texture("images/sicbotable.png"),
        aerochess_pad: new Texture("images/aerochess_pad.png"),
        carrom_pad: new Texture("images/carrom_pad.png"),

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
        rolldice: new AudioClip("sounds/rolldice.mp3"),
        placechip: new AudioClip("sounds/placechip.mp3"),
        removechip: new AudioClip("sounds/removechip.mp3"),
        success: new AudioClip("sounds/success.mp3")
	}
	
}

