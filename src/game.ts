
import resources from "src/resources";
import { Mahjong } from "src/mahjong";
import { Doudizhu } from "./doudizhu";
import { getUserData, UserData } from '@decentraland/Identity'
import {Utils} from "src/utils"
import { Txsound } from "src/txsound";
import * as ui from '@dcl/ui-scene-utils'
 

class Stage extends Entity {

    public table_instances = [];
    public userData;
    public ui_score ;
    
    public materials = [];
    public final_scores = [0,0,0,0];
    public round   = 1;
    public sounds = {};
    public bgm ;
    

    constructor() {
        
        super();
        engine.addEntity(this);

        this.createMaterials();
        this.init_sounds();

        
        let building = new Entity();
        building.setParent(this);
        building.addComponent( new Transform({
            position: new Vector3(8 , 0, 8),
            scale: new Vector3( 1, 1,  0.98 )
        }))
        building.addComponent( new GLTFShape("models/building_4x2.glb"));
        building.getComponent( GLTFShape ).isPointerBlocker = false;
        
        
        let common_plane_shape = new PlaneShape();
        let buyable_poap = new Entity();
        buyable_poap.setParent( this );
        buyable_poap.addComponent( new Transform({
            position: new Vector3( 19, 4 , 13.72),
            scale: new Vector3( 5 ,5 ,1 ),
        }))
        buyable_poap.addComponent( common_plane_shape );
        buyable_poap.addComponent( this.materials[5] );
        buyable_poap.getComponent( Transform ).rotation.eulerAngles = new Vector3(180, 180,0);
        buyable_poap.addComponent( new OnPointerDown(
            (e)=>{
                this.buyable_poap_onclick("33781");
            },{
                hoverText:"Redeem POAP (500pts)",
                distance:20
            }
        ))

        buyable_poap = new Entity();
        buyable_poap.setParent( this );
        buyable_poap.addComponent( new Transform({
            position: new Vector3( 44, 4 , 13.72),
            scale: new Vector3( 5 ,5 ,1 ),
        }))
        buyable_poap.addComponent( common_plane_shape );
        buyable_poap.addComponent( this.materials[6] );
        buyable_poap.getComponent( Transform ).rotation.eulerAngles = new Vector3(180, 180,0);
        buyable_poap.addComponent( new OnPointerDown(
            (e)=>{
                this.buyable_poap_onclick("36486");
            },{
                hoverText:"Redeem POAP (1000pts)",
                distance:20
            }
        ))


        buyable_poap = new Entity();
        buyable_poap.setParent( this );
        buyable_poap.addComponent( new Transform({
            position: new Vector3( 0.3, 4 , 8.72),
            scale: new Vector3( 5 ,5 ,1 ),
        }))
        buyable_poap.addComponent( common_plane_shape );
        buyable_poap.addComponent( this.materials[7] );
        buyable_poap.getComponent( Transform ).rotation.eulerAngles = new Vector3(180, 90,0);
        buyable_poap.addComponent( new OnPointerDown(
            (e)=>{
                this.buyable_poap_onclick("39029");
            },{
                hoverText:"Redeem POAP (150pts)",
                distance:20
            }
        ))

        


        // Tbl 1
        let tbl = new Entity();
        tbl.setParent( this );
        tbl.addComponent( new Transform({
           position:new Vector3(16, 0.013 ,8),
           scale:new Vector3( 1.5 , 1.0,  1.5)
        }))
        tbl.addComponent( resources.models.table );

        let mj = new Mahjong( this, 0 , 0 );
        mj.getComponent(Transform).position.x = tbl.getComponent(Transform).position.x;
        this.table_instances.push( mj );

            

        // Tbl 2
        tbl = new Entity();
        tbl.setParent( this );
        tbl.addComponent( new Transform({
            position:new Vector3(24, 0.013 ,8),
            scale:new Vector3( 1.5 , 1.0,  1.5)
        }))
        tbl.addComponent( resources.models.table );
        mj = new Mahjong( this, 1 , 0 );
        mj.getComponent(Transform).position.x = tbl.getComponent(Transform).position.x;
        this.table_instances.push( mj );

           
        // Tbl 3
        tbl = new Entity();
        tbl.setParent( this );
        tbl.addComponent( new Transform({
            position:new Vector3(32, 0.013 ,8),
            scale:new Vector3( 1.5 , 1.0,  1.5)
        }))
        tbl.addComponent( resources.models.table );
        mj = new Mahjong( this, 1 , 1 );
        mj.getComponent(Transform).position.x = tbl.getComponent(Transform).position.x;
        this.table_instances.push( mj );
        




        // Guy 1
        let chessguy = new Entity();
        chessguy.setParent(this);
        chessguy.addComponent( new Transform({
            position: new Vector3( 16, 0 ,10),
            scale: new Vector3(1,1,1)
        }))
        chessguy.addComponent( resources.models.chessguy);


        // Guy 2
        chessguy = new Entity();
        chessguy.setParent(this);
        chessguy.addComponent( new Transform({
            position: new Vector3( 14, 0 ,8),
            scale: new Vector3(1,1,1)
        }))
        chessguy.addComponent( resources.models.chessguy);
        chessguy.getComponent(Transform).rotation.eulerAngles = new Vector3(0,-90,0);


        // Guy 3
        chessguy = new Entity();
        chessguy.setParent(this);
        chessguy.addComponent( new Transform({
            position: new Vector3( 18, 0 ,8),
            scale: new Vector3(1,1,1)
        }))
        chessguy.addComponent( resources.models.chessguy);
        chessguy.getComponent(Transform).rotation.eulerAngles = new Vector3(0, 90,0);
        





        // Tbl 4 DDZ
        tbl = new Entity();
        tbl.setParent( this );
        tbl.addComponent( new Transform({
            position:new Vector3(8, 0.013 ,8),
            scale:new Vector3( 1.5 , 1.0,  1.5)
        }))
        tbl.addComponent( resources.models.table );
        let ddz = new Doudizhu( this, 0 , 0 );
        ddz.getComponent(Transform).position.x = tbl.getComponent(Transform).position.x;
        this.table_instances.push( ddz );

        // Guy 4
        chessguy = new Entity();
        chessguy.setParent(this);
        chessguy.addComponent( new Transform({
            position: new Vector3( 6, 0 ,8),
            scale: new Vector3(1,1,1)
        }))
        chessguy.addComponent( resources.models.chessguy);
        chessguy.getComponent(Transform).rotation.eulerAngles = new Vector3(0,-90,0);


        // Guy 5
        chessguy = new Entity();
        chessguy.setParent(this);
        chessguy.addComponent( new Transform({
            position: new Vector3( 10, 0 ,8),
            scale: new Vector3(1,1,1)
        }))
        chessguy.addComponent( resources.models.chessguy);
        chessguy.getComponent(Transform).rotation.eulerAngles = new Vector3(0, 90,0);
        









        this.createUI();
        this.read_userstate();

        this.init_bgm();
		this.init_onenter_event();
        
    }


