///<reference lib="es2015.symbol" />
///<reference lib="es2015.symbol.wellknown" />
///<reference lib="es2015.collection" />
///<reference lib="es2015.iterable" />




import resources from "src/resources";
import { handlePoap } from 'src/poapHandler'
import * as ui from '@dcl/ui-scene-utils'
import { Txclickable_box } from "src/txclickable_box"
import { getUserData, UserData } from '@decentraland/Identity'




import { Client, Room } from "colyseus.js";



//--------------
export class Mahjong extends Entity implements ISystem {    
    
    
    public anim_piece = null;
    public anim_target = new Vector3(0,0,0);
    public anim_dealing = 0;
    public anim_tick = 0;


    public materials = [];
    public whose_turn = 0;
    public mpiece_highlight;

    // Logical values
    public deck = [];
    public players_deck                 = [[],[],[],[]];
    public exposed_deck                 = [[],[],[],[]];
    public discarded_deck               = [[],[],[],[]];

    // Acutal entities.
    public wall_pieces_ent              = [];
    public players_concealed_ent        = [[],[],[],[]];
    public players_discarded_ent        = [[],[],[],[]];
    public players_exposed_ent          = [[],[],[],[]];
    
    // Positions for the ents
    public players_concealed_pos        = [[],[],[],[]];
    public players_discarded_pos        = [[],[],[],[]];
    public players_exposed_pos          = [[],[],[],[]];
    public wall_pieces_pos              = [];
    
    // Seat winds
    public seatwinds_root;
    public seatwinds_ent = [];
    public fixed_seatwinds_ent = [];
    
    public prevalent_wind = 27;
    public players_wind = [27,28,29,30]
    

    public buttons = {};
    public last_discarded = -1;
    public last_discarded_side = -1;
    public last_drawn = -1;
    public last_drawn_side = -1;
    public last_wall_piece = null;


    public gameover = 1;
    
    public ui_root;
    public ui_texts = [];
    public ui_images_winner_hand = [];
    public ui_network_msg;
    public ui_root_for_distance_toggle ;

    

    public doable_actions  = [];
    public doable_selected = [];


    public display_names = [];
    public display_names_ent = [];
    public final_scores = [0,0,0,0];
    public userData;

    public round   = 0;
    public sounds  = {};


    // 0: Single Player vs A.I
    // 1: PvP
    public game_mode = 0;
    public table_index = 0;
    public stage ;

    public colyseus_room = null;
    public colyseus_transaction = [];
    public colyseus_players = {};
    public my_seat_id = 0;
    
    public tiles_entity_created = 0;


    constructor( stage, game_mode , table_index ) {

        super();
        engine.addEntity(this);

        this.stage = stage;
        this.game_mode = game_mode;
        this.table_index = table_index;

        this.init_sounds();
        this.init_deck();
        this.init_positions();
        this.init_names();
        this.init_entities();
        

        engine.addSystem( this );
        
    }


    //-------
    add_obj_to_arr( arr, kv_list ) {

        let obj = {};
        for ( let i = 0 ; i < kv_list.length ; i+= 2 ) {
            let key = kv_list[i];
            let val = kv_list[i+1];
            obj[key] = val;
        }
        arr.push( obj );
    }


    //-----------
    check_can_hu( h , extra_card ) {

        let player_deck = this.copyArray( this.players_deck[h]) ;
        if ( extra_card != null ) { 
            player_deck.push( extra_card );
        }

        let player_deck_stat = {};
        for ( let i = 0 ; i < player_deck.length ; i++ ) {
            this.safe_incr( player_deck_stat , player_deck[i] , 1 );
        }

        //log( "player_deck_stat" , player_deck_stat )
        
        let winning_concealed_hand = [];
        let winning_exposed_hand   = [];
        let has_4sets_1pair = 0;
        

        let whatif_index = 0;
        
        for ( let key in player_deck_stat ) {

            if ( player_deck_stat[key] >= 2 ) {

                let tmp_deck_stat = this.copyObject( player_deck_stat )
                tmp_deck_stat[key] -= 2;
                this.clear_empty_key( tmp_deck_stat );

                winning_concealed_hand.length = 0;
                this.add_obj_to_arr( winning_concealed_hand , [ key , 2] );


                //log( "\n", whatif_index ,".What if", key , "is removed by 2", tmp_deck_stat )

                // Backup this for later use.
                let tmp_deck_stat2 = this.copyObject( tmp_deck_stat );


                // Remove all quads.
                for ( let key2 in tmp_deck_stat ) {
                    if ( tmp_deck_stat[key2] >= 4 ) {
                        tmp_deck_stat[key2] -= 4;

                        this.add_obj_to_arr( winning_concealed_hand , [ key2 , 4] );
                        
                        
                    }
                }
                this.clear_empty_key( tmp_deck_stat );
                //log( "What if", whatif_index, "What if all quads removed.", tmp_deck_stat )


                // Remove all tripplets.
                for ( let key2 in tmp_deck_stat ) {
                    if ( tmp_deck_stat[key2] >= 3 ) {
                        tmp_deck_stat[key2] -= 3;

                        this.add_obj_to_arr( winning_concealed_hand , [ key2 , 3 ] );
                        
                    }
                }
                this.clear_empty_key( tmp_deck_stat );
                //log( whatif_index, ".What if all tripplets removed.", tmp_deck_stat )

                // Remove all straights
                for ( let key3 in tmp_deck_stat ) {
                    let int_key3 = parseInt(key3);
                    if ( int_key3 < 27 && int_key3 % 9 <= 6 ) {
                        for ( let rep = 0 ; rep < 2 ; rep+= 1) {
                            if ( tmp_deck_stat[key3] >= 1 && tmp_deck_stat[ int_key3 + 1] >= 1 && tmp_deck_stat[ int_key3 + 2] >= 1 ) {
                                tmp_deck_stat[key3] -= 1;
                                tmp_deck_stat[int_key3 + 1] -= 1;
                                tmp_deck_stat[int_key3 + 2] -= 1;

                                this.add_obj_to_arr( winning_concealed_hand , [ key3 , 1 , int_key3 + 1 , 1 , int_key3+ 2, 1 ] );
                        
                            }
                        }
                    }
                }
                
                this.clear_empty_key( tmp_deck_stat );
                //log( whatif_index, ".What if all straights removed.", tmp_deck_stat )

                if ( Object.keys(tmp_deck_stat).length == 0 ) {
                    has_4sets_1pair = 1;  
                    break;
                } else {


                    //log( whatif_index, ".Still no hu, reverse the seq and retry.")
                    // Still no hu? then we try again with.
                    // Remove all straights first, then only remove all quads and tripplets.
                    winning_concealed_hand.splice( 1, winning_concealed_hand.length - 1);

                    // Remove all straights
                    for ( let key3 in tmp_deck_stat2 ) {
                        let int_key3 = parseInt(key3);
                        if ( int_key3 < 27 && int_key3 % 9 <= 6 ) {
                            for ( let rep = 0 ; rep < 2 ; rep+= 1) {
                                if ( tmp_deck_stat2[key3] >= 1 && tmp_deck_stat2[ int_key3 + 1] >= 1 && tmp_deck_stat2[ int_key3 + 2] >= 1 ) {
                                    tmp_deck_stat2[key3] -= 1;
                                    tmp_deck_stat2[int_key3 + 1] -= 1;
                                    tmp_deck_stat2[int_key3 + 2] -= 1;

                                    this.add_obj_to_arr( winning_concealed_hand , [ key3 , 1 , int_key3 + 1 , 1 , int_key3+ 2, 1 ] );
                        
                                }
                            }
                        }
                    }
                    this.clear_empty_key( tmp_deck_stat2 );
                    //log(  whatif_index, ".(R) What if all straights removed.", tmp_deck_stat2 )


                     // Remove all quads.
                    for ( let key2 in tmp_deck_stat2 ) {
                        if ( tmp_deck_stat2[key2] >= 4 ) {
                            tmp_deck_stat2[key2] -= 4;
                            this.add_obj_to_arr( winning_concealed_hand , [ key2 , 4] );
                        }
                    }
                    this.clear_empty_key( tmp_deck_stat2 );
                    //log( whatif_index, ".(R) What if all quads removed.", tmp_deck_stat2 )

                     // Remove all tripplets.
                    for ( let key2 in tmp_deck_stat2 ) {
                        if ( tmp_deck_stat2[key2] >= 3 ) {
                            tmp_deck_stat2[key2] -= 3;

                            this.add_obj_to_arr( winning_concealed_hand , [ key2 , 3 ] );
                        
                        }
                    }
                    this.clear_empty_key( tmp_deck_stat2 );
                    //log( whatif_index, ".(R) What if all tripplets removed.", tmp_deck_stat2 )

                    if ( Object.keys(tmp_deck_stat2).length == 0 ) {
                        has_4sets_1pair = 1;  
                        break;
                    } 

                }

                whatif_index += 1;
            }
            if ( has_4sets_1pair == 1) {
                break;
            }
        }

        if ( has_4sets_1pair == 1 ) {

            if ( this.exposed_deck[h].length > 0 ) {
                for ( let i = 0 ; i < this.exposed_deck[h].length ; i++ ) {
                    
                    let key   = this.exposed_deck[h][i];
                    let key_1 = this.exposed_deck[h][i+1];
                    let key_2 = this.exposed_deck[h][i+2];
                    let key_3 = this.exposed_deck[h][i+3];

                    if ( key == key_1 && key_1 == key_2 && key_2 == key_3 ) {

                        this.add_obj_to_arr( winning_exposed_hand , [ key , 4] )
                        i += 4;

                    } else if ( key == key_1 && key_1 == key_2 ) {
                        
                        this.add_obj_to_arr( winning_exposed_hand , [ key , 3] )
                        i += 3;
                                    
                    } else {

                        this.add_obj_to_arr( winning_exposed_hand , [ key , 1 , key_1 , 1 , key_2 , 1] )
                        i += 3;
                    }
                }
            }
            

            
        } else { 
            winning_concealed_hand.length = 0;
            winning_exposed_hand.length = 0;
        } 
        
        let scores =  this.eval_score( h , player_deck_stat, winning_concealed_hand, winning_exposed_hand , extra_card );
        return this.refine_combinations( scores  );
    }


    //----
    clear_buttons() {
        let b ;
    	for ( b in this.buttons ) {
    		this.buttons[b].hide();
    	}
    }

    //--------
    createButtons(){

        let buttonGroup = new Entity();
        buttonGroup.setParent( this );
        buttonGroup.addComponent( new Transform({
            position: new Vector3(0,  3,  0),
            scale: new Vector3( 0.8 , 0.8 , 0.8 )       
        }))
        buttonGroup.addComponent( new Billboard() );
        

        let helpButton = new Txclickable_box(
            "How to Play",
            "help",
            new Transform({
                position: new Vector3( 0, 1.65, 0),
                scale: new Vector3(1,1,1)
            }),
            buttonGroup,
            this,
            this.materials[3]
        )
        this.buttons["help"] = helpButton;
        

        let dealButton = new Txclickable_box(
            "Start",
            "deal",
            new Transform({
                position: new Vector3( 0, 0, 0),
                scale: new Vector3(1,1,1)
            }),
            buttonGroup,
            this,
            this.materials[3]
        )
        this.buttons["deal"] = dealButton;
        


        if ( this.game_mode == 1 ) {



            let connectButton = new Txclickable_box(
                "Join Public Room",
                "connect",
                new Transform({
                    position: new Vector3( 0, 0, 0),
                    scale: new Vector3(1,1,1)
                }),
                buttonGroup,
                this,
                this.materials[3]
            )
            this.buttons["connect"] = connectButton; 
            
            
            connectButton = new Txclickable_box(
                "Join Private Room",
                "connect2",
                new Transform({
                    position: new Vector3( 0, -1.65, 0),
                    scale: new Vector3(1,1,1)
                }),
                buttonGroup,
                this,
                this.materials[3]
            )
            this.buttons["connect2"] = connectButton; 





            let kickButton = new Txclickable_box(
                "Kick",
                "kick",
                new Transform({
                    position: new Vector3( 0, 0, 0),
                    scale: new Vector3(1,1,1)
                }),
                buttonGroup,
                this,
                this.materials[3]
            )
            this.buttons["kick"] = kickButton; 
            this.buttons["kick"].hide();



            let leaveButton = new Txclickable_box(
                "Leave Room",
                "leave",
                new Transform({
                    position: new Vector3( 0, 1.65, 0),
                    scale: new Vector3(1,1,1)
                }),
                buttonGroup,
                this,
                this.materials[3]
            )
            this.buttons["leave"] = leaveButton; 
            this.buttons["leave"].hide();
            


            this.buttons["deal"].hide();



        }




        let pungButton = new Txclickable_box(
            "Pung",
            "pung",
            new Transform({
                position: new Vector3(4.1, 0 ,0),
                scale: new Vector3( 1, 1, 1)
            }),
            buttonGroup,
            this,
            this.materials[3]
        )
        

        pungButton.hide();
        this.buttons["pung"] = pungButton;
        let button_face = new Entity();
        button_face.setParent(  pungButton );
        button_face.addComponent( new Transform({
            position: new Vector3( -2 ,0, 0.55),
            scale: new Vector3(1, 1 ,1)
        }) );
        button_face.addComponent( new PlaneShape() );
        button_face.addComponent( this.materials[0] );
        button_face.getComponent(Transform).rotation.eulerAngles = new Vector3(0,180,0);
        pungButton["face"] = button_face.getComponent( PlaneShape );
        
        


       



        let passButton = new Txclickable_box(
            "Pass",
            "pass",
            new Transform({
                position: new Vector3( 0 ,-1.6 ,0),
                scale: new Vector3( 1, 1, 1)
            }),
            buttonGroup,
            this,
            this.materials[3]
        )
        passButton.hide();
        this.buttons["pass"] = passButton;

        
        let winButton = new Txclickable_box(
            "Win",
            "win",
            new Transform({
                position: new Vector3( -4.1, 1.6 ,0),
                scale: new Vector3( 1, 1, 1)
            }),
            buttonGroup,
            this,
            this.materials[3]
        )
        winButton.hide();
        this.buttons["win"] = winButton;
        

        let chowbuttons = ["chow_0","chow_1", "chow_2"];
        for ( let b = 0 ; b < 3 ; b++) {
            let chowButton = new Txclickable_box(
                "Chow",
                chowbuttons[b],
                new Transform({
                    position: new Vector3( -12.2 , -1.55 + b * 1.6 ,0),
                    scale: new Vector3( 1 , 1, 1)
                }),
                buttonGroup,
                this,
                this.materials[3]
            )
            chowButton.hide();
            chowButton.text_transform.position.x += 1;
            this.buttons[chowbuttons[b]] = chowButton;
                

            let button_face = new Entity();
            button_face.setParent(  chowButton );
            button_face.addComponent( new Transform({
                position: new Vector3( -2 ,0, 0.55),
                scale: new Vector3(3, 1 ,1)
            }) );
            button_face.addComponent( new PlaneShape() );
            button_face.addComponent( this.materials[0] );
            button_face.getComponent(Transform).rotation.eulerAngles = new Vector3(0,180,0);
            chowButton["face"] = button_face.getComponent( PlaneShape );
            
        }
        
        let kongbuttons = ["kong_0","kong_1", "kong_2"];
        for ( let b = 0 ; b < 3 ; b++ ) {
            let kongButton = new Txclickable_box(
                "Kong",
                kongbuttons[b],
                new Transform({
                    position: new Vector3( 12.2 , -1.55 + b * 1.6 ,0),
                    scale: new Vector3( 1, 1, 1)
                }),
                buttonGroup,
                this,
                this.materials[3]
            )
            kongButton.hide();
            this.buttons[kongbuttons[b]] = kongButton;

            let button_face = new Entity();
            button_face.setParent(  kongButton );
            button_face.addComponent( new Transform({
                position: new Vector3( -2 ,0, 0.55),
                scale: new Vector3(1, 1 ,1)
            }) );
            button_face.addComponent( new PlaneShape() );
            button_face.addComponent( this.materials[0] );
            button_face.getComponent(Transform).rotation.eulerAngles = new Vector3(0,180,0);
            kongButton["face"] = button_face.getComponent( PlaneShape );
            
        }
        

        
    }


    //-------
    createMahjongPieces(){

        let xs          = [ -7.5  ,  12.5 ,   7.5 , -12.5 ];
        let xdeltas     = [  1.1  ,     0 ,  -1.1 ,     0 ];
        let zs          = [ -12.5 ,  -7.5 ,  12.5 , 7.5   ];
        let zdeltas     = [     0 ,   1.1 ,     0 , -1.1  ];
        let yrots       = [     0 ,   -90 ,   180 ,   90  ]

        for ( let h = 0 ; h < 4 ; h++) {

            // The Wall
            for ( let i = 0 ; i < 17 ; i++ ) {
                for ( let j = 0 ; j < 2 ; j++) {
                    
                    let x =  xs[h] + i * xdeltas[h]; 
                    let y =  0.35 + j * -0.7;
                    let z =  zs[h] + i * zdeltas[h];

                    let mpiece = this.create_tile( this, this.wall_pieces_ent.length , x, y,  z );
                    mpiece.getComponent( Transform ).rotation.eulerAngles = new Vector3(-90, yrots[h] ,0);
                    this.wall_pieces_ent.push( mpiece );

                    this.wall_pieces_pos.push(  [ new Vector3( x,y,z ) , new Vector3(-90,yrots[h],0) ] );
                }
            }
        }


        let mpiece_highlight = new Entity();
        mpiece_highlight.setParent(this);
        mpiece_highlight.addComponent( new Transform({
            position: new Vector3( 0, -500, 0),
            scale: new Vector3( 1 , 1.3 , 0.8)
        }))
        mpiece_highlight.getComponent( Transform ).rotation.eulerAngles = new Vector3(90,0,0);
        mpiece_highlight.addComponent( resources.models.cubeframe);
        this.mpiece_highlight = mpiece_highlight;
    }

    //--------
    createMaterials() {

        this.materials = this.stage.materials;
        
    }

    //----------
    create_tile( parent, id, x, y, z  ) {
        
        let mpiece = new Entity();
        mpiece.setParent(parent);
        mpiece.addComponent( new Transform({
            position: new Vector3(x,y,z),
            scale: new Vector3( 1 , 1 , 1 ),
        }))
        mpiece.addComponent( resources.models.mahjong );
        mpiece["onpointerdown_pt"] = new OnPointerDown(
            (e)=>{
                this.piece_onclick(e);
            },{
                hoverText:"E: Discard Piece"
            }
        );
        mpiece["id"] = id;

        let mpiece_face = new Entity();
        mpiece_face.setParent( mpiece );
        mpiece_face.addComponent( new Transform({
            position: new Vector3( 0 , 0 , -0.36),
            scale: new Vector3(0.95 , 1.35 , 1 )
        }))
        mpiece_face.addComponent( new PlaneShape() );
        mpiece_face.addComponent( this.materials[0] );
        mpiece_face.getComponent( PlaneShape ).withCollisions = false;
        mpiece_face.getComponent( PlaneShape ).isPointerBlocker = false;
        

        mpiece["face"] = mpiece_face;
        return mpiece;
    }


