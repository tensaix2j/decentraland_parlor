
import resources from "src/resources";

import { CannonBox } from "src/cannonbox";
import { getUserData, UserData } from '@decentraland/Identity'
import { Txclickable_box } from "src/txclickable_box"

export class Aerochess extends Entity implements ISystem {
    
    public world;
    public dice;
    public FIXED_TIME_STEPS = 1.0 / 60;
    public MAX_TIME_STEPS = 10;

    public THROW_STRENGTH_MULTIPLIER = 1;
    public throwPower = 8;
    public throwPowerAdjusted = this.throwPower * this.THROW_STRENGTH_MULTIPLIER;

    public board_pos = [];
    public turn_pos = [];


    public userData;
    public display_names = [];
    public display_names_ent = [];


    public rollnum = 0;
    public pieces = [];
    public boardspots = [];

    public dice_pos = new Vector3( 5,  0.3 , 8 );
    public my_seat_id = 0;
    public whose_turn = 0;

    public stage ;
    public game_mode ;
    public table_index ;

    public sounds = {};
    public materials ;
    public buttons = {};
    public gameover = 1;

    public anim_dealing = 0;
    public anim_tick = 0;


    public ui_root_for_distance_toggle;
    public ui_announcement;
    public ui_announcement_tick = 0;
    public ui_network_msg;

    public turn_highlighter;
    public final_scores ;

    //--------------
    constructor( stage , game_mode , table_index ) {

        super();
		this.setParent(stage);
        
        this.stage = stage;
        this.game_mode = game_mode
        this.table_index = table_index ;

        this.init_sounds();
        this.init_names();
        this.init_board_pos();
        this.init_entities();
        this.final_scores = stage.final_scores;
        

        /*
        onPlayerExpressionObservable.add(({ expressionId }) => {
			
            let emote_id = ["","wave","fistpump","robot","raiseHand","clap", "money", "kiss", "tektonik","hammer","tik"].indexOf( expressionId );
            this.rollnum = emote_id;
            log( "You rolled", this.rollnum );
		})
        */
        engine.addSystem( this );
        

    }


    //-----
    async init_names() {
        
        if (!this.userData) {
            await this.setUserData()
        }	

        this.display_names[0] = this.userData.displayName;
        this.display_names[1] = "Bot_Becky#0002";
        this.display_names[2] = "Bot_Charlie#0003";
        this.display_names[3] = "Bot_Donald#0004";

        /*
        this.curbid = 2;
        this.bomb_or_rocket =3;
        this.landlord = 1;
        this.whose_turn = 1;
        this.do_win();
        */
        
    }


    //---------------
    init_sounds() {
        this.sounds = this.stage.sounds;

    }