    //-------
    async buyable_poap_onclick( event_id ) {

        ui.displayAnnouncement( "Please wait for a moment...." , 5, Color4.Yellow(), 14, false );
        
        
        let url = "https://tensaistudio.xyz/mahjong/buy_poap.rvt";
       	
       	if (!this.userData) {
   			await this.setUserData()
  		}	

        let sig      = Utils.sha256(this.userData.userId + Utils.wibble() + this.final_scores[0] );
        
        let body = JSON.stringify({
			useraddr : this.userData.userId,
            username : this.userData.displayName,
            event_id: event_id
		})

        let fetchopt = {
            headers: {
              'content-type': 'application/json'
            },
            body: body,
            method: 'POST'
        };
        
        try {
            
            let resp = await fetch(url, fetchopt ).then(response => response.json())
            log("JDEBUG", "buy_poap", "Sent request to URL", url , "SUCCESS", resp );
            
            
            if ( resp["poap_code"] != "" ) {
                let prompt_instruction = "Please claim your POAP\nin the claim page.\n(Right click to use mouse)";
                let prompt_but_label = "Claim";

                if ( resp["success"] != 1 ) {
                    prompt_instruction = "You have already acquired\nthis POAP previously\n(Right click to use mouse)";
                    prompt_but_label = "Show Me";
                } else {

                    // Update new score 
                    this.final_scores[0]    = parseInt( resp["p0"] );
                    this.render_scores();
                    // Update all instance's final_scores[0];
                    for ( let i = 0 ; i < this.table_instances.length ; i++) {
                        this.table_instances[i].final_scores[0] = this.final_scores[0];
                    }

                }
                let p = new ui.CustomPrompt(ui.PromptStyles.DARK);
                p.addText( prompt_instruction , 0, 100, Color4.White(), 24)
                let button1 = p.addButton(
                    prompt_but_label,
                    0,
                    -30,
                    () => {
                    openExternalURL("http://poap.xyz/claim/"+ resp["poap_code"] )
                    p.hide()
                    },
                    ui.ButtonStyles.RED
                )
            } else {
                ui.displayAnnouncement( resp["msg"] , 5, Color4.Yellow(), 14, false );
                
            }
            
            
        } catch(err) {
            log("error to do", url, fetchopt, err );
        }
    }



    //---------
    // This function is unused due to poor in performance.
    init_models() {
        //for ( let i = 0 ; i < 34 ; i++ ) {
        //    resources.models.tiles[ i ] = new GLTFShape("models/mahjong_tile_" + i +".glb");
        //}

    }