    //----------
    createUI() {

        let ui_2d_canvas = new UICanvas();


        let ui_root_for_distance_toggle = new UIContainerRect( ui_2d_canvas );
        ui_root_for_distance_toggle.vAlign = "center";
		ui_root_for_distance_toggle.hAlign = "center";
        ui_root_for_distance_toggle.positionX = -100;
        ui_root_for_distance_toggle.positionY = 100;
        this.ui_root_for_distance_toggle = ui_root_for_distance_toggle;


        let ui_root = new UIContainerRect( ui_root_for_distance_toggle );
        ui_root.vAlign = "center";
		ui_root.hAlign = "center";
        ui_root.positionX = -100;
        ui_root.positionY = 0;
        this.ui_root = ui_root;

        for ( let i = 0 ; i < 18 ; i++) {
            let ui_image = new UIImage( ui_root, resources.textures.mahjong_tiles);
            ui_image.hAlign = "left";
            ui_image.vAlign = "top";
            ui_image.sourceLeft = 0;
            ui_image.sourceWidth = 95;
            ui_image.sourceTop = 0;
            ui_image.sourceHeight = 128;
            ui_image.positionX = -200 + i * 36;
            ui_image.positionY =  150;
            ui_image.width = 32;
            ui_image.height = 43;
            ui_image.visible = false;
            this.ui_images_winner_hand.push( ui_image );

        }

        for ( let i = 0 ; i < 4 ; i++ ) { 
            let ui_text = new UIText( ui_root );
            ui_text.vAlign = "top";
            ui_text.vTextAlign = "top";
            ui_text.hAlign = "left";
            ui_text.hTextAlign = "left";
            if ( i == 0 ) {
                ui_text.positionX = -250;
            } else { 
                ui_text.positionX = i * 100;
            }
            ui_text.positionY = 50;
            ui_text.value = "";
            ui_text.fontSize = 16;
            this.ui_texts.push( ui_text );
        }
        this.ui_root.visible = false;

        let ui_network_msg = new UIText( ui_root_for_distance_toggle );
        ui_network_msg.vAlign = "bottom";
		ui_network_msg.hAlign = "left";
		ui_network_msg.hTextAlign = "left";
		ui_network_msg.positionX =  0;
		ui_network_msg.positionY = -310;
		
        if ( this.game_mode == 0 ) {
            ui_network_msg.value = "Mahjong: Player vs A.I Mode.";
        } else {
            ui_network_msg.value = "Mahjong: Player v Player Mode. Table: " + (this.table_index + 1);
        }

		ui_network_msg.fontSize = 15;
		ui_network_msg.visible = true;
		this.ui_network_msg = ui_network_msg;
    }

    //-----
    createSeatWinds() {
        
        let seatwinds_root = new Entity();
        seatwinds_root.setParent( this );
        seatwinds_root.addComponent( new Transform() );
        this.seatwinds_root = seatwinds_root;

        let xs = [  0 ,  3,  0 , -3 ];
        let zs = [ -3 ,  0 , 3,   0 ];
        let billboard = new Billboard();

        for ( let h = 0 ; h < 4 ; h++) {

            let seatwind = new Entity();   
            let x = xs[h];
            let z = zs[h];
            seatwind.setParent( seatwinds_root );
            seatwind.addComponent( new Transform({
                position: new Vector3( x , 0.1 , z ),
                scale: new Vector3( 3 , 3 , 1)
            }))
            seatwind.getComponent( Transform).rotation.eulerAngles = new Vector3(90, h * -90 ,0);
            seatwind.addComponent( new PlaneShape() );

            this.setFaceVal( seatwind.getComponent(PlaneShape), 27 + h , 1 ); 
            seatwind.addComponent( this.materials[1] );
            this.seatwinds_ent.push( seatwind );
            this.fixed_seatwinds_ent.push( seatwind );


            let display_name_ent = new Entity();
            display_name_ent.setParent( this );
            display_name_ent.addComponent( new Transform({
                position: new Vector3(x, 0.8, z ),
                scale: new Vector3(0.4, 0.4, 0.4)
            }))
            display_name_ent.addComponent( new TextShape("") );
            display_name_ent.addComponent( billboard );
            this.display_names_ent.push( display_name_ent );

        }

    }    

    //---------------------------------
    copyObject( obj ) {
        let retobj = {};
        for ( let key in obj ) {
            retobj[key] = obj[key];
        }
        return retobj;
    }

    //---------------------------------
    copyArray( arr ) {
        let retarr = [];
        for ( let i = 0 ; i < arr.length ; i++ ) {
            retarr.push(arr[i]);
        }
        return retarr;
    }

    //---------------
    copy2DArray( arr ) {
        let retarr = [];
        for ( let h = 0 ; h < arr.length ; h++ ) {
            if ( retarr[h] == null ) {
                retarr[h] = [];
            }
            for ( let i = 0 ; i < arr[h].length ; i++) {
                retarr[h].push(arr[h][i]);
            }
        }
        return retarr;
    }
    

    //---------------------------------
    clear_empty_key( obj ) {
        for ( let key in obj ) {
            if ( obj[key] == 0 ) {
                delete obj[key];
            }
        }
    }
    
    //---------------------------------
    clear_empty_and_neg_key( obj ) {
        for ( let key in obj ) {
            if ( obj[key] <= 0 ) {
                delete obj[key];
            }
        }
    }

    //--------
    do_pung( todo ) {
        
        let action_owner = todo[0];

        let cardinal_label = ["East","South","West","North"][this.players_wind[ action_owner] - 27]
        ui.displayAnnouncement( "[" + cardinal_label + "] " +this.display_names[ action_owner ] + ": Pung!", 2, Color4.Yellow(), 14, false);
        this.sounds["pung"].playOnce();

        let count = 0;

        this.discarded_deck[this.last_discarded_side].pop();
        this.exposed_deck[ action_owner ].push( this.last_discarded );
        
        let m_piece = this.players_discarded_ent[this.last_discarded_side].pop();
        this.players_exposed_ent[ action_owner ].push( m_piece );
        m_piece.getComponent( Transform ).position.x = this.players_exposed_pos[ action_owner ][ this.players_exposed_ent[ action_owner ].length - 1 ].x;
        m_piece.getComponent( Transform ).position.y = this.players_exposed_pos[ action_owner ][ this.players_exposed_ent[ action_owner ].length - 1 ].y;
        m_piece.getComponent( Transform ).position.z = this.players_exposed_pos[ action_owner ][ this.players_exposed_ent[ action_owner ].length - 1 ].z;
        m_piece.getComponent( Transform ).rotation.eulerAngles = new Vector3( 90, action_owner * -90, 0 );
                            
        for ( let i = this.players_deck[ action_owner ].length ; i >= 0 ; i-- ) {

            if ( this.players_deck[ action_owner ][i] == this.last_discarded ) {

                this.players_deck[ action_owner ].splice( i , 1);
                this.exposed_deck[ action_owner ].push( this.last_discarded );
                
                let m_piece = this.players_concealed_ent[ action_owner ][i];
                this.players_concealed_ent[ action_owner ].splice( i , 1 );
                this.players_exposed_ent[  action_owner  ].push( m_piece );
                m_piece.getComponent( Transform ).position.x = this.players_exposed_pos[  action_owner  ][ this.players_exposed_ent[ action_owner ].length - 1 ].x;
                m_piece.getComponent( Transform ).position.y = this.players_exposed_pos[  action_owner  ][ this.players_exposed_ent[ action_owner ].length - 1 ].y;
                m_piece.getComponent( Transform ).position.z = this.players_exposed_pos[  action_owner  ][ this.players_exposed_ent[ action_owner ].length - 1 ].z;
                m_piece.getComponent( Transform ).rotation.eulerAngles = new Vector3( 90,  action_owner  * -90, 0 );
                    
                count += 1;
            }
            if ( count >= 2 ) {
                break;
            }
        }
        this.exposed_deck[ action_owner ].push( -2 );


        this.mpiece_highlight.getComponent(Transform).position.y = -500;
        this.whose_turn =  action_owner ;
        this.render_turn();

        

        
        this.clear_buttons();    
            
    }


    //-----
    do_kong( todo ) {

        log( todo );

        let action_owner        = todo[0];
        let kong_type           = todo[4];
        let key                 = todo[5];
        let kong_button_index   = todo[2];

        let cardinal_label = ["East","South","West","North"][this.players_wind[ action_owner ] - 27]
        let count = 0;
        
        if ( kong_type == -3 ) {

            // big melded kong (Ming Gang)
            ui.displayAnnouncement( "[" + cardinal_label + "] " +this.display_names[ action_owner ] + ": Big Melded Kong!", 2, Color4.Yellow(), 14, false);
            this.sounds["public_kong"].playOnce();

            this.discarded_deck[this.last_discarded_side].pop();
            this.exposed_deck[ action_owner ].push( this.last_discarded );
            
            let m_piece = this.players_discarded_ent[this.last_discarded_side].pop();
            this.players_exposed_ent[  action_owner  ].push( m_piece );
            m_piece.getComponent( Transform ).position.x = this.players_exposed_pos[  action_owner  ][ this.players_exposed_ent[ action_owner ].length - 1 ].x;
            m_piece.getComponent( Transform ).position.z = this.players_exposed_pos[  action_owner  ][ this.players_exposed_ent[ action_owner ].length - 1 ].z;
            m_piece.getComponent( Transform ).position.y = this.players_exposed_pos[  action_owner  ][ this.players_exposed_ent[ action_owner ].length - 1 ].y;
            m_piece.getComponent( Transform ).rotation.eulerAngles = new Vector3( 90,  action_owner  * -90, 0 );
                    
            
            for ( let i = this.players_deck[ action_owner ].length ; i >= 0 ; i-- ) {
                if ( this.players_deck[ action_owner ][i] == this.last_discarded ) {

                    this.players_deck[ action_owner ].splice( i , 1);
                    this.exposed_deck[ action_owner ].push( this.last_discarded );

                    let m_piece = this.players_concealed_ent[ action_owner ][i];
                    this.players_concealed_ent[ action_owner ].splice( i , 1 );
                    this.players_exposed_ent[  action_owner  ].push( m_piece );
                    m_piece.getComponent( Transform ).position.x = this.players_exposed_pos[  action_owner  ][ this.players_exposed_ent[ action_owner ].length - 1 ].x;
                    m_piece.getComponent( Transform ).position.z = this.players_exposed_pos[  action_owner  ][ this.players_exposed_ent[ action_owner ].length - 1 ].z;
                    m_piece.getComponent( Transform ).position.y = this.players_exposed_pos[  action_owner  ][ this.players_exposed_ent[ action_owner ].length - 1 ].y;
                    m_piece.getComponent( Transform ).rotation.eulerAngles = new Vector3( 90,  action_owner  * -90, 0 );
                    
                    
                    count += 1;
                }
                if ( count >= 3 ) {
                    break;
                }
            }
           
            this.exposed_deck[ action_owner ].push( -3 );
    
            this.mpiece_highlight.getComponent(Transform).position.y = -500;
            this.whose_turn =  action_owner ;
            this.check_wall_and_proceed_draw_one_tile(); // Need to draw 1 more card.

            
        } else if ( kong_type == -5 ) {
            
            // Concealed kong (An Gang)
            ui.displayAnnouncement( "[" + cardinal_label + "] " +this.display_names[ action_owner ] + ": Concealed Kong!", 2, Color4.Yellow(), 14, false);
            this.sounds["private_kong"].playOnce();

            for ( let i = this.players_deck[ action_owner ].length ; i >= 0 ; i-- ) {
                if ( this.players_deck[ action_owner ][i] == key ) {
                    
                    this.players_deck[ action_owner ].splice( i , 1);
                    this.exposed_deck[ action_owner ].push( key );

                    let m_piece = this.players_concealed_ent[ action_owner ][i];
                    this.players_concealed_ent[ action_owner ].splice( i , 1 );
                    this.players_exposed_ent[  action_owner  ].push( m_piece );
                    m_piece.getComponent( Transform ).position.x = this.players_exposed_pos[  action_owner  ][ this.players_exposed_ent[ action_owner ].length - 1 ].x;
                    m_piece.getComponent( Transform ).position.z = this.players_exposed_pos[  action_owner  ][ this.players_exposed_ent[ action_owner ].length - 1 ].z;
                    m_piece.getComponent( Transform ).position.y = this.players_exposed_pos[  action_owner  ][ this.players_exposed_ent[ action_owner ].length - 1 ].y;

                    let x_rot = 90;
                    if ( count == 0 || count == 3 ) {
                        x_rot = -90;
                    }
                    m_piece.getComponent( Transform ).rotation.eulerAngles = new Vector3( x_rot ,  action_owner  * -90, 0 );
                    
                    count += 1;
                }
            }
            
            this.exposed_deck[ action_owner ].push( -5 );
            this.check_wall_and_proceed_draw_one_tile();
        
        
        } else if ( kong_type == -4 ) {

            // Small Melded Kong(Jia Gang)
            ui.displayAnnouncement( "[" + cardinal_label + "] " +this.display_names[ action_owner ] + ": Small Melded Kong!", 2, Color4.Yellow(), 14, false);
            this.sounds["public_kong"].playOnce();

            for ( let i = this.players_deck[ action_owner ].length ; i >= 0 ; i-- ) {
                if ( this.players_deck[ action_owner ][i] == key ) {
                    
                    this.players_deck[ action_owner ].splice( i , 1);
                    
                    // Figure out which index to insert .
                    let insert_at_index     = this.exposed_deck[  action_owner  ].length;
                    let insert_ent_at_index = this.players_exposed_ent[  action_owner  ].length; 
                    let j_ent = 0;
                    for (let j = 0 ; j < this.exposed_deck[  action_owner  ].length  ; j++ ) {
                        if ( this.exposed_deck[  action_owner  ][j] == key ) {
                            insert_at_index = j + 1;
                            insert_ent_at_index = j_ent + 1;
                            break;
                        }
                        if ( this.exposed_deck[  action_owner  ][j] >= 0 ) {
                            j_ent += 1;
                        }
                    }

                    this.exposed_deck[ action_owner ].splice( insert_at_index, 0, key );
                    this.exposed_deck[ action_owner ][insert_at_index + 3] = -4;

                    let m_piece = this.players_concealed_ent[ action_owner ][i];
                    
                    this.players_concealed_ent[ action_owner  ].splice( i , 1 );
                    this.players_exposed_ent[  action_owner   ].splice( insert_ent_at_index, 0, m_piece );
                    
                    m_piece.getComponent( Transform ).position.x = this.players_exposed_pos[  action_owner  ][ insert_ent_at_index  ].x;
                    m_piece.getComponent( Transform ).position.z = this.players_exposed_pos[  action_owner  ][ insert_ent_at_index  ].z;
                    m_piece.getComponent( Transform ).position.y = this.players_exposed_pos[  action_owner  ][ insert_ent_at_index  ].y + 0.7;
                    m_piece.getComponent( Transform ).rotation.eulerAngles = new Vector3( -90 ,  action_owner  * -90, 0 );

                    break;
                }
            }
            this.check_wall_and_proceed_draw_one_tile();
        }

        

        
    }



    
    //----
    do_chow( todo ) {

        let action_owner = todo[0];
        let chow_type    = todo[2];


        let cardinal_label = ["East","South","West","North"][this.players_wind[ action_owner ] - 27]
        ui.displayAnnouncement( "[" + cardinal_label + "] " + this.display_names[ action_owner ] + ": Chow!", 2, Color4.Yellow(), 14, false);
        this.sounds["chow"].playOnce();

        let count = 0;
        let discarded_val   = this.last_discarded % 9;
        let discarded_suit  = (this.last_discarded / 9) >> 0;

        let chow_plate = [];
        let chow_plate_ent = [];

        for ( let i = this.players_deck[ action_owner ].length ; i >= 0 ; i-- ) {

            let cur_val         = this.players_deck[ action_owner ][i] % 9;
            let cur_suit        = (this.players_deck[ action_owner ][i] / 9) >> 0;

            if ( cur_suit == discarded_suit ) {

                if ( chow_type == 0) {
                    if ( cur_val - discarded_val == -2 && chow_plate[0] == null) {
                        
                        chow_plate[0] = this.players_deck[ action_owner ][i];
                        this.players_deck[ action_owner ].splice( i , 1);
                        
                        chow_plate_ent[0] = this.players_concealed_ent[  action_owner  ][i];
                        this.players_concealed_ent[ action_owner ].splice( i , 1 );
                    }
                    if ( cur_val - discarded_val == -1 && chow_plate[1] == null) {

                        chow_plate[1] = this.players_deck[ action_owner ][i];
                        this.players_deck[ action_owner ].splice( i , 1);

                        chow_plate_ent[1] = this.players_concealed_ent[  action_owner  ][i];
                        this.players_concealed_ent[  action_owner  ].splice( i , 1 );
                    }
                } else if ( chow_type == 1) {
                    if ( cur_val - discarded_val == -1 && chow_plate[0] == null) {
                        chow_plate[0] = this.players_deck[ action_owner ][i];
                        this.players_deck[ action_owner ].splice( i , 1);

                        chow_plate_ent[0] = this.players_concealed_ent[  action_owner  ][i];
                        this.players_concealed_ent[ action_owner ].splice( i , 1 );
                    }
                    if ( cur_val - discarded_val ==  1 && chow_plate[2] == null) {
                        chow_plate[2] = this.players_deck[ action_owner ][i];
                        this.players_deck[ action_owner ].splice( i , 1);

                        chow_plate_ent[2] = this.players_concealed_ent[  action_owner  ][i];
                        this.players_concealed_ent[ action_owner ].splice( i , 1 );
                    }
                } else if ( chow_type == 2) {
                    if ( cur_val - discarded_val == 1 && chow_plate[1] == null) {
                        chow_plate[1] = this.players_deck[ action_owner ][i];
                        this.players_deck[ action_owner ].splice( i , 1);

                        chow_plate_ent[1] = this.players_concealed_ent[  action_owner  ][i];
                        this.players_concealed_ent[ action_owner ].splice( i , 1 );
                    }
                    if ( cur_val - discarded_val == 2 && chow_plate[2] == null) {
                        chow_plate[2] = this.players_deck[ action_owner ][i];
                        this.players_deck[ action_owner ].splice( i , 1);

                        chow_plate_ent[2] = this.players_concealed_ent[  action_owner  ][i];
                        this.players_concealed_ent[ action_owner ].splice( i , 1 );
                    }
                }
            }
        }
        if ( chow_type == 0 ) {
            chow_plate[2]       = this.last_discarded;
            chow_plate_ent[2]   = this.players_discarded_ent[ this.last_discarded_side ].pop();
        } else if ( chow_type == 1) {
            chow_plate[1]       = this.last_discarded;
            chow_plate_ent[1]   = this.players_discarded_ent[ this.last_discarded_side ].pop();
        } else if ( chow_type == 2) {
            chow_plate[0]       = this.last_discarded;
            chow_plate_ent[0]   = this.players_discarded_ent[ this.last_discarded_side ].pop();
        }


        for ( let i = 0 ; i < 3 ; i++ ) {
            
            this.exposed_deck[ action_owner ].push( chow_plate[i] );
            this.players_exposed_ent[  action_owner  ].push( chow_plate_ent[i] );
            chow_plate_ent[i].getComponent( Transform ).position.x = this.players_exposed_pos[  action_owner  ][ this.players_exposed_ent[ action_owner ].length - 1 ].x;
            chow_plate_ent[i].getComponent( Transform ).position.z = this.players_exposed_pos[  action_owner  ][ this.players_exposed_ent[ action_owner ].length - 1 ].z;
            chow_plate_ent[i].getComponent( Transform ).position.y = this.players_exposed_pos[  action_owner  ][ this.players_exposed_ent[ action_owner ].length - 1 ].y;
            
            chow_plate_ent[i].getComponent( Transform ).rotation.eulerAngles = new Vector3( 90,  action_owner  * -90, 0 );


        }
        this.exposed_deck[ action_owner ].push( -1 );
        
        this.mpiece_highlight.getComponent(Transform).position.y = -500;
        this.discarded_deck[this.last_discarded_side].pop();
        
        this.whose_turn =  action_owner ;
        this.render_turn();


        this.clear_buttons(); 
       
        log("chow done");


    }

   