    //--------
    createButtons(){

        let buttonGroup = new Entity();
        buttonGroup.setParent( this );
        buttonGroup.addComponent( new Transform({
            position: new Vector3(0,  1,  0),
            scale: new Vector3( 0.32 , 0.32 , 0.32 )       
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
        
        let ui_announcement = new UIText( ui_root_for_distance_toggle );
        ui_announcement.vAlign = "center";
        ui_announcement.vTextAlign = "center";
        ui_announcement.hAlign = "center";
        ui_announcement.hTextAlign = "center";
        ui_announcement.value = "";
        ui_announcement.fontSize = 14;
        ui_announcement.color = Color4.Yellow();
        this.ui_announcement = ui_announcement;




        let ui_network_msg = new UIText( ui_root_for_distance_toggle );
        ui_network_msg.vAlign = "bottom";
		ui_network_msg.hAlign = "left";
		ui_network_msg.hTextAlign = "left";
		ui_network_msg.positionX =  0;
		ui_network_msg.positionY = -310;
		
        ui_network_msg.value = "Aeroplane Chess: Single Player Mode. Reward 200pts if you win.";
        ui_network_msg.fontSize = 15;
		ui_network_msg.visible = true;
		this.ui_network_msg = ui_network_msg;
        

    }

    //---------------------
    displayAnnouncement( msg ,  duration, color , size, border ) {
        
        this.ui_announcement.value = msg;
        this.ui_announcement.color = color;
        this.ui_announcement.fontSize = size;
        this.ui_announcement_tick = duration * 30;
    }

    //--------------
    async setUserData() {
        const data = await getUserData()
        log(data.displayName)
        this.userData = data
    }


    //-----
    init_board_pos() {
        
        this.board_pos[0] = [ 11.4, 6.2 ]
        this.board_pos[1] = [ 11.6, 5.7 ]
        this.board_pos[2] = [ 11.6, 5.25 ]
        this.board_pos[3] = [ 11.4, 4.75 ]
        this.board_pos[4] = [ 10.9, 4.55 ]
        this.board_pos[5] = [ 10.5, 4.55 ]
        this.board_pos[6] = [ 10.0, 4.55 ]
        this.board_pos[7] = [ 9.55, 4.55 ]
        this.board_pos[8] = [ 9.05, 4.55 ]
        this.board_pos[9] = [ 8.55, 4.75 ]
        this.board_pos[10] = [ 8.4, 5.25 ]
        this.board_pos[11] = [ 8.4,  5.7 ]
        this.board_pos[12] = [ 8.55, 6.2 ]


        this.board_pos[13] = [  8.2, 6.55 ]
        this.board_pos[14] = [  7.7, 6.4 ]
        this.board_pos[15] = [  7.25, 6.4 ]
        this.board_pos[16] = [  6.7, 6.55 ]
        this.board_pos[17] = [  6.55, 7.1 ]
        this.board_pos[18] = [  6.55, 7.55 ]
        this.board_pos[19] = [  6.55, 8 ]
        this.board_pos[20] = [  6.55, 8.5 ]
        this.board_pos[21] = [  6.55, 8.9 ]
        this.board_pos[22] = [  6.7, 9.45 ]
        this.board_pos[23] = [  7.25, 9.6 ]
        this.board_pos[24] = [  7.7, 9.6 ]
        this.board_pos[25] = [  8.2, 9.45 ]
        


        this.board_pos[26] = [ 8.55, 9.8 ]
        this.board_pos[27] = [ 8.4, 10.3 ]
        this.board_pos[28] = [ 8.4, 10.75 ]
        this.board_pos[29] = [ 8.55, 11.25 ]
        this.board_pos[30] = [ 9.05, 11.45 ]
        this.board_pos[31] = [ 9.55, 11.45 ]
        this.board_pos[32] = [ 10, 11.45 ]
        this.board_pos[33] = [ 10.45, 11.45 ]
        this.board_pos[34] = [ 10.9, 11.45 ]
        this.board_pos[35] = [ 11.4, 11.25 ]
        this.board_pos[36] = [ 11.6, 10.75 ]
        this.board_pos[37] = [ 11.6, 10.3 ]
        this.board_pos[38] = [ 11.4, 9.8 ]
        

        this.board_pos[39] = [ 11.75, 9.45 ]
        this.board_pos[40] = [ 12.3,  9.6 ]
        this.board_pos[41] = [ 12.75, 9.6 ]
        this.board_pos[42] = [ 13.25, 9.45 ]
        
        this.board_pos[43] = [ 13.45, 8.9 ]
        this.board_pos[44] = [ 13.45, 8.45 ]
        this.board_pos[45] = [ 13.45, 8 ]
        this.board_pos[46] = [ 13.45, 7.55 ]
        this.board_pos[47] = [ 13.45, 7.1 ]
        this.board_pos[48] = [ 13.25, 6.6 ]

        this.board_pos[49] = [ 12.75, 6.4 ]
        this.board_pos[50] = [ 12.3, 6.4 ]
        this.board_pos[51] = [ 11.75, 6.6 ]


        // Road to the win >= 52 - 75
        this.board_pos[52] = [ 12.9, 8 ]
        this.board_pos[53] = [ 12.45, 8 ]
        this.board_pos[54] = [ 11.89, 8 ]
        this.board_pos[55] = [ 11.4, 8 ]
        this.board_pos[56] = [ 10.9, 8 ]
        this.board_pos[57] = [ 10.4, 8 ]

        this.board_pos[58] = [ 10, 5.05 ]
        this.board_pos[59] = [ 10, 5.55 ]
        this.board_pos[60] = [ 10, 6.05 ]
        this.board_pos[61] = [ 10, 6.55 ]
        this.board_pos[62] = [ 10, 7.1 ]
        this.board_pos[63] = [ 10, 7.6 ]

        this.board_pos[64] = [ 7.05, 8 ]
        this.board_pos[65] = [ 7.55, 8 ]
        this.board_pos[66] = [ 8.05, 8 ]
        this.board_pos[67] = [ 8.55, 8 ]
        this.board_pos[68] = [ 9.05, 8 ]
        this.board_pos[69] = [ 9.6, 8 ]
        
        this.board_pos[70] = [ 10, 10.9 ]
        this.board_pos[71] = [ 10, 10.4 ]
        this.board_pos[72] = [ 10, 9.9 ]
        this.board_pos[73] = [ 10, 9.4 ]
        this.board_pos[74] = [ 10, 8.9 ]
        this.board_pos[75] = [ 10, 8.4 ]
        
        
       



        //------------
        // Starting point 76 to 79
        this.board_pos[76] = [ 13.6, 6.2 ]
        this.board_pos[77] = [  8.2, 4.4 ]
        this.board_pos[78] = [  6.4, 9.8 ]
        this.board_pos[79] = [ 11.75, 11.6 ]


        //------------------
        // airport >= 80
        // Yellow
        this.board_pos[80] = [ 12.5, 5.5 ]
        this.board_pos[81] = [ 13.45, 5.5 ]
        this.board_pos[82] = [ 12.5, 4.6 ]
        this.board_pos[83] = [ 13.45, 4.6 ]

        // Blue
        this.board_pos[84] = [ 6.55, 5.5 ]
        this.board_pos[85] = [ 7.5, 5.5 ]
        this.board_pos[86] = [ 6.55, 4.6 ]
        this.board_pos[87] = [ 7.45, 4.6 ]
        
        // Green
        this.board_pos[88] = [ 6.6, 11.45 ]
        this.board_pos[89] = [ 7.5, 11.45 ]
        this.board_pos[90] = [ 6.6, 10.5 ]
        this.board_pos[91] = [ 7.5, 10.5 ]
        
        // Red
        this.board_pos[92] = [ 12.5, 11.45 ]
        this.board_pos[93] = [ 13.45, 11.45 ]
        this.board_pos[94] = [ 12.5, 10.5 ]
        this.board_pos[95] = [ 13.45, 10.5 ]
        

        this.turn_pos[0] = [ 12.975 , 5.05   ];
        this.turn_pos[1] = [  7.025 , 5.05   ];
        this.turn_pos[2] = [   7.05 , 10.975 ];
        this.turn_pos[3] = [ 12.975 , 10.975 ];
        


    }

    //---
    async init_entities() {


        this.addComponent( new Transform({
            position: new Vector3( 0 , 1, 0),
            scale: new Vector3( 0.3 , 0.3, 0.3 )
        }))

        this.createMaterials();
        this.createButtons();
        this.createUI();



        
        
        let root = new Entity();
        root.setParent( this );
        root.addComponent( new Transform({
            position: new Vector3(-10,0,-8),
            scale: new Vector3(1,1,1)
        })) 

        let board = new Entity();
        board.setParent(root);
        board.addComponent( new PlaneShape());
        board.addComponent( new Transform({
            position: new Vector3( 10,  0.06 ,8),
            scale: new Vector3(8,8,1)
        }))
        board.getComponent(Transform).rotation.eulerAngles = new Vector3(90,0,0)
        board.addComponent( this.materials[10] );

        

        let world = new CANNON.World()
        world.quatNormalizeSkip = 0
        world.quatNormalizeFast = false
        world.gravity.set(0, -9.82, 0)
        this.world = world;


        let physicsMaterial = new CANNON.Material("groundMaterial")
        let gltfbox = new BoxShape();
        let ground = new CannonBox( 
            new Vector3( 8 ,  0,  8 ),
            new Vector3( 16 , 0.1,   16 ),
            world,
            physicsMaterial,
            0,
            gltfbox
        )
        //ground.setParent( root );

        let diceMaterial = new CANNON.Material("diceMaterial")
        diceMaterial.restitution = 0;

        let dice = new CannonBox(
            new Vector3( this.dice_pos.x , this.dice_pos.y ,  this.dice_pos.z ),
            new Vector3( 0.4, 0.4 , 0.4 ),
            world,
            diceMaterial,
            1,
            new GLTFShape("models/dice.glb")
        )
        dice.setParent( root );
        dice.setRot( 0, 0, 0);

        this.dice = dice;
        this.dice["onpointerdown"] = new OnPointerDown(
            (e)=>{
                this.diceOnThrow();
            },{
                hoverText:"Throw Dice",
                distance:20
            }
        )
        

        if (!this.userData) {
            await this.setUserData()
        }
        
        
        
        
        let piece_models = [];
        piece_models[1]     = new GLTFShape("models/piece_blue.glb");
        piece_models[2]     = new GLTFShape("models/piece_green.glb");
        piece_models[3]     = new GLTFShape("models/piece_red.glb");
        piece_models[0]     = new GLTFShape("models/piece_yellow.glb");
        
        for ( let t = 0 ; t < 4 ; t++ ) {

            let team = t;

            for ( let i = 0 ; i < 4 ; i++) {
                
                let boardpos = 80 + team * 4 + i;
                let x = this.board_pos[boardpos][0];
                let z = this.board_pos[boardpos][1];
                let piece = new Entity();
                
                piece.setParent(root);
                piece.addComponent( new Transform({
                    position: new Vector3( x , 0.05 , z  ),
                    scale: new Vector3( 1 , 1 , 1 )
                }))
                piece.addComponent( piece_models[team] );
                piece["boardpos"] = boardpos;
                piece["team"] = team;
                piece["id"] = i ;
                piece["onpointerdown"] = new OnPointerDown(
                    (e)=>{
                        this.piece_onclick(e);
                    },{
                        hoverText:"Move Piece",
                        distance:10
                    }             
                )
                piece["anim"] = [];
                piece["memberindex"] = i;
                this.pieces.push( piece );
                
            }

            
            let name_pos = [ 
                [ 12.8  , 3.9   ],
                [ 5.85  , 4.9   ],
                [ 6.7   , 12.15 ],
                [ 14.2  , 11.15 ],
            ] ;
            
            let nametag = new Entity();
            nametag.setParent( root);
            let boardpos = 80 + team * 4 + 3;
            
            let x = name_pos[t][0];
            let z = name_pos[t][1];

            nametag.addComponent( new Transform({
                position: new Vector3( x, 0.05, z ),
                scale: new Vector3(0.25, 0.25 , 0.25 )
            }))
            nametag.getComponent( Transform ).rotation.eulerAngles = new Vector3( 90 , 90 * t , 0);
            nametag.addComponent( new TextShape( "" ) )
            this.display_names_ent.push( nametag );


        }

        let size_x = 0.6 / this.getComponent(Transform).scale.x ;
        let size_y = 0.04 / this.getComponent(Transform).scale.y ;
        let size_z = 0.6 / this.getComponent(Transform).scale.z ;
         
        let turn_highlighter = new Entity();
        turn_highlighter.setParent(root);
        turn_highlighter.addComponent( new Transform({
            position: new Vector3(0,-500,0),
            scale: new Vector3( size_x , size_y, size_z)
        }))
        turn_highlighter.addComponent( resources.models.cubeframe );
        this.turn_highlighter = turn_highlighter;

    }

    //----------
    move_piece( piece ) {
        

        let rollnum = this.rollnum;
        let newboardpos;

        if ( rollnum != 6 && piece["boardpos"] >= 80 ) {
            this.displayAnnouncement("Not allowed to do that. You can only move pieces out of hangar when you roll a 6", 5, Color4.Yellow(), 14, false);
            return ;
        }

        let base = ( 47 + 13 * piece["team"]) % 52;

        let distance_from_base  = 0;
        let distance_from_base2 = 0;
            
        if ( piece["boardpos"] >= 80 ) {

            newboardpos = 76 + piece["team"];
            
        } else if ( piece["boardpos"] >= 76 ) {

            newboardpos = (base + rollnum) % 52;

        } else if ( piece["boardpos"] < 52 ) {

            newboardpos = (piece["boardpos"] + rollnum ) % 52;

            distance_from_base  = piece["boardpos"] - base;
            distance_from_base2 = newboardpos       - base;
            
            if ( distance_from_base < 0 ) {
                distance_from_base  += 52;
            }
            if ( distance_from_base2 < 0 || distance_from_base2 < distance_from_base ){ 
                distance_from_base2 += 52;
            }
            
            if ( distance_from_base2 >= 51 ) {
                newboardpos = ( distance_from_base2 - 51 ) +  ( 52 + ( 6 * piece["team"]) )
            }

        } else if ( piece["boardpos"] >= 52 && piece["boardpos"] <= 75 ) {

            newboardpos = piece["boardpos"] + rollnum ;
            if ( newboardpos > 57 + piece["team"] * 6 ) {
                newboardpos = (57 + piece["team"] * 6 ) * 2 - newboardpos;
            }
        }
        
        // Anim control
        piece["anim"].length = 0;
            
        if ( newboardpos < 76 ) {

            if ( piece["boardpos"] < 52 ) {
                // Main route
                let move_dist = distance_from_base2 - distance_from_base;
                let dist_b4_50 = 50 - distance_from_base;
                let dist_af_50 = distance_from_base2 - 50;

                for ( let i = 1 ; i <= move_dist && i <= dist_b4_50; i++ ) {
                    let apos = (piece["boardpos"] + i) % 52;
                    piece["anim"].push( apos );
                }

                // Main route to road to finish
                if ( dist_af_50 > 0 ) {
                    for ( let i = 0 ; i < dist_af_50 ; i++ ) {
                        let apos = 52 + 6 * piece["team"] + i ;
                        piece["anim"].push( apos );
                    }
                }

                
            } else if ( piece["boardpos"] >= 52 && piece["boardpos"] < 76 ) {
                // Road to finish 
                if ( piece["boardpos"] + rollnum <= (57 + 6 * piece["team"] ) ) {
                    let move_dist = newboardpos - piece["boardpos"];
                    for ( let i = 1 ; i <= move_dist ; i++ ) {
                        let apos = piece["boardpos"] + i;
                        piece["anim"].push( apos );
                    }
                } else {
                    let move_dist1 = (57 + 6 * piece["team"]) - piece["boardpos"];
                    for ( let i = 1 ; i <= move_dist1 ; i++ ) {
                        let apos = piece["boardpos"] + i;
                        piece["anim"].push( apos );
                    }
                    let move_dist2 = (57 + 6 * piece["team"] ) - newboardpos;
                    for ( let i = 1 ; i <= move_dist2 ; i++ ) {
                        let apos = (57 + 6 * piece["team"]) - i;
                        piece["anim"].push( apos );
                    }
                }

            } else if ( piece["boardpos"] >= 76 && piece["boardpos"] <= 79 )  {
                // Launching point to main route.
                let move_dist = newboardpos - base;
                if ( move_dist < 0 ) {
                    move_dist += 52;
                }
                for ( let i = 1 ; i <= move_dist ; i++ ) {
                    let apos = (base + i) % 52;
                    piece["anim"].push( apos );
                }
            } 
        
        } else {
            piece["anim"].push( newboardpos );
        }  


        
        
        // Still got one more jump if land on team color
        if ( newboardpos < 52 ) {
            if ( distance_from_base2 == 18 ) {
                newboardpos = (newboardpos + 12) % 52;
                piece["anim"].push( newboardpos );
                
            } else if ( distance_from_base2 != 50 ) {

                //JUMP
                let team_on_step = [3,0,1,2][newboardpos % 4];
                if ( team_on_step == piece["team"] ) {
                    newboardpos = (newboardpos + 4) % 52;
                }
                piece["anim"].push( newboardpos );
                
                // After jump still can fly.
                distance_from_base2 = newboardpos - base;
                if ( distance_from_base2 < 0 ) {
                    distance_from_base2 += 52;
                }
                if ( distance_from_base2 == 18 ) {
                    newboardpos = (newboardpos + 12) % 52;
                }
                piece["anim"].push( newboardpos );
                
            }
        }

        log( piece["anim"].length );

        // update boardspot first 
        if ( this.boardspots[ piece["boardpos"] ] != null ) {
            let index = this.boardspots[ piece["boardpos"] ].indexOf( piece );
            if ( index > -1 ) {
                this.boardspots[ piece["boardpos"] ].splice(index,1);
                for ( let i = index ; i < this.boardspots[ piece["boardpos"] ].length ; i++ ) {
                    let piece_i = this.boardspots[ piece["boardpos"] ][i];
                    piece_i.getComponent( Transform ).position.y -= 0.12;
                }
            }
        }

        piece["boardpos"] = newboardpos;
        
        this.togglePointer( this.whose_turn , 0 );


    }





    //--------
    piece_onclick(e) {
        
        let piece = engine.entities[e.hit.entityId];
        if ( this.rollnum == 0 ) {
            this.displayAnnouncement("Please roll the dice first" , 5 , Color4.Yellow(), 14, false );
        } else {
            this.move_piece( piece );            
        }        
    }





    //------
    diceOnThrow() {

        //this.togglePointerDice(0);

        this.sounds["rolldice"].playOnce();

        this.dice["animating"] = 1;

        this.dice.setPos( 
            this.dice_pos.x ,
            this.dice_pos.y  ,
            this.dice_pos.z
        );
        
        this.dice.setVelocity( 0, 0, 0 ); 
        
        this.dice.setAngularVelocity( Math.random() * 10 , Math.random() * 10 , Math.random() * 10 )
        this.dice.setRot( Math.random() * 90, Math.random() * 90 , Math.random() * 90); 
        
        let throwDirection = Vector3.Up();

        this.dice.boxBody.applyImpulse(
            new CANNON.Vec3(
                            throwDirection.x * this.throwPowerAdjusted, 
                            throwDirection.y * this.throwPowerAdjusted , 
                            throwDirection.z * this.throwPowerAdjusted
                        ),
            new CANNON.Vec3( 
                            this.dice.boxBody.position.x  , 
                            this.dice.boxBody.position.y  , 
                            this.dice.boxBody.position.z  
            )
        )
    }
    //----
    diceOnStop() {

        this.dice["animating"] = 0;
        

        let dice_vec = [];
        let dice_vec_val = [4,3,2,5,1,6];
        dice_vec[0]     = Vector3.Up().rotate(        this.dice.getComponent(Transform).rotation ).normalize();
        dice_vec[1]     = Vector3.Down().rotate(      this.dice.getComponent(Transform).rotation ).normalize();
        dice_vec[2]     = Vector3.Forward().rotate(   this.dice.getComponent(Transform).rotation ).normalize();
        dice_vec[3]    = Vector3.Backward().rotate(  this.dice.getComponent(Transform).rotation ).normalize();
        dice_vec[4]    = Vector3.Left().rotate(      this.dice.getComponent(Transform).rotation ).normalize();
        dice_vec[5]   = Vector3.Right().rotate(     this.dice.getComponent(Transform).rotation ).normalize();
        
        let highest = -999;
        let highest_i = 0;
        for ( let i = 0 ; i < 6 ; i++ ) {
            let dotproduct = Vector3.Dot( dice_vec[i], Vector3.Up() ) ;
            if ( dotproduct > highest ) {
                highest = dotproduct;
                highest_i = i;
            }
        }
        let value = dice_vec_val[highest_i];

        // DEBUG
        //value = 3;

        this.dice.updatePos();
        this.dice.updateRot();
        
        let msg;
        if ( this.whose_turn == this.my_seat_id ) {
            msg = "You rolled a " + value + ". ";
        } else {
            msg = "AI rolled a " + value + ". ";
        }

        this.rollnum = value;
        
        let can_move = 0;
        if ( this.rollnum == 6 || this.has_movable_piece(this.whose_turn ) > 0 ) {
            if ( this.whose_turn == this.my_seat_id ) {
                if ( this.rollnum == 6 ) {
                    msg += "You can move one piece out of hangar."
                } else {
                    msg += "Please move one of your pieces."
                }
            } else {
                msg += "Please wait while A.I is moving piece."
            }

            can_move = 1;
        }

        if ( can_move == 1 ) {
            
            if ( this.whose_turn == this.my_seat_id ) {
                this.togglePointer( this.my_seat_id , 1 );
            } else {
                this.AI_move_piece();
            }


        } else {
            msg += "There's no movable piece. Next player..";
            this.whose_turn = (this.whose_turn + 1) % 4;
            this.anim_dealing = 2;
        }
        
        //this.displayAnnouncement( msg  , 5 , Color4.Yellow(), 14, false );
        this.ui_network_msg.value = msg;
        
    }



    
    //-------
    has_movable_piece( h ) {
        let ret = 0;
        for ( let i = 0 ; i < this.pieces.length; i++ ) {
            let piece = this.pieces[i];
            if ( piece["team"] == h && piece["boardpos"] < 80 && piece["done"] != 1 ) {
                ret = 1;
                break;
            }
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

    //-------------
    new_round() {

        this.clear_buttons();
        this.gameover = 0;
        this.whose_turn = 0;

        for ( let i = 0 ; i < this.pieces.length ; i++ ) {
            
            let piece = this.pieces[i];
            let team = piece["team"];
            let id   = piece["id"];
            let boardpos = 80 + team * 4 + id;
            let x = this.board_pos[boardpos][0];
            let z = this.board_pos[boardpos][1];

            piece["boardpos"] = boardpos;
            piece["done"] = 0;
            piece.getComponent(Transform).position.x = x;
            piece.getComponent(Transform).position.z = z;
            piece.getComponent(Transform).position.y = 0.05;

            //piece["nametag"].getComponent( TextShape ).value = this.display_names[team];
            
        }
        for ( let t = 0 ; t < 4 ; t++ ) {
            this.display_names_ent[t].getComponent(TextShape).value = this.display_names[t];
        }

        
        // DEBUG
        /*
        for ( let i = 0 ; i < 4 ; i++ ) {
            let boardpos = 54;
            let x = this.board_pos[boardpos][0];
            let z = this.board_pos[boardpos][1];
            let y = 0.05 + i * 0.12;
            this.pieces[i]["boardpos"] = boardpos;
            this.pieces[i].getComponent(Transform).position.x = x;
            this.pieces[i].getComponent(Transform).position.z = z;
            this.pieces[i].getComponent(Transform).position.y = y;
            
        }
        */
        




        this.play_turn_procedure();
        this.whose_turn = this.my_seat_id;
    }


    //----------
    togglePointer( player_h , on_off ) {

        log("togglePointer", player_h ,on_off );
        
        for ( let i = 0 ; i < this.pieces.length; i++ ) {
            let piece = this.pieces[i];
            if ( piece["team"] == player_h ) {
                if ( on_off == 0 ) {
                    if ( piece.hasComponent(OnPointerDown) ) {
                        piece.removeComponent( OnPointerDown );
                    }
                } else {
                    if ( !piece.hasComponent(OnPointerDown) ) {
                        piece.addComponent( piece["onpointerdown"] );
                    }
                }
            
            }
        }
    }

    //------------
    togglePointerDice( on_off ) {
        if ( on_off == 0 ) {
            if ( this.dice.hasComponent(OnPointerDown) ) {
                this.dice.removeComponent( OnPointerDown );
            }
        } else {
            if ( !this.dice.hasComponent(OnPointerDown) ) {
                this.dice.addComponent( this.dice["onpointerdown"]);
            }
        }
    }

    //-------
    play_turn_procedure() {

        if ( this.gameover == 1 ) {
            this.buttons["deal"].show();
            return ;
        }
        
        if ( this.whose_turn == this.my_seat_id ) {
            this.sounds["turnstart"].playOnce();
        }

        this.turn_highlighter.getComponent( Transform ).position.x = this.turn_pos[ this.whose_turn ][0];
        this.turn_highlighter.getComponent( Transform ).position.z = this.turn_pos[ this.whose_turn ][1];
        this.turn_highlighter.getComponent( Transform ).position.y = 0;
        
        

        //this.displayAnnouncement( this.display_names[this.whose_turn] + "'s Turn. Roll the dice", 5, Color4.Yellow(), 14, false );
        this.ui_network_msg.value = this.display_names[this.whose_turn] + "'s Turn. Rolling......Please wait..";


        this.rollnum = 0;
        this.AI_roll_dice();
        
    }


    //---------
    AI_roll_dice() {
        this.diceOnThrow();
    }

    //------
    AI_move_piece() {


        log("AI_move_piece", "rollnum is", this.rollnum );

        let moved = 0;
        if ( this.rollnum == 6 ) {

            // Move one still in hanger.
            for ( let i = 0 ; i < this.pieces.length; i++ ) {
                let piece = this.pieces[i];
                if ( piece["team"] == this.whose_turn && piece["boardpos"] >= 80 ) {
                    this.move_piece( piece );
                    moved = 1;
                    break;
                }
            }
        } 
        if ( moved == 0 ) {
            for ( let i = 0 ; i < this.pieces.length; i++ ) {
                let piece = this.pieces[i];
                if ( piece["team"] == this.whose_turn && piece["boardpos"] < 80 && piece["done"] != 1  ) {
                    this.move_piece( piece );
                    break;
                }
            }
        }
    }
    


    //--------
    // Button onclicked
    txclickable_button_onclick( id ,  userData ) {

        log( "txclickable_button_onclick", id , userData );
        
        if ( id == "deal") {
            this.new_round();
        } else if ( id == "help") {
            openExternalURL("https://www.ymimports.com/pages/how-to-play-aeroplane-chess-fei-xing-qi");
        }
    }


    //-----------
    update(dt) {
        
        if ( this.gameover == 0 ) {

            if ( this.anim_dealing == 2) {
                this.anim_tick += 1;
                if ( this.anim_tick > 20 ) {
                    this.anim_tick = 0;
                    this.anim_dealing = 0;
                    this.play_turn_procedure();
                }
            }
            
            if ( this.dice["animating"] == 1 ) {
                
                this.world.step( this.FIXED_TIME_STEPS, dt, this.MAX_TIME_STEPS)
                this.dice.updatePos();
                this.dice.updateRot();
                
                if ( this.dice.boxBody.velocity.x < 0.01 && 
                    this.dice.boxBody.velocity.y < 0.01 && 
                    this.dice.boxBody.velocity.z < 0.01 && 
                    this.dice.boxBody.angularVelocity.x < 0.01 &&
                    this.dice.boxBody.angularVelocity.y < 0.01 &&
                    this.dice.boxBody.angularVelocity.z < 0.01 &&
                    this.dice.boxBody.position.y < 1 
                ) {
                    this.dice["animating_extra"] = 10;
                    this.diceOnStop();
                }
            }

            
            if ( this.dice["animating_extra"] && this.dice["animating_extra"] > 0  ) {
                this.dice["animating_extra"] -= 1;
                this.world.step( this.FIXED_TIME_STEPS, dt, this.MAX_TIME_STEPS)
                this.dice.updatePos();
                this.dice.updateRot();
            }


            for ( let i = 0 ; i < this.pieces.length ; i++ ) {

                let piece = this.pieces[i];
                if ( piece["anim"].length > 0 ) {

                    let targetpos = piece["anim"][0];
                    let tx = this.board_pos[ targetpos ][0];
                    let tz = this.board_pos[ targetpos ][1];
                    let diffx = tx - piece.getComponent(Transform).position.x ;
                    let diffz = tz - piece.getComponent(Transform).position.z ;
                    
                    if ( diffx * diffx + diffz * diffz > 0.0001 ) { 

                        let delta_x = diffx / 3;
                        let delta_z = diffz / 3;
                        
                        if ( targetpos >= 80 ) {

                            delta_x = diffx / 8;
                            delta_z = diffz / 8;
                        }
                        piece.getComponent(Transform).position.x += delta_x;
                        piece.getComponent(Transform).position.z += delta_z;
                        piece.getComponent(Transform).position.y = 0.05;

                    } else {
                        // Reach 1 spot
                        piece["anim"].shift();   

                        this.sounds["placechip"].playOnce();

                        if ( piece["anim"].length == 0 ) {    
                            
                            // Reach destination 

                            if ( this.boardspots[ piece["boardpos"] ] == null ) {
                                this.boardspots[ piece["boardpos"] ] = [];
                            }
                            
                            this.boardspots[ piece["boardpos"] ].push( piece );
                            for ( let i = this.boardspots[ piece["boardpos"] ].length - 2 ; i >= 0 ; i-- ) {
                                let piece_i = this.boardspots[ piece["boardpos"] ][i];

                                if ( piece_i["team"] != piece["team"] ) {

                                    // Capture  
                                    this.displayAnnouncement( this.display_names[ piece["team"] ] + " captured " + this.display_names[ piece_i["team"] ] + "'s piece"  , 5, Color4.Yellow(), 14, false );
                                    this.sounds["chow"].playOnce();

                                    this.boardspots[ piece["boardpos"] ].splice( i , 1 );
                                    let homepos = piece_i["team"] * 4 + 80 + piece_i["memberindex"];
                                    piece_i["boardpos"] = homepos;
                                    piece_i["anim"].push( homepos );
                                    piece_i.removeComponent( OnPointerDown );
                                }  
                            }
                            for ( let i = 0 ; i < this.boardspots[ piece["boardpos"] ].length ; i++ ) {
                                let piece_i = this.boardspots[ piece["boardpos"] ][i];
                                if ( piece_i["done"] != 1 ) {
                                    piece_i.getComponent( Transform ).position.y = i * 0.12 + 0.05 ;
                                }
                            }

                            if ( [ 57, 63, 69, 75 ].indexOf( piece["boardpos"] ) > -1 ) {

                                piece["done"] = 1;
                                piece.getComponent(Transform).position.y = -500;
                                
                                let cnt_pieces_reached = 0;
                                for ( let i = piece["team"] * 4 ; i < piece["team"] * 4 + 4 ; i++ ) {
                                    if ( this.pieces[i]["done"] == 1 ) {
                                        cnt_pieces_reached += 1;
                                    }
                                }

                                this.displayAnnouncement( this.display_names[ piece["team"] ] + " : " + cnt_pieces_reached + "/4 reached." , 5, Color4.Yellow(), 14, false );
                                this.sounds["success"].playOnce();

                                if ( cnt_pieces_reached == 4 ) {
                                    this.ui_network_msg.value = "Winner is " + this.display_names[ piece["team"] ] + ".";
                                    this.gameover = 1;

                                    if ( piece["team"] == this.my_seat_id ) {

                                        this.ui_network_msg.value += "You have been rewarded 200pts"
                                        this.final_scores[0] += 200;
                                        this.stage.render_scores();
                                        this.stage.on_score_updated( this.final_scores , 0, this.stage.round , "aerochess" , 0 );
                                    }
                                }
                                
                            }
                            
                            if ( this.rollnum != 6 ) {
                                this.whose_turn = (this.whose_turn + 1 ) % 4;
                            }
                            this.anim_dealing = 2;

                            
                        }
                        
                    }

                }
            }
        }


        if ( this.ui_announcement_tick > 0 ) {
            this.ui_announcement_tick -= 1;
            if ( this.ui_announcement_tick <= 0 ) {
                this.ui_announcement.value = "";
            }
        }
        let diff_x = Camera.instance.feetPosition.x - this.getComponent(Transform).position.x - this.getParent().getComponent(Transform).position.x ;
        let diff_z = Camera.instance.feetPosition.z - this.getComponent(Transform).position.z - this.getParent().getComponent(Transform).position.z ;
        if ( diff_x * diff_x + diff_z * diff_z  < 20 ) {
        
            let diff_y = Camera.instance.feetPosition.y - this.getComponent(Transform).position.y - this.getParent().getComponent(Transform).position.y;
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