    //--------------------
    init_sounds() {
        
        
        this.sounds["shuffle"]          = new Txsound(this, resources.sounds.shuffle );
        this.sounds["discard"]          = new Txsound(this, resources.sounds.discard );
        
        this.sounds["pung"]          = new Txsound(this, resources.sounds.pung );
        this.sounds["chow"]          = new Txsound(this, resources.sounds.chow );
        this.sounds["private_kong"]  = new Txsound(this, resources.sounds.private_kong );
        this.sounds["public_kong"]  = new Txsound(this, resources.sounds.public_kong );
        
        this.sounds["turnstart"]    = new Txsound( this, resources.sounds.turnstart );

        this.sounds["zimo"]          = new Txsound(this, resources.sounds.zimo );
        this.sounds["hule"]          = new Txsound(this, resources.sounds.hule );
        
        for ( let i = 0 ; i < 34 ; i++ ) {
            this.sounds["tile_" + i ] = new Txsound( this, new AudioClip("sounds/tile_" + i +".mp3"),)
        }

        this.sounds["cardshuffle"]      = new Txsound(this, resources.sounds.cardshuffle );
        this.sounds["turnstart"]    = new Txsound( this, resources.sounds.turnstart );
        this.sounds["greater"]      = new Txsound( this, resources.sounds.greater);
        this.sounds["iwin"]         = new Txsound( this, resources.sounds.iwin );
        this.sounds["card"]         = new Txsound( this, resources.sounds.card) ;
        this.sounds["explosion"]    = new Txsound( this, resources.sounds.explosion);
        this.sounds["firework"]     = new Txsound( this, resources.sounds.firework);
        
        
        for ( let i = 2 ; i <= 16 ; i++ ) {
            this.sounds["single_" + i ] = new Txsound( this, new AudioClip("sounds/single_" + i +".mp3"),)
        }
        for ( let i = 2 ; i <= 15 ; i++ ) {
            this.sounds["pair_" + i ] = new Txsound( this, new AudioClip("sounds/pair_" + i +".mp3"),)
        }
        for ( let i = 0 ; i <= 3 ; i++ ) {
            this.sounds["bid_" + i ] = new Txsound( this, new AudioClip("sounds/bid_" + i +".mp3"),)
        }
        for ( let i = 0 ; i <= 1 ; i++ ) {
            this.sounds["passed_" + i ] = new Txsound( this, new AudioClip("sounds/passed_" + i +".mp3"),)
        }
        for ( let i = 0 ; i <= 2 ; i++ ) {
            this.sounds["straight_" + i ] = new Txsound( this, new AudioClip("sounds/straight_" + i +".mp3"),)
        }
        for ( let i = 0 ; i <= 3 ; i++ ) {
            this.sounds["tripplet_" + i ] = new Txsound( this, new AudioClip("sounds/tripplet_" + i +".mp3"),)
        }
        for ( let i = 0 ; i <= 2 ; i++ ) {
            this.sounds["quad_" + i ] = new Txsound( this, new AudioClip("sounds/quad_" + i +".mp3"),)
        }
        
    }

    //---------------
    init_bgm( ) {
	    

	    let bgm =  new AudioStream("https://tensaistudio.xyz/ktv/mahjong/bgm.mp3")
        const streamSource = new Entity()
		streamSource.addComponent(bgm)
		engine.addEntity(streamSource)
        this.bgm = bgm;
        //this.bgm.volume = 0.1;
        
    }

    //------
    async init_onenter_event() {

        if (!this.userData) {
            await this.setUserData()
        }	

        onEnterSceneObservable.add((player) => {

            if (player.userId === this.userData.userId) {
                log("I entered the scene!");
                //this.bgm.volume = 0.1;
            }
        })
    }


    //--------
    createMaterials() {
        /*
        let mahjong_mat = new Material();
        mahjong_mat.albedoTexture = resources.textures.mahjong_tiles;
        mahjong_mat.albedoColor = Color3.White();
        this.materials.push( mahjong_mat );
        */
        let b_mahjong_mat = new BasicMaterial();
        b_mahjong_mat.texture = resources.textures.mahjong_tiles;
        this.materials.push( b_mahjong_mat );

        let mahjong_mat = new Material();
        mahjong_mat.albedoTexture = resources.textures.mahjong_tiles_2bit;
        mahjong_mat.albedoColor = Color3.White();
        mahjong_mat.transparencyMode = 1;
        this.materials.push( mahjong_mat);

        mahjong_mat = new Material();
        mahjong_mat.albedoTexture = resources.textures.mahjong_tiles_2bit;
        mahjong_mat.emissiveColor = Color3.White();
        mahjong_mat.emissiveIntensity = 6;
        mahjong_mat.transparencyMode = 1;
        this.materials.push( mahjong_mat);
        
        let button_mat = new Material();
        button_mat.albedoColor = Color3.FromInts(0,66,99);
        this.materials.push( button_mat );
        
        let b_card_mat = new BasicMaterial();
        b_card_mat.texture = resources.textures.cards;
        this.materials.push( b_card_mat );
        
        let poap_mat = new Material();
        poap_mat.albedoTexture = new Texture("images/poap_33781.png");
        poap_mat.transparencyMode = 1;
        poap_mat.roughness = 1;
        poap_mat.specularIntensity = 0;
        this.materials.push( poap_mat );

        poap_mat = new Material();
        poap_mat.albedoTexture = new Texture("images/poap_36486.png");
        poap_mat.transparencyMode = 1;
        poap_mat.roughness = 1;
        poap_mat.specularIntensity = 0;
        this.materials.push( poap_mat );

        poap_mat = new Material();
        poap_mat.albedoTexture = new Texture("images/poap_39029.png");
        poap_mat.transparencyMode = 1;
        poap_mat.roughness = 1;
        poap_mat.specularIntensity = 0;
        this.materials.push( poap_mat );

    }


