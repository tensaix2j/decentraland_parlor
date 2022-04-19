
import resources from "src/resources";
import { getUserData, UserData } from '@decentraland/Identity'
import {Utils} from "src/utils"
import { Txsound } from "src/txsound";
import * as ui from '@dcl/ui-scene-utils'
import { Txclickable_box } from "src/txclickable_box"


export class Doudizhu extends Entity implements ISystem {

    public stage; 
    public game_mode;
    public table_index;

    // Logical values
    public deck = [];
    public players_deck                 = [[],[],[]];
    public discarded_deck               = [[],[],[]];

    // Acutal entities.
    public wall_pieces_ent              = [];
    public players_concealed_ent        = [[],[],[]];
    public players_discarded_ent        = [[],[],[]];
    
    // Positions for the ents
    public players_concealed_pos        = [[],[],[]];
    public players_discarded_pos        = [[],[],[]];
    public wall_pieces_pos              = [];
    
    public userData;
    public display_names = [];

    public buttons = {};
    public materials = [];
    public gameover = 1;

    // UIs
    public ui_network_msg;
    public ui_root_for_distance_toggle ;
    public ui_root;
    public ui_texts = [];
    public ui_announcement;
    public ui_announcement_tick = 0;



    // Anims
    public anim_piece = null;
    public anim_target = new Vector3(0,0,0);
    public anim_dealing = 0;
    public anim_tick = 0;

    
    public round = 0;
    public whose_turn = 0;
    public my_seat_id = 0;

    public curbid = 0 ;
    public landlord = -1;
    public round_winner = -1;
    public bomb_or_rocket = 0;


    public final_scores = [0,0,0,0];
    public last_discarded_vals = [];
    public last_discarded_side = -1;

    public round_actions  = [ -1 , -1 , -1 ];

    public sounds;

    public cards_entity_created = 0;





    //---------------------
    constructor( stage , game_mode , table_index ) {
        super();
        engine.addEntity( this );
        
        this.stage = stage;
        this.game_mode = game_mode
        this.table_index = table_index ;

        this.init_sounds();
        this.init_deck();
        this.init_positions();
        this.init_names();
        this.init_entities();
        

       
        

        engine.addSystem( this );
    }


    //-------
    bid_round_procedure() {
        
        if ( this.whose_turn == this.my_seat_id ) {
            this.render_pre_round_bid_buttons();
        } else { 
            this.NPC_decide_pre_round_bid( this.whose_turn );
        }
    }


    //----------
    check_pattern( selected_vals ) {
        
        let ret = -1;
        if ( selected_vals.length == 1 ) {
            // Single
            ret = 20;
            log( "Pattern is: Single");
        
        } else if ( selected_vals.length == 2 ) {

            // Pair
            if ( selected_vals[0] > 51 && selected_vals[1] > 51) {
                // 2 Jokers
                log( "Pattern is: Rocket");
                ret = 22;
            } else if ( selected_vals[0] % 13 == selected_vals[1] % 13 && selected_vals[0] < 52 && selected_vals[1] < 52 ) {
                log( "Pattern is: Pair");
                ret = 19;
            }
        
        } else if ( selected_vals.length == 3 ) {
            // Tripple 
            if ( selected_vals[0] % 13 == selected_vals[1] % 13 && 
                selected_vals[1] % 13 == selected_vals[2] % 13 ) {
                
                log( "Pattern is: Tripplet");
                ret = 18;    
            }
        
        } else if ( selected_vals.length >= 4 ) {
            
            // Need the suitless statistic
            let tmp_stat = {}
            for ( let i = 0 ; i < selected_vals.length ; i++) {
                let cardval = this.card_val( selected_vals[i] )
                this.safe_incr( tmp_stat , cardval , 1 );
            }
            
            // 4 cards
            if ( selected_vals.length == 4 ) { 
                // 4 cards
                for ( let key in tmp_stat ) {
                    if ( tmp_stat[key] == 3 ) {
                        // 3 + 1
                        log( "Pattern is: 3 + 1");
                        ret = 17;
                    } else if ( tmp_stat[key] == 4 ) {
                        // 4 + 0
                        log( "Pattern is: BOMB");
                        ret = 21;
                    }
                }
            }

            // >= 5 card and above can check for single,double and tripple sequences.
            if ( selected_vals.length >= 5 ) {
                ret = this.is_single_sequence(  tmp_stat );
                if ( ret != -1) {
                    log("Pattern is: Sequence")
                    ret = 15;
                }

                if ( ret == -1) {
                    ret = this.is_pair_sequence(  tmp_stat );
                    if ( ret != -1) {
                        log("Pattern is: Sequence of Pairs")
                        ret = 14;
                    }
                }


                if ( ret == -1) {
                    ret = this.is_triplet_sequence( tmp_stat );
                    if ( ret != -1) {
                        log("Pattern is: Sequence of Tripplets")
                        ret = 13;
                    }
                }


                if ( ret == -1 ) {
                    
                    let pair_count      = 0;
                    let single_count    = 0;
                    let quad_count      = 0;

                    for ( let key in tmp_stat ) {
                        if ( tmp_stat[key] == 4 ) {
                            quad_count += 1;
                        } else if ( tmp_stat[key] == 2 ) {
                            pair_count += 1;
                        } else if ( tmp_stat[key] == 1) {
                            single_count += 1;
                        }
                    }
                    if ( quad_count == 1 && single_count == 2 && pair_count == 0) {
                        ret = 11;
                        log("Pattern is: 4 + 2")
                    } else if ( quad_count == 1 && pair_count == 2 && single_count == 0) {
                        ret = 10;
                        log("Pattern is: 4 + 2 pairs")
                    }
                }
                
                if ( ret == -1 ) {
                    // see how many tripplets can be removed .
                    let tmp_stat2 = this.copyObject( tmp_stat );
                    let tmp_stat3 = {};

                    let pair_count = 0;
                    let single_count = 0;
                    let tripplet_count = 0;
                    
                    for ( let key in tmp_stat2 ) {
                        if ( tmp_stat2[key] == 3 ) {
                            tmp_stat2[key] = 0;
                            this.safe_incr( tmp_stat3 , key, 3 );
                            tripplet_count += 1;

                        } else if ( tmp_stat2[key] == 2 ) {
                            pair_count += 1;
                        } else if ( tmp_stat2[key] == 1) {
                            single_count += 1;

                        }
                    }
                    this.clear_empty_key( tmp_stat2 );

                   
                    let has_sequence_of_tripplet = this.is_triplet_sequence( tmp_stat3 );
                    if ( has_sequence_of_tripplet > -1  || tripplet_count == 1) {
                        
                        // Number of tripplet dictates how many pairs can be attached.
                        tripplet_count = Object.keys( tmp_stat3 ).length;
                        
                        log( "pair count", pair_count );
                        log( "single count", single_count );

                        if ( pair_count == tripplet_count ) {
                            
                            if ( pair_count == 1) {
                                log( "check_pattern","Pattern is: 3 + 2");
                                ret = 12;
                            } else {
                                log( "check_pattern","Pattern is: Sequence of triplets with attached pairs");
                                ret = 9;
                            }

                        } else if ( single_count == tripplet_count ) {
                            log( "Pattern is: Sequence of triplets with attached cards");
                            ret = 16;
                        }
                    }
                    
                    
                }

            }
        }
        return ret;
    }

    //------------
    // 3,4,5,6,7,8,9,10,J, Q, K, A,   2, JB, JR
    // 1 2 3 4 5 6 7  8 9 10 11 12    13  14  15
    card_val( val ) {
        if (val >= 52 ) {
            return val - 52 + 14;
        } else {
            if ( val % 13 == 0 ) {
                return 13;
            } else {
                return val % 13
            }
        } 
    }