    //----
    do_win( todo  ) {
        
        let action_owner = todo[0];
        let last_hu_scores = todo[4];
        let last_hu_use_discard = todo[5];
        
        log( "Hu Side",  action_owner  , "Use Discard", last_hu_use_discard );
        log( "Hu hand", this.players_deck[ action_owner ]);
        log( "Hu exposed", this.exposed_deck[ action_owner ]);

        if ( last_hu_use_discard == 0 ) {
            let last_index = this.players_concealed_ent[  action_owner  ].length - 1;
            this.mpiece_highlight.getComponent(Transform).position.copyFrom( this.players_concealed_ent[  action_owner  ][last_index].getComponent(Transform).position );
            this.mpiece_highlight.getComponent(Transform).rotation.copyFrom( this.players_concealed_ent[  action_owner  ][last_index].getComponent(Transform).rotation );
        }


        let cardinal_label = ["East","South","West","North"][this.players_wind[ action_owner ] - 27]
        ui.displayAnnouncement( "[" + cardinal_label + "] " +  this.display_names[ action_owner ] + ": Hu!", 5, Color4.Yellow(), 14, false);
        if ( last_hu_use_discard == 1 ) {
            this.sounds["hule"].playOnce();
        } else {
            this.sounds["zimo"].playOnce();
        }
        this.clear_buttons();
        // draw
        this.whose_turn = -1;
        this.gameover = 1;
        
        let str = [];
        if ( last_hu_scores != null ) {

            str[0] = "Winner is : " + "[" + cardinal_label + "] " + this.display_names[  action_owner  ] + "\n\n"
            str[1] = "\n\n"
            str[2] = "\n\n"
            str[3] = "\n\n"

            let total = 0;
            for ( let i = 0 ; i < last_hu_scores.length ; i++ ) {
                str[0]  += last_hu_scores[i][0] + "\n";
                str[1] += last_hu_scores[i][1]  + "\n";
                str[2] += "\n";
                str[3] += "\n";
                total += last_hu_scores[i][1];
            }
            str[0] += "\nTotal: \n\n";
            str[1] += "\n" + total + "\n\n"
            str[2] += "\n\n\n";
            str[3] += "\n\n\n";

            str[0] += "Player\n"
            str[1] += "Hand Score\n"
            str[2] += "Win Bonus\n"
            str[3] += "Final Score\n"
            for ( let i = 0 ; i < 4 ; i++) {
                str[i] += "---------\n";
            }

            
            for ( let h = 0 ; h < 4 ; h++ ) {

                let hand_score = "";
                let win_bonus  = "-8";


                if ( h ==  action_owner  ) {
                    
                    if ( last_hu_use_discard == 1 ) {
                        hand_score = "+" + total;
                        this.final_scores[h] += total;
                    } else {
                        hand_score = "+" + (total * 3);
                        this.final_scores[h] += (total * 3);
                    }
                    win_bonus  = "+24";

                    
                    this.final_scores[h] += 24;
                    

                } else { 
                    
                    this.final_scores[h] -= 8;
                    if ( last_hu_use_discard == 1 ) {
                        if ( h == this.last_discarded_side) {
                            hand_score = "-" + total;
                            this.final_scores[h] -= total;
                        } 
                    } else {
                        hand_score = "-" + total;
                        this.final_scores[h] -= total;
                    }
                }
                
                str[0] +=  this.display_names[h] + "\n"
                str[1] +=  hand_score + "\n"
                str[2] +=  win_bonus  + "\n"
                str[3] +=  this.final_scores[h] + "\n"                
            }


            for ( let i = 0 ; i < 4 ; i++) {
                this.ui_texts[i].value = str[i];
            }
            
        }

        // show faces
        for ( let h = 1 ; h < 4 ; h++ ) {
            for ( let i = 0 ; i < this.players_concealed_ent[h].length ; i++ ){
                let m_piece = this.players_concealed_ent[h][i];
                m_piece.getComponent( Transform ).rotation.eulerAngles = new Vector3( 90 , h * -90 , 0 );
            }
        }

        
        
        this.render_hand_to_ui(  action_owner  , last_hu_use_discard );
        
        
        
        this.stage.on_score_updated( this.final_scores , this.game_mode , this.round , "mahjong");
        this.buttons["deal"].show();
        this.buttons["leave"].show();
    
    }

    //---
    do_pass( todo ) {

        this.clear_buttons();
        this.whose_turn = (this.whose_turn + 1) % 4;
        this.render_turn();
        this.check_wall_and_proceed_draw_one_tile();
    
    }


    



    //------------------------------------------------------
    eval_score( h, player_deck_stat , winning_concealed_hand, winning_exposed_hand , extra_card ) {

        let scores = [];
        
        if ( winning_concealed_hand.length > 0 ) {
            
            // Hu here. Now eval score based on exposed deck hand
            let composite_hand = winning_concealed_hand.concat( winning_exposed_hand );
            //log( "Composite of exposed and concealed hands", composite_hand );
            
            

            // Generic params for concealed
            let concealed_pung_count = 0;
            let concealed_kong_count = 0;
            let concealed_chow_count = 0;
            for ( let i = 0 ; i < winning_concealed_hand.length ; i++ ) {

                let setkeys = Object.keys( winning_concealed_hand[i] ); 
                if ( setkeys.length == 1 ) {
                    let key = setkeys[0];
                    let tilecount = winning_concealed_hand[i][key];
                    if ( tilecount == 4 ) {
                        concealed_kong_count += 1;
                    } else if ( tilecount == 3) {
                        concealed_pung_count += 1;
                    }
                } else if ( setkeys.length == 3 ) {
                    concealed_chow_count += 1;
                }
            }
            
            

            // Generic Params for exposed 
            let exposed_kong_count = 0;
            let exposed_pung_count = 0;
            let exposed_chow_count = 0;

            
            for ( let i = 0 ; i < winning_exposed_hand.length ; i++ ) {

                let setkeys = Object.keys( winning_exposed_hand[i] ); 
                if ( setkeys.length == 1 ) {
                    let key = setkeys[0];
                    let tilecount = winning_exposed_hand[i][key];
                    if ( tilecount == 4 ) {
                        exposed_kong_count += 1;
                    } else if ( tilecount == 3) {
                        exposed_pung_count += 1;
                    }
                } else if ( setkeys.length == 3 ) {
                    exposed_chow_count += 1;
                }
            }



            // Generic params for composite. 
            let kong_count = 0;
            let pung_count = 0;
            let chow_count = 0;
            let pair_count = 0;
            
            
            for ( let i = 0 ; i < composite_hand.length ; i++ ) {

                let setkeys = Object.keys( composite_hand[i] ); 
                if ( setkeys.length == 1 ) {
                    let key = setkeys[0];
                    let tilecount = composite_hand[i][key];
                    if ( tilecount == 4 ) {
                        kong_count += 1;
                    } else if ( tilecount == 3) {
                        pung_count += 1;
                    } else if ( tilecount == 2) {
                        pair_count += 1;
                    }
                } else if ( setkeys.length == 3 ) {
                    chow_count += 1;
                }
            }

            


            
            // Generic var
            let impossible_to_complete = 0;

            
            //------------
            // 1 Point

            // Pure Double Chow
            // Mixed Double Chow
            // Short Straight
            // Two Terminal Chows

            if ( chow_count >= 2 ) {

                let suit_used = {}
                let chow_heads = {};
                let chow_heads_suitless = {};

                for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                    for ( let strkey in composite_hand[i] ) {
                        let key = parseInt(strkey);
                        if ( key < 27 && composite_hand[i][key] == 1 ) {
                            let suit = (key / 9) >> 0;                
                            suit_used[suit] = 1;
                            this.safe_incr( chow_heads, key , 1 )
                            this.safe_incr( chow_heads_suitless , key % 9 , 1)
                            break;
                        } 
                    }
                }
                for ( let ch in chow_heads ) {
                    if ( chow_heads[ch] >= 2 ) {
                        scores.push( [  "Pure Double Chow", 2 ]  )
                        break;
                    } else if ( chow_heads_suitless[ch] >= 2 ) {
                        scores.push( [  "Mixed Double Chow", 1 ]  )
                        break;
                    }
                }

                let terminal_chow_count = 0;
                for ( let strch in chow_heads_suitless ) {
                    let ch = parseInt(strch);
                    if ( ch == 0 || ch == 6 ) {
                        terminal_chow_count += 1;
                    }
                }
                if ( terminal_chow_count >= 2 ) {
                    scores.push( [  "Two Terminal Chows", 1 ]  )
                }

                let arr_chow_heads = Object.keys( chow_heads ).sort(function(a, b){return parseInt(a)- parseInt(b) });
                for ( let i = 0 ; i < arr_chow_heads.length ; i++ ) {
                    if ( parseInt(arr_chow_heads[i+1]) - parseInt(arr_chow_heads[i]) == 3 && ( parseInt(arr_chow_heads[i])/ 9) >> 0 == ( parseInt(arr_chow_heads[i+1])/ 9)>>0 ) {
                        scores.push( [  "Short Straight", 1 ]  )
                        break;
                    }
                }
            }

            
            // Pung of Terminals or Honors
            let done = 0
            for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                for ( let strkey in composite_hand[i] ) {
                    let key = parseInt(strkey)
                    if ( ( (key >= 27 && key <= 30 && key != this.players_wind[i] && key != this.prevalent_wind ) || (key % 9 == 0) || (key % 9 == 8) ) && composite_hand[i][key] >= 3 ) {
                        scores.push( [  "Pung Of Terminals or Honors", 1 ]  )
                        done = 1;
                        break;
                    }
                }
                if ( done == 1 ) {
                    break;
                }
            }

            // Melded Kong
            if ( exposed_kong_count >= 1 ) {
                scores.push( [  "Melded Kong", 1 ]  )
            }