    //----------
    createUI() {

        let ui_2d_canvas = new UICanvas();
        
        let ui_score =  new UIText( ui_2d_canvas );
		ui_score.vAlign = "bottom";
		ui_score.hAlign = "left";
		ui_score.hTextAlign = "left";
		ui_score.positionX = 60;
		ui_score.positionY = 10;
		ui_score.value = "";
		ui_score.fontSize = 15;
		ui_score.visible = true;
		this.ui_score = ui_score;
        this.render_scores();
    }

    //--------
    // Called by mj instance to stage.
    on_score_updated( final_scores , game_mode, round , game_type ) {

        this.final_scores[0] = final_scores[0];
        
        if ( game_mode == 0 && game_type == "mahjong" ) {
            // For single player, update round and bot's scores too. 
            // For multi player, only update the score.
            this.final_scores[1] = final_scores[1];
            this.final_scores[2] = final_scores[2];
            this.final_scores[3] = final_scores[3];
            this.round = round;
        }

        // Update all instance's final_scores[0];
        for ( let i = 0 ; i < this.table_instances.length ; i++) {
            this.table_instances[i].final_scores[0] = this.final_scores[0];
        }
        this.update_highscore();
        this.render_scores();

    }

    //----
    render_scores() {
        this.ui_score.value = "Score: " + this.final_scores[0];
    }

    
    //---------------
    async setUserData() {
        const data = await getUserData()
        this.userData = data
    }


    //----------------------
    async read_userstate() {
        
        let url = "https://tensaistudio.xyz/mahjong/read_userstate.rvt";
        
       	if (!this.userData) {
   			await this.setUserData()
  		}	

        let body = JSON.stringify({
			useraddr : this.userData.userId,
            username : this.userData.displayName
		})

        let fetchopt = {
            headers: {
              'content-type': 'application/json'
            },
            body: body,
            method: 'POST'
        };
        let _this = this;
        
        try {
            
            let resp = await fetch(url, fetchopt ).then(response => response.json())
            log("JDEBUG", "read_userstate", "Sent request to URL", url , "SUCCESS", resp );

            this.round              = parseInt( resp["round"] );
            this.final_scores[0]    = parseInt( resp["p0"] );
            this.final_scores[1]    = parseInt( resp["p1"] );
            this.final_scores[2]    = parseInt( resp["p2"] );
            this.final_scores[3]    = parseInt( resp["p3"] );
            this.render_scores();

            // Update all instance's final_scores[0];
            for ( let i = 0 ; i < this.table_instances.length ; i++) {
                this.table_instances[i].final_scores[0] = this.final_scores[0];
            }
            
        } catch(err) {
            log("error to do", url, fetchopt, err );
        }
    }




    //----------------------
    async update_highscore() {
        
        let url = "https://tensaistudio.xyz/mahjong/update_highscore2.tcl";
       	
       	if (!this.userData) {
   			await this.setUserData()
  		}	

        let sig      = Utils.sha256(this.userData.userId + Utils.wibble() + this.final_scores[0] );
        
        let body = JSON.stringify({
			useraddr : this.userData.userId,
            username : this.userData.displayName,
            round: this.round,
            p0 : this.final_scores[0],
            p1 : this.final_scores[1],
            p2 : this.final_scores[2],
            p3 : this.final_scores[3],
            sig: sig
		})

        let fetchopt = {
            headers: {
              'content-type': 'application/json'
            },
            body: body,
            method: 'POST'
        };
        
        try {
            
            let resp = await fetch(url, fetchopt ).then(response => response.json())
            log("JDEBUG", "read_userstate", "Sent request to URL", url , "SUCCESS", resp );
            
        } catch(err) {
            log("error to do", url, fetchopt, err );
        }
    }
}

new Stage();