    //---------
    compare_pattern( your_vals,  table_vals ) {

        let ret = -1;
        
        let your_pattern  = this.check_pattern( your_vals );
        let table_pattern = this.check_pattern( table_vals );
        
        log("Your Pattern type", your_pattern);
        log("Table Pattern type", table_pattern);
        
        if ( table_vals.length == 0 ) {
            return 1;
        }

        if ( your_pattern < table_pattern ) {
            return -1;
        }
        if ( your_pattern != table_pattern && your_pattern < 21 ) {
            return -1;
        }
        if ( your_vals.length != table_vals.length && your_pattern < 21 ) {
            return -1;
        }
        if ( your_pattern >= 21 && your_pattern > table_pattern ) {
            return 1;
        }
        
        if ( your_pattern == table_pattern ) {

            // BOMB
            if ( your_pattern == 21 || your_pattern == 20  || your_pattern == 19 || your_pattern == 18 ) {
                
                if ( this.card_val( your_vals[0] )  > this.card_val( table_vals[0] ) ) {
                    return 1;
                }
            } else if ( your_pattern <= 17 ) {
                
                let your_stat = {}
                for ( let i = 0 ; i < your_vals.length ; i++) {
                    let val = this.card_val( your_vals[i] );
                    this.safe_incr( your_stat , val , 1 );
                }
                let table_stat = {} 
                for ( let i = 0 ; i < table_vals.length ; i++) {
                    let val = this.card_val( table_vals[i] );
                    this.safe_incr( table_stat , val , 1 );
                }
                
                log( your_stat );
                log( table_stat );

                if ( your_pattern == 17 || your_pattern == 12 || your_pattern == 16 || your_pattern == 13) {
                    let your_use_key = 0;
                    let table_use_key = 0;
                    // 3 + 1. compare the tripplet.
                    for ( let key in your_stat ) {
                        let int_key = parseInt(key);
                        if ( your_stat[key] == 3 && int_key > your_use_key) {
                            your_use_key = int_key;
                        }
                    }
                    for ( let key in table_stat ) {
                        let int_key = parseInt(key);
                        if ( table_stat[key] == 3 && int_key > table_use_key) {
                            table_use_key = int_key;
                        }
                    }

                    log("Your key", your_use_key , "vs", "table_use_key", table_use_key)
                    if ( your_use_key > table_use_key ) {
                        return 1;
                    }

                } else if ( your_pattern == 15 || your_pattern == 14 ) {

                    // Sequence, Seq of pair
                    let your_use_key = 0;
                    let table_use_key = 0;
                    // 3 + 1. compare the tripplet.
                    for ( let key in your_stat ) {
                        let int_key = parseInt(key);
                        if ( int_key > your_use_key) {
                            your_use_key = int_key;
                        }
                    }
                    for ( let key in table_stat ) {
                        let int_key = parseInt(key);
                        if ( int_key > table_use_key) {
                            table_use_key = int_key;
                        }
                    }
                    log("Your key", your_use_key , "vs", "table_use_key", table_use_key)
                    if ( your_use_key > table_use_key ) {
                        return 1;
                    }

                } if ( your_pattern == 11 || your_pattern == 10 ) {
                    
                    let your_use_key = 0;
                    let table_use_key = 0;
                    // 4 + 2. compare the quad.
                    for ( let key in your_stat ) {
                        let int_key = parseInt(key);
                        if ( your_stat[key] == 4 && int_key > your_use_key) {
                            your_use_key = int_key;
                        }
                    }
                    for ( let key in table_stat ) {
                        let int_key = parseInt(key);
                        if ( table_stat[key] == 4 && int_key > table_use_key) {
                            table_use_key = int_key;
                        }
                    }

                    log("Your key", your_use_key , "vs", "table_use_key", table_use_key)
                    if ( your_use_key > table_use_key ) {
                        return 1;
                    }
                }
            }

        }
        
        return ret;        
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

    //-------
    sort_suitless( keys ) {
        keys.sort(function(a, b) {
            return a - b;
        });
    }

    //------------
    is_single_sequence( tmp_stat ) {
        
        let ret = -1;
        let impossible = 0;
        
        if ( Object.keys(tmp_stat).length < 5 ) {
            impossible = 1;
        }
        
        if ( impossible == 0 ) {
            // No 2s and Jokers.
            for ( let key in tmp_stat ) {
                let int_key = parseInt(key);
                if ( int_key == 13 || int_key == 14 || int_key == 15 ) {
                    impossible = 1;
                    ret = -1;
                    break;
                }
            }
        }

        if ( impossible == 0 ) {
            let keys = Object.keys( tmp_stat )
            this.sort_suitless( keys );
            for ( let j = 0 ; j < keys.length - 1 ; j++) {
                if ( parseInt(keys[j + 1 ]) - parseInt(keys[j]) == 1  && tmp_stat[ keys[j] ] == 1  && tmp_stat[ keys[j + 1] ] == 1 ) {
                    // ok
                } else {
                    impossible = 1;
                    break;
                }
            }
        }   

        if ( impossible == 0 ) {
            
            ret = 1;
        }
        
        return ret;
    }

     //------------
     is_pair_sequence(  tmp_stat ) {
        
        let ret = -1;
        let impossible = 0;
        
        if ( Object.keys(tmp_stat).length < 3 ) {
            impossible = 1;
        }

        if ( impossible == 0 ) {
            // No 2s and Jokers pls
            for ( let key in tmp_stat ) {
                let int_key = parseInt(key);
                if ( int_key == 13 || int_key == 14 || int_key == 15 ) {
                    impossible = 1;
                    ret = -1;
                    break;
                }
            }
        }
        
        if ( impossible == 0 ) {
            let keys = Object.keys( tmp_stat )
            this.sort_suitless( keys );
            for ( let j = 0 ; j < keys.length - 1 ; j++) {
                if ( parseInt(keys[j + 1 ]) - parseInt(keys[j]) == 1  && tmp_stat[ keys[j] ] == 2 && tmp_stat[ keys[j + 1] ] == 2 ) {
                    // ok
                } else {
                    impossible = 1;
                    break;
                }
            }
        }   

        if ( impossible == 0 ) {
            ret = 1;
        }
        
        return ret;
    }

    //-----
    is_triplet_sequence(  tmp_stat ) {
        
        let ret = -1;
        let impossible = 0;
        
        if ( Object.keys(tmp_stat).length < 2 ) {
            impossible = 1;
        }

        // No 2s and Jokers pls
        if ( impossible == 0 ) {
            for ( let key in tmp_stat ) {
                let int_key = parseInt(key);
                if ( int_key == 13 || int_key == 14 || int_key == 15 ) {
                    impossible = 1;
                    ret = -1;
                    break;
                }
            }
        }
        if ( impossible == 0 ) {
            let keys = Object.keys( tmp_stat )
            this.sort_suitless( keys );
            for ( let j = 0 ; j < keys.length - 1 ; j++) {
                if ( parseInt(keys[j + 1 ]) - parseInt(keys[j]) == 1  && tmp_stat[ keys[j] ] == 3 && tmp_stat[ keys[j + 1] ] == 3 ) {
                    // ok
                } else {
                    impossible = 1;
                    break;
                }
            }
        }   

        if ( impossible == 0 ) {
            
            ret = 1;
        }
        
        return ret;
    }


    


    //----
    clear_buttons() {
        let b ;
    	for ( b in this.buttons ) {
    		this.buttons[b].hide();
    	}
    }

     //----------
     clear_deck() {

        for ( let h = 0 ; h < 3 ; h++) {
            
            // Reset all hand cardvals
            this.players_deck[h].length = 0;
            this.discarded_deck[h].length = 0;
            
        }
        this.return_ents_to_walls();
        this.ui_root.visible = false;
        this.clear_buttons();
    }

    //-------
    clear_round_actions() {
        for ( let i = 0 ; i < 3 ; i++ ) {
            this.round_actions[i] = -1;
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
        
        let butlabels = [ "No Bid", "Bid 1", "Bid 2", "Bid 3" , "Pass", "Hint", "Submit"];
        let butids    = [ "bid_0" , "bid_1", "bid_2", "bid_3" , "pass" , "hint", "submit" ];

        for ( let i = 0 ; i < butids.length ; i++  ) {
            let but = new Txclickable_box(
                butlabels[i],
                butids[i],
                new Transform({
                    position: new Vector3( 0, 0, 0),
                    scale: new Vector3(1,1,1)
                }),
                buttonGroup,
                this,
                this.materials[3]
            )
            this.buttons[ butids[i] ] = but;
            but.hide();

        }
    }

    //--------
    createCardPieces() {

        // The Wall
        for ( let i = 0 ; i < 54 ; i++ ) {
                
            let x =  0; 
            let y =  i * 0.01 - 0.5;
            let z =  0;

            let mpiece = new Entity();
            mpiece.setParent(this);
            mpiece.addComponent( new Transform({
                position: new Vector3(x,y,z),
                scale: new Vector3( 2 , 2 * 1.44 , 1 ),
            }))
            mpiece.addComponent( new PlaneShape() );
            mpiece.addComponent( this.materials[4] )
            this.setFaceVal( mpiece , i );

            mpiece["onpointerdown_pt"] = new OnPointerDown(
                (e)=>{
                    this.piece_onclick(e);
                },{
                    hoverText:"Select Card"
                }
            );
            mpiece["id"] = this.wall_pieces_ent.length;
            mpiece["selected"] = 0;
            mpiece.getComponent( Transform ).rotation.eulerAngles = new Vector3( -90, 0 ,0);

            this.wall_pieces_ent.push( mpiece );
            this.wall_pieces_pos.push(  [ new Vector3( x,y,z ) , new Vector3( 0,0,0) ] );
            
        }
        
        
    }

    //----------
    createMaterials() {

        this.materials = this.stage.materials;

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

        
        let ui_network_msg = new UIText( ui_root_for_distance_toggle );
        ui_network_msg.vAlign = "bottom";
		ui_network_msg.hAlign = "left";
		ui_network_msg.hTextAlign = "left";
		ui_network_msg.positionX =  0;
		ui_network_msg.positionY = -310;
		
        if ( this.game_mode == 0 ) {
            ui_network_msg.value = "Card Game: Landlord vs Farmers: Player vs A.I Mode.";
        } else {
            ui_network_msg.value = "Card Game: Landlord vs Farmers: Player v Player Mode. Table: " + (this.table_index + 1);
        }

		ui_network_msg.fontSize = 15;
		ui_network_msg.visible = true;
		this.ui_network_msg = ui_network_msg;


        let ui_root = new UIContainerRect( ui_root_for_distance_toggle );
        ui_root.vAlign = "center";
		ui_root.hAlign = "center";
        ui_root.positionX = -100;
        ui_root.positionY = 0;
        this.ui_root = ui_root;

        for ( let i = 0 ; i < 3 ; i++ ) { 
            let ui_text = new UIText( ui_root );
            ui_text.vAlign = "top";
            ui_text.vTextAlign = "top";
            ui_text.hAlign = "left";
            ui_text.hTextAlign = "left";
            if ( i == 0 ) {
                ui_text.positionX = -250;
            } else { 
                ui_text.positionX = i * 150;
            }
            ui_text.positionY = 50;
            ui_text.value = "";
            ui_text.fontSize = 16;
            this.ui_texts.push( ui_text );
        }
        this.ui_root.visible = false;


        let ui_announcement = new UIText( ui_root_for_distance_toggle );
        ui_announcement.vAlign = "center";
        ui_announcement.vTextAlign = "center";
        ui_announcement.hAlign = "center";
        ui_announcement.hTextAlign = "center";
        ui_announcement.value = "";
        ui_announcement.fontSize = 14;
        ui_announcement.color = Color4.Yellow();
        this.ui_announcement = ui_announcement;
        


    }

    //---------------------
    displayAnnouncement( msg ,  duration, color , size, border ) {
        
        this.ui_announcement.value = msg;
        this.ui_announcement.color = color;
        this.ui_announcement.fontSize = size;
        this.ui_announcement_tick = duration * 30;
    }




    //---------
    do_bid( h , bidval ) {


        //log( "do_bid",bidval, "Player", h , this.players_deck[h]);
        if ( bidval > this.curbid ) {
            this.curbid = bidval ;
        }

        this.whose_turn = ( this.whose_turn + 1 ) % 3;
        this.clear_buttons();

        this.round_actions[h] = bidval;
        this.displayAnnouncement( this.display_names[h] + " bidded " + bidval , 3, Color4.Yellow(), 14, false );
        
        this.sounds["bid_" + bidval ].playOnce();

        
        // Bidding round continues
        this.anim_dealing = 3;
        
    }


    
    //---------
    dumb_AI_for_do_hint( h ) {

        let ret_vals = [];
        let table_pattern = this.check_pattern( this.last_discarded_vals );
        
        
        // --------- prepare stats for later use --------
        let your_stat = {}
        for ( let i = 0 ; i < this.players_deck[h].length ; i++) {
            let cardval = this.card_val( this.players_deck[h][i] );
            this.safe_incr( your_stat , cardval , 1 );
        }

        let table_stat = {}
        for ( let i = 0 ; i < this.last_discarded_vals.length ; i++) {
            let cardval = this.card_val( this.last_discarded_vals[i] );
            this.safe_incr( table_stat , cardval , 1 );
        }

        log( "AI_decide_cards_to_discard","table_pattern", table_pattern );

        // Single, Pair, Tripple, Quad
        //  21: Quad
        //  20: Single
        //  19: Pair
        //  18: Tripplet
        if ( table_pattern == 21  || table_pattern == 20 || table_pattern == 19 || table_pattern == 18) {
            
            let table_main_key = this.card_val( this.last_discarded_vals[0] );
            let your_main_key = -1;

            let card_count = 4;
            if ( table_pattern == 18 ) {
                card_count = 3;
            } else if ( table_pattern == 19 ) {
                card_count = 2;
            } else if ( table_pattern == 20 ) {
                card_count = 1;
            }
            
            for ( let i = 0 ; i < 4 ; i++) {
                for ( let key in your_stat ) {
                    // i == 0 means in the first round we match exactly card count, in the next round only we dismantle 
                    if ( ( i == 0 && your_stat[key] == card_count || i > 0 && your_stat[key] == (card_count + i) ) && parseInt(key) > table_main_key ) {
                        your_main_key = parseInt(key);
                        break;
                    }
                }
                if ( your_main_key > -1) {
                    break;
                }
            }

            if ( your_main_key > -1 ) {
                for ( let i = 0 ; i < this.players_deck[h].length ; i++ ) {
                    if ( this.card_val( this.players_deck[h][i] ) == your_main_key ) {
                        ret_vals.push( this.players_deck[h][i] );
                    }
                    if ( ret_vals.length == this.last_discarded_vals.length ) {
                        break;
                    }
                }
            } 
        

        // Sequence of 1, pair and tripplet.
        //  15: Seq of 1s
        //  14: Seq of 2s
        //  13: Seq of 3s
        //  
        } else if ( table_pattern == 15 || table_pattern == 14 || table_pattern == 13 ) {
            
            let table_keys = Object.keys( table_stat );
            this.sort_suitless( table_keys );
            let table_main_key = table_keys[ table_keys.length - 1];
            let seq_length = Object.keys( table_stat ).length;
            
            let card_count = 1;
            if ( table_pattern == 14 ) {
                card_count = 2;
            } else if ( table_pattern == 13 ) {
                card_count = 3;
            } 

            
            let your_main_key = -1;

            for ( let key in your_stat ) {
                let int_key = parseInt(key);
                let impossible = 0;
                if ( int_key > parseInt(table_main_key) ) {
                    
                    for ( let i = int_key ; i > int_key - seq_length ; i-- ) {
                        if ( your_stat[i] >= card_count  && i < 13) {
                        } else {
                            impossible = 1;
                            break;
                        }
                    }
                    if ( impossible == 0) {
                        your_main_key = int_key;
                        break;
                    }
                }
            }

            if ( your_main_key > -1 ) {
                let used = {};
                for ( let i = 0 ; i < this.players_deck[h].length ; i++ ) {
                    let cv = this.card_val( this.players_deck[h][i] );
                    this.safe_incr( used, cv , 0 );
                    if ( cv > your_main_key - seq_length && cv <= your_main_key && used[cv] < card_count ) {
                        ret_vals.push( this.players_deck[h][i] );
                        this.safe_incr( used, cv , 1 );
                    }
                }
            } 
            

        // Tripplet seq + attached
        //  17: 3 + 1
        //  16: 3,3.. + 1,1...
        //  12: 3 + 2 (5 cards)
        //   9: 3,3.. + 2,2,... (>5 cards)   
        } else if ( table_pattern == 17 || table_pattern == 16 || table_pattern == 12 || table_pattern == 9 ) {
            
            let table_main_key = -1;
            let table_tripplet_count = 0;
            let table_pair_count = 0;
            let table_single_count = 0;
            for ( let key in table_stat ) {
                let int_key = parseInt( key );
                if ( table_stat[key] == 3 ) {
                    if ( int_key > table_main_key ) {
                        table_main_key = int_key;
                    }
                    table_tripplet_count += 1;
                } else if ( table_stat[key] == 2 ) {
                    table_pair_count += 1;
                } else if ( table_stat[key] == 1 ) {
                    table_single_count += 1;
                }
            }
            
            let seq_length = table_tripplet_count;
            let your_main_key = -1;
            let your_secondary_keys = [];
            let card_count = 3;

            
            for ( let key in your_stat ) {

                let int_key = parseInt(key);
                let impossible = 0;
                if ( int_key > table_main_key ) {
                    
                    for ( let i = int_key ; i > int_key - seq_length ; i-- ) {
                        if ( your_stat[i] >= card_count  && i < 13) {
                        } else {
                            impossible = 1;
                            break;
                        }
                    }
                    if ( impossible == 0 && your_main_key == -1) {
                        your_main_key = int_key;
                    }
                }


                if ( your_stat[key] == 2 && table_pair_count > 0 && your_secondary_keys.length < table_pair_count ) {
                    // Exact match first, if cannot find then next round only dismantle
                    your_secondary_keys.push( int_key );

                } else if ( your_stat[key] == 1 && table_single_count > 0  && your_secondary_keys.length < table_single_count ) {
                    // Exact match first, if cannot find then next round only dismantle
                    your_secondary_keys.push( int_key );                    
                }
            }

            let your_secondary_keys_len_required = table_single_count || table_pair_count;
            
            // Exact match cannot ...so any >
            for ( let i = 0 ; i < 4 ; i++) {
                if ( your_secondary_keys.length < your_secondary_keys_len_required ) {
                    for ( let key in your_stat ) {
                        let int_key = parseInt(key);
                        if ( your_stat[key] >= 2 && your_stat[key] < 3 && table_pair_count > 0 && your_secondary_keys.length < table_pair_count && your_secondary_keys.indexOf(int_key) == -1 ) {
                            // Exact match first, if cannot find then next round only dismantle
                            your_secondary_keys.push( int_key );
        
                        } else if ( your_stat[key] >= 1 && your_stat[key] < 3 && table_single_count > 0  && your_secondary_keys.length < table_single_count && your_secondary_keys.indexOf(int_key) == -1 ) {
                            // Exact match first, if cannot find then next round only dismantle
                            your_secondary_keys.push( int_key );                    
                        }
                    }
                } else {
                    break;
                }
            }

            if ( your_main_key > -1  && your_secondary_keys.length >= your_secondary_keys_len_required ) {
                
                let used = {};
                for ( let i = 0 ; i < this.players_deck[h].length ; i++ ) {
                
                    let cv = this.card_val( this.players_deck[h][i] );
                    this.safe_incr( used, cv , 0 );
                    if ( cv > your_main_key - seq_length && cv <= your_main_key && used[cv] < card_count ) {
                        ret_vals.push( this.players_deck[h][i] );
                        this.safe_incr( used, cv , 1 );
                    } else if ( your_secondary_keys.indexOf(cv) > -1 && table_single_count > 0 && used[cv] < 1 ) {
                        ret_vals.push( this.players_deck[h][i] );
                        this.safe_incr( used, cv , 1 );
                    } else if ( your_secondary_keys.indexOf(cv) > -1 && table_pair_count > 0 && used[cv] < 2 ) {
                        ret_vals.push( this.players_deck[h][i] );
                        this.safe_incr( used, cv , 1 );
                    }
                }
            } 
    
        // Quad + attached
        //  11: 4 + 1,1
        //  10: 4 + 2,2...
        } else if ( table_pattern == 11 || table_pattern == 10 ) {

            let table_main_key = -1;
            let table_pair_count = 0;
            let table_single_count = 0;
            
            for ( let key in table_stat ) {
                let int_key = parseInt( key );
                if ( table_stat[key] == 4 ) {
                    table_main_key = int_key;
                } else if ( table_stat[key] == 2 ) {
                    table_pair_count += 1;
                } else if ( table_stat[key] == 1 ) {
                    table_single_count += 1;
                }
            }


            let your_main_key = -1;
            let your_secondary_keys = [];


            for ( let key in your_stat ) {
                let int_key = parseInt(key);
                if ( int_key > table_main_key && your_stat[key] == 4 ) {
                    your_main_key = int_key;
                    break;
                }
                if ( your_stat[key] == 2 && table_pair_count > 0 && your_secondary_keys.length < table_pair_count ) {
                    // Exact match first, if cannot find then next round only dismantle
                    your_secondary_keys.push( int_key );

                } else if ( your_stat[key] == 1 && table_single_count > 0  && your_secondary_keys.length < table_single_count ) {
                    // Exact match first, if cannot find then next round only dismantle
                    your_secondary_keys.push( int_key );                    
                }
            }

            // Exact match cannot ...so any >
            for ( let i = 0 ; i < 4 ; i++) {
                if ( your_secondary_keys.length < 2 ) {
                    for ( let key in your_stat ) {
                        let int_key = parseInt(key);
                        if ( your_stat[key] >= 2 && your_stat[key] < 4 && table_pair_count > 0 && your_secondary_keys.length < table_pair_count && your_secondary_keys.indexOf(int_key) == -1 ) {
                            // Exact match first, if cannot find then next round only dismantle
                            your_secondary_keys.push( int_key );
        
                        } else if ( your_stat[key] >= 1 && your_stat[key] < 4 && table_single_count > 0  && your_secondary_keys.length < table_single_count && your_secondary_keys.indexOf(int_key) == -1 ) {
                            // Exact match first, if cannot find then next round only dismantle
                            your_secondary_keys.push( int_key );                    
                        }
                    }
                } else {
                    break;
                }
            }

            if ( your_main_key > -1  && your_secondary_keys.length >= 2 ) {
                
                let used = {};
                for ( let i = 0 ; i < this.players_deck[h].length ; i++ ) {
                
                    let cv = this.card_val( this.players_deck[h][i] );
                    this.safe_incr( used, cv , 0 );
                    if ( cv == your_main_key && used[cv] < 4 ) {
                        ret_vals.push( this.players_deck[h][i] );
                        this.safe_incr( used, cv , 1 );
                    } else if ( your_secondary_keys.indexOf(cv) > -1 && table_single_count > 0 && used[cv] < 1 ) {
                        ret_vals.push( this.players_deck[h][i] );
                        this.safe_incr( used, cv , 1 );
                    } else if ( your_secondary_keys.indexOf(cv) > -1 && table_pair_count > 0 && used[cv] < 2 ) {
                        ret_vals.push( this.players_deck[h][i] );
                        this.safe_incr( used, cv , 1 );
                    }
                }
            } 
        }

        // Check Pattern regardless combo .i.e Rocket and Bombs
        if ( ret_vals.length == 0 ) {

            if ( table_pattern < 21 ) {

                let your_main_key = -1;
                for ( let key in your_stat ) {
                    let int_key = parseInt(key);
                    if ( your_stat[key] == 4 ) {
                        your_main_key = int_key;
                        break;
                    }
                }
                if ( your_main_key > -1) {
                    for ( let i = 0 ; i < this.players_deck[h].length ; i++ ) {
                        if ( this.card_val( this.players_deck[h][i] ) == your_main_key ) {
                            ret_vals.push( this.players_deck[h][i] );
                        }
                    }   
                }
            }
            

            // Extreme last resort to use Rocket.
            if ( ret_vals.length == 0 ) {
                if ( your_stat[14] == 1 && your_stat[15] == 1 ) {
                    for ( let i = 0 ; i < this.players_deck[h].length ; i++ ) {
                        let cv = this.card_val( this.players_deck[h][i] );
                        if ( cv >= 14 ) {
                            ret_vals.push( this.players_deck[h][i] );
                        }
                    }
                }
            }
        }

        // The vals of selected cards in array
        return ret_vals;
    }

    //-------------
    dumb_AI_for_lead_round( h ) {
        
        let ret_vals = [];

        let your_stat = {}
        for ( let i = 0 ; i < this.players_deck[h].length ; i++) {
            let cardval = this.card_val( this.players_deck[h][i] );
            this.safe_incr( your_stat , cardval , 1 );
        }

        for ( let key in your_stat ) {
            
            let int_key = parseInt(key);
            let seq_1_length = 1;
            let seq_2_length = 0;
            let seq_3_length = 0;

            if ( your_stat[int_key] >= 3 ) {
                seq_3_length = 1;
            }
            if ( your_stat[int_key] >= 2 ) {
                seq_2_length = 1;
            }

            if ( seq_3_length == 1 ) {
                for ( let i = 1 ; i < this.players_deck[h].length ; i++ ) {
                    if ( your_stat[ int_key + i ] >= 3 && (int_key + i) < 13 ) {
                        seq_3_length += 1;
                    } else {
                        break;
                    }
                }
            }
            
            if ( seq_2_length == 1 ) {
                for ( let i = 1 ; i < this.players_deck[h].length ; i++ ) {
                    if ( your_stat[ int_key + i ] >= 2 && (int_key + i) < 13 ) {
                        seq_2_length += 1;
                    } else {
                        break;
                    }
                }
            }
                
            for ( let i = 1 ; i < this.players_deck[h].length ; i++ ) {
                if ( your_stat[ int_key + i ] >= 1 && (int_key + i) < 13 ) {
                    seq_1_length += 1;
                } else {
                    break;
                }
            }




            if ( seq_3_length > 0 ) {

                // Check can do airplane or not.. 
                let attached_pairs = [];
                let attached_singles = [];
                let single_count = 0;
                let pair_count = 0;

                for ( let key2 in your_stat ) {
                    let int_key2 = parseInt(key2);
                    if ( your_stat[key2] == 2 && int_key2 < 13 && attached_pairs.length < seq_3_length) {
                        pair_count += 1;
                        attached_pairs.push( int_key2 );

                    } else if ( your_stat[key2] == 1 && int_key2 < 13 && attached_singles.length < seq_3_length ) {
                        single_count += 1;
                        attached_singles.push( int_key2 );
                    }
                }

                let attach_pair_or_single = 0;
                
                if ( single_count >= seq_3_length ) {
                    // Get rid of singles first
                    attach_pair_or_single = 1;

                } else if ( single_count >= seq_3_length - 1 && seq_3_length >= 2 ) {

                    attach_pair_or_single = 1;
                    seq_3_length -= 1;

                } else if ( single_count >= seq_3_length - 2 && seq_3_length >= 3 ) {

                    attach_pair_or_single = 1;
                    seq_3_length -= 2;
                
                } else if ( single_count >= seq_3_length - 4 && seq_3_length >= 4 ) {

                    attach_pair_or_single = 1;
                    seq_3_length -= 3;

                } else if ( pair_count >= seq_3_length ) {
                    // Then pairs
                    attach_pair_or_single = 2;

                } else if ( pair_count >= seq_3_length - 1 && seq_3_length >= 2 ) {
                    // Then pairs
                    attach_pair_or_single = 2;
                    seq_3_length -= 1;
                } else if ( pair_count >= seq_3_length - 2 && seq_3_length >= 3 ) {
                    // Then pairs
                    attach_pair_or_single = 2;
                    seq_3_length -= 2;
                } else if ( pair_count >= seq_3_length - 3 && seq_3_length >= 4 ) {
                    // Then pairs
                    attach_pair_or_single = 2;
                    seq_3_length -= 3;
    
                }
                

                let used = {};
                for ( let i = 0 ; i < this.players_deck[h].length ; i++ ) {
                
                    let cv = this.card_val( this.players_deck[h][i] );
                    this.safe_incr( used, cv , 0 );
                    if ( cv >= int_key  && cv <= int_key + seq_3_length - 1 && used[cv] < 3 ) {
                        ret_vals.push( this.players_deck[h][i] );
                        this.safe_incr( used, cv , 1 );
                    } else if ( attached_singles.indexOf(cv) > -1 && attach_pair_or_single == 1 && used[cv] < 1 ) {
                        ret_vals.push( this.players_deck[h][i] );
                        this.safe_incr( used, cv , 1 );
                    } else if ( attached_pairs.indexOf(cv) > -1 && attach_pair_or_single == 2 && used[cv] < 2 ) {
                        ret_vals.push( this.players_deck[h][i] );
                        this.safe_incr( used, cv , 1 );
                    }
                }
                // Airplane or sequence_tripplet, doesn't matter will do it.
                break;
            
            
            } else if ( seq_2_length >= 3 ) {
                
                let used = {};
                for ( let i = 0 ; i < this.players_deck[h].length ; i++ ) {
                    let cv = this.card_val( this.players_deck[h][i] );
                    this.safe_incr( used, cv , 0 );
                    if ( cv >= int_key  && cv <= int_key + seq_2_length - 1 && used[cv] < 2 ) {
                        ret_vals.push( this.players_deck[h][i] );
                        this.safe_incr( used, cv , 1 );
                    }
                }
                break;

            } else if ( seq_1_length >= 5 ) {

                let used = {};
                for ( let i = 0 ; i < this.players_deck[h].length ; i++ ) {
                    let cv = this.card_val( this.players_deck[h][i] );
                    this.safe_incr( used, cv , 0 );
                    if ( cv >= int_key  && cv <= int_key + seq_1_length - 1 && used[cv] < 1 ) {
                        ret_vals.push( this.players_deck[h][i] );
                        this.safe_incr( used, cv , 1 );
                    }
                }
                break;
            }


            //console.log( this.translate2(key), "seq_1_length", seq_1_length , "seq_2_length", seq_2_length , "seq_3_length", seq_3_length);
        }

        if ( ret_vals.length == 0 ) {
            for ( let key in your_stat ) {
                let int_key = parseInt(key);
                if ( your_stat[key] == 2 && int_key < 13 ) {

                    let used = {};
                    for ( let i = 0 ; i < this.players_deck[h].length ; i++ ) {
                        let cv = this.card_val( this.players_deck[h][i] );
                        this.safe_incr( used, cv , 0 );
                        if ( cv == int_key && used[cv] < 2 ) {
                            ret_vals.push( this.players_deck[h][i] );
                            this.safe_incr( used, cv , 1 );
                        }
                    }
                    break;
                }
            }
        }


        if ( ret_vals.length == 0 ) {
            for ( let key in your_stat ) {
                let int_key = parseInt(key);
                if ( your_stat[key] == 1  ) {
                    for ( let i = 0 ; i < this.players_deck[h].length ; i++ ) {
                        let cv = this.card_val( this.players_deck[h][i] );
                        if ( cv == int_key  ) {
                            ret_vals.push( this.players_deck[h][i] );
                            break;
                        }
                    }
                    break;
                }
            }
        }

        // Super last resort
        if ( ret_vals.length == 0 ) {
            ret_vals.push( this.players_deck[h][0] );
        }

        return ret_vals;
    }
    
    

    //-------
    do_hint( h ) {
        
        let ret = 0;
        this.unselect_all( h );
        let ai_selected_vals = this.dumb_AI_for_do_hint( h )
        
        if ( ai_selected_vals.length == 0 ) {
            this.do_pass( h ) ;
            ret = 0;

        } else {
            for ( let i = 0 ; i < ai_selected_vals.length ; i++ ) {
                let val = ai_selected_vals[i];
                let idx = this.players_deck[h].indexOf( val );
                this.shared_piece_onclick( h , idx);
            }
            ret = 1;
            
            // Extra stuffs to make AI a little bit smarter by not sabotaging team mate.            
            if ( ai_selected_vals.length <= 2 ) {
                // Either single or pair 
                if ( this.card_val( ai_selected_vals[0] ) >= 14 ) {
                    // If jokers are involved.
                    ret = 3;
                } else if ( this.card_val( ai_selected_vals[0] ) == 13 ) {
                    ret = 2;
                }
            } else if ( ai_selected_vals.length == 4 ) {
                ret = 4;
            }
            log("do_hint", "hand", this.players_deck[h], "ai_selected", ai_selected_vals);

        }
        return ret;

    }

  


    //------
    do_pass( h ) {

        this.displayAnnouncement( this.display_names[h] + " passed " , 5, Color4.Yellow(), 14, false );

        this.unselect_all( h );

        this.round_actions[ this.whose_turn ] = 4;
        this.togglePointer( this.whose_turn , 0 );
        this.whose_turn = (this.whose_turn + 1) % 3;
        this.anim_dealing = 6;

        let rand = (Math.random() * 2) >> 0;
        this.sounds["passed_" + rand  ].playOnce();
        this.clear_buttons();


    }


    //-------
    do_submit( h  ) {

        let selected_vals = [];
        let selected_indices = [];

        for ( let i = 0 ; i < this.players_concealed_ent[h].length ; i++ ) {
            if  ( this.players_concealed_ent[h][i]["selected"] == 1 ) {
                selected_vals.push(  this.players_deck[h][i] );
                selected_indices.push( i );
            }
        }
        log("Selected vals are: ", selected_vals );

        let pattern = this.check_pattern( selected_vals );
        if ( pattern  > -1 ) {
            
            if ( this.compare_pattern( selected_vals , this.last_discarded_vals ) > 0  ) {
                
                if ( pattern == 22 || pattern == 21 ) {
                    this.bomb_or_rocket += 1;
                }

                for ( let i = selected_indices.length - 1 ; i >= 0 ; i-- ) {

                    let players_concealed_ent_index = selected_indices[i];
                    let val = selected_vals[i];

                    let mpiece = this.players_concealed_ent[h][players_concealed_ent_index];
                    mpiece["selected"] = 0;

                    this.players_deck[ h ].splice(          players_concealed_ent_index , 1 );
                    this.players_concealed_ent[ h ].splice( players_concealed_ent_index , 1 );
                    
                    this.players_discarded_ent[ h ].push( mpiece );
                    this.discarded_deck[h].push( val );
                    
                    mpiece.getComponent(Transform).position.x = this.players_discarded_pos[ h ][ i ].x;
                    mpiece.getComponent(Transform).position.y = this.players_discarded_pos[ h ][ i ].y;
                    mpiece.getComponent(Transform).position.z = this.players_discarded_pos[ h ][ i ].z;

                    mpiece.getComponent(Transform).rotation.eulerAngles = new Vector3( 90 , [ 0, -90, 90 ][ h ], 0);

                    
                }

                this.play_sound( pattern , selected_vals );

                this.clear_buttons();
                this.clear_round_actions();

                if ( this.players_deck[h].length == 0 ) {
                    this.do_win(); 
                } else {

                    this.last_discarded_vals = selected_vals;
                    this.last_discarded_side = this.whose_turn;

                    this.togglePointer( this.whose_turn , 0 );
                    this.whose_turn = (this.whose_turn + 1) % 3;
                    this.anim_dealing = 6;
                }
            } else {
                this.displayAnnouncement( "You need to play higher combination of same type.", 3, Color4.Yellow(), 14, false );
            }
        } else {
            this.displayAnnouncement( "Invalid Combination", 3, Color4.Yellow(), 14, false );
        }
    }



    //----
    do_win( ) {
        
        let action_owner = this.whose_turn;
        this.clear_buttons();
        
        this.whose_turn = -1;
        this.gameover = 1;
        
        let str = [];
        str[0] = "Winner is : " + this.display_names[  action_owner  ] + (( this.landlord == action_owner ) ? "(Landlord)":"(Farmer)") + "\n\n"
        str[1] = "\n\n"
        str[2] = "\n\n"
        
        let base = this.curbid;


        str[0] += "\nBase Point:";
        str[1] += "\n" + this.curbid
        str[2] += "\n";
        
        str[0] += "\nBombs or Rocket used:";
        str[1] += "\n" + this.bomb_or_rocket
        str[2] += "\n";
        
        str[0] += "\nMultiplier:";
        str[1] += "\n" + ( 1 << this.bomb_or_rocket ) 
        str[2] += "\n";
        
        let total = this.curbid * ( 1 << this.bomb_or_rocket );
        
        str[0] += "\n\nTotal:";
        str[1] += "\n\n" + total
        str[2] += "\n\n";
        
        
        str[0] += "\n\n\nPlayer\n"
        str[1] += "\n\n\nRound Score\n"
        str[2] += "\n\n\nFinal Score\n"

        for ( let i = 0 ; i < 3 ; i++) {
            str[i] += "---------\n";
        }
        for ( let h = 0 ; h < 3 ; h++ ) {

            let is_winner = 0;
            if ( action_owner == this.landlord && h == this.landlord) {
                is_winner = 1;
            } else if ( action_owner != this.landlord && h != this.landlord ) {
                is_winner = 1;
            }

            if ( is_winner == 1 ) {
                // Winner
                if ( this.landlord == h ) {
                    this.final_scores[h] += total * 2;
                    str[1] +=  ( total * 2 )  + "\n"
                } else {
                    this.final_scores[h] += total;
                    str[1] +=  ( total )  + "\n"
                }
            } else {     
                // Losers        
                if ( this.landlord == h ) {    
                    this.final_scores[h] -= total * 2;
                    str[1] +=  "-" + ( total * 2 )  + "\n"
                } else {
                    this.final_scores[h] -= total;
                    str[1] +=  "-" + ( total )  + "\n"
                }
            }
            
            str[0] +=  this.display_names[h] + " " + (( this.landlord == h ) ? "(Landlord)":"(Farmer)") + "\n"
            str[2] +=  this.final_scores[h] + "\n"                
        }

        for ( let i = 0 ; i < 3 ; i++) {
            this.ui_texts[i].value = str[i];
        }

        this.sounds["iwin"].playOnce();
        this.show_hand();

        this.ui_root.visible = true;
        this.stage.on_score_updated( this.final_scores , this.game_mode , this.round , "doudizhu" );
        this.buttons["deal"].show();
    
    }




    //-----------
    init_deck() {

        this.deck.length = 0;
        for ( let i = 0 ; i < 54 ; i++ ) {
            this.deck.push( i );
        }
        this.shuffleArray( this.deck );
        
        
    }
    
    //--------------
    init_entities() {

        this.addComponent( new Transform({
            position: new Vector3(8, 1.05 ,8),
            scale: new Vector3(0.08 , 0.08, 0.08 )
        }))

        

        this.createMaterials();
        this.createButtons();
        this.createUI();
        
        // Not lazy load for vs AI in constructor
        if ( this.cards_entity_created == 0 && this.game_mode == 0 ) {
            this.createCardPieces();
            this.cards_entity_created = 1;
        }
    }

    //-----
    async init_names() {
        
        if (!this.userData) {
            await this.setUserData()
        }	

        this.display_names[0] = this.userData.displayName;
        this.display_names[1] = "Bot_Becky#0002"
        this.display_names[2] = "Bot_Charlie#0003"

        /*
        this.curbid = 2;
        this.bomb_or_rocket =3;
        this.landlord = 1;
        this.whose_turn = 1;
        this.do_win();
        */
        
    }


    //---------
    init_positions() {

        // - + + - 
        // - - + +
        // + 0 - 0
        // 0 + 0 -
        
        let xs_concealed        = [  -6.5, 14.5,    -14.5 ];
        let zs_concealed        = [ -14.5, -6.5,     6.5 ];

        let xdeltas_concealed   = [   0.8,    0,     0  ];
        let zdeltas_concealed   = [     0,  0.8,    -0.8  ];
        
        let xs_discarded        = [    -4,    6,       -6  ];
        let zs_discarded        = [    -6,   -4,        4  ];

        let xdeltas_discarded   = [   0.8,  1.5,      -1.5  ];
        let zdeltas_discarded   = [  -1.5,  0.8,      -0.8  ];
        
        
        for ( let h = 0 ; h < 3 ; h++) {

            // The concealed pos
            for ( let i = 0 ; i < 20 ; i++) {

                let x = xs_concealed[h] + i * xdeltas_concealed[h]; 
                let y = i * 0.001 ;
                let z = zs_concealed[h] + i * zdeltas_concealed[h];
                this.players_concealed_pos[h].push(  new Vector3( x,y,z ) );
            }
            
            // The discarded pos
            for ( let i = 0 ; i < 20 ; i++ ) {

                let x;
                let y = i * 0.001;
                let z;
                
                if ( h == 0) {
                    x = xs_discarded[h] + (i % 20 ) * xdeltas_discarded[h];
                    z = zs_discarded[h] + ( (i / 20 ) >> 0 ) * zdeltas_discarded[h];
                } else {
                    x = xs_discarded[h] + ((i / 20) >> 0 ) * xdeltas_discarded[h] ;
                    z = zs_discarded[h] +  (i % 20) * zdeltas_discarded[h] ;
                }
                this.players_discarded_pos[h].push(  new Vector3( x,y,z ) );

            }
            
        }
    }

    //---------------
    init_sounds() {
        this.sounds = this.stage.sounds;

    }

    //-----------------
    new_round( ) {

        if ( this.cards_entity_created == 0 ) {
            this.createCardPieces();
            this.cards_entity_created = 1;
        }
        
        this.init_deck();
        this.clear_deck();
        this.clear_round_actions();
        this.last_discarded_vals.length = 0;
        this.last_discarded_side = -1;


        this.ui_network_msg.value = "";
        

        
        this.gameover = 0;
        this.curbid = 0;
        this.bomb_or_rocket = 0;
        
        if ( this.game_mode == 1 ) {
            // Wait for server. Server is waiting for 4 ppl to click play.
            this.displayAnnouncement( "Please wait for others to click play...", 5, Color4.Yellow(), 14, false );
            //this.colyseus_transaction.length = 0;
            //this.colyseus_room.send("new_round_ready");

        } else {


            // Insert card into players deck from the public deck.
            for ( let h = 0 ; h < 3 ; h++) {
                for ( let i = 0 ; i < 17 ; i++ ) {
                    this.players_deck[h].push( this.deck.shift() );
                }
            }
            this.sounds["cardshuffle"].playOnce();
            this.anim_dealing = 1;
            this.round += 1;
            // Wait until animation of dealing is done..then we proceed.
        }

            
    }


    //---------------------
    // AI function 1:  Decide what to do based on doaction.
    NPC_decide_pre_round_bid( h  ) {

        this.sort_player_tile( this.whose_turn ); 

        let remaining_choice = 3 - this.curbid + 1;
        let rand_decision = ( Math.random() * remaining_choice ) >> 0;
        
        if ( rand_decision == 0 ) {
            this.do_bid( h , 0);   
        } else {
            this.do_bid( h, rand_decision + this.curbid );
        }
    }

    //-------------------
    NPC_decide_discard( h ) {

        if ( this.last_discarded_vals.length == 0 ) {
            
            // Leader
            this.unselect_all( h );
            let ai_selected_vals = this.dumb_AI_for_lead_round( h )
            for ( let i = 0 ; i < ai_selected_vals.length ; i++ ) {
                let val = ai_selected_vals[i];
                let idx = this.players_deck[h].indexOf( val );
                this.shared_piece_onclick( h , idx);
            }
            this.do_submit(h);
        
        } else {
            // Defen
            let do_pass_regardless = 0;
            let ret = this.do_hint(h);

            if ( ret > 0 ) {
                if ( this.last_discarded_side != this.landlord && h != this.landlord ) {
                    // Last discarded is from team mate. Try not to sabotage.
                    if ( ret == 1) {
                        this.do_submit(h);
                    } else {
                        this.do_pass(h);
                    }
                } else {
                    this.do_submit(h);
                }

                
            }
        }
    }
    

    //---------
    shared_piece_onclick( owner , players_concealed_ent_index ) {
        
        let mpiece = this.players_concealed_ent[ owner ][ players_concealed_ent_index ];
        if ( mpiece["selected"] == 1 ) {
            mpiece["selected"] = 0;
        } else {
            mpiece["selected"] = 1;
        }
        
        if ( players_concealed_ent_index > -1 ) {
            if ( mpiece["selected"] == 1  ) {
                if ( owner == 0 ) {
                    mpiece.getComponent( Transform ).position.z = this.players_concealed_pos[owner][ players_concealed_ent_index ].z + 0.5;
                } else if ( owner == 1 ) {
                    mpiece.getComponent( Transform ).position.x = this.players_concealed_pos[owner][ players_concealed_ent_index ].x - 0.5;
                } else if ( owner == 2 ) {
                    mpiece.getComponent( Transform ).position.x = this.players_concealed_pos[owner][ players_concealed_ent_index ].x + 0.5;
                }
            } else {
                if ( owner == 0 ) {
                    mpiece.getComponent( Transform ).position.z = this.players_concealed_pos[owner][ players_concealed_ent_index ].z ;
                } else if ( owner == 1 ) {
                    mpiece.getComponent( Transform ).position.x = this.players_concealed_pos[owner][ players_concealed_ent_index ].x ;
                } else if ( owner == 2 ) {
                    mpiece.getComponent( Transform ).position.x = this.players_concealed_pos[owner][ players_concealed_ent_index ].x ;
                }
            }
        }
    }

    //----
    unselect_all( owner ) {

        for ( let i = 0 ; i < this.players_concealed_ent[owner].length ; i++ ) {
            let mpiece = this.players_concealed_ent[owner][i];
            mpiece["selected"] = 0;
            if ( owner == 0 ) {
                mpiece.getComponent( Transform ).position.z = this.players_concealed_pos[owner][ i ].z ;
            } else if ( owner == 1 ) {
                mpiece.getComponent( Transform ).position.x = this.players_concealed_pos[owner][ i ].x ;
            } else if ( owner == 2 ) {
                mpiece.getComponent( Transform ).position.x = this.players_concealed_pos[owner][ i ].x ;
            }
        }
    }



    //----
    piece_onclick(e) {

        if ( e.buttonId == 1  || e.buttonId == 0 ) {

            let mpiece = engine.entities[e.hit.entityId];
            let mpiece_id = mpiece["id"];
            let owner     = this.whose_turn;
            let players_concealed_ent_index = -1;

            for ( let i = 0 ; i < this.players_concealed_ent[owner].length ; i++ ) {
                if (this.players_concealed_ent[owner][i]["id"] == mpiece_id ) {
                    players_concealed_ent_index = i;
                    break;
                }
            }
            this.shared_piece_onclick( owner , players_concealed_ent_index );
        }
    }






    //-----
    play_round_procedure() {
        
        log("play_round_procedure");

        
        if ( 
            this.round_actions[(this.whose_turn + 1) % 3] == 4 && 
            this.round_actions[(this.whose_turn + 2) % 3] == 4  
        ) {
            // If both have passed. 
            this.last_discarded_vals.length = 0;
            this.last_discarded_side = -1;

        }

        if ( this.last_discarded_vals.length == 0 ) {
            this.displayAnnouncement( this.display_names[this.whose_turn] + "'s Turn. (Round Leader)", 10, Color4.Yellow(), 14, false );
        } else {
            this.displayAnnouncement( this.display_names[this.whose_turn] + "'s Turn.", 10, Color4.Yellow(), 14, false );
        }

        let discarded_last = this.players_discarded_ent[this.whose_turn].length ;
        let discarded_first = discarded_last - 20;
        if ( discarded_first < 0 ) {
            discarded_first = 0;
        }
        for ( let i = discarded_first ; i < discarded_last ; i++) {
            this.players_discarded_ent[ this.whose_turn ][i].getComponent(Transform).position.y = -500;
        }

        this.sort_player_tile( this.whose_turn ); 

        if ( this.whose_turn == this.my_seat_id ) {

            this.sort_player_tile( this.whose_turn ); 
            this.render_play_round_buttons();
            this.togglePointer( this.whose_turn , 1 );
            this.sounds["turnstart"].playOnce();

        } else {
            this.anim_dealing = 8;
            
        }
    }   


    //--------
    play_sound( pattern , selected_val ){

        if ( pattern == 22 ) {
            this.sounds["pair_15"].playOnce();
            this.sounds["firework"].playOnce();
            
        } else if ( pattern == 21 ) {
            this.sounds["quad_0"].playOnce();
            this.sounds["explosion"].playOnce();
            

        } else if ( pattern == 20 ) {
            
            let val = this.card_val( selected_val[0])
            if ( val < 13 ) {
                this.sounds["single_" + (val+2) ].playOnce();
            } else if ( val == 13 ) {
                this.sounds["single_2"].playOnce();
            } else if ( val >= 14) {
                this.sounds["single_" + (val+1)].playOnce();
            }
        } else if ( pattern == 19 ) {
            let val = this.card_val( selected_val[0])
            if ( val < 13 ) {
                this.sounds["pair_" + (val+2) ].playOnce();
            } else if ( val == 13 ) {
                this.sounds["pair_2"].playOnce();
            } else if ( val >= 14) {
                this.sounds["pair_15"].playOnce();
            }

        } else if ( pattern <= 18 && this.last_discarded_vals.length > 0 ) {
            this.sounds["greater"].playOnce();
            
        } else if ( pattern == 18 ) {
            this.sounds["tripplet_0"].playOnce();
        } else if ( pattern == 17) {
            this.sounds["tripplet_1"].playOnce();
        } else if ( pattern == 16) {
            this.sounds["tripplet_3"].playOnce();

        } else if ( pattern == 15 ) {
            this.sounds["straight_0"].playOnce();
        } else if ( pattern == 14 ) {
            this.sounds["straight_1"].playOnce();
        } else if ( pattern == 13 ) {
            this.sounds["straight_2"].playOnce();
        } else if ( pattern == 12 ) {
            this.sounds["tripplet_2"].playOnce();
        } else if ( pattern == 9 ) {
            this.sounds["tripplet_3"].playOnce();
        } else if ( pattern == 11 ) {
            this.sounds["quad_1"].playOnce();

        } else if ( pattern == 12 ) {
            this.sounds["quad_2"].playOnce();
        }

    }

     //-------
     render_play_round_buttons() {

        this.clear_buttons();
        
        if ( this.last_discarded_vals.length > 0 ) {
            this.buttons[ "pass" ].show();  
            this.buttons[ "pass" ].getComponent(Transform).position.y = 0;
            this.buttons[ "hint" ].show();  
            this.buttons[ "hint" ].getComponent(Transform).position.y = 1.65;
        }
        this.buttons[ "submit" ].show();  
        this.buttons[ "submit" ].getComponent(Transform).position.y = 2 * 1.65;
        

    }
    //-------
    render_pre_round_bid_buttons() {

        this.clear_buttons();
        this.sort_player_tile( this.whose_turn ); 


        this.buttons[ "bid_0" ].show();  
        this.buttons[ "bid_0" ].getComponent(Transform).position.y = 0;

        // Of all the doable actions, only render where owner is player 0.
        let ii = 1;
        for ( let i = this.curbid + 1 ; i <= 3 ; i++ ) {
            this.buttons[ "bid_" + i ].show();  
            this.buttons[ "bid_" + i  ].getComponent(Transform).position.y = ii * 1.65;
            ii += 1;
        }
        
    }


    //------
    return_ents_to_walls() {
        
        // Return all piece entities to wall
        for ( let h = 0 ; h < 3 ; h++) {
            for ( let i = this.players_discarded_ent[h].length - 1 ; i >= 0 ; i-- ) {
                this.wall_pieces_ent.push( this.players_discarded_ent[h].pop() );
            }
            for ( let i = this.players_concealed_ent[h].length -1 ; i >= 0 ; i-- ) {
                this.wall_pieces_ent.push( this.players_concealed_ent[h].pop() );
            }
        }
        for ( let i = 0 ; i < this.wall_pieces_ent.length ; i++ ) {

            this.wall_pieces_ent[i]["selected"] = 0;
            this.wall_pieces_ent[i].getComponent(Transform).position.x = this.wall_pieces_pos[i][0].x;
            this.wall_pieces_ent[i].getComponent(Transform).position.y = this.wall_pieces_pos[i][0].y;
            this.wall_pieces_ent[i].getComponent(Transform).position.z = this.wall_pieces_pos[i][0].z;
            this.wall_pieces_ent[i].getComponent(Transform).rotation.eulerAngles = new Vector3( -90 ,  0  ,0 );
            
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
    setFaceVal( entity , val  ) {
        
        let frame_x = val % 13;
        let frame_y = 4 - ( (val / 13) >> 0 );
        let backframe_x = 2;
        let backframe_y = 0;
        
        entity.getComponent( PlaneShape ).uvs = [

            
            (backframe_x + 1)/13.0      , backframe_y/5.0,
            (backframe_x)/13.0          , backframe_y/5.0,
            (backframe_x)/13.0          , (backframe_y+1)/5.0,
            (backframe_x + 1)/13.0      , (backframe_y+1)/5.0,
            
            (frame_x + 1 )/13.0     , frame_y/5.0,
            (frame_x )/13.0         , frame_y/5.0,
            (frame_x )/13.0         , (frame_y+1)/5.0,
            (frame_x + 1)/13.0      , (frame_y+1)/5.0,
            
        ]
        
    }

    //---------------
    async setUserData() {
        const data = await getUserData()
        this.userData = data
    }

    //---------
    show_hand() {
        for ( let h = 0 ; h < 3; h++ ) {
            for ( let i = 0 ; i <  this.players_concealed_ent[h].length ; i++) {
               let mpiece = this.players_concealed_ent[h][i];
               mpiece.getComponent(Transform).rotation.eulerAngles = new Vector3( 90, [ 0, -90, 90 ][ h ], 0 ) ;
            }
        }
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



    //----------
    sort_player_tile( player_h ) {

        log( "Sort Player tile", player_h , "player_deck.length", this.players_deck[player_h].length, "ent.length", this.players_concealed_ent[player_h].length );

        this.players_deck[player_h].sort(function(a, b) {
            if ( a < 52) {
                a = a % 13;
            }
            if ( a == 0 ) {
                a = 13;
            } 
            if ( b < 52 ) {
                b = b % 13;
            }
            if ( b == 0 ) {
                b = 13;
            }
            
            return b - a;
        });

        for ( let i = 0 ; i < this.players_concealed_ent[player_h].length ; i++ ) {
            
            let mpiece = this.players_concealed_ent[player_h][i];
            let val    = this.players_deck[player_h][i];
            mpiece.getComponent(Transform).position.x = this.players_concealed_pos[player_h][i].x;
            mpiece.getComponent(Transform).position.y = i * 0.001;
            mpiece.getComponent(Transform).position.z = this.players_concealed_pos[player_h][i].z;
            
            if ( player_h == this.my_seat_id ) {
                mpiece.getComponent(Transform).rotation.eulerAngles = new Vector3( 90 , [ 0, -90, 90 ][ player_h ] , 0 );
            } else {
                mpiece.getComponent(Transform).rotation.eulerAngles = new Vector3( -90 , [ 0, -90, 90 ][ player_h ], 0 );
            }

            this.setFaceVal( mpiece , val  );
            
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

        if ( id.substr(0,3) == "bid") {
            this.do_bid( this.whose_turn , parseInt( id.substr(4,1) ) );
        
        } else if ( id == "submit") {
            this.do_submit( this.whose_turn );
        
        } else if ( id == "pass" ) {
            this.do_pass( this.whose_turn );
        
        } else if ( id == "hint" ) {
            this.do_hint( this.whose_turn );
        }  

        
        if ( id == "deal") {
            this.new_round();
        } else if ( id == "help") {
            openExternalURL("https://www.youtube.com/watch?v=HOWevyidlXk");
        }
    }
    

    //----------
    update(dt ) {

        if ( this.anim_dealing == 1 ) {

            let total_concealed_count = 0;
            for ( let h = 0 ; h < 3 ; h++ ) {
                total_concealed_count += this.players_concealed_ent[h].length;
            }
            if ( total_concealed_count < 51 ) {

                // Change container
                this.anim_piece = this.wall_pieces_ent.shift();

                let player_h = total_concealed_count % 3;
                let tile_i   = ( total_concealed_count / 3 ) >> 0; 
                this.players_concealed_ent[player_h].push( this.anim_piece );
                
                this.anim_target.x = this.players_concealed_pos[player_h][tile_i].x;
                this.anim_target.y = this.players_concealed_pos[player_h][tile_i].y;
                this.anim_target.z = this.players_concealed_pos[player_h][tile_i].z;

                
                this.anim_piece["player"] = player_h;
                this.anim_piece.getComponent( Transform ).position.y = 0.05;
                this.setFaceVal( this.anim_piece, this.players_deck[player_h][tile_i]  );

                // Give some times to move
                this.anim_dealing = 2;
            } else {

                this.anim_dealing = 0;
                this.whose_turn = 0;
                        
                // Done with dealing..
                this.clear_round_actions();
        
                if ( this.game_mode == 1 ) {
                    // Dont need to do anything, we will process colyseus transaction and know what to do.

                } else {
                    this.bid_round_procedure();
                }
            }

        } else if ( this.anim_dealing == 3 ) {
            this.anim_tick += 1;
            if ( this.anim_tick > 20 ) {
                this.anim_tick = 0;
                this.anim_dealing = 4;
            }

        } else if ( this.anim_dealing == 6 ) {

            this.anim_tick += 1;
            if ( this.anim_tick > 20 ) {
                this.anim_tick = 0;
                this.anim_dealing = 5;
            }



        } else if ( this.anim_dealing == 7 ) {
            // Everyone doesnt want to bid
            this.anim_tick += 1;
            if ( this.anim_tick > 20 ) {
                this.anim_tick = 0;
                this.new_round();
            }
        
        } else if ( this.anim_dealing == 8 ) {

            this.anim_tick += 1;
            if ( this.anim_tick > 10 ) {
                this.anim_tick = 0;
                this.anim_dealing = 0;
                this.NPC_decide_discard( this.whose_turn  );
            }

        } else if ( this.anim_dealing == 4 ) {

            let finished = -1;
            let winner = -1;
            let bidded_count = 0;
            let highest_bid = 0;

            log( "this.round_actions", this.round_actions );

            for ( let i = 0 ; i < 3 ; i++) {

                if ( this.round_actions[i] > -1) {
                    bidded_count += 1;
                    
                    if ( this.round_actions[i] > highest_bid ) {
                        highest_bid = this.round_actions[i];
                        winner = i;
                    }
                    if ( this.round_actions[i] == 3 ) {
                        finished = 1;
                        winner = i;
                        break;
                    }
                }
            }
            if ( bidded_count == 3 || finished > -1 ) {
                
                if ( winner == -1) {

                    this.displayAnnouncement("No one bidded to become Land Lord, reshuffle... " , 5 , Color4.Yellow(), 14, false);
                    this.anim_dealing = 7;

                } else {
                    
                    this.landlord = winner;
                    this.displayAnnouncement("LandLord role is given to " + this.display_names[winner] , 5 , Color4.Yellow(), 14, false);
                    log( "Winner of auction is ", this.landlord);
                    
                    // 3 extra cards
                    for ( let i = 0 ; i < 3 ; i++) {

                        let card_val = this.deck.shift();
                        let card_ent = this.wall_pieces_ent.shift()
                        
                        this.players_deck[ this.landlord ].push( card_val );
                        this.players_concealed_ent[ this.landlord ].push( card_ent );
                        this.setFaceVal( card_ent , card_val );

                        let concealed_index = this.players_concealed_ent[ this.landlord ].length - 1;

                        card_ent.getComponent(Transform).position.x = this.players_concealed_pos[ this.landlord ][ concealed_index ].x ;
                        card_ent.getComponent(Transform).position.y = this.players_concealed_pos[ this.landlord ][ concealed_index ].y ;
                        card_ent.getComponent(Transform).position.z = this.players_concealed_pos[ this.landlord ][ concealed_index ].z ;
                        
                        
                        //if ( this.landlord == this.my_seat_id ) {
                            card_ent.getComponent(Transform).rotation.eulerAngles = new Vector3( 90 ,  [ 0, -90, 90 ][ this.landlord ] ,0);
                        //} else {
                        //    card_ent.getComponent(Transform).rotation.eulerAngles = new Vector3( -90 , [ 0, -90, 90 ][ this.landlord ], 0);
                        //}
                        
                    }

                    this.clear_round_actions();
                    this.round_winner = this.landlord;
                    this.whose_turn = this.landlord;
                    this.anim_dealing = 6;
                }
            
            } else {
                this.bid_round_procedure();
            }
            





        }  else if ( this.anim_dealing == 5 ) { 
            
            this.anim_dealing = 0;
            
            if ( this.game_mode == 1 ) {
                // Dont need to do anything, we will process colyseus transaction and know what to do.

            } else {
                this.play_round_procedure();
            }
            
        }





        if ( this.anim_piece != null ) {

            //log("animating...");
            // Animate movement.
            let diffx = this.anim_target.x - this.anim_piece.getComponent(Transform).position.x ;
            let diffz = this.anim_target.z - this.anim_piece.getComponent(Transform).position.z ;

            let speed_inverse = 3;
            if ( this.anim_dealing == 2 ) {
                speed_inverse = 1.1;
            }
            if ( diffx * diffx + diffz * diffz > 0.0001 ) { 
                // not reach , move
                let delta_x = diffx / speed_inverse;
                let delta_z = diffz / speed_inverse;
                this.anim_piece.getComponent(Transform).position.x += delta_x;
                this.anim_piece.getComponent(Transform).position.z += delta_z;
                
            } else {
                
                // Reach 
                this.anim_piece.getComponent(Transform).position.x = this.anim_target.x;
                this.anim_piece.getComponent(Transform).position.y = this.anim_target.y;
                this.anim_piece.getComponent(Transform).position.z = this.anim_target.z;

                // Face orientation issue.
                let h = this.anim_piece["player"];
                if ( this.anim_dealing == 2 ) {
                    if ( h == this.my_seat_id ) {
                        this.anim_piece.getComponent(Transform).rotation.eulerAngles = new Vector3( 90 ,  [ 0, -90, 90 ][ h ] ,0);
                    } else {
                        this.anim_piece.getComponent(Transform).rotation.eulerAngles = new Vector3( -90 , [ 0, -90, 90 ][ h ], 0);
                    }

                    this.sounds["card"].playOnce();
                    this.anim_dealing = 1;

                }

                this.anim_piece = null;
            }
        }

        if ( this.ui_announcement_tick > 0 ) {
            this.ui_announcement_tick -= 1;
            if ( this.ui_announcement_tick <= 0 ) {
                this.ui_announcement.value = "";
            }
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