            // No Honor Tiles
            impossible_to_complete = 0;
            for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                for ( let strkey in composite_hand[i] ) {
                    let key = parseInt(strkey)
                    if ( key >= 27  ) {
                        impossible_to_complete = 1;
                        break;
                    }
                }
                if ( impossible_to_complete == 1 ) {
                    break;
                }
            }
            if ( impossible_to_complete == 0 ) {
                scores.push( [  "No Honor Tiles", 1 ]  )
            }


            // Flowers
            
            // Edge Wait

            // Closed Wait

            // Pair Wait



            //------
            // 2 points
            
            // Dragon Pung
            // Prevalend Wind 
            // Seat Wind

            let dragon_pung_count = 0;
            let seat_wind_pung_count = 0;
            let prevalent_wind_pung_count = 0;
            for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                for ( let strkey in composite_hand[i] ) {
                    let key = parseInt(strkey)
                    if ( key >= 31 && key <= 33 && composite_hand[i][key] >= 3 ) {
                        dragon_pung_count += 1;  
                    } else if ( key >= 27 && key <= 30 && composite_hand[i][key] >= 3 ) {
                        if ( this.players_wind[h] == key ) {
                            seat_wind_pung_count += 1;
                        }
                        if ( this.prevalent_wind == key ) {
                            prevalent_wind_pung_count += 1;
                        }
                    } else {
                        break;
                    }
                }
            }
            if ( dragon_pung_count >= 1 ) {
                scores.push( [  "Dragon Pung", 2 ]  )
            }
            if ( seat_wind_pung_count >= 1 ) {
                scores.push( ["Seat Wind", 2])
            }
            if ( prevalent_wind_pung_count >= 1 ) {
                scores.push( ["Prevalent Wind", 2])
            }
            

            // All Chows
            if ( chow_count >= 4 ) {
                scores.push( [  "All Chows", 2 ]  )
            }

            // Tile Hog

            // Double Pung


            // Two Concealed Pungs
            if ( concealed_pung_count + concealed_kong_count >= 2 ) {
                scores.push( [  "Two Concealed Pungs", 2 ]  )
            }

            // Concealed Kong
            if ( concealed_kong_count >= 1 ) {
                scores.push( [ "Concealed Kong" , 2] )
            }
            // All Simples



            //-------
            // 4 points


            // Outside Hand
            

            

            // 2 Melded Kongs
            if ( exposed_kong_count == 2 ) {
                scores.push( [  "Two Melded Kongs", 4 ]  )
            }

            // Last of its kind

           

            


            //------
            // 6 points 

            // All Pungs
            if ( pung_count + kong_count >= 4 ) {
                scores.push( [  "All Pungs", 6 ]  )
            }

            // Half Flush
            // One Voided Suit(1)

            let suit_used = {};
            for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                for ( let strkey in composite_hand[i] ) {
                    let key = parseInt(strkey)
                    if ( key < 27 ) {
                        let suit = (key / 9) >> 0;
                        suit_used[suit] = 1;                          
                    } 
                }
            }
            if ( Object.keys(suit_used).length == 1 ) {
                scores.push( [  "Half Flush", 6 ]  )
            } else if ( Object.keys(suit_used).length == 2 ) {
                scores.push( [ "One Voided Suit", 1] )
            }


            // All types


            // Melded Hand

            // Two Dragon Pungs
            // 2 dragon pungs
            if ( pung_count >= 2 ) {
                let little_dragon_count = 0;
                for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                    for ( let strkey in composite_hand[i] ) {
                        let key = parseInt(strkey)
                        if ( key >= 31 && key <= 33 && composite_hand[i][key] >= 3 ) {
                            little_dragon_count += 1;                                    
                        } else {
                            break;
                        }
                    }
                }
                if ( little_dragon_count == 2 ) {
                    scores.push( [  "Two Dragon Pungs", 6 ]  )
                }
            }



            // -----
            // 8 points



            
            

            // Reversible Tiles
            impossible_to_complete = 0;
            for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                for ( let strkey in composite_hand[i] ) {
                    let key = parseInt(strkey)
                    if ( [0,1,2,3,4,7,8,10,12,13,14,16,17,33].indexOf( key ) == -1) {
                        impossible_to_complete = 1;
                        break;
                    }
                }
            }
            if ( impossible_to_complete == 0 ) {
                scores.push( [  "Reversible Tiles", 8 ]  )
            }

            // Mixed Straight
            // Mixed Triple Chow
            // Mixed Shifted Chow

            if ( chow_count >= 3 ) {

                let suit_used = {}
                let chow_heads = [];

                for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                    for ( let strkey in composite_hand[i] ) {
                        let key = parseInt(strkey)
                        if ( key < 27 && composite_hand[i][key] == 1 ) {
                            let suit = (key / 9) >> 0;                
                            suit_used[suit] = 1;
                            chow_heads.push( key % 9);
                            break;
                        } 
                    }
                }

                if ( Object.keys(suit_used).length >= 3 ) {
                    
                    // If same number, then mixed triple chow, 
                    chow_heads.sort(function(a, b){return a-b})
                    if ( chow_heads[0] == chow_heads[1] && chow_heads[1] == chow_heads[2] ) {
                        scores.push( [  "Mixed Triple Chow", 8 ]  )
                    } else if ( chow_heads[1] - chow_heads[0] == 3 && chow_heads[2] - chow_heads[1] == 3 ) {
                        scores.push( [  "Mixed Straight", 8] );
                    } else if ( chow_heads[1] - chow_heads[0] == 1 && chow_heads[2] - chow_heads[1] == 1 ) {
                        scores.push( [  "Mixed Shifted Chow", 6] );
                    }
                }
            }


            // Mixed shifted pungs
            if ( pung_count >= 3 ) {
                impossible_to_complete = 0;
                let collected_pung_keys = [];
                for ( let i = 1 ; i < composite_hand.length ; i++ ) {
                    for ( let strkey in composite_hand[i] ) {
                        let key = parseInt(strkey)
                        if ( key < 27 && composite_hand[i][key] >= 3 ) {
                            collected_pung_keys.push( key % 9 );
                        } 
                    }
                }
                if ( collected_pung_keys.length >= 3 ) {    
                    collected_pung_keys.sort(function(a, b){return a-b})
                    
                    let conti_count = 0;
                    for ( let i = 0 ; i < collected_pung_keys.length ; i++ ) {
                        if ( collected_pung_keys[i+1] - collected_pung_keys[i] == 1 && collected_pung_keys[i+2] - collected_pung_keys[i] == 2) {
                            scores.push( [  "Mixed Shifted Pungs", 8 ]  )
                            break;
                        }
                    }
                }
            }

            // Two concealed kongs
            if ( concealed_kong_count >= 2 ) {
                scores.push( [  "Two Concealed Kongs", 8 ]  )
            }

            // Last Tile Draw

            // Last Tile Claim

            // Out with Replacement Tile

            // Robbing The Kong

            // Chicken Hand

            //-------
            // 12 points


            // Lesser Honors and Knitted Tiles

            // Knitted Straight


            // Lower and Upper Four 
            let impossible_lower_4_only = 0;
            let impossible_upper_4_only = 0;

            for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                for ( let strkey in composite_hand[i] ) {
                    let key = parseInt(strkey)
                    if ( key >= 27 ) {
                        impossible_lower_4_only = 1;
                        impossible_upper_4_only = 1;
                        break;
                    }
                    if ( key % 9 > 3 ) {
                        impossible_lower_4_only = 1;
                    }
                    if ( key % 9 < 5 ) {
                        impossible_upper_4_only = 1;
                    }
                }
            }
            
            if ( impossible_upper_4_only == 0 ) {
                scores.push( [  "Upper Four", 12 ]  )
            }
            if ( impossible_lower_4_only == 0 ) {
                scores.push( [  "Lower Four", 12 ]  )
            }


            // Big Three Winds
            if ( pung_count + kong_count >= 3) {
                let big_wind_count = 0;
                for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                    for ( let strkey in composite_hand[i] ) {
                        let key = parseInt(strkey)
                        if ( key >= 27 && key <= 30 && composite_hand[i][key] >= 3 ) {
                            big_wind_count += 1;                                    
                        } else {
                            break;
                        }
                    }
                }
                if ( big_wind_count == 3 ) {
                    scores.push( [  "Big Three Winds", 12 ]  )
                }
            }


            //-------
            // 16 points

            // Pure Straight
            // Three-suited terminal chows
            if ( chow_count >= 3 ) {

                let keysuit_cnt = {};
                for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                    for ( let strkey in composite_hand[i] ) {
                        let key = parseInt(strkey)
                        if ( key < 27 && composite_hand[i][key] == 1 ) {
                            let keysuit = (key / 9) >> 0;
                            this.safe_push( keysuit_cnt, keysuit, key );
                        } else if ( key < 27 && composite_hand[i][key] == 2 ) {
                            let keysuit = (key / 9) >> 0;
                            this.safe_push( keysuit_cnt, keysuit, key );
                        }
                    }
                }

                // exactly 3 suited
                if ( Object.keys( keysuit_cnt ).length == 3 ) {

                    let requirement_met = 0;
                    for ( let keysuit in keysuit_cnt ) {
                        if ( keysuit_cnt[keysuit].length == 6 ) {
                            keysuit_cnt[keysuit].sort(function(a, b){return a-b})
                            if ( keysuit_cnt[keysuit][0] % 9 == 0 &&  keysuit_cnt[keysuit][5] % 9 == 8  ) {
                                requirement_met += 1;
                            }
                        } else if ( keysuit_cnt[keysuit].length == 1  ) {
                            if ( keysuit_cnt[keysuit][0] % 9 == 4 ) {
                                requirement_met += 1
                            }
                        }
                    }
                    if ( requirement_met == 3) {
                        scores.push( [  "Three-suited Terminal Chows", 16 ]  )
                    }
                } 
                
                
                
                // checking pure straight
                for ( let keysuit in keysuit_cnt ) {
                    keysuit_cnt[keysuit].sort(function(a, b){return a-b})
                    if ( keysuit_cnt[keysuit].length >= 9 && keysuit_cnt[keysuit][8] - keysuit_cnt[keysuit][0] == 8 ) {
                        scores.push( [  "Pure Straight", 16 ]  )
                        break;
                    }
                }
                
                
            }



            // Pure Shifted Chows
            if ( chow_count >= 3 ) {

                let keysuit_cnt = {};
                for ( let i = 1 ; i < composite_hand.length ; i++ ) {
                    for ( let strkey in composite_hand[i] ) {
                        let key = parseInt(strkey)
                        if ( key < 27 && composite_hand[i][key] == 1 ) {
                            let keysuit = (key / 9) >> 0;
                            this.safe_push( keysuit_cnt, keysuit, key );
                            break;
                        } 
                    }
                }
                for ( let keysuit in keysuit_cnt ) {
                    if ( keysuit_cnt[keysuit].length == 3 ) {
                       keysuit_cnt[keysuit].sort()
                       if ( keysuit_cnt[keysuit][2] - keysuit_cnt[keysuit][0] == 2 ) {
                        scores.push( [  "Pure Shifted Chows", 16 ]  )
                       }
                    }
                }
            }

            

            // All Fives
            impossible_to_complete = 0;
            for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                let grp_has_five = 0;
                for ( let strkey in composite_hand[i] ) {
                    let key = parseInt(strkey)
                    if ( key < 27 && key % 9 == 4) {
                        grp_has_five = 1;
                    }
                }
                if ( grp_has_five == 0) {
                    impossible_to_complete = 1;
                    break;
                }
            }
            if ( impossible_to_complete == 0 ) {
                scores.push( [  "All Fives", 16 ]  )
            }



            // Triple Pungs
            if ( pung_count >= 3 ) {
                let keysuit_cnt = {};
                let keynum_cnt = {};

                for ( let i = 1 ; i < composite_hand.length ; i++ ) {
                    for ( let strkey in composite_hand[i] ) {
                        let key = parseInt(strkey)
                        if ( key < 27 && composite_hand[i][key] >= 3 ) {
                            let keysuit = (key / 9) >> 0;
                            this.safe_incr( keysuit_cnt, keysuit, 1 );

                            let keynum = key % 9 ;
                            this.safe_incr( keynum_cnt, keynum, 1 );

                        } 
                    }
                }

                if ( Object.keys( keysuit_cnt).length >= 3 ) {
                    for ( let keynum in keynum_cnt ) {
                        if ( keynum_cnt[keynum] == 3 ) {
                            scores.push( [  "Triple Pungs", 16 ]  )
                            break;
                        }
                    }
                }
            }
            




            // 3 concealed pungs
            if ( concealed_pung_count + concealed_kong_count >= 3 ) {
                scores.push( [  "Three Concealed Pungs", 16 ]  )
            }
            





            //--------
            // 24 points
            // All even Pung
            if ( pung_count >= 4 ) {
                impossible_to_complete = 0
                for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                    for ( let strkey in composite_hand[i] ) {
                        let key = parseInt(strkey)
                        if ( key % 9 % 2 != 1) {
                            impossible_to_complete = 1;
                            break;
                        }
                    }
                }
                if ( impossible_to_complete == 0 ) {
                    scores.push( [  "All Even Pungs", 24 ]  )
                }
            }
            

            // Full Flush
            impossible_to_complete = 0
            let prev_suit = -1;
            for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                for ( let strkey in composite_hand[i] ) {
                    let key = parseInt(strkey)
                    if ( prev_suit == -1 || ((key / 9) >> 0) == prev_suit ) {
                        // OK
                        prev_suit = (key / 9) >> 0;
                    } else {
                        impossible_to_complete = 1;
                        break
                    }
                }
            }
            if ( impossible_to_complete == 0) {
                scores.push( [  "Full Flush", 24 ]  )
            }


            // Pure Triple Chow
            if ( chow_count >= 3 ) {
             
                impossible_to_complete = 0;
                let first_chow_seen = -1;
                let registered_chow_key = {};
                
                for ( let i = 1 ; i < composite_hand.length ; i++ ) {
                    for ( let strkey in composite_hand[i] ) {
                        let key = parseInt(strkey)
                        if ( key < 27 && composite_hand[i][key] == 1 ) {

                            if ( first_chow_seen == -1 || first_chow_seen == i ) {

                                registered_chow_key[key] = 1;
                                first_chow_seen = i;

                            } else if ( registered_chow_key[key] == null) {
                                impossible_to_complete = 1;
                                break;
                            }
                        } 
                    }
                    if ( impossible_to_complete == 1) {
                        break;
                    }
                }
                if ( impossible_to_complete == 0 ) {
                    scores.push( [  "Pure Tripple Chow", 24 ]  )
                }
            }




            // Pure Shifted Pungs
            if ( pung_count + kong_count >= 3 ) {
                let keysuit_cnt = {};
                for ( let i = 1 ; i < composite_hand.length ; i++ ) {
                    for ( let strkey in composite_hand[i] ) {
                        let key = parseInt(strkey)
                        if ( key < 27 && composite_hand[i][key] >= 3 ) {
                            let keysuit = (key / 9) >> 0;
                            this.safe_push( keysuit_cnt, keysuit, key );
                        } 
                    }
                }
                for ( let keysuit in keysuit_cnt ) {
                    if ( keysuit_cnt[keysuit].length == 3 ) {
                       keysuit_cnt[keysuit].sort()
                       if ( keysuit_cnt[keysuit][2] - keysuit_cnt[keysuit][0] == 2 ) {
                        scores.push( [  "Pure Shifted Pungs", 24 ]  )
                       }
                    }
                }
            }




            // Lower, Middle, Upper tiles
            let impossible_lower_tile_only = 0;
            let impossible_middle_tile_only = 0;
            let impossible_upper_tile_only = 0;

            for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                for ( let strkey in composite_hand[i] ) {
                    let key = parseInt(strkey)
                    if ( key >= 27 ) {
                        impossible_lower_tile_only = 1;
                        impossible_middle_tile_only = 1;
                        impossible_upper_tile_only = 1;
                        break;
                    }
                    if ( key % 9 > 2 ) {
                        impossible_lower_tile_only = 1;
                        
                    }
                    if ( key % 9 < 6 ) {
                        impossible_upper_tile_only = 1;
                    }
                    if ( key % 9 < 3 || key % 9 > 5) {
                        impossible_middle_tile_only = 1;
                    }
                }
            }

            if ( impossible_upper_tile_only == 0 ) {
                scores.push( [  "Upper Tiles", 24 ]  )
            }
            if ( impossible_middle_tile_only == 0 ) {
                scores.push( [  "Middle Tiles", 24 ]  )
            }
            if ( impossible_lower_tile_only == 0 ) {
                scores.push( [  "Lower Tiles", 24 ]  )
            }


            // ---------
            // 32 points 

        
            // Four shifted chows
            if ( chow_count >= 4 ) {

                let keysuit_cnt = {};
                for ( let i = 1 ; i < composite_hand.length ; i++ ) {
                    for ( let strkey in composite_hand[i] ) {
                        let key = parseInt(strkey)
                        if ( key < 27 && composite_hand[i][key] == 1 ) {
                            let keysuit = (key / 9) >> 0;
                            this.safe_push( keysuit_cnt, keysuit, key );
                            break;
                        } 
                    }
                }
                for ( let keysuit in keysuit_cnt ) {
                    if ( keysuit_cnt[keysuit].length == 4 ) {
                       keysuit_cnt[keysuit].sort()
                       if ( keysuit_cnt[keysuit][3] - keysuit_cnt[keysuit][0] == 3 ) {
                        scores.push( [  "Four Shifted Chows", 32 ]  )
                       }
                    }
                }
            }
            


            // Three kongs
            // 3 KONGS.
            if ( kong_count >= 3 ) {
                scores.push( [  "Three Kongs", 32 ]  )
            }
            
            // All Terminals and Honors
            impossible_to_complete = 0;
            for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                for ( let strkey in composite_hand[i] ) {
                    let key = parseInt(strkey)
                    if ( ((key < 27 && (key % 9 == 0 || key % 9 == 8)) || (key >=27) ) && composite_hand[i][key] >= 2 ) {
                    } else {
                        impossible_to_complete = 1;
                        break;
                    }
                }
                if ( impossible_to_complete == 1) {
                    break;
                }
            }
            if ( impossible_to_complete == 0 ) {
                scores.push( [  "All Terminals and Honors", 32 ]  )
            }




            // -----------
            // 48 points

            // Quadruple Chow
            if ( chow_count >= 4 ) {
             
                impossible_to_complete = 0;
                let first_chow_seen = -1;
                let registered_chow_key = {};
                for ( let i = 1 ; i < composite_hand.length ; i++ ) {
                    for ( let strkey in composite_hand[i] ) {
                        let key = parseInt(strkey)
                        if ( key < 27 && composite_hand[i][key] == 1 ) {

                            if ( first_chow_seen == -1 || first_chow_seen == i ) {

                                registered_chow_key[key] = 1;
                                first_chow_seen = i;

                            } else if ( registered_chow_key[key] == null) {

                                impossible_to_complete = 1;
                                break;
                            }
                        } 
                    }
                    if ( impossible_to_complete == 1) {
                        break;
                    }
                }
                
                if ( impossible_to_complete == 0 ) {
                    scores.push( [  "Quadruple Chow", 48 ]  )
                }
            }
            




            // Four Pure shifted Pungs
            if ( pung_count + kong_count >= 4 ) {
                let keysuit_cnt = {};
                for ( let i = 1 ; i < composite_hand.length ; i++ ) {
                    for ( let strkey in composite_hand[i] ) {
                        let key = parseInt(strkey)
                        if ( key < 27 && composite_hand[i][key] >= 3 ) {
                            let keysuit = (key / 9) >> 0;
                            this.safe_push( keysuit_cnt, keysuit, key );
                        } 
                    }
                }
                for ( let keysuit in keysuit_cnt ) {
                    if ( keysuit_cnt[keysuit].length == 4 ) {
                       keysuit_cnt[keysuit].sort()
                       if ( keysuit_cnt[keysuit][3] - keysuit_cnt[keysuit][0] == 3 ) {
                        scores.push( [  "4 Pure Shifted Pungs", 48 ]  )
                       }
                    }
                }
            }





            //-----------------
            // 64 points    

            // All Terminals
            impossible_to_complete = 0;
            for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                for ( let strkey in composite_hand[i] ) {
                    let key = parseInt(strkey)
                    if ( key < 27 && (key % 9 == 0 || key % 9 == 8) && composite_hand[i][key] >= 2 ) {
                    } else {
                        impossible_to_complete = 1;
                        break;
                    }
                }
                if ( impossible_to_complete == 1) {
                    break;
                }
            }
            
            if ( impossible_to_complete == 0 ) {
                scores.push( [  "All Terminal", 64 ]  )
            }



            // All Honors
            impossible_to_complete = 0;
            for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                for ( let strkey in composite_hand[i] ) {
                    let key = parseInt(strkey);
                    if ( key >= 27 && key <= 33 && composite_hand[i][key] >= 2 ) {
                    } else {
                        impossible_to_complete = 1;
                       break;
                    }
                }
                if ( impossible_to_complete == 1) {
                    break;
                }
            }
            if ( impossible_to_complete == 0 ) {
                scores.push( [  "All Honors", 64 ]  )
            }



            // Little Four Winds 
            if ( pung_count + kong_count >= 4) {
                let little_wind_count = 0;
                for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                    for ( let strkey in composite_hand[i] ) {
                        let key = parseInt(strkey)
                        if ( key >= 27 && key <= 30 && composite_hand[i][key] >= 2 ) {
                            little_wind_count += 1;                                    
                        } else {
                            break;
                        }
                    }
                }
                if ( little_wind_count == 4 ) {
                    scores.push( [  "Little Four Winds", 64 ]  )
                }
            }


            
            // Little Three Dragons
            if ( pung_count + kong_count >= 2 ) {
                
                let little_dragon_count = 0;
                for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                    for ( let strkey in composite_hand[i] ) {
                        let key = parseInt(strkey)
                        if ( key >= 31 && key <= 33 && composite_hand[i][key] >= 2 ) {
                            little_dragon_count += 1;                                    
                        } else {
                            break;
                        }
                    }
                }
                if ( little_dragon_count == 3 ) {
                    scores.push( [  "Little Three Dragons", 64 ]  )
                }
            }





            // 4 Concealed Pungs/Kongs
            if ( concealed_pung_count + concealed_kong_count >= 4 ) {
                scores.push( [  "Four Concealed Pungs", 64 ]  )
            }


            // Pure Terminal Chow
            if ( chow_count >= 4 ) {
                
                let terminal_1_chow_count = 0;
                let terminal_9_chow_count = 0;
                let pair_5_count = 0;
                
                for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                    
                    for ( let strkey in composite_hand[i] ) {
                        let key = parseInt(strkey)
                        if ( composite_hand[i][key] == 2  && key < 27 && key % 9 == 4) {
                            // the pair of 5
                            pair_5_count += 1;
                        } else if ( composite_hand[i][key] == 1 && key < 27 && key % 9 == 0) {
                            terminal_1_chow_count += 1

                        } else if ( composite_hand[i][key] == 1 && key < 27 && key % 9 == 8) {
                            terminal_9_chow_count += 1
                        }
                    }
                }

                if ( terminal_1_chow_count == 2 && terminal_9_chow_count == 2 && pair_5_count == 1 ) {
                    scores.push( [ "Pure Terminal Chow", 64 ]  )
                }
            }





            //------------------------------
            // 88 points
            // Big 4 winds

            // Big Four Winds
            if ( pung_count + kong_count >= 4) {
                let big_wind_count = 0;
                for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                    for ( let strkey in composite_hand[i] ) {
                        let key = parseInt(strkey)
                        if ( key >= 27 && key <= 30 && composite_hand[i][key] >= 3 ) {
                            big_wind_count += 1;                                    
                        } else {
                            break;
                        }
                    }
                }
                if ( big_wind_count == 4 ) {
                    scores.push( [ "Big Four Winds", 88 ]  )
                }
            }


            // Big Three Dragon
            if ( pung_count + kong_count >= 3) {
                let big_dragon_count = 0;
                for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                    for ( let strkey in composite_hand[i] ) {
                        let key = parseInt(strkey)
                        if ( key >= 30 && key <= 33 && composite_hand[i][key] >= 3 ) {
                            big_dragon_count += 1;                                    
                        } else {
                            break;
                        }
                    }
                }
                if ( big_dragon_count == 3 ) {
                    scores.push( [ "Big Three Dragons", 88 ]  )
                }
            }





            // All Greens
            impossible_to_complete = 0;
            for ( let i = 0 ; i < composite_hand.length ; i++ ) {
                for ( let key in composite_hand[i] ) {
                    if ( [10,11,12,14,16,32].indexOf( parseInt(key) ) == -1 ) {
                        impossible_to_complete = 1;
                        break;
                    }
                }
                if ( impossible_to_complete == 1) {
                    break;
                }
            }
            if ( impossible_to_complete == 0 ) {
                scores.push( [ "All Green", 88 ]  )
            }



            // 4 KONGS.
            // already counted how many kongs during 3 KONGS
            if ( kong_count == 4 ) {
                scores.push( [ "Four Kongs", 88 ]  )
            }

            // IF this guy has nothing but still can hu
            if ( scores.length == 0 ) {
                // Score is 0 
                if ( chow_count + pung_count == 4 && pair_count == 1 ) {
                    scores.push( ["Chicken Hand", 8 ])
                }
            }
        } 

            
        
        // Below winning sets dont have 4 sets 1 pair, but still can hu.
        //--------------------------
        
        
        // Knitted straight
        let impossible_to_complete = 0;
        let single_non_honor_count = 0;
        let tmp_deck_stat = this.copyObject( player_deck_stat );
        for ( let strkey in tmp_deck_stat ) {
            let key = parseInt(strkey)
            if ( tmp_deck_stat[key] == 1 && key < 27 ) {
                single_non_honor_count += 1;
            } else {
                tmp_deck_stat[key] = 0;
            }
        }
        this.clear_empty_key( tmp_deck_stat );

        if ( single_non_honor_count == 9 ) {
            
            let group_used = {};
            for ( let strkey in tmp_deck_stat) {
                let key = parseInt(strkey)
                let key_suit  =  ( key / 9 ) >> 0;
                let key_group =  ( key % 9 ) % 3;
            
                if ( group_used[key_group] == null ) {
                    group_used[ key_group ] = key_suit

                } else if ( group_used[key_group] != key_suit ) {
                    impossible_to_complete = 1;
                    break;   
                }
            }

            if ( impossible_to_complete == 0 ) {
                scores.push( [ "Knitted Straight", 12 ]  )
        
            }
        }


        
        // Lesser Honor and Knitted
        // Greater Honors and Knitted 

        // Count honor
        impossible_to_complete = 0;
        let honor_count = 0;
        for ( let strkey in player_deck_stat ) {
            let key = parseInt(strkey)
            if ( player_deck_stat[key] == 1 ) {
                if ( key >= 27 && key <= 33) {
                    honor_count += 1;
                }
            } else {
                impossible_to_complete = 1;
                break;
            }
        }
        
        
        if ( impossible_to_complete == 0 && honor_count >= 6 && Object.keys(player_deck_stat).length >= 13 ) {

            let tmp_deck_stat = this.copyObject( player_deck_stat )
            // Remove the honors 
            for ( let i = 27 ; i <= 33 ; i++) {
                tmp_deck_stat[i] = 0;
            }
            this.clear_empty_key( tmp_deck_stat );
            
            let group_used = {};
            for ( let strkey in tmp_deck_stat) {
                let key = parseInt(strkey)
                let key_suit  =  ( key / 9 ) >> 0;
                let key_group =  ( key % 9 ) % 3;
            
                if ( group_used[key_group] == null ) {
                    group_used[ key_group ] = key_suit

                } else if ( group_used[key_group] != key_suit ) {

                    impossible_to_complete = 1;
                    break;   
                }
            }
            if ( impossible_to_complete == 0 ) {
                if ( honor_count >= 7 ) {
                    scores.push( [ "Greater Honors and Knitted", 64 ]  )
                } else {
                    scores.push( [ "Lesser Honors and Knitted", 12 ]  )
                }
            }
        }
        
        //-------------------------------
        // 7 pairs ( Need 7 pairs)
        if ( Object.keys( player_deck_stat).length == 7 ) {
            let has_non_2 = 0;
            for ( let key in player_deck_stat ) {
                if ( player_deck_stat[key] != 2 ) {
                    has_non_2 = 1;
                    break;
                }
            }
            if ( has_non_2 == 0 ) {

                // Can be upgraded to 7 shifted pairs.
                let sorted_keys = Object.keys( player_deck_stat).sort();
                let no_straight = 0;
                for ( let i = 0 ; i < sorted_keys.length - 1 ; i++ ) {
                    if ( parseInt(sorted_keys[i+1]) - parseInt(sorted_keys[i]) == 1 &&  
                       (  ( parseInt(sorted_keys[i])/9)>>0) == (( parseInt(sorted_keys[i+1])/9)>>0) && parseInt(sorted_keys[i]) < 27 ) {
                    } else {
                        no_straight = 1;
                    }
                }
                if ( no_straight == 0 ) {
                    scores.push( ["Seven Shifted Pairs", 88 ])
                } else {
                    
                    scores.push( [ "Seven Pairs", 24 ] )
                }
                
            }
        }

        //--------------------
        // 9 gates pagoda
        for ( let suit = 0 ; suit < 3 ; suit++ ) {
            if ( 
                player_deck_stat[suit * 9 + 0] >= 3 && player_deck_stat[suit * 9 + 8] >= 3 && 
                player_deck_stat[suit * 9 + 1] >= 1 && player_deck_stat[suit * 9 + 2] >= 1 && 
                player_deck_stat[suit * 9 + 3] >= 1 && player_deck_stat[suit * 9 + 4] >= 1 && 
                player_deck_stat[suit * 9 + 5] >= 1 && player_deck_stat[suit * 9 + 6] >= 1 && 
                player_deck_stat[suit * 9 + 7] >= 1  ) {
                
                //log("Potential 9 gates with Suit:", suit )
                let tmp_deck_stat = this.copyObject( player_deck_stat )
                for ( let i = 0 ; i < 9 ; i++) {
                    if ( i == 0 || i == 8 ) {
                        tmp_deck_stat[suit * 9 + i] -= 3;
                    } else {
                        tmp_deck_stat[suit * 9 + i] -= 1;
                    }
                }   
                this.clear_empty_key( tmp_deck_stat );
                //log( tmp_deck_stat );

                if ( Object.keys(tmp_deck_stat).length == 1 ) {

                    if ( (( parseInt( Object.keys(tmp_deck_stat)[0] ) / 9 ) >> 0 ) == suit ) {
                        //log("HU LE!!! 9 Gates")
                        scores.push( [ "Nine Gates", 88 ] )
                    }
                }
                break;
            } 
        }



        // ----------------
        // Thirteen Orphans
        if ( player_deck_stat[0] >= 1 && player_deck_stat[8] >= 1 && 
            player_deck_stat[9] >= 1 && player_deck_stat[17] >= 1 &&
            player_deck_stat[18] >= 1 && player_deck_stat[26] >= 1 &&
            player_deck_stat[27] >= 1 && player_deck_stat[28] >= 1 && 
            player_deck_stat[29] >= 1 && player_deck_stat[30] >= 1 &&
            player_deck_stat[31] >= 1 && player_deck_stat[32] >= 1 && 
            player_deck_stat[33] >= 1 
        ) {
        
            scores.push( [ "Thirteen Orphans", 88 ] )
        } 


        //-------
        if ( scores.length > 0 ) {
            // Fully Concealed Hand (Self drawn concealed hand)
            // Concealed Hand (Discard concealed hand)

            if ( winning_exposed_hand.length == 0 ) {
                if ( extra_card == null ) {
                    scores.push( [  "Fully Concealed Hand", 4 ]  )
                } else {
                    scores.push( [ "Concealed Hand", 2 ])
                }   
            }
            if ( extra_card == null ) {
                scores.push( ["Self Drawn", 1 ])
            }
        }
        
        return scores;
    }


    //---------
    finalize_doable( ) {
        
        if ( this.game_mode == 1 ) {
            
            this.colyseus_room.send( "doable_selected", this.doable_selected );
            this.clear_buttons();

        } else {

            log( "Finalize doable", "doable_queued", this.doable_selected  );

            let highest_precedence = 0;
            let highest_precedence_index = 0;
            let highest_precedence_owner = -1;

            for ( let i = 0 ; i < this.doable_selected.length ; i++ ) {
                
                let precedence = this.doable_selected[i][3];
                let owner      = this.doable_selected[i][0];

                if ( precedence > highest_precedence ) {
                    highest_precedence = precedence;
                    highest_precedence_index = i;
                    highest_precedence_owner = this.doable_selected[i][0];

                } else if ( precedence == highest_precedence ) {

                    if (     ( owner + 4 - this.whose_turn) % 4  <   ( highest_precedence_owner + 4 - this.whose_turn ) % 4    ) {
                        highest_precedence = precedence;
                        highest_precedence_index = i;
                        highest_precedence_owner = owner;
                    } 
                }
            }

            log( "Chosed todo is index", highest_precedence_index);
            
            let todo = this.doable_selected[ highest_precedence_index ];

            if ( this.doable_selected.length >= 2 ) {
                ui.displayAnnouncement("Intercepted by " + todo[1] , 5, Color4.Yellow(), 14, false);
            }
            this.execute_todo(todo);

            
        }
        
        this.doable_selected.length = 0;
    }

    //------
    execute_todo( todo ) {

        if ( todo[1] == "pung" ) {
            this.do_pung( todo );

        } else if ( todo[1] == "kong") {
            
            this.do_kong( todo );

        } else if ( todo[1] == "chow" ) {

            this.do_chow( todo );
        
        } else if ( todo[1] == "win" ) {
        
            this.do_win( todo );
        
        } else if ( todo[1] == "pass" ) {
        
            this.do_pass( todo );
        
        }
    }





    //---------
    init_colyseus_withPassword() {
        let prompt = new ui.FillInPrompt(
            'Private Room Password',
            (e) => {
                this.init_colyseus( e );
            },
            'Enter',
            ''
          )	
    }

    
    //-------
    leave_colyseus() {
        if ( this.colyseus_room != null ) {
            this.colyseus_room.leave();
        }
    }


    //---------
    async init_colyseus( room_pass ) {

        let protocol    = "wss";
        let host        = "tensaistudio.xyz:444";

        // Debug
        protocol    = "ws";
        host        = "localhost:2567";

        var client = new Client( protocol + "://" + host );
        var room ;
        var _this = this;

        if (!this.userData) {
            await this.setUserData()
        }	

        let room_name = "mahjongtable_" + this.table_index ;
        if ( room_pass != null ) {
            room_name = "mahjongtable_private_" + this.table_index ;
        }
        log( "Joining ", room_name );


        client.joinOrCreate( room_name , 
            { 
                username :      this.userData.displayName , 
                final_score:    this.final_scores[this.my_seat_id], 
                user_addr:      this.userData.userId ,
                password:       room_pass
            } 
        
        ).then(room_instance => {
                
            room = room_instance
            
            var players = {};
            
            room.onLeave(code => {
                if (code > 1000) {
                  log("room.onLeave", "Abnormal closation")
                } else {
                  // the client has initiated the disconnection
                  log("room.onLeave", "Normal closation")
                }
                _this.colyseus_transaction.push( ["server_shutdown" , code ]);

            });

            room.onError((code, message) => {
                log("room.onError","Error occured on serverside.")
            });

            room.state.players.onAdd = function ( player, sessionId) {

                log("room.state.players.onAdd", sessionId , "seat index", player.seat_id , "name", player.displayName , "score", player.final_score );
                if ( sessionId == room.sessionId ) {
                    _this.my_seat_id = player.seat_id;
                    log("My Seat ID is", _this.my_seat_id );
                    _this.readjust_y_of_players_concealed_pos();
                }
                _this.display_names[ player.seat_id ] = player.displayName;
                _this.final_scores[ player.seat_id ]  = player.final_score;
                ui.displayAnnouncement( player.displayName + " has joined the game.", 5, Color4.Yellow(), 14, false);

                _this.display_names_ent[ player.seat_id ].getComponent(TextShape).value = player.displayName;
                _this.colyseus_players[ sessionId ] = player.seat_id ;


            }

            room.state.players.onRemove = function (player, sessionId) {

                log("room.state.players.onRemove", sessionId );

                if ( this.gameover == 0 ) {
                    ui.displayAnnouncement( player.displayName + " has left the game. Bot to take over until someone else join.", 15, Color4.Yellow(), 14, false);
                    _this.display_names[ player.seat_id ] = "Bot_#000" + player.seat_id ;
                
                } else {
                    ui.displayAnnouncement( player.displayName + " has left the game.", 15, Color4.Yellow(), 14, false);
                    _this.display_names[ player.seat_id ] = "";
                }
                
                _this.final_scores[ player.seat_id ]  = 0;
                _this.display_names_ent[ player.seat_id ].getComponent(TextShape).value = _this.display_names[ player.seat_id ];
                
                delete _this.colyseus_players[ sessionId ];

                
            }



            room.onMessage("everyone_new_round_ready", (starting_deck) => {
                
                log( "room.onMessage", "everyone_new_round_ready", starting_deck );

                // Insert into player deck
                for ( let h = 0 ; h < starting_deck.length ; h++ ) {
                    for ( let i = 0 ; i < starting_deck[h].length ; i++ ) {
                        _this.players_deck[ h ].push( starting_deck[h][i] );
                    }
                }
                

                _this.clear_buttons();
                _this.sounds["shuffle"].playOnce();
                _this.anim_dealing = 1;
                _this.round += 1;
                _this.adjust_wind();
                
            });



            room.onMessage("everyone_dealing_done", (whose_turn )=>{
                
                log( "room.onMessage", "everyone_dealing_done" , whose_turn );
                _this.colyseus_transaction.push( ["everyone_dealing_done", whose_turn ]);
            });
            

            room.onMessage("init_anim_1_tile_wall_to_player", (message)=>{
                
                log( "room.onMessage", "init_anim_1_tile_wall_to_player" );
                _this.colyseus_transaction.push(["init_anim_1_tile_wall_to_player"] );
            });



            room.onMessage("draw_game", (message)=>{
                
                log( "room.onMessage", "draw_game" );
                _this.colyseus_transaction.push(["draw_game"] );

            });
            

            room.onMessage("everyone_turnplayer_draw_one_tile", (drawn_tile)=>{

                log( "room.onMessage", "everyone_turnplayer_draw_one_tile", drawn_tile );
                _this.colyseus_transaction.push(["everyone_turnplayer_draw_one_tile", drawn_tile ] );
            });
            

            room.onMessage("discard_tile", (message)=>{

                log( "room.onMessage", "discard_tile", message );
                _this.colyseus_transaction.push(["discard_tile", message ] );
            });





            room.onMessage("has_doable_actions", (doable_actions)=>{
                log( "room.onMessage", "has_doable_actions" , doable_actions  );
                _this.colyseus_transaction.push(["has_doable_actions", doable_actions ] );
            });

            

            room.onMessage("finalize_action_selected", (todo_action)=>{
                log( "room.onMessage", "finalize_action_selected", todo_action );
                _this.colyseus_transaction.push(["finalize_action_selected", todo_action ] );
            });

            
            room.onMessage("count_down_discard", (data)=>{

                log( "room.onMessage", "count_down_discard", data );
                _this.colyseus_transaction.push(["count_down_discard", data ] );

            });

            room.onMessage("count_down_doable", (data)=>{

                log( "room.onMessage", "count_down_doable", data );
                _this.colyseus_transaction.push(["count_down_doable", data ] );
            });


            room.onMessage("count_down_kick", (data)=>{

                log( "room.onMessage", "count_down_kick", data );
                _this.colyseus_transaction.push(["count_down_kick", data ] );
            });


            room.onMessage("kick", (data)=>{

                log( "room.onMessage", "kick", data );
                _this.colyseus_transaction.push(["kick", data ] );
            });

            
            
            room.onMessage("sync_me", (message)=>{

                log( "room.onMessage", "sync_me" , message );
                _this.players_deck      = _this.copy2DArray( message[0] );
                _this.exposed_deck      = _this.copy2DArray( message[1] );
                _this.discarded_deck    = _this.copy2DArray( message[2] );

                _this.whose_turn            = message[3];
                _this.gameover              = message[4];
                _this.doable_actions        = message[5];
                _this.last_discarded        = message[6];
                _this.last_discarded_side   = message[7];
                _this.last_drawn            = message[8];
                _this.last_drawn_side       = message[9];
                
                if ( _this.gameover == 0 ) {
                    _this.clear_buttons();
                    if ( _this.doable_actions.length > 0 ) {
                        let player_doable_actions_cnt = _this.render_buttons_based_on_doable_actions();
                        if ( player_doable_actions_cnt > 0 ) {
                            _this.buttons[ "pass" ].show();
                        }
                    }
                }
                _this.resync_deck_to_ent();
                                
            });


            if ( this.tiles_entity_created == 0 ) {
                this.createMahjongPieces();
                this.tiles_entity_created = 1;
            }
            
            this.colyseus_room = room;
            this.clear_buttons();
            this.buttons["deal"].show();
            this.buttons["leave"].show();
                
        }).catch(e => {

            log("CONNECT ERROR", e);
            ui.displayAnnouncement("Unable to connect to server", 5, Color4.Yellow(), 14, false);
        });

        
    }

    //------
    resync_deck_to_ent() {
        
        this.return_ents_to_walls();
        for ( let h = 0 ; h < 4 ; h++ ) {
            
            for ( let i = 0 ; i < this.players_deck[h].length ; i++) {
                
                let piece_ent = this.wall_pieces_ent.pop();
                piece_ent["player"] = h;

                this.players_concealed_ent[h].push( piece_ent );

                piece_ent.getComponent(Transform).position.x = this.players_concealed_pos[h][i].x;
                piece_ent.getComponent(Transform).position.y = this.players_concealed_pos[h][i].y;
                piece_ent.getComponent(Transform).position.z = this.players_concealed_pos[h][i].z;
                
                let xrot = -90;
                if ( h == this.my_seat_id ) {
                    xrot = 90;
                }
                piece_ent.getComponent(Transform).rotation.eulerAngles = new Vector3( xrot , h * -90 , 0);
                this.setTileVal( piece_ent , this.players_deck[h][i] );

            }
            if ( h == this.my_seat_id ) {
                this.sort_player_tile(h);
            }
            let i2 = 0;
            for ( let i = 0 ; i < this.exposed_deck[h].length ; i++) {
                
                if ( this.exposed_deck[h][i] >= 0 ) {

                    let piece_ent = this.wall_pieces_ent.pop();
                    piece_ent["player"] = h;

                    this.players_exposed_ent[h].push( piece_ent );

                    piece_ent.getComponent(Transform).position.x = this.players_exposed_pos[h][i2].x;
                    piece_ent.getComponent(Transform).position.y = this.players_exposed_pos[h][i2].y;
                    piece_ent.getComponent(Transform).position.z = this.players_exposed_pos[h][i2].z;
                    piece_ent.getComponent(Transform).rotation.eulerAngles = new Vector3( 90 , h * -90 , 0);
                    this.setTileVal( piece_ent, this.exposed_deck[h][i]  );
                    i2 += 1;
                }

            }

            for ( let i = 0 ; i < this.discarded_deck[h].length ; i++) {
                
                let piece_ent = this.wall_pieces_ent.pop();
                piece_ent["player"] = h;
                this.players_discarded_ent[h].push( piece_ent );
                
                piece_ent.getComponent(Transform).position.x = this.players_discarded_pos[h][i].x;
                piece_ent.getComponent(Transform).position.y = this.players_discarded_pos[h][i].y;
                piece_ent.getComponent(Transform).position.z = this.players_discarded_pos[h][i].z;
                piece_ent.getComponent(Transform).rotation.eulerAngles = new Vector3( 90 , h * -90 , 0);
                this.setTileVal( piece_ent, this.discarded_deck[h][i]  );
            }
        }
        


        this.render_turn();

    }


    //-----------
    init_deck() {

        
        this.deck.length = 0;
        
        /*
        this.deck = [ 

            16,16,16,  16, 3,5,    7, 9, 13,   14,17,19,  24,
            6, 6, 6,   6,12,12,   11,13,13,   14,18,14,  30,
            6, 7, 7,   9 ,9, 2,    2 ,3,3,     12,30,10,  10,   
            9 ,9 ,9,   10,10,13,   16,11,11,   15,25,15,  31,
            13, 3, 16 ,33 ,18,22,  31,11,31,5,5,5,6,6,6,7,7,7,7,8,8,8,8,10,10,11,11,11,12,12,12,12,13,13,13,14,14,14,14
        ];
        */
        /*
        this.deck = [ 

            16,17,1,  33, 3,5,    7, 9, 13,   14,17,23,  24,
            2, 2, 2,   11,12,12,   23,25,25,   34,14,12,  30,
            6, 16, 6,   28 ,9, 1,    2 ,3,3,     19,19,13,  13,   
            9 ,33 ,33,   10,30,20,   11,19,11,   15, 25,15,  31,
            13, 3, 16,33,18,22,31,11,31,5,5,6,7
        ];
         */

        
        for ( let i = 0 ; i < 4 ; i++ ) {
            for ( let j = 0 ; j < 34 ; j++) {
               this.deck.push( j );
            }
        }
        this.shuffleArray( this.deck );
        
        
    }



    //---------
    init_positions() {

        // - + + - 
        // - - + +
        // + 0 - 0
        // 0 + 0 -
        
        let xs_concealed        = [  -6.5, 14.5,   6.5 , -14.5 ];
        let zs_concealed        = [ -14.5, -6.5,  14.5 ,   6.5 ];
        let xdeltas_concealed   = [   1.1,    0,  -1.1,     0  ];
        let zdeltas_concealed   = [     0,  1.1,     0,  -1.1  ];
        
        let xs_discarded        = [    -4,    6,     4,    -6  ];
        let zs_discarded        = [    -6,   -4,     6,     4  ];
        let xdeltas_discarded   = [   1.1,  1.5,  -1.1,  -1.5  ];
        let zdeltas_discarded   = [  -1.5,  1.1,   1.5,  -1.1  ];
        
        let xs_exposed          = [  -15.6,   17,   15.6 ,   -17 ];
        let zs_exposed          = [    -17, -15.6,    17 ,  15.6 ];
        let xdeltas_exposed     = [    1.1,    0,  -1.1,     0  ];
        let zdeltas_exposed     = [     0,  1.1,     0,  -1.1  ];


        for ( let h = 0 ; h < 4 ; h++) {

            // The concealed pos
            for ( let i = 0 ; i < 14 ; i++) {

                let x = xs_concealed[h] + i * xdeltas_concealed[h]; 
                let y =  (h == this.my_seat_id )? 0 : -0.35;
                let z = zs_concealed[h] + i * zdeltas_concealed[h];
                this.players_concealed_pos[h].push(  new Vector3( x,y,z ) );
            }


            // The discarded pos
            for ( let i = 0 ; i < 24 ; i++ ) {

                let x;
                let y = -0.35;
                let z;
                
                if ( h % 2 == 0 ) {
                    x = xs_discarded[h] + (i % 8 ) * xdeltas_discarded[h];
                    z = zs_discarded[h] + ( (i / 8 ) >> 0 ) * zdeltas_discarded[h];
                } else {
                    x = xs_discarded[h] + ((i / 8) >> 0 ) * xdeltas_discarded[h] ;
                    z = zs_discarded[h] +  (i % 8) * zdeltas_discarded[h] ;
                }
                this.players_discarded_pos[h].push(  new Vector3( x,y,z ) );

            }

            // The exposed hand pos
            for ( let i = 0 ; i < 16 ; i++ ) {
                let x = xs_exposed[h] + i * xdeltas_exposed[h]; 
                let y = -0.35;
                let z = zs_exposed[h] + i * zdeltas_exposed[h];

                this.players_exposed_pos[h].push(  new Vector3( x,y,z ) );
            }
        }
    }
    
    //-----
    readjust_y_of_players_concealed_pos() {
        
        for ( let h = 0 ; h < 4 ; h++) {
            // The concealed pos (which is a vector)
            for ( let i = 0 ; i < this.players_concealed_pos[h].length ; i++) {

                let y =  (h == this.my_seat_id )? 0 : -0.35;
                this.players_concealed_pos[h][i].y = y;
            }
        }
    }



    //-------------
    init_entities() {

        this.addComponent( new Transform({
            position: new Vector3(8, 1.05 ,8),
            scale: new Vector3(0.08 , 0.08, 0.08 )
        }))

        

        this.createMaterials();
        this.createButtons();
        this.createUI();
        this.createSeatWinds();
       
        if ( this.tiles_entity_created == 0 && this.game_mode == 0) {
            this.createMahjongPieces();
            this.tiles_entity_created = 1;
        }
    }

    //-----
    async init_names() {
        
        if (!this.userData) {
            await this.setUserData()
        }	

        this.display_names[0] = this.userData.displayName;
        this.display_names[1] = "Bot_Charlie#0002"
        this.display_names[2] = "Bot_Becky#0003"
        this.display_names[3] = "Bot_Donald#0004"

    }

    //---------------
    init_sounds() {
        this.sounds = this.stage.sounds;
    }


    //------
    return_ents_to_walls() {
        
        

        // Return all piece entities to wall
        for ( let h = 0 ; h < 4 ; h++) {
            for ( let i = this.players_discarded_ent[h].length - 1 ; i >= 0 ; i-- ) {
                this.wall_pieces_ent.push( this.players_discarded_ent[h].pop() );
            }
            for ( let i = this.players_exposed_ent[h].length -1 ; i >= 0 ; i-- ) {
                this.wall_pieces_ent.push( this.players_exposed_ent[h].pop() );
            }
            for ( let i = this.players_concealed_ent[h].length -1 ; i >= 0 ; i-- ) {
                this.wall_pieces_ent.push( this.players_concealed_ent[h].pop() );
            }
        }
        for ( let i = 0 ; i < this.wall_pieces_ent.length ; i++ ) {

            this.wall_pieces_ent[i].getComponent(Transform).position.x = this.wall_pieces_pos[i][0].x;
            this.wall_pieces_ent[i].getComponent(Transform).position.y = this.wall_pieces_pos[i][0].y;
            this.wall_pieces_ent[i].getComponent(Transform).position.z = this.wall_pieces_pos[i][0].z;
            this.wall_pieces_ent[i].getComponent(Transform).rotation.eulerAngles = new Vector3( -90 ,  this.wall_pieces_pos[i][1].y  ,0 );
            
        }
        
    }
    //----------
    clear_deck() {
        for ( let h = 0 ; h < 4 ; h++) {
            
            // Reset all hand cardvals
            this.players_deck[h].length = 0;
            this.exposed_deck[h].length = 0;
            this.discarded_deck[h].length = 0;
            
        }
        this.return_ents_to_walls();
        this.mpiece_highlight.getComponent(Transform).position.y = -500;
        this.ui_root.visible = false;
        this.clear_buttons();
    }

    //-----------------
    new_round( ) {

        if ( this.tiles_entity_created == 0 ) {
            this.createMahjongPieces();
            this.tiles_entity_created = 1;
        }
        

        this.init_deck();
        this.clear_deck();
        this.ui_network_msg.value = "";
        this.gameover = 0;
        
        if ( this.game_mode == 1 ) {
            // Wait for server. Server is waiting for 4 ppl to click play.
            ui.displayAnnouncement( "Please wait for others to click play...", 5, Color4.Yellow(), 14, false );
            this.colyseus_transaction.length = 0;
            this.colyseus_room.send("new_round_ready");

        } else {


            // Insert card into players deck from the public deck.
            for ( let h = 0 ; h < 4 ; h++) {
                for ( let i = 0 ; i < 13 ; i++ ) {
                    this.players_deck[h].push( this.deck.shift() );
                }
            }
            this.sounds["shuffle"].playOnce();
            this.anim_dealing = 1;
            this.round += 1;
            this.adjust_wind();
            // Wait until animation of dealing is done..then we proceed.
        }

            
    }




    //------
    adjust_wind() {

        let east_index = ( this.round - 1 ) % 4;
        
        for ( let i = 0 ; i < 4; i++ ) {
            this.players_wind[(east_index + i) % 4 ] = 27 + i;
            this.seatwinds_ent[(east_index + i) % 4] = this.fixed_seatwinds_ent[i];
        }
        this.seatwinds_root.getComponent( Transform ).rotation.eulerAngles = new Vector3( 0, -90 * (( this.round - 1 ) % 4 ), 0);
        this.prevalent_wind = (((( this.round -  1 ) / 4 ) >> 0 ) % 4 ) + 27;

    }


    //---------------------
    // AI function 1:  Decide what to do based on doaction.
    NPC_decide_doaction( h , doable_actions ) {

        let player_deck_stat = {};
        for ( let i = 0 ; i < this.players_deck[h].length ; i++ ) {
            this.safe_incr( player_deck_stat , this.players_deck[h][i] , 1 );
        }

        let penalty = {};
        
        for ( let i = 0 ; i < doable_actions.length ; i++ ) {
            
            if ( doable_actions[i][0] == h ) {

                if ( doable_actions[i][1].substr(0,3) == "win"   ) {

                    this.safe_incr( penalty, i ,  -999999 ); 
                    break;

                } else if ( doable_actions[i][1].substr(0,4) == "kong"   ) {

                    this.safe_incr( penalty, i ,  -99999 ); 
                    break;

                } else if ( doable_actions[i][1].substr(0,4) == "pung"  ) {

                    let pungkey = doable_actions[i][2];

                    if ( pungkey >= 27 ) {
                        this.safe_incr( penalty, i ,  -9999 ); 

                    } else {
                        
                        // Check if this pung breaks 2 chows.
                       
                        // We count how many chows we have before removal of pungkeys
                        let tmp_deck_stat = this.copyObject( player_deck_stat )
                        let chow_count_b4 = 0;
                        for ( let key3 in tmp_deck_stat ) {
                            let int_key3 = parseInt(key3);
                            if ( int_key3 < 27 && int_key3 % 9 <= 6 ) {
                                for ( let rep = 0 ; rep < 2 ; rep+= 1) {
                                    if ( tmp_deck_stat[key3] >= 1 && tmp_deck_stat[ int_key3 + 1] >= 1 && tmp_deck_stat[ int_key3 + 2] >= 1 ) {

                                        tmp_deck_stat[key3] -= 1;
                                        tmp_deck_stat[int_key3 + 1] -= 1;
                                        tmp_deck_stat[int_key3 + 2] -= 1;
                                        chow_count_b4 += 1;
                                    }
                                }
                            }
                        }
                        
                        tmp_deck_stat = this.copyObject( player_deck_stat )
                        tmp_deck_stat[pungkey] -= 2;
                        this.clear_empty_key( tmp_deck_stat );

                        let chow_count_after = 0;
                        
                        for ( let key3 in tmp_deck_stat ) {
                            let int_key3 = parseInt(key3);
                            if ( int_key3 < 27 && int_key3 % 9 <= 6 ) {
                                for ( let rep = 0 ; rep < 2 ; rep+= 1) {
                                    if ( tmp_deck_stat[key3] >= 1 && tmp_deck_stat[ int_key3 + 1] >= 1 && tmp_deck_stat[ int_key3 + 2] >= 1 ) {

                                        tmp_deck_stat[key3] -= 1;
                                        tmp_deck_stat[int_key3 + 1] -= 1;
                                        tmp_deck_stat[int_key3 + 2] -= 1;
                                        chow_count_after += 1;
                                    }
                                }
                            }
                        }
                        
                        if ( chow_count_b4  - chow_count_after < 2 ) {
                            this.safe_incr( penalty, i ,  -999 ); 
                        }
                    }
                
                } else if ( doable_actions[i][1].substr(0,4) == "chow"  ) {
                    
                    let chowkey = doable_actions[i][2];

                    let tmp_deck_stat = this.copyObject( player_deck_stat )
                    let pung_count_b4 = 0;
                    let pair_count_b4 = 0;
                    
                    for ( let key in tmp_deck_stat ) {
                        let int_key = parseInt(key);
                        if ( tmp_deck_stat[key] >= 3  ) {
                            pung_count_b4 += 1;
                        } else if ( tmp_deck_stat[key] == 2 ) {
                            pair_count_b4 += 1;
                        }
                    }
                    
                    
                    tmp_deck_stat[chowkey] -= 1;
                    let chow_midpt;

                    if ( doable_actions[i][1][5] == '0' )  { //Low
                        tmp_deck_stat[chowkey-1] -= 1;
                        tmp_deck_stat[chowkey-2] -= 1;
                        chow_midpt = (chowkey - 1) % 9;

                    }
                    if ( doable_actions[i][1][5] == '1' )  { //Mid
                        tmp_deck_stat[chowkey-1] -= 1;
                        tmp_deck_stat[chowkey+1] -= 1;
                        chow_midpt = chowkey % 9;
                        
                    }
                    if ( doable_actions[i][1][5] == '2' )  { //High
                        tmp_deck_stat[chowkey+1] -= 1;
                        tmp_deck_stat[chowkey+2] -= 1;
                        chow_midpt = (chowkey + 1) % 9;
                    }
                    this.clear_empty_and_neg_key( tmp_deck_stat );
                    let pung_count_after = 0;
                    let pair_count_after = 0;

                    for ( let key in tmp_deck_stat ) {
                        let int_key = parseInt(key);
                        if ( tmp_deck_stat[key] >= 3  ) {
                            pung_count_after += 1;
                        } else if ( tmp_deck_stat[key] == 2 ) {
                            pair_count_after += 1;
                        }
                    }
                    
                    if ( pung_count_b4 - pung_count_after < 1 ) {
                        
                        let pair_taken = pair_count_b4 - pair_count_after;
                        this.safe_incr( penalty, i , pair_taken * 10 ); 
                        if ( chow_midpt >= 4 ) {
                            this.safe_incr( penalty, i ,  8 - chow_midpt ); 
                        } else {
                            this.safe_incr( penalty, i , chow_midpt ); 
                        }
    
                    }
                    
                }
            }
        }


        let do_action_index = -1;
        if ( Object.keys(penalty).length > 0 ) {

            let lowest_penalty_score = 9999999;
            let lowest_penalty_index = 0;
            for ( let doable_index in penalty ) {
                let int_doable_index = parseInt( doable_index );

                if ( penalty[doable_index] < lowest_penalty_score ) {
                    lowest_penalty_score = penalty[doable_index];
                    lowest_penalty_index = int_doable_index;
                }
            }
            do_action_index = lowest_penalty_index;
        } 
        
        if ( do_action_index > -1 ) {
            if ( doable_actions[do_action_index][1] == "pung" ) {
                
                this.doable_selected.push( [ h , "pung", 0 , 8] )
                
            } else if ( doable_actions[do_action_index][1].substr(0,4) == "kong" ) {
                
                let key                 = doable_actions[do_action_index][2] ;
                let type                = doable_actions[do_action_index][3] ;
                let kong_button_index   = doable_actions[do_action_index][4];

                this.doable_selected.push( [ h , "kong", kong_button_index , 9 , type , key ] )

                
            } else if ( doable_actions[do_action_index][1].substr(0,4) == "chow" ) {
                
                this.doable_selected.push( [ h , "chow", doable_actions[do_action_index][4] , 7] )
                

            } else if ( doable_actions[do_action_index][1] == "win" ) {
                
                let last_hu_scores         = this.doable_actions[do_action_index][2] ;
                let last_hu_use_discard    = this.doable_actions[do_action_index][3] ;
                
                this.doable_selected.push( [ h , "win", 0 , 10, last_hu_scores , last_hu_use_discard ] )
                
            }

            log("NPC " , h ," has made decision to do something", this.doable_selected );
        }




        
    }


    //-----------
    // Both 
    discard_tile( owner , players_concealed_ent_index  ){
        
        log("discard_tile", owner , players_concealed_ent_index );

        let mpiece = this.players_concealed_ent[owner][players_concealed_ent_index];

        this.last_discarded         = this.players_deck[ owner ][players_concealed_ent_index];
        this.last_discarded_side    = owner;

        this.players_deck[ owner ].splice(          players_concealed_ent_index , 1 );
        this.players_concealed_ent[ owner ].splice( players_concealed_ent_index , 1 );
        
        this.players_discarded_ent[ owner ].push( mpiece );

        this.mpiece_highlight.getComponent(Transform).position.y = -500;

        // Anim move to discard
        this.anim_piece = mpiece;
        this.anim_piece.getComponent(Transform).rotation.eulerAngles = new Vector3( 90 , owner * -90 , 0);
        this.anim_piece.getComponent(Transform).position.y = -0.35;

        this.anim_target.x = this.players_discarded_pos[ owner ][ this.discarded_deck[owner].length ].x;
        this.anim_target.y = this.players_discarded_pos[ owner ][ this.discarded_deck[owner].length ].y;
        this.anim_target.z = this.players_discarded_pos[ owner ][ this.discarded_deck[owner].length ].z;
        this.discarded_deck[owner].push( this.last_discarded );
        
        this.togglePointer( this.my_seat_id , 0 );

        this.anim_dealing = 4;
    }



    //------
    // AI function 2: Decide which tile to discard.
    NPC_decide_discard_tile() {
        
        let owner = this.whose_turn;
        
        // Dont random, use AI to decide which  players_concealed_ent_index
        let players_concealed_ent_index = this.AI_find_best_tile_to_discard( owner )
        

        this.discard_tile( owner , players_concealed_ent_index );
        
    }

    //------------------
    AI_find_best_tile_to_discard( owner ) {

        let index = (Math.random() * this.players_deck[owner].length) >> 0;
        
        // First thing first, we get the player_stat, exposed_stat, and discard _stat
        let player_deck_stat = {}
        for ( let i = 0 ; i < this.players_deck[owner].length ; i++ ) {
            this.safe_incr( player_deck_stat, this.players_deck[owner][i], 1 );
        }        

        let discarded_exposed_deck_stat = {};
        for ( let h = 0 ; h < 4 ; h++) {
            for ( let i = 0 ; i < this.exposed_deck[h].length ; i++ ) {
                this.safe_incr( discarded_exposed_deck_stat, this.exposed_deck[h][i], 1 );
            }
            for ( let i = 0 ; i < this.discarded_deck[h].length ; i++) {
                this.safe_incr( discarded_exposed_deck_stat, this.discarded_deck[h][i], 1 );
            }
        }
        // Find the keyval to discard.
        
        let candidate_score = {};

        // Remove all chows first
        let tmp_deck_stat = this.copyObject( player_deck_stat );

        for ( let key in tmp_deck_stat ) {
            let intkey = parseInt(key);
            if ( intkey < 25 && tmp_deck_stat[intkey] >= 1 && tmp_deck_stat[intkey+1] >= 1 && tmp_deck_stat[intkey+2] >= 1 ) {

                tmp_deck_stat[intkey] -= 1;
                tmp_deck_stat[intkey+1] -= 1;
                tmp_deck_stat[intkey+2] -= 1;        

                this.safe_incr( candidate_score , intkey,   10 )
                this.safe_incr( candidate_score , intkey+1, 10 )
                this.safe_incr( candidate_score , intkey+2, 10 )
            } 
        }

        this.clear_empty_key( tmp_deck_stat );
        
        for ( let key in tmp_deck_stat ) {
            let intkey = parseInt(key);
            this.safe_incr( candidate_score , key, 0 )

            if ( discarded_exposed_deck_stat[intkey] >= 2 ) {
                this.safe_incr( candidate_score , key, -1000 )
            
            } else if ( tmp_deck_stat[intkey] >= 3 ) {
                this.safe_incr( candidate_score , key, 100 )
            
            } else if ( tmp_deck_stat[intkey] >= 2 ) {
                this.safe_incr( candidate_score , key, 50 )
            
            } else if ( tmp_deck_stat[intkey] == 1 ) {

                if ( intkey < 26 &&  tmp_deck_stat[intkey] >= 1 && tmp_deck_stat[intkey+1] >= 1 || 
                     intkey > 1  &&  tmp_deck_stat[intkey - 1] >= 1 && tmp_deck_stat[intkey] >= 1
                   ) {
                    this.safe_incr( candidate_score , intkey, 1 )
                }

            }
        }
        
        let lowest_score = 9999999;
        let lowest_score_key;
        for ( let key in candidate_score ) {
            if ( candidate_score[key] < lowest_score ) {
                lowest_score = candidate_score[key];
                lowest_score_key = key;
            }
        }
        
        for ( let i = 0 ; i < this.players_deck[owner].length ; i++) {
            if ( this.players_deck[owner][i] == lowest_score_key ) {
                index = i;
                break;
            }
        }

        return index;

    }




    //----
    piece_onclick(e) {
        
        if ( e.buttonId == 1  || e.buttonId == 0 ) {

            let mpiece = engine.entities[e.hit.entityId];
            
            let mpiece_id = mpiece["id"];
            let owner     = mpiece["player"];
            let players_concealed_ent_index = -1;

            for ( let i = 0 ; i < this.players_concealed_ent[owner].length ; i++ ) {
                if (this.players_concealed_ent[owner][i]["id"] == mpiece_id ) {
                    players_concealed_ent_index = i;
                    break;
                }
            }
            this.togglePointer( this.whose_turn , 0 );

            if ( this.game_mode == 1 ) {
                // Let colyseus do the work. 
                let key = this.players_deck[ this.my_seat_id ][ players_concealed_ent_index ];
                this.colyseus_room.send("discard_tile", [ this.my_seat_id, key ] )
            } else {
                this.discard_tile( owner , players_concealed_ent_index );
            }
        }
    }

    

   


    




    





    //---------
    //  Check deck then proceed to init_anim_1_tile_wall_to_player
    //  shd not call this after pung, chow, because u dont draw 1 after pung.  
    //  usual flow:  u pung, then discard 1 from whatever hand you are holding.
    check_wall_and_proceed_draw_one_tile() {

        log( "check_wall_and_proceed_draw_one_tile" , "whose_turn", this.whose_turn );
        
        this.clear_buttons();
        this.doable_actions.length = 0;
        this.doable_selected.length = 0;

        if ( this.game_mode == 1 ) {
            
            // Don't need to do anything, server dictates everything.
            

        } else {
            if ( this.deck.length > 0 ) {
                this.init_anim_1_tile_wall_to_player();
            } else {
                // draw
                this.draw_game();
            }
        }
        
    }



    //------
    draw_game() {

        this.togglePointer( this.whose_turn , 0);
        this.whose_turn = -1;
        this.render_turn();
        this.gameover = 1;
        ui.displayAnnouncement("Game ends in a draw.", 10, Color4.Yellow(), 20, false);
        this.buttons["deal"].show();
        this.buttons["leave"].show();
    }



    //-----------------------
    //  Initiate the anim of draw 1 tile from deck to hand (Doesnt really do it, until anim is done)
    
    init_anim_1_tile_wall_to_player() {

        log( "init_anim_1_tile_wall_to_player" , "whose_turn", this.whose_turn );
        
        this.render_turn_no_toggle();

        // Since i cannot see NPC, so, only sort player tile.
        if ( this.whose_turn == this.my_seat_id ) {
            this.sort_player_tile( this.whose_turn );
        }
            
        this.anim_target.x = this.players_concealed_pos[ this.whose_turn ][ this.players_deck[this.whose_turn].length  ].x;
        this.anim_target.y = this.players_concealed_pos[ this.whose_turn ][ this.players_deck[this.whose_turn].length  ].y;
        this.anim_target.z = this.players_concealed_pos[ this.whose_turn ][ this.players_deck[this.whose_turn].length  ].z;
        
        if ( this.whose_turn == this.my_seat_id ) {
            if ( this.my_seat_id == 0 ) {
                this.anim_target.x += 0.5;
            } else if ( this.my_seat_id == 1 ) {
                this.anim_target.z += 0.5;
            } else if ( this.my_seat_id == 2 ) {
                this.anim_target.x -= 0.5;
            } else if ( this.my_seat_id == 3 ) {
                this.anim_target.z -= 0.5;
            }
        }
        
         
        this.last_wall_piece = this.wall_pieces_ent.shift();
        this.anim_piece = this.last_wall_piece;
        
        this.anim_piece["player"] = this.whose_turn;
        
        
        this.anim_dealing = 3;

        
        //log("Anim 3", this.whose_turn , this.anim_piece );

        // Now wait until anim of drawing a tile done.
    }

    //------
    // Draw one tile then checks if there's any doable action upon turn player drawing a tile.
    play_draw_one_tile_procedure( drawn_tile ) {
        
        log( "play_draw_one_tile_procedure" , "whose_turn", this.whose_turn );
        
        this.last_drawn = drawn_tile;
        this.last_drawn_side = this.whose_turn;
        
        this.players_deck[ this.whose_turn ].push( this.last_drawn );
        if ( this.last_wall_piece != null ) {
            this.players_concealed_ent[ this.whose_turn ].push( this.last_wall_piece );
        } else {
            // Just incase.
            this.players_concealed_ent[ this.whose_turn ].push( this.wall_pieces_ent.shift() );
        }


        let last_drawn_ent = this.players_concealed_ent[this.whose_turn][ this.players_concealed_ent[this.whose_turn].length - 1 ];
        
        this.setTileVal( last_drawn_ent , this.last_drawn );


        this.doable_actions.length = 0;
        this.doable_selected.length = 0;

        // Check to see if can do Concealed Kong
        let player_deck_stat = {};
        for ( let i = 0 ; i < this.players_deck[ this.whose_turn ].length ; i++ ) {
            this.safe_incr( player_deck_stat , this.players_deck[ this.whose_turn ][i] , 1 );
        }

        let kong_button_index = 0;
        for ( let key in player_deck_stat ) {
            if ( player_deck_stat[key] == 4 ) {
                this.doable_actions.push( [ this.whose_turn , "kong_" + kong_button_index , key , -5 , kong_button_index ] )
                kong_button_index += 1;
            }    
        }

        // Check to see if can do Small Melded Kong
        let exposed_pung_keys = {};
        for ( let i = 0 ; i < this.exposed_deck[ this.whose_turn ].length ; i++ ) {
            if ( this.exposed_deck[ this.whose_turn ][i] == -2 ) {
                let key = this.exposed_deck[ this.whose_turn ][i-1];
                exposed_pung_keys[key] = 1;
            }
        }

        
        for ( let i = 0 ; i < this.players_deck[ this.whose_turn ].length ; i++ ) {
            let key = this.players_deck[ this.whose_turn ][i];
            if ( exposed_pung_keys[key] == 1 ) {
                // Has an exposed pung that can meld.
                this.doable_actions.push( [ this.whose_turn , "kong_" + kong_button_index , key , -4 , kong_button_index ] )
                kong_button_index += 1;
            }
        }

        
        // Check to see if can zi mo to Hu
        let can_hu = this.check_can_hu( this.whose_turn , null );
        if ( can_hu.length > 0 ) {
            this.doable_actions.push( [ this.whose_turn , "win" , can_hu , 0] )
        }
        
    }

    


    //------
    // This procedure checks if there's any doable action upon turn player discarding a tile.

    play_discard_procedure( ) {
        
        log( "Play discard procedure" , "Discard by", this.whose_turn );

        this.doable_actions.length = 0;
        this.doable_selected.length = 0;

        this.clear_buttons();
        
        // Check if there's a pungable or big melded kong chance for all players except player who just discarded.
        for ( let h = 0 ; h < 4 ; h++ ) {
            
            let count = 0;
            if ( h != this.whose_turn ) {

                for ( let i = 0 ; i < this.players_deck[h].length ; i++ ) {
                    if ( this.players_deck[h][i] == this.last_discarded ) {
                        count += 1;
                    }
                }
                // Pung
                if ( count >= 2 ) {
                    this.doable_actions.push( [ h , "pung" , this.last_discarded , -2 ] )
                }

                // Big Melded Kong
                if ( count >= 3 ) {
                    this.doable_actions.push( [ h , "kong_0" , this.last_discarded , -3 , 0 ] )
                }
            }
        }

        // Check if there's a chow chance. Chow can only be done by next turn player.
        if ( this.last_discarded < 27 ) {

            let next_jia = (this.whose_turn + 1) % 4 ;
            let chowable = [0,0,0,0];
            let discarded_val   = this.last_discarded % 9;
            let discarded_suit  = (this.last_discarded / 9) >> 0;
                                
            for ( let i = 0 ; i < this.players_deck[ next_jia ].length ; i++ ) {
                // Is suited tiles
                if ( this.players_deck[next_jia][i] < 27 ) {

                    let cur_val         = this.players_deck[next_jia][i] % 9;
                    let cur_suit        = (this.players_deck[next_jia][i] / 9) >> 0;

                    if ( cur_suit == discarded_suit ) {
                        if ( cur_val - discarded_val == -2 ) {
                            chowable[0] = 1;
                        }
                        if ( cur_val - discarded_val == -1 ) {
                            chowable[1] = 1;
                        }
                        if ( cur_val - discarded_val == 1 ) {
                            chowable[2] = 1;
                        }
                        if ( cur_val - discarded_val == 2 ) {
                            chowable[3] = 1;
                        }
                    }
                }
            }



            if ( chowable[0] == 1 && chowable[1] == 1 ) {
                this.doable_actions.push( [ next_jia , "chow_0" , this.last_discarded -2 , -1, 0 ] )
            }

            if ( chowable[1] == 1 && chowable[2] == 1 ) {
                
                this.doable_actions.push( [ next_jia , "chow_1" , this.last_discarded-1 , -1 , 1] )
            }
            if ( chowable[2] == 1 && chowable[3] == 1 ) {
                
                this.doable_actions.push( [ next_jia , "chow_2" , this.last_discarded  , -1 , 2 ] )
            }
            
        }


        // Check for Hu also for all players except player who just discarded.
        for ( let h = 0 ; h < 4 ; h++ ) {
            
            // Cannot hu your own discard
            if ( h != this.whose_turn ) {

                let can_hu = this.check_can_hu( h, this.last_discarded); 
                
                if ( can_hu.length > 0 ) {
                    this.doable_actions.push( [ h , "win" , can_hu , 1 ] )
                }
            }
        }
        
    }

    //------------
    // Will process all colyseus transaction that has been gathered.
    process_colyseus_transaction( ) {

        let colyseus_transaction = this.colyseus_transaction.shift();

        log("Processing colyseus", colyseus_transaction[0]);

        if ( colyseus_transaction[0] == "everyone_dealing_done" ) {

            this.ui_network_msg.value = "";
            let whose_turn = colyseus_transaction[1];
            this.whose_turn = whose_turn; 
            
        } else if ( colyseus_transaction[0] == "init_anim_1_tile_wall_to_player" ) {
            this.init_anim_1_tile_wall_to_player();
        
        } else if ( colyseus_transaction[0] == "draw_game" ) {
            this.draw_game();
        
        } else if ( colyseus_transaction[0] == "everyone_turnplayer_draw_one_tile" ) {
            let drawn_tile = colyseus_transaction[1];
            this.play_draw_one_tile_procedure( drawn_tile ); 
            this.render_turn();
            if ( this.whose_turn == this.my_seat_id ) {
                let player_doable_actions_cnt = this.render_buttons_based_on_doable_actions();
                this.sounds["turnstart"].playOnce();
            } 
        } else if ( colyseus_transaction[0] == "discard_tile" ) {

            let message = colyseus_transaction[1];
            let owner                       = message[0];
            let key                         = message[1];
            let concealed_ent_index         = this.players_deck[owner].indexOf( key );
            this.discard_tile( owner, concealed_ent_index );

        } else if ( colyseus_transaction[0] == "has_doable_actions" ) {

            this.doable_actions = colyseus_transaction[1];
            let player_doable_actions_cnt = this.render_buttons_based_on_doable_actions();
            if ( player_doable_actions_cnt > 0 ) {
                this.buttons[ "pass" ].show();
            }
        } else if ( colyseus_transaction[0] == "finalize_action_selected" ) {
            let todo_action = colyseus_transaction[1];
            this.execute_todo( todo_action );

        } else if ( colyseus_transaction[0] == "count_down_discard" ) {

            let data = colyseus_transaction[1];
            let count_down_tick = data[0];
            let owner           = data[1];
            if ( count_down_tick == 0 ) {
                this.ui_network_msg.value = "";
            } else {
                this.ui_network_msg.value = "Waiting for player: " + this.display_names[owner] + " : " + count_down_tick;
            }



        } else if ( colyseus_transaction[0] == "count_down_doable") {

            let data = colyseus_transaction[1];
            let count_down_tick = data[0];
            if ( count_down_tick == 0 ) {
                this.ui_network_msg.value = "";
            } else {
                this.ui_network_msg.value = "Waiting for players to do action.  : " + count_down_tick;
            }
        



        } else if ( colyseus_transaction[0] == "count_down_kick") {

            let data = colyseus_transaction[1];
            let count_down_tick = data[0];
            let owner           = data[1];
            
            this.ui_network_msg.value = "Waiting for player:  : " + this.display_names[owner] + " to click play. " + count_down_tick;

            if ( count_down_tick == 0 ) {
                this.buttons["kick"].show();
            } else {
                this.buttons["kick"].hide();
            }
        } else if (  colyseus_transaction[0] == "kick") {

            this.buttons["kick"].hide();


        } else if ( colyseus_transaction[0] == "server_shutdown" ) {
            
            let code = colyseus_transaction[1];
            if ( code > 1000 ) {
                ui.displayAnnouncement("Server has been shutdown/rebooted. Please reconnect. Sorry for interrupting your game.",5, Color4.Yellow(), 14,false);
            } else {
                ui.displayAnnouncement("You have been disconnected." , 5, Color4.Yellow(), 14,false);
            }
            this.gameover = 1;

            if ( this.tiles_entity_created == 1 ) {
                this.clear_deck();
            }

            this.clear_buttons();
            this.buttons["connect"].show();
            this.buttons["connect2"].show();

        } 
    }


    




    
    //--------------
    refine_combinations( scores ) {

        
        let filters = {};
        for ( let i = scores.length - 1 ; i >= 0 ; i-- ) {
            switch ( scores[i][0]  ) {
                case "Thirteen Orphans":
                    filters["Concealed Hand"] = 1;
                    filters["Outside Hand"] = 1;
                    filters["All Types"] = 1;
                    filters["All Terminals and Honors"] = 1;
                    break;    

                case "Seven Shifted Pairs":
                    filters["Full Flush"] = 1;
                    filters["Seven Pairs"] = 1;
                    filters["Half Flush"] = 1;
                    filters["Pair Wait"] = 1;
                    filters["No Honor Tiles"] = 1;
                    filters["One Voided Suit"] = 1;
                    filters["Four Shifted Chows"] = 1;
                    filters["All Chows"] = 1;
                    filters["Pure Double Chow"] = 1;
                    filters["Concealed Hand"] = 1;
                    
                    break;    
                
                case "Four Kongs":
                    filters["Three Kongs"] = 1;
                    filters["All Pungs"] = 1;
                    filters["Two Melded Kongs"] = 1;
                    filters["Pair Wait"] = 1;
                    filters["Melded Kong"] = 1;
                    break;    

                case "Nine Gates":
                    filters["Full Flush"] = 1;
                    filters["Half Flush"] = 1;
                    filters["Concealed Hand"] = 1;
                    filters["One Voided Suit"] = 1;
                    filters["Pung of Terminals or Honors"] = 1;
                    break;
                
                case "Big Three Dragons":
                    filters["Two Dragon Pungs"] = 1;
                    filters["Little Three Dragons"] = 1;
                    filters["Dragon Pung"] = 1;
                    break;

                case "Big Four Winds":
                    filters["Pung of Terminals or Honors"] = 1;
                    filters["Prevalent Wind"] = 1;
                    filters["Seat Wind"] = 1;
                    filters["All Pungs"] = 1;
                    filters["Big Three Winds"] = 1;
                    filters["Little Four Winds"] = 1;
                    break;

                case "Pure Terminal Chows":
                    filters["Full Flush"] = 1;
                    filters["Half Flush"] = 1;
                    filters["All Chows"] = 1;
                    filters["One Voided Suit"] = 1;
                    filters["Two Terminal Chows"] = 1;
                    filters["Pure Double Chow"] = 1;
                    break;
                
                case "Four Concealed Pungs":
                    filters["Concealed Hand"] = 1;
                    filters["Two Concealed Pungs"] = 1;
                    filters["All Pungs"] = 1;
                    filters["Three Concealed Pungs"] = 1;
                    break;

                case "Little Three Dragons":
                    filters["Dragon Pung"] = 1;
                    filters["Two Dragon Pungs"] = 1;
                    break;

                case "Little Four Winds":
                    filters["Pung of Terminals or Honors"] = 1;
                    filters["Big Three Winds"] = 1;
                    break;

                case "All Honors":
                    filters["Pung of Terminals or Honors"] = 1;
                    filters["One Voided Suit"] = 1;
                    filters["Outside Hand"] = 1;
                    filters["All Pungs"] = 1;
                    filters["All Terminals and Honors"] = 1;
                    break;

                case "All Terminals":
                    filters["Pung of Terminals or Honors"] = 1;
                    filters["No Honor Tiles"] = 1;
                    filters["Outside Hand"] = 1;
                    filters["All Pungs"] = 1;
                    filters["All Terminals and Honors"] = 1;
                    break;

                case "Four Pure Shifted Pungs":
                    filters["All Pungs"] = 1;
                    filters["Pure Shifted Pungs"] = 1;
                    break;

                case "Quadruple Chow":
                    filters["Pure Double Chow"] = 1;
                    filters["Tile Hog"] = 1;
                    filters["Pure Triple Chow"] = 1;
                    break;
                
                case "All Terminals and Honors":
                    filters["Pung of Terminals or Honors"] = 1;
                    filters["Outside Hand"] = 1;
                    filters["All Pungs"] = 1;
                    break;

                case "Three Kongs":
                    filters["Two Melded Kongs"] = 1;
                    filters["Melded Kong"] = 1;
                    break;

                case "Four Shifted Chows":
                    filters["Short Straight"] = 1;
                    filters["Pure Shifted Chows"] = 1;
                    break;
                
                case "Lower tiles":
                    filters["No Honor Tiles"] = 1;
                    filters["Lower Four"] = 1;
                    break;
                
                case "Middle tiles":
                    filters["No Honor Tiles"] = 1;
                    filters["All Simples"] = 1;
                    break;
                    
                case "Upper tiles":
                    filters["No Honor Tiles"] = 1;
                    filters["Upper Four"] = 1;
                    break;    

                case "Pure Triple Chow":
                    filters["Pure Double Chow"] = 1;
                    break;

                case "Full Flush":
                    filters["One Voided Suit"] = 1;
                    filters["No Honor Tiles"] = 1;
                    filters["Half Flush"] = 1;
                    break;

                case "All Even Pungs":
                    filters["No Honor Tiles"] = 1;
                    filters["All Simples"] = 1;
                    filters["All Pungs"] = 1;
                    break;


                case "Greater Honors and Knitted Tiles":
                    filters["Concealed Hand"] = 1;
                    filters["All Types"] = 1;
                    filters["Lesser Honors and Knitted Tiles"] = 1;
                    break;

                case "Seven Pairs":
                    filters["Pair Wait"] = 1;
                    filters["Concealed Hand"] = 1;
                    break;

                case "Three Concealed Pungs":
                    filters["Two Concealed Pungs"] = 1;
                    filters["Double Pung"] = 1;
                    break;

                case "All Fives":
                    filters["No Honor Tiles"] = 1;
                    filters["All Simples"] = 1;
                    break;

                case "Pure Shifted Chows":
                    break;
                
                case "Three Suited Terminal Chows":
                    filters["Mixed Double Chow"]= 1;
                    filters["Two Terminal Chows"] = 1;
                    filters["No Honor Tiles"] = 1;
                    filters["All Chows"] = 1;
                    break;

                case "Pure Straight":
                    filters["Short Straight"] = 1;
                    filters["Two Terminal Chows"] = 1;
                    break;

                case "Big Three Winds":
                    filters["Pung of Terminals or Honors"]= 1;
                    break;
                
                case "Lower Four":
                    filters["No Honor Tiles"] = 1;
                    break;
                
                case "Upper Four":
                    filters["No Honor Tiles"] = 1;
                    break;
                
                case "Lesser Honors and Knitted Tiles":
                    filters["Concealed Hand"] = 1;
                    filters["All Types"] = 1;
                    break;

                case "Mixed Triple Chow":
                    filters["Mixed Double Chow"] = 1;
                    break;

                case "Reversible Tiles":
                    filters["One Voided Suit"] = 1;
                    break;
                
                case "Two Dragon Pungs":
                    filters["Dragon Pung"] = 1;
                    break;
                
                case "Melded Hand":
                    filters["Pair Wait"]= 1;
                    break;
                
                case "Half Flush":
                    filters["One Voided Suit"] = 1;
                    break;
                
                case "Two Melded Kongs":
                    filters["Melded Kong"] = 1;
                    break;
                
                case "All Simples":
                    filters["No Honor Tiles"] = 1;
                    break;

                case "All Chows":
                    filters["No Honor Tiles"] = 1;
                    break;



                default: 
            } 
        }

        let new_list = [];
        for ( let i = scores.length - 1 ; i >= 0 ; i-- ) {

            if ( filters[ scores[i][0] ] == 1 ) {
            } else { 
                new_list.push( scores[i] );
            }
        }

        return new_list;
    }

    


    //---------
    render_buttons_based_on_doable_actions() {
        
        let player_doable_actions_cnt = 0;

        // Of all the doable actions, only render where owner is player 0.
        for ( let i = this.doable_actions.length - 1 ; i >= 0 ; i-- ) {

            let owner   = this.doable_actions[i][0] ;
                
            if ( owner == this.my_seat_id ) {
                
                let butname = this.doable_actions[i][1] ;
                this.buttons[ butname ].show();  
                this.buttons[ butname ].getComponent(Transform).position.x = 0;
                this.buttons[ butname ].getComponent(Transform).position.y = player_doable_actions_cnt * 1.65;
                

                if ( butname.substr(0,4) == "kong" ) {

                    let key                 = this.doable_actions[i][2] ;
                    let type                = this.doable_actions[i][3] ;
                    let kong_button_index   = this.doable_actions[i][4];

                    this.setFaceVal( this.buttons[ butname ]["face"], key , 1 );
                    
                    this.buttons[ butname ]["type"] = type;
                    this.buttons[ butname ]["key"]  = key;
                    


                } else if ( butname.substr(0,3) == "win" ) {

                    this.buttons[ butname ]["last_hu_scores"]         = this.doable_actions[i][2] ;
                    this.buttons[ butname ]["last_hu_use_discard"]   = this.doable_actions[i][3] ;
                    

                } else if ( butname.substr(0,4) == "pung") {
                    
                    let key                 = this.doable_actions[i][2] ;
                    let type                = this.doable_actions[i][3] ;
                    
                    this.setFaceVal( this.buttons[ butname ]["face"], key , 1 );
                    
                } else if ( butname.substr(0,4) == "chow" ) {

                    let key                 = this.doable_actions[i][2] ;
                    let type                = this.doable_actions[i][3] ;
                    this.setFaceVal( this.buttons[ butname ]["face"], key , 3 );
                        
                }


                this.doable_actions.splice( i , 1);
                player_doable_actions_cnt += 1; 
            }
        }

        return player_doable_actions_cnt;

    }

    //-----
    render_hand_to_ui( player_h , use_discard ) {
        
        let ui_img_index = 0;
        let cur_x = -200 + 72;

        for ( let i = 0 ; i < this.exposed_deck[player_h].length ; i++ ) {
            
            if ( this.exposed_deck[player_h][i] >= 0 ) {
                let frame_x =   this.exposed_deck[player_h][i] % 9;
                let frame_y = ( this.exposed_deck[player_h][i] / 9 ) >> 0;
                this.ui_images_winner_hand[ui_img_index].sourceLeft   = frame_x * 95;
                this.ui_images_winner_hand[ui_img_index].sourceTop = frame_y * 128;            
                this.ui_images_winner_hand[ui_img_index].visible = true;
                this.ui_images_winner_hand[ui_img_index].positionX = cur_x;

                cur_x += 36;
                ui_img_index += 1;
            } else {
                cur_x += 10;
            }
        }

        let winner_concealed_hand = this.copyArray( this.players_deck[player_h] );
        if ( use_discard == 1 ) {
            winner_concealed_hand.push( this.last_discarded );
        }
        winner_concealed_hand.sort( function(a,b) { return a - b });
        

        cur_x += 36;
        
        for ( let i = 0 ; i < winner_concealed_hand.length ; i++ ) {
            
            let frame_x = winner_concealed_hand[i] % 9;
            let frame_y = ( winner_concealed_hand[i] / 9 ) >> 0;
            this.ui_images_winner_hand[ui_img_index].sourceLeft   = frame_x * 95;
            this.ui_images_winner_hand[ui_img_index].sourceTop    = frame_y * 128;            
            this.ui_images_winner_hand[ui_img_index].visible = true;
            this.ui_images_winner_hand[ui_img_index].positionX = cur_x;
            ui_img_index += 1;
            cur_x += 36;
        }
        

        for ( let i = ui_img_index ; i < 18 ; i++) {
            this.ui_images_winner_hand[ui_img_index].visible = false;
        }
        this.ui_root.visible = true;

    }
    

    //-----
    render_turn_no_toggle() {
        for ( let i = 0 ; i < 4 ; i++) {
            this.seatwinds_ent[i].removeComponent( Material );
            if ( this.whose_turn == i ) {
                this.seatwinds_ent[i].addComponent( this.materials[2] );
            } else {
                this.seatwinds_ent[i].addComponent( this.materials[1] );
            }
        }        
    }

    //-----
    render_turn() {
        for ( let i = 0 ; i < 4 ; i++) {
            this.seatwinds_ent[i].removeComponent( Material );
            if ( this.whose_turn == i ) {
                this.seatwinds_ent[i].addComponent( this.materials[2] );
            } else {
                this.seatwinds_ent[i].addComponent( this.materials[1] );
            }
        }        
        if ( this.whose_turn == this.my_seat_id ) {
            log("this.render_turn", "toggle_on");
            this.togglePointer( this.my_seat_id , 1 ); 
        }
    }

    //---------
    safe_incr( obj , key, val ) {
        if ( obj[key] == null ) {
            obj[key] = 0;
        }
        obj[key] += val;
    }

    //---
    safe_push( obj , key, val ) {
        if ( obj[key] == null ) {
            obj[key] = [];
        }
        obj[key].push(val);
    }

    //------
    setFaceVal( planeShape, val , count ) {
        
        let frame_x = val % 9;
        let frame_y = 4 - ( (val / 9) >> 0 );
        
        //log( "setFaceVal", val , count , frame_x , frame_y );
        planeShape.uvs = [
            (frame_x + count )/9.0     , frame_y/5,
            (frame_x )/9.0             , frame_y/5,
            (frame_x )/9.0             , (frame_y+1)/5,
            (frame_x + count)/9.0      , (frame_y+1)/5,
            
            (frame_x + count)/9.0      , frame_y/5,
            (frame_x)/9.0              , frame_y/5,
            (frame_x)/9.0              , (frame_y+1)/5,
            (frame_x + count)/9.0      , (frame_y+1)/5,
        ]
        
    }
    //-----
    setTileVal( entity , val  ) {
        
        //log( "setTileVal" , val )
        //entity.removeComponent( GLTFShape );
        //entity.addComponent( resources.models.tiles[val] );
        this.setFaceVal( entity["face"].getComponent(PlaneShape) , val , 1 )
        
    }

    //---------------
    async setUserData() {
        const data = await getUserData()
        this.userData = data
    }

    //---------------------
    shuffleArray(array) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
    }

    

    //--------
    sort_player_tile( player_h ) {

        log( "Sort Player tile", player_h , "player_deck.length", this.players_deck[player_h].length, "ent.length", this.players_concealed_ent[player_h].length );

        this.players_deck[player_h].sort(function(a, b) {
            return a - b;
        });

        for ( let i = 0 ; i < this.players_concealed_ent[player_h].length ; i++ ) {
            let mpiece = this.players_concealed_ent[player_h][i];
            let val    = this.players_deck[player_h][i];
            mpiece.getComponent(Transform).position.x = this.players_concealed_pos[player_h][i].x;
            mpiece.getComponent(Transform).position.y = this.players_concealed_pos[player_h][i].y;
            mpiece.getComponent(Transform).position.z = this.players_concealed_pos[player_h][i].z;
            
            if ( player_h == this.my_seat_id ) {
                mpiece.getComponent(Transform).rotation.eulerAngles = new Vector3( 0, player_h * -90, 0 );
            } else {
                mpiece.getComponent(Transform).rotation.eulerAngles = new Vector3( -90 , player_h * -90, 0 );
            }

            this.setTileVal( mpiece , val  );
        }   
    }

    
    //-----
    togglePointer( player_h , on_off ) {

        log("togglePointer", player_h ,on_off );

        for ( let i = 0 ; i < this.players_concealed_ent[player_h].length ; i++ ) {
            let mpiece = this.players_concealed_ent[player_h][i];
            if ( on_off == 0 ) {
                if ( mpiece.hasComponent(OnPointerDown) ) {
                    mpiece.removeComponent( OnPointerDown );
                }
            } else {

                if ( mpiece.hasComponent(OnPointerDown) == false )  {

                    mpiece.addComponent( mpiece["onpointerdown_pt"] );
                }
            }
        }
    }

    //--------
    // Button onclicked
    txclickable_button_onclick( id ,  userData ) {

        log( "txclickable_button_onclick", id , userData );

        if ( id == "pung") {
            
            this.doable_selected.push( [ this.my_seat_id , "pung", 0 , 8] )
            this.finalize_doable() ;

        } else if ( id == "kong_0") {
            
            let type = this.buttons[id]["type"];
            let key  = this.buttons[id]["key"];

            this.doable_selected.push( [ this.my_seat_id , "kong", 0, 9 , type , key ] )
            this.finalize_doable() ;

        } else if ( id == "kong_1") {
            
            let type = this.buttons[id]["type"];
            let key  = this.buttons[id]["key"];
            
            this.doable_selected.push( [ this.my_seat_id , "kong", 1 ,9 , type, key ] )
            this.finalize_doable() ;

        } else if ( id == "kong_2") {
            
            let type = this.buttons[id]["type"];
            let key  = this.buttons[id]["key"];
            
            this.doable_selected.push( [ this.my_seat_id , "kong", 2 ,9 , type , key ] )
            this.finalize_doable() ;

        } else if ( id == "chow_0") {

            this.doable_selected.push( [ this.my_seat_id , "chow" , 0 , 7] )
            this.finalize_doable() ;

        } else if ( id == "chow_1") {
            
            this.doable_selected.push( [this.my_seat_id , "chow" , 1 , 7 ] )
            this.finalize_doable() ;

        } else if ( id == "chow_2") {
            
            this.doable_selected.push( [this.my_seat_id , "chow" , 2 ,7 ] )
            this.finalize_doable() ;
            
        } else if ( id == "win") {

            let last_hu_scores       = this.buttons[ id ]["last_hu_scores"];
            let last_hu_use_discard = this.buttons[ id ]["last_hu_use_discard"] 
            this.doable_selected.push( [this.my_seat_id , "win" , 0, 10 , last_hu_scores, last_hu_use_discard] )
            this.finalize_doable() ;
            
        } else if ( id == "pass") {

            this.doable_selected.push( [0 , "pass", 0 , 6] )
            this.finalize_doable() ;

        } 

        // this is for single player only.
        if ( this.gameover == 0 && this.whose_turn != this.my_seat_id && this.game_mode == 0 && id != "win" && id != "join" ) {
            this.anim_dealing = 5;
            this.anim_tick = 0;
        }
        

        if ( id == "deal") {

            this.new_round();
        
        } else if ( id == "connect") {
            this.init_colyseus(null);


        } else if ( id == "connect2") {
            this.init_colyseus_withPassword();
        
        } else if ( id == "leave") {

            this.leave_colyseus();



        } else if ( id == "kick") {
            this.colyseus_room.send("kick");
        
        } else if ( id == "help") {
            openExternalURL("https://playmahjong.io/how-to-play-mahjong");
        }
    }
    




    //---------------
    update( dt ) {

        if ( this.anim_dealing == 1 ) {

            let total_concealed_count = 0;
            for ( let h = 0 ; h < 4 ; h++ ) {
                total_concealed_count += this.players_concealed_ent[h].length;
            }
            if ( total_concealed_count < 52 ) {

                // Change container
                this.anim_piece = this.wall_pieces_ent.shift();

                let player_h = total_concealed_count % 4;
                let tile_i   = ( total_concealed_count / 4 ) >> 0; 
                this.players_concealed_ent[player_h].push( this.anim_piece );
                
                this.anim_target.x = this.players_concealed_pos[player_h][tile_i].x;
                this.anim_target.y = this.players_concealed_pos[player_h][tile_i].y;
                this.anim_target.z = this.players_concealed_pos[player_h][tile_i].z;

                
                this.anim_piece["player"] = player_h;
                this.setTileVal( this.anim_piece, this.players_deck[player_h][tile_i]  );

                // Give some times to move
                this.anim_dealing = 2;
            } else {

                this.anim_dealing = 0;
                this.whose_turn = this.players_wind.indexOf(27);
                        
                // Done with dealing..
                if ( this.game_mode == 1 ) {
                    // Dont need to do anything, we will process colyseus transaction and know what to do.
                    
                } else {
                    this.check_wall_and_proceed_draw_one_tile();
                }
            }

        } else if ( this.anim_dealing == 5 ) {
            this.anim_tick += 1;
            if ( this.anim_tick > 40 ) {
                this.anim_dealing = 6;
                this.anim_tick = 0;
            }
        
        } else if ( this.anim_dealing == 6 ) {

            this.NPC_decide_discard_tile();
        }



        if ( this.anim_piece != null ) {

            //log("animating...");


            // Animate movement.
            let diffx = this.anim_target.x - this.anim_piece.getComponent(Transform).position.x ;
            let diffz = this.anim_target.z - this.anim_piece.getComponent(Transform).position.z ;

            let speed_inverse = 3;
            if ( this.anim_dealing == 2 ) {
                speed_inverse = 1.3;
            }
            
                
            if ( diffx * diffx + diffz * diffz > 0.0001 ) { 
                // not reach , move
                let delta_x = diffx / speed_inverse;
                let delta_z = diffz / speed_inverse;
                this.anim_piece.getComponent(Transform).position.x += delta_x;
                this.anim_piece.getComponent(Transform).position.z += delta_z;
                
            } else {
                
                // Reach 
                //log("anim reached..", this.anim_dealing )

                this.anim_piece.getComponent(Transform).position.x = this.anim_target.x;
                this.anim_piece.getComponent(Transform).position.y = this.anim_target.y;
                this.anim_piece.getComponent(Transform).position.z = this.anim_target.z;

                // Face orientation issue.
                let h = this.anim_piece["player"];
                if ( this.anim_dealing == 2 || this.anim_dealing == 3 ) {
                    if ( h == this.my_seat_id ) {
                        this.anim_piece.getComponent(Transform).rotation.eulerAngles = new Vector3( 0, h * -90 ,0);
                    } else {
                        this.anim_piece.getComponent(Transform).rotation.eulerAngles = new Vector3( -90 , h * -90, 0);
                    }
                } else if ( this.anim_dealing == 4 )  {
                    this.anim_piece.getComponent(Transform).rotation.eulerAngles = new Vector3( 90,  h * -90, 0);
                }

                
                // Highlight which one just got discarded.
                if ( this.anim_dealing == 4 ) {
                    this.mpiece_highlight.getComponent(Transform).position.copyFrom( this.anim_piece.getComponent(Transform).position );
                    this.mpiece_highlight.getComponent(Transform).rotation.copyFrom( this.anim_piece.getComponent(Transform).rotation );
                }

                let last_drawn_ent = this.anim_piece;
                this.anim_piece = null;

                
                if ( this.anim_dealing == 2 ) {

                    this.anim_dealing = 1;
                    this.sounds["discard"].playOnce();
                    


                } else if ( this.anim_dealing == 3 ) {
                    
                    // 3. anim draw one tile done
                    this.anim_dealing = 0;

                    if ( this.game_mode == 1 ) {    
                        
                        // Dont need to do anything, server dictates everything.

                        
                    } else {
                        this.play_draw_one_tile_procedure( this.deck.shift() );   
                        
                        if ( this.whose_turn == this.my_seat_id ) {
                            // Player's chance to do Kong or Hu upon drawing 1 tile.
                            let player_doable_actions_cnt = this.render_buttons_based_on_doable_actions();
                            this.render_turn();
                            this.sounds["turnstart"].playOnce();
                            
                        } else {
                            
                            // NPC's turn
                            this.NPC_decide_doaction( this.whose_turn , this.doable_actions );
                            if ( this.doable_selected.length > 0 ) {
                            
                                // Has something to do: eg: Kong / Hu
                                log( "update", "anim_dealing == 3 done", "DEBUG_B Finalize doable.");
                                this.finalize_doable();
                                // Pause for 2s... so that user can see... then back again
                                if ( this.gameover == 0 ) {

                                    this.anim_dealing = 5;
                                    this.anim_tick = 0;
                                }
                            } else {
                                // No doable action, just discard 1 then
                                this.NPC_decide_discard_tile();
                            }
                        }
                    }








                } else if ( this.anim_dealing == 4 ) {
                    
                    // 4. animation of discarding a tile is completed.
                    this.anim_dealing = 0;
                    this.sounds["discard"].playOnce();
                    this.sounds["tile_" + this.last_discarded ].playOnce();
                        
                    if ( this.game_mode == 1 ) {
                        
                        // PVP server dictates everything, so no need to do anything.

                    } else {
                        
                        // Single player mode:
                        this.play_discard_procedure();  
                    
                        // Player's chance to do Pung,Kong,Chow or Hu upon other player discarding a tile.


                        // Let NPC make selection first. NPC can overwrite chow with pung
                        for ( let h = 0 ; h < 4 ; h++ ) {
                            if ( h != this.whose_turn && h != this.my_seat_id ) {
                                this.NPC_decide_doaction( h , this.doable_actions );
                            }
                        }
                        // Then player make selection
                        let player_doable_actions_cnt = this.render_buttons_based_on_doable_actions();
                        if ( player_doable_actions_cnt > 0 ) {
                            
                            this.buttons[ "pass" ].show();

                        } else if ( this.doable_selected.length > 0 ) {
                            // Player has no doable action, but NPC has. Then do the NPC ones.

                            log( "update", "anim_dealing == 4 done", "DEBUG_A Finalize doable.");
                            this.finalize_doable();
                            // Pause for 2s... so that user can see... then back again
                            if ( this.gameover == 0 ) {

                                this.anim_dealing = 5;
                                this.anim_tick = 0;
                            }
                            
                        } else {
                            
                            // Both also have no doable action/ Chose not to do action, then proceed to next turn
                            this.sort_player_tile( this.whose_turn );
                            this.whose_turn = (this.whose_turn + 1) % 4;
                            this.check_wall_and_proceed_draw_one_tile();
                        }
                    }
                    
                    
                }
                
                
            }
        }
        if ( this.game_mode == 1 && this.anim_dealing == 0 && this.colyseus_transaction.length > 0 ) {
            this.process_colyseus_transaction();
        }

        let diff_x = Camera.instance.feetPosition.x - this.getComponent(Transform).position.x ;
        let diff_z = Camera.instance.feetPosition.z - this.getComponent(Transform).position.z ;
        if ( diff_x * diff_x + diff_z * diff_z  < 20 ) {
        
            let diff_y = Camera.instance.feetPosition.y - this.getComponent(Transform).position.y ;
            if ( diff_y * diff_y < 9) { 
                this.ui_root_for_distance_toggle.visible = true;
            } else {
                this.ui_root_for_distance_toggle.visible = false;
            }
        } else {
            this.ui_root_for_distance_toggle.visible = false;
        }
    }


    
}

