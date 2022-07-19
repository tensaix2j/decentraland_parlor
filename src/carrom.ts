
import { b2Vec2 } from '../node_modules/box2d.ts/Box2D/Common/b2Math'
import { b2World } from '../node_modules/box2d.ts/Box2D/Dynamics/b2World'
import { b2FixtureDef, b2Fixture } from '../node_modules/box2d.ts/Box2D/Dynamics/b2Fixture'
import { b2BodyDef, b2BodyType, b2Body } from '../node_modules/box2d.ts/Box2D/Dynamics/b2Body'
import { b2PolygonShape } from '../node_modules/box2d.ts/Box2D/Collision/Shapes/b2PolygonShape'
import { b2CircleShape } from '../node_modules/box2d.ts/Box2D/Collision/Shapes/b2CircleShape'
import { b2ContactListener } from "../node_modules/box2d.ts/Box2D/Dynamics/b2WorldCallbacks"

import * as ui from '@dcl/ui-scene-utils'

import resources from './resources'
import { Txclickable_box  } from './txclickable_box'
import { getUserData, UserData } from '@decentraland/Identity'
import { handlePoap } from 'src/poapHandler'
import {Utils} from "src/utils"


export class Carrom extends Entity implements ISystem {

    public materials;
    public stage ;
    public game_mode ;
    public table_index ;

    public world   ;
    public pieces = [];
    public striker ;
    public carrom_pad;

    public adjustleft = 0;
    public adjustright = 0;
    public adjustpower = 0;


    public angle = 0.0;
    public power = 0.0;

    public wait_all_pieces_stop = 0;
    public contacted = [];

    public pocketed = [];
    public tmp_pocketed = [];

    
    public whose_turn = 0;
    public my_seat_id = 0;
   
    public buttons = {};
    public gameover = 1;

    public display_names = [];
    public userData;
    public turn_phase = 0;
    public display_msg = "";
    public striker_placed = 0;

    public turn_indicator;
    
    public red_cleared = 0;
    
    public ai_phase = 0;
    public ai_targetpower = 0;
    public tick = 0;




    constructor( stage , game_mode , table_index ){
        
        super();
        engine.addEntity( this );
        this.stage = stage;
        this.game_mode = game_mode
        this.table_index = table_index ;

        this.init_names();
        this.init_box2d();
        this.init_entities();
        this.init_box2d_contact_listener();


        engine.addSystem( this );
    }


    //--------
    createButtons(){

        let buttonGroup = new Entity();
        buttonGroup.setParent( this );
        buttonGroup.addComponent( new Transform({
            position: new Vector3(0,  1.5,  0),
            scale: new Vector3( 0.1 , 0.1 , 0.1 )       
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




    //-------
    createDynamicCircle( x, y , radius , world , ccd  ) {
    	return this.createCircle( x,y, radius , world,  b2BodyType.b2_dynamicBody , ccd );
    }		
	
	 //-------------
    createStaticCircle( x, y , radius , world  ) {
    	return this.createCircle( x,y, radius , world,  b2BodyType.b2_staticBody , false );
    }
    //----------
    createStaticShape( x, y , vertices, world ) {
    	return this.createShape( x, y, world,  b2BodyType.b2_staticBody, vertices );
    }

    //--------------
    createStaticSensorCircle( x,y, radius , world, sensorid ) {

    	// Box2D
    	let bodyDef   = new b2BodyDef();
        bodyDef.position.Set( x , y );
        bodyDef.type 	= b2BodyType.b2_staticBody;
        bodyDef.userData  = sensorid;
		
        let fixDef          = new b2FixtureDef();
        fixDef.density      = 0.0;
        fixDef.friction     = 0.0;
        fixDef.restitution  = 0.0;
        fixDef.shape        = new b2CircleShape(radius);
        fixDef.isSensor 	= true;
        
        let b2body = world.CreateBody(bodyDef);
        b2body.CreateFixture(fixDef);

        return b2body;

    }
    
    //------------
    createShape( x, y, world, body_type , vertices  ) {

    	let bodyDef   = new b2BodyDef();
        bodyDef.position.Set( x , y );
        bodyDef.type 	= body_type;
		
        let fixDef          = new b2FixtureDef();
        fixDef.density      = 10;
        fixDef.friction     = 100;
        fixDef.restitution  = 0.5;

        let shape        = new b2PolygonShape();
        shape.Set( vertices , vertices.length );
        fixDef.shape = shape;


        let b2body = world.CreateBody(bodyDef);
        b2body.CreateFixture(fixDef);
        return b2body;
    }
    
    //----------------
    createCircle( x,y, radius , world, body_type , ccd ) {

    	// Box2D
    	let bodyDef   = new b2BodyDef();
        bodyDef.position.Set( x , y );
        bodyDef.type 	= body_type;
        bodyDef.bullet  = ccd;
		
        let fixDef          = new b2FixtureDef();
        fixDef.density      = 20;
        fixDef.friction     = 100;
        fixDef.restitution  = 0.5;
        fixDef.shape        = new b2CircleShape(radius);
        
        let b2body = world.CreateBody(bodyDef);
        b2body.CreateFixture(fixDef);
        b2body.SetLinearDamping(0.6);
		b2body.SetAngularDamping(0.1);
        return b2body;
    }

    //----------
    createMaterials() {

        this.materials = this.stage.materials;

    }

    //-------
    init_box2d() {
        
        let gravity   = new b2Vec2(0, 0);
        this.world     = new b2World( gravity );

    }

    //-------
    init_box2d_contact_listener() {
        
        var contactListener = new b2ContactListener();
		var _this = this;
		contactListener.BeginContact = function (contact) {

			if ( contact.GetFixtureA().GetBody().GetUserData() != null  && contact.GetFixtureB().GetBody().GetUserData() != null ) {

				let userdataA = contact.GetFixtureA().GetBody().GetUserData();
				let userdataB = contact.GetFixtureB().GetBody().GetUserData();

                //log( "A", userdataA ,"B", userdataB )

				if ( userdataA.substr(0,4) == "hole" ) {
					
                    let piece_id = parseInt( userdataB.substr(5,2) );
					_this.piece_onenter_hole( _this.pieces[piece_id] );

                    

				} else if ( userdataB.substr(0,4) == "hole") {
					
                    let piece_id = parseInt( userdataA.substr(5,2) );
					_this.piece_onenter_hole( _this.pieces[piece_id] );



				} else if ( userdataA.substr(0,5) == "piece" && userdataB.substr(0,5) == "piece" ) {
					
                    
                    let piece_id_A = parseInt( userdataA.substr(5,2) );
                    let piece_id_B = parseInt( userdataB.substr(5,2) );
                    
                    if ( piece_id_A == 0 ) {
                        _this.contacted.push( piece_id_B );
                    } else if ( piece_id_B == 0 ) {
                        _this.contacted.push( piece_id_A );
                    }
				}
			} 
		}
		contactListener.EndContact = function ( contact ) {
			
		}
		contactListener.PostSolve = function (contact, impulse) {

		}
		contactListener.PreSolve = function (contact, oldManifold) {

		}
		this.world.SetContactListener(contactListener);	

    }

    //---------
    piece_onenter_hole( piece ) {
        piece["entered_hole"] = 1;
    }

    //------------------------
    init_entities() {
        
        this.createMaterials();
        this.addComponent( new Transform({
            position: new Vector3(8,0,8),
            scale: new Vector3(1,1,1)
        }))


        let carrom_pad = new Entity();
        carrom_pad.setParent( this );
        carrom_pad.addComponent( new Transform({
            position: new Vector3(0, 1 ,0),
            scale: new Vector3(2.875, 2.875, 1)
        }))
        carrom_pad.addComponent( new PlaneShape() );
        carrom_pad.addComponent( this.materials[12] );
        carrom_pad.getComponent( Transform ).rotation.eulerAngles = new Vector3(90,0,0);

        carrom_pad["onpointerdown"] = new OnPointerDown(
            (e)=>{
                this.carrom_pad_onclick(e);
            },{
                hoverText : "Left Click to place Striker. E/F to rotate angle. Hold and Release 1 to launch."
            }
        )
        this.carrom_pad = carrom_pad;
            

        let pieces_per_row = [ 3,4,5,4,3];
        let colors = [ 0,1,0, 1,1,0,1, 0,0,2,1,0, 1,1,0,1, 0,1,0];
        

        // Create Box2D Walls.
        let vertices = [];	

        vertices.length = 0;
    	vertices.push(  new b2Vec2(   1.5375, 1.4375   ) ); 
		vertices.push(  new b2Vec2(   1.5375, 1.5375   ) );   
		vertices.push(  new b2Vec2(  -1.5375, 1.5375   ) );   
		vertices.push(  new b2Vec2(  -1.5375, 1.4375   ) );   
		this.createStaticShape( 0, 0 , vertices , this.world );

        vertices.length = 0;
        vertices.push(  new b2Vec2(  -1.4375, -1.4375   ) ); 
		vertices.push(  new b2Vec2(  -1.4375,  1.4375   ) );   
		vertices.push(  new b2Vec2(  -1.5375,  1.4375   ) );   
		vertices.push(  new b2Vec2(  -1.5375, -1.4375   ) );   
		this.createStaticShape( 0, 0 , vertices , this.world );

        vertices.length = 0;
        vertices.push(  new b2Vec2(   1.5375, -1.5375   ) ); 
		vertices.push(  new b2Vec2(   1.5375, -1.4375   ) );   
		vertices.push(  new b2Vec2(  -1.5375, -1.4375   ) );   
		vertices.push(  new b2Vec2(  -1.5375, -1.5375   ) );   
		this.createStaticShape( 0, 0 , vertices , this.world );
        

        vertices.length = 0;
        vertices.push(  new b2Vec2(   1.5375, -1.4375   ) ); 
		vertices.push(  new b2Vec2(   1.5375,  1.4375   ) );   
		vertices.push(  new b2Vec2(   1.4375,  1.4375   ) );   
		vertices.push(  new b2Vec2(   1.4375, -1.4375   ) );   
		this.createStaticShape( 0, 0 , vertices , this.world );
        

        


        // Pieces
        
        for ( let i = 0 ; i < 5 ; i++ ) {
            for ( let j = 0 ; j < pieces_per_row[i] ; j++ ) {

                let x = (j - 2) * 0.155 ;
                let y = 1.015;
                let z = (i - 2) * 0.135;
                let color = colors[ this.pieces.length ];

                if ( i % 2 == 1 ) {
                    x += 0.0775;
                } else if ( i == 0 || i == 4 ) {
                    x += 0.155;
                }
                this.createPiece( x , y , z , color  );
            }
        }
        

        //DEBUG
       //this.createPiece(  0.85, 1.015, 1.27 , 2 );
       //this.createPiece(  0.1, 1.015, 0.1 , 0 );
       //this.createPiece(  0.3, 1.015, 0.3 , 1 );
         


        // Striker
        let carrom_striker = new Entity();
        carrom_striker.setParent( this );

        let x = 0 ;
        let y = -500;
        let z = -1;
        
        carrom_striker.addComponent( new Transform({
            position: new Vector3( x, y, z ),
            scale: new Vector3( 0.18, 0.18, 0.18)
        }))
        carrom_striker.addComponent( resources.models.carrom_piece_striker );
        carrom_striker["box2dbody"] = this.createDynamicCircle(  
            x ,  
            z ,  
            0.09 , 
            this.world, 
            true 
        );
        carrom_striker["active"] = 0;
        carrom_striker["id"] = this.pieces.length;
        carrom_striker["box2dbody"].SetUserData( "piece" + carrom_striker["id"] );
        carrom_striker["color"] = 3 ;


        this.striker = carrom_striker;
        this.pieces.push( carrom_striker );   





        // Line
        let guideline = new Entity();
		guideline.setParent( this );
        guideline.addComponent( new Transform( {
			position: new Vector3(  x ,  y  ,  z ),
			scale   : new Vector3(  1,   1 ,  1)
		}));
        let guideline_line = new Entity();
        guideline_line.setParent( guideline );
        guideline_line.addComponent( new Transform( {
			position: new Vector3(  0 ,  0  , 0.25 ),
			scale   : new Vector3(  0.004, 0.004 , 0.5 )
		}));
        guideline_line.addComponent( new BoxShape() );
        guideline_line.addComponent( this.materials[13] );
        guideline_line.getComponent( BoxShape ).withCollisions = false;
        this.striker["guideline"] = guideline;
        this.striker["guideline_line"] = guideline_line;
        






        // Holes
        this.createStaticSensorCircle( -1.3875 ,  1.3875 , 0.08 , this.world, "hole" ); 
    	this.createStaticSensorCircle(  1.3875 ,  1.3875 , 0.08 , this.world, "hole" ); 
    	this.createStaticSensorCircle(  1.3875 , -1.3875 , 0.08 , this.world, "hole" ); 
    	this.createStaticSensorCircle( -1.3875 , -1.3875 , 0.08 , this.world, "hole" ); 


        this.createButtons();

        let turn_indicator = new Entity();
        turn_indicator.setParent( this );
        turn_indicator.addComponent( new Transform({
            position: new Vector3( 0,  0.98 , -0.99 ),
            scale: new Vector3( 1.75 , 0.05 , 0.18 )
        }))
        turn_indicator.addComponent( new BoxShape());
        turn_indicator.addComponent( this.materials[14] );
        turn_indicator.getComponent( BoxShape).isPointerBlocker = false;
        turn_indicator.getComponent( BoxShape).withCollisions = false;
        this.turn_indicator = turn_indicator;

        



    }


    //------
    createPiece( x , y , z , color  ) {
        
        let box2dbody = this.createDynamicCircle(  
            x ,  
            z ,  
            0.0775 , 
            this.world, 
            true 
        );

        let carrom_piece = new Entity();
        carrom_piece.setParent( this );
        carrom_piece.addComponent( new Transform({
            position: new Vector3( x, y, z ),
            scale: new Vector3( 0.155, 0.155, 0.155)
        }))
        if ( color == 2 ) {
            carrom_piece.addComponent( resources.models.carrom_piece_red );
        } else if ( color == 1) {
            carrom_piece.addComponent( resources.models.carrom_piece_black );
        } else {
            carrom_piece.addComponent( resources.models.carrom_piece_brown );
        }
        carrom_piece["box2dbody"] = box2dbody;
        carrom_piece["active"] = 1;
        carrom_piece["id"] = this.pieces.length;
        carrom_piece["color"] = color ;

        box2dbody.SetUserData( "piece" + carrom_piece["id"] );
        this.pieces.push( carrom_piece );       
        
    }


    //--------------
    striker_onclick( e ) {
        
        //let xforce = 0.01;
        //let yforce = 5;
        //this.striker["box2dbody"].ApplyLinearImpulse( new b2Vec2( xforce, yforce ) , this.striker["box2dbody"].GetWorldCenter(), true );

    }

    //---------
    input_ondown( button_id ) {
        
        if ( this.gameover == 0 && this.turn_phase == 0 ) {

            if ( button_id == 1 ) {
                this.adjustleft = 1;

            } else if ( button_id == 2 ) {
                this.adjustright = 1;


            } else if ( button_id == 3 ) {
                this.adjustpower = 1;
            }
        }
    }

    //------
    input_onup( button_id ) {
        
        if ( this.gameover == 0 && this.turn_phase == 0   ) {
            
            
            if ( button_id == 1 ) {
                // E
                this.adjustleft = 0;

            
            } else if ( button_id == 2 ) {
                // F
                this.adjustright = 0;


            } else if ( button_id == 3 ) {

                // 1
                if ( this.striker_placed == 1 ) {
                    if ( this.power <= 0.01 ) {
                        this.power = 0.01;
                    }
                    this.releasepower();
                    this.adjustpower = 0;
                } else {
                    ui.displayAnnouncement("Please place your striker on baseline first.", 5, Color4.Yellow(), 14, false);
    
                } 
            }
        
        }
    }

    //-------
    hide_striker() {

        this.striker["box2dbody"].SetPosition( new b2Vec2( -2,-2) );
        this.striker["box2dbody"].SetLinearVelocity( new b2Vec2( 0 , 0 ) );
        this.striker["box2dbody"].SetAngularVelocity( 0 );
    
        this.striker["active"] = 0;
        this.striker.getComponent(Transform).position.x = -2;
        this.striker.getComponent(Transform).position.y = -500;
        this.striker.getComponent(Transform).position.z = -2;
        this.power = 0;
        this.adjustpower = 0;
    }


    //--------------
    async setUserData() {
        const data = await getUserData()
        log(data.displayName)
        this.userData = data
    }

    //-----
    async init_names() {
        
        if (!this.userData) {
            await this.setUserData()
        }	

        this.display_names[0] = this.userData.displayName;
        this.display_names[1] = "Bot_Becky#0002";
        
    }

    //----------------------
    async update_highscore( win ) {
        
        let url = "https://tensaistudio.xyz/carrom/update_highscore.rvt";
       	
       	if (!this.userData) {
   			await this.setUserData()
  		}	

        let sig      = Utils.sha256(this.userData.userId + Utils.wibble() + win );
        
        let body = JSON.stringify({
			useraddr : this.userData.userId,
            username : this.userData.displayName,
            win: win,
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
            log("JDEBUG", "update_highscore", "Sent request to URL", url , "SUCCESS", resp );
            
        } catch(err) {
            log("error to do", url, fetchopt, err );
        }
    }

    //----------
    collide_with_pieces( x , z ) {
        for ( let i = 0 ; i < this.pieces.length ; i++ ) {
            if ( this.pieces[i]["active"] == 1 && this.pieces[i]["color"] < 3 ) {
                let diff_x = this.pieces[i].getComponent(Transform).position.x - x;
                let diff_z = this.pieces[i].getComponent(Transform).position.z - z;
                if ( diff_x * diff_x + diff_z * diff_z <= 0.028) {
                    return 1;
                }
            }
        }
        return 0;
    }
    //----------
    collide_with_pieces2( x , z ) {
        for ( let i = 0 ; i < this.pieces.length ; i++ ) {
            if ( this.pieces[i]["active"] == 1 && this.pieces[i]["color"] < 3 ) {
                let diff_x = this.pieces[i].getComponent(Transform).position.x - x;
                let diff_z = this.pieces[i].getComponent(Transform).position.z - z;
                if ( diff_x * diff_x + diff_z * diff_z <= 0.016) {
                    return 1;
                }
            }
        }
        return 0;
    }


    //---------
    ai_place_striker() {

        let ai_chosen_i = -1;
        let shortest_distance = 999;
        let ai_chosen_hole_x ;
        let ai_chosen_hole_z ;
        let ai_chosen_diff_x ; 
        let ai_chosen_diff_z ;




        let remaining_count = 0;
        for ( let i = 0 ; i < this.pieces.length ; i++ ) {
            if ( this.pieces[i]["active"] == 1 && this.pieces[i]["color"] == 1 ) {
                remaining_count += 1;
            }
        }
        if ( remaining_count <= 1 && this.red_cleared == 0 ) {
            
            for ( let i = 0 ; i < this.pieces.length ; i++ ) {
                if ( this.pieces[i]["active"] == 1 && this.pieces[i]["color"] == 2 ) {
                    
                    let hole_x;
                    let hole_z;

                    if ( this.pieces[i].getComponent(Transform).position.x < 0 ) {
                        hole_x = -1.3875;
                    } else {
                        hole_x =  1.3875;
                    }

                    if ( this.pieces[i].getComponent(Transform).position.z < 1 ) {
                        hole_z = -1.3875;
                    } else {
                        hole_z =  1.3875;
                    }
                    
                    let diff_x = hole_x - this.pieces[i].getComponent(Transform).position.x ;
                    let diff_z = hole_z - this.pieces[i].getComponent(Transform).position.z ;
                    
                    ai_chosen_i = i;
                    ai_chosen_hole_x = hole_x;
                    ai_chosen_hole_z = hole_z;
                    ai_chosen_diff_x = diff_x;
                    ai_chosen_diff_z = diff_z;
                
                }
            }

        } else {
            
            for ( let i = 0 ; i < this.pieces.length ; i++ ) {
                if ( this.pieces[i]["active"] == 1 && this.pieces[i]["color"] == 1 ) {

                    if ( this.pieces[i].getComponent(Transform).position.z < 1 ) {
                        // Consider the one in front rather than the back
                        let hole_x;
                        let hole_z = -1.3875;
                        if ( this.pieces[i].getComponent(Transform).position.x < 0 ) {
                            hole_x = -1.3875;
                        } else {
                            hole_x =  1.3875;
                        }
                        let diff_x = hole_x - this.pieces[i].getComponent(Transform).position.x ;
                        let diff_z = hole_z - this.pieces[i].getComponent(Transform).position.z ;
                        
                        let distance_sqr = diff_x * diff_x + diff_z * diff_z ;
                        if ( distance_sqr <= shortest_distance ) {
                            shortest_distance = distance_sqr;
                            ai_chosen_i = i;
                            ai_chosen_hole_x = hole_x;
                            ai_chosen_hole_z = hole_z;
                            ai_chosen_diff_x = diff_x;
                            ai_chosen_diff_z = diff_z;

                        }
                    }
                }
            }


            if ( ai_chosen_i == -1 ) {
                // Still not chosen, then we have to do reflection shot to hit the one behind baseline.
                for ( let i = 0 ; i < this.pieces.length ; i++ ) {
                    if ( this.pieces[i]["active"] == 1 && this.pieces[i]["color"] == 1 ) {
                        let hole_x;
                        let hole_z = 1.3875;
                        if ( this.pieces[i].getComponent(Transform).position.x < 0 ) {
                            hole_x = -1.3875;
                        } else {
                            hole_x =  1.3875;
                        }
                        let diff_x = hole_x - this.pieces[i].getComponent(Transform).position.x ;
                        let diff_z = hole_z - this.pieces[i].getComponent(Transform).position.z ;

                        let distance_sqr = diff_x * diff_x + diff_z * diff_z ;
                        if ( distance_sqr <= shortest_distance ) {
                            shortest_distance = distance_sqr;
                            ai_chosen_i = i;
                            ai_chosen_hole_x = hole_x;
                            ai_chosen_hole_z = hole_z;
                            ai_chosen_diff_x = diff_x;
                            ai_chosen_diff_z = diff_z;
                        }
                    }
                }   
            }
        }


        if ( ai_chosen_i != -1 ) {

            
            let theta_rad = Math.atan2( ai_chosen_diff_x, ai_chosen_diff_z);
            let zdiff_striker = 1 - this.pieces[ai_chosen_i].getComponent(Transform).position.z;
            let xdiff_striker = zdiff_striker * Math.tan( theta_rad );
            
            
            let z = 1;
            let y = 1.015;
            let x = this.pieces[ai_chosen_i].getComponent(Transform).position.x + xdiff_striker;

            let readjust_angle = 0;
            if ( x > 0.91 ) {
                x = 0.91;
                readjust_angle = 1;
                
            } 
            if ( x < -0.91 ) {
                x = -0.91;
                readjust_angle = 1;
            }

            if ( ai_chosen_hole_z > 0 ) {
                readjust_angle = 1;
            } 

            this.ai_targetpower = 0.31;

            if ( readjust_angle == 1 ) {
                
                log("Readjust angle!")

                if ( this.pieces[ai_chosen_i].getComponent(Transform).position.z < 1 ) {
                
                    let diff_x = this.pieces[ai_chosen_i].getComponent(Transform).position.x - x;
                    let diff_z = this.pieces[ai_chosen_i].getComponent(Transform).position.z - z;
                    theta_rad = Math.atan2( diff_x, diff_z );
                    if ( ai_chosen_hole_x > 0 ) {
                        theta_rad += 0.05;
                    } else {
                        theta_rad -= 0.05;
                    }
                } else {
                    
                    this.ai_targetpower = 0.99;

                    if ( this.pieces[ai_chosen_i].getComponent(Transform).position.x > 0 ) {
                        x = this.pieces[ai_chosen_i].getComponent(Transform).position.x - 0.4;
                    } else {
                        x = this.pieces[ai_chosen_i].getComponent(Transform).position.x + 0.4;
                    }
                
                    if ( x > 0.91 ) {
                        x = 0.91;
                    } 
                    if ( x < -0.91 ) {
                        x = -0.91;
                    }
                    z = 1;
                    let diff_x = (this.pieces[ai_chosen_i].getComponent(Transform).position.x - x) / 3;
                    let diff_z = -1.35 - z;
                    theta_rad = Math.atan2( diff_x, diff_z );

                    
                    
                }
            } else {
                if ( ai_chosen_hole_x > 0 ) {
                    theta_rad += 0.012;
                } else {
                    theta_rad -= 0.012;
                }
            }



            this.striker["box2dbody"].SetPosition( new b2Vec2( x,z) );
            this.striker["box2dbody"].SetLinearVelocity( new b2Vec2( 0 , 0 ) );
            this.striker["box2dbody"].SetAngularVelocity( 0 );
            this.angle = theta_rad * 180.0 / Math.PI ;
            this.striker["active"] = 1;
            this.striker.getComponent(Transform).position.x = x;
            this.striker.getComponent(Transform).position.y = y;
            this.striker.getComponent(Transform).position.z = z;
            this.striker_placed = 1;
            
            this.power = 0;
            this.adjustpower = 0;
            
        }
    }



    //------------
    carrom_pad_onclick( e ) {
        
        log( "carrom_pad_onclick" , e.buttonId );

        if ( e.buttonId == 0 ) {
            // Place

            let x = e.hit.hitPoint.x - this.getComponent(Transform).position.x;
            let y = 1.015;

            let z = e.hit.hitPoint.z - this.getComponent(Transform).position.z;
            let target_z = [-1,1][this.whose_turn] ;

            let diff_z = Math.abs( z - target_z );
            if ( diff_z <= 0.18 && x >= -0.91 && x <= 0.91 ) {

                // Check collision with pieces.
                let collide_with_pieces = this.collide_with_pieces( x , z ) ;
                if ( collide_with_pieces == 0 ) {

                    z = target_z;
                    this.striker["box2dbody"].SetPosition( new b2Vec2( x,z) );
                    this.striker["box2dbody"].SetLinearVelocity( new b2Vec2( 0 , 0 ) );
                    this.striker["box2dbody"].SetAngularVelocity( 0 );

                    if ( this.striker["active"] == 0 ) {
                        this.angle = this.whose_turn * 178 ;
                        this.striker["active"] = 1;
                    }

                    this.striker.getComponent(Transform).position.x = x;
                    this.striker.getComponent(Transform).position.y = y;
                    this.striker.getComponent(Transform).position.z = z;

                    this.striker_placed = 1;
                    this.power = 0;
                    this.adjustpower = 0;
                    this.adjust_angle_by_turn();



                } else {
                    ui.displayAnnouncement("Striker must not touch the pieces on the table", 5, Color4.Yellow(), 14, false);

                }
            
            } else {

                ui.displayAnnouncement("Please place on your base line.", 5, Color4.Yellow(), 14, false);

            }
        } 
        
    }


    


    //-----
    releasepower() {

        log("releasepower");

        this.turn_phase = 1;
        if ( this.carrom_pad.hasComponent(OnPointerDown) ) {
            this.carrom_pad.removeComponent( OnPointerDown );
        }
        
        let rad         = this.angle * Math.PI / 180.0 ;
        let xforce      = this.power * 10 * Math.sin(rad);
        let yforce      = this.power * 10 * Math.cos(rad);
        
        this.striker["box2dbody"].ApplyLinearImpulse( new b2Vec2( xforce, yforce ) , this.striker["box2dbody"].GetWorldCenter(), true );
        this.striker["guideline"].getComponent(Transform).position.y = -500;

        this.wait_all_pieces_stop = 1;
        this.power = 0;
            


    }

    //-----------------
    any_piece_still_moving() {

        for ( let i = 0 ; i < this.pieces.length ; i++ ) {
    		let piece = this.pieces[i];
            if ( piece["active"] == 1 ) {
        		let xvel = piece["box2dbody"].GetLinearVelocity().x;
        		let yvel = piece["box2dbody"].GetLinearVelocity().y;
        		if ( xvel * xvel + yvel * yvel > 0.000125 ) {
        			return 1
        		}
            }
    	}
        
    	return 0;
    }


    //----
    clear_buttons() {
        let b ;
    	for ( b in this.buttons ) {
    		this.buttons[b].hide();
    	}
    }



    //--------
    new_round() {
        
        this.clear_buttons();
        this.gameover = 0;
        this.display_msg = "";

        // DEBUG 
        this.reset_pieces_positions();
        
        this.red_cleared = 0;
        this.whose_turn = 0;
        this.play_turn_procedure();


    }

    //-----
    reset_pieces_positions() {

        let pieces_per_row = [ 3,4,5,4,3];
        let piece_id = 0;

        for ( let i = 0 ; i < pieces_per_row.length ; i++ ) {
            for ( let j = 0 ; j < pieces_per_row[i] ; j++ ) {    
                
                let x = (j - 2) * 0.155 ;
                let y = 1.015;
                let z = (i - 2) * 0.135;

                if ( i % 2 == 1 ) {
                    x += 0.0775;
                } else if ( i == 0 || i == 4 ) {
                    x += 0.155;
                }

                this.pieces[piece_id].getComponent(Transform).position.x = x;
                this.pieces[piece_id].getComponent(Transform).position.y = y;
                this.pieces[piece_id].getComponent(Transform).position.z = z;

                this.pieces[piece_id]["box2dbody"].SetPosition( new b2Vec2(x,z) )
                this.pieces[piece_id]["active"] = 1;

                piece_id += 1;
                
            }
        }
        this.striker["active"] = 0;
        this.striker.getComponent( Transform ).position.y = -500;
    }


    //-----------
    play_turn_procedure() {
        
        if ( this.gameover == 1 ) {
            ui.displayAnnouncement( this.display_msg , 5, Color4.Yellow(), 14, false);
            this.buttons["deal"].show();
            return ;
        }

        //this.hide_striker();
        this.turn_phase = 0;
        this.tmp_pocketed.length = 0;
        this.striker_placed = 0;
        
        this.power = 0;
        this.adjustpower = 0;
        this.adjustleft = 0;
        this.adjustright = 0;

        this.turn_indicator.getComponent( Transform ).position.y = 0.98;
        this.turn_indicator.getComponent( Transform ).position.z = [-0.99,0.99][this.whose_turn];
        


        this.display_msg += "\n" + this.display_names[ this.whose_turn ] + "'s ("+ ["White","Black"][this.whose_turn] +") Turn. ";
        
        if ( !this.carrom_pad.hasComponent(OnPointerDown) && this.whose_turn == 0 ) {
            this.carrom_pad.addComponent( this.carrom_pad["onpointerdown"]);
            this.display_msg += "\nPlease place your striker on the base line.";
            
        } else {
            this.ai_phase = 1;
            this.tick = 0;
            this.display_msg += "\nAI is thinking....";


        }

        ui.displayAnnouncement( this.display_msg , 5, Color4.Yellow(), 14, false);

    }


    //-----------
    put_back_piece( color ) {

        log("put back ", color );
        
        for ( let i = 0 ; i < this.pieces.length ; i++ ) {

            if ( this.pieces[i]["color"] == color && this.pieces[i]["active"] == 0 ) {
                
                let x = 0 ;
                let y = 1.015;
                let z = 0;
                
                let test_x = 0;
                let test_z = 0;
                let found = 0;

                for ( let r = 0 ; r < 1.23 ; r += 0.08 ) {
                    for ( let theta = 0 ; theta < 360 ; theta += 20 ) {
                        
                        let theta_rad = theta * Math.PI / 180.0;
                        let test_x = r * Math.cos( theta_rad );
                        let test_z = r * Math.sin( theta_rad );

                        if ( this.collide_with_pieces2(test_x, test_z) == 0 ) {

                            //log( "r", r , "theta", theta);

                            x = test_x ;
                            z = test_z ;
                            found = 1;
                            break;
                        }
                    }
                    if ( found == 1) {
                        break;
                    }
                }

                
                this.pieces[i].getComponent(Transform).position.x = x;
                this.pieces[i].getComponent(Transform).position.y = y;
                this.pieces[i].getComponent(Transform).position.z = z;

                this.pieces[i]["box2dbody"].SetPosition( new b2Vec2(x,z) )
                this.pieces[i]["box2dbody"].SetLinearVelocity( new b2Vec2(0,0));

                
                this.pieces[i]["active"] = 1;
                return ;
            }
        }
    }



    //--------
    on_all_pieces_stop() {
        

        this.wait_all_pieces_stop = 0;
        this.display_msg = "";

        let change_of_turn          = 0;
        let red_pocketed            = 0;
        let striker_pocketed        = 0;
        let opponent_piece_pocketed = 0;
        let own_piece_pocketed      = 0; 

        let ori_turn                = this.whose_turn;
        let oppo_turn               = 1 - this.whose_turn;

        this.striker["box2dbody"].SetLinearVelocity( new b2Vec2( 0 , 0 ) );


        if ( this.tmp_pocketed.length > 0 ) {

            // We check if we pocketed any of our own piece.
            for ( let i = 0 ; i < this.tmp_pocketed.length ; i++) {

                let piece = this.tmp_pocketed[i];

                if ( piece["color"] != this.whose_turn ) {
                
                    if ( piece["color"] <= 1 ) {
                        
                        opponent_piece_pocketed = 1;
                        
                    } else if ( piece["color"] == 3 ) {
                    
                        striker_pocketed = 1;
                        
                    
                    } else if ( piece["color"] == 2 ) {
                        red_pocketed = 1;
                    
                    }
                } else {
                    own_piece_pocketed = 1;
                }
            }



            
            if ( striker_pocketed == 1) {

                // Striker pocketed.
                this.display_msg = "Foul! You pocketed striker. End of Turn. ";
                this.whose_turn = ( ori_turn + 1 ) % 2;
                change_of_turn = 1;

                
            } else if ( opponent_piece_pocketed == 1 ) {

                // Opp piece pocketed
                this.display_msg = "Foul! You pocketed opponent's piece. End of turn.";
                this.whose_turn = ( ori_turn + 1 ) % 2;
                change_of_turn = 1;
                        
           
            } else if ( red_pocketed == 1 ) {
                
                if ( own_piece_pocketed == 0 ) {
                    // Red pocketed but not own piece
                    this.display_msg = "Red Pocketed. Need to pocket one of your piece to cover the queen in following turn.";
                    this.red_cleared = 1;

                } else {
                    // Within same turn, red and own piece pocketed.
                    this.red_cleared = 2;
                    this.display_msg = "Red Pocketed and Covered.";
                }

            } 



        } else {
            // Nothing pocketed, change of turn.
            this.display_msg = "Nothing pocketed. End of turn.";
            this.whose_turn = ( ori_turn + 1 ) % 2;
            change_of_turn = 1;
        }

       



        // table has any remaining of your piece? 
        let has_remaining = [0,0];
        for ( let i = 0 ; i < this.pieces.length ; i++ ) {
            if ( this.pieces[i]["color"] < 2 && this.pieces[i]["active"] == 1 ) {
                has_remaining[ this.pieces[i]["color"] ] = 1;
            }
        }



        if ( has_remaining[ori_turn] == 0 ) {
            if ( this.red_cleared == 0 ) {
                this.display_msg += "\nFoul! Red needs to be cleared before your last piece is pocketed. Your piece is returned to table";
                this.put_back_piece( ori_turn );
                this.whose_turn = ( ori_turn + 1 ) % 2;
                change_of_turn = 1;
            }
        }

        

        if ( change_of_turn == 0 ) {

            // Within different turn, red cleared
            if ( this.red_cleared == 1 ) {
                this.red_cleared = 2;
            }
            

            if ( has_remaining[ori_turn] > 0 ) {
                this.display_msg += "Good Shot. "+ this.display_names[ori_turn] + "(" + ["White","Black"][ori_turn]+ ") turn again.";
            } else {
                
                this.wingame( ori_turn );
                this.gameover = 1;
            }
        } else {
            if ( has_remaining[oppo_turn] == 0 ) {
                this.wingame( oppo_turn );
                this.gameover = 1;

            }
        }
        

        if ( change_of_turn == 1 && ( this.red_cleared == 1  || red_pocketed == 1 ) && this.gameover == 0 ) {
            this.display_msg += "Red has been put back due to not covered successfully.";
            this.put_back_piece(2);
            this.red_cleared = 0;
            if ( has_remaining[ori_turn] == 0 ) {
                this.put_back_piece( ori_turn );
            }
        }

        


        this.play_turn_procedure();

        

    }
    //---
    wingame( winturn ) {
        
        this.display_msg = "The winner is " + this.display_names[winturn];
        if ( winturn == 0 ) {
            this.display_msg += "Congratulation!";
            this.update_highscore(1);
        } else {
            this.display_msg += "Better luck next time!";
            this.update_highscore(0);
        }
    }
    

    //--------
    // Button onclicked
    txclickable_button_onclick( id ,  userData ) {

        log( "txclickable_button_onclick", id , userData );

        if ( id == "deal") {
            
            this.new_round();

        } else if ( id == "help") {
            openExternalURL("https://www.youtube.com/watch?v=R0inyabgB-Y");
        }
    }


    //--------
    adjust_angle_by_turn() {
        if ( this.whose_turn == 0 ) {
            if ( this.angle < -45 ) {
                this.angle = -45;
            }
            if ( this.angle > 45 ) {
                this.angle = 45;
            }

        } else {
            if ( this.angle < 135 ) {
                this.angle = 135;
            }
            if ( this.angle > 225 ) {
                this.angle = 225;
            }
        }
    }

    //------------------------
    update(dt) {

        if ( this.gameover == 0 ) {

            this.world.Step( 0.05  , 10, 10 );
            
            for ( let i = 0 ; i < this.pieces.length ; i++) {

                let piece = this.pieces[i];

                if ( piece["entered_hole"] == 1) {

                    piece["box2dbody"].SetPosition( new b2Vec2(-2,-2) );
                    piece.getComponent( Transform ).position.y = -500;
                    this.tmp_pocketed.push( piece );
                    piece["entered_hole"] = 0;
                    piece["active"] = 0;
                } 
                piece.getComponent( Transform ).position.x = piece["box2dbody"].GetPosition().x;
                piece.getComponent( Transform ).position.z = piece["box2dbody"].GetPosition().y;
            }
            
            if ( this.any_piece_still_moving() == 0  ) {

                if ( this.adjustleft == 1 ) {
                    this.angle = ( this.angle - 1 ) % 360;
                    this.adjust_angle_by_turn();

                }
                if ( this.adjustright == 1 ) {
                    this.angle = ( this.angle + 1 ) % 360;
                    this.adjust_angle_by_turn();
                }
                this.striker["guideline"].getComponent(Transform).rotation.eulerAngles = new Vector3( 0 , this.angle  , 0) ;
                
                this.striker["guideline"].getComponent(Transform).position.x = this.striker.getComponent( Transform ).position.x ;
                this.striker["guideline"].getComponent(Transform).position.y = this.striker.getComponent( Transform ).position.y ;
                this.striker["guideline"].getComponent(Transform).position.z = this.striker.getComponent( Transform ).position.z ;

                
                if ( this.adjustpower == 1 ) {
                    if ( this.power < 1 ) {
                        this.power += 0.01;
                    }
                }

                let sz = this.power * 0.5 + 0.25;
                this.striker["guideline_line"].getComponent(Transform).scale.z = sz;
                this.striker["guideline_line"].getComponent(Transform).position.z = sz / 2;
                
                if ( this.wait_all_pieces_stop == 1 ) {
                    this.on_all_pieces_stop();
                }
            }

            // AI
            if ( this.ai_phase == 1 ) {

                this.tick += 1;
                if ( this.tick > 30 ) {
                    this.ai_phase = 2;
                    this.tick = 0;
                }

            } else if ( this.ai_phase == 2 ) {
                
                this.ai_place_striker();
                this.ai_phase = 3;
                this.tick = 0;

            } else if ( this.ai_phase == 3 ) {

                this.tick += 1;
                if ( this.tick > 60 ) {
                    this.ai_phase = 4;
                    this.tick = 0;
                }
            } else if ( this.ai_phase == 4 ) {
                if ( this.power < this.ai_targetpower ) {
                    this.power += 0.01; 
                } else {
                    this.ai_phase = 5;
                }
            } else if ( this.ai_phase == 5 ) {
                this.releasepower();
                this.ai_phase = 0;
            }
            
        }

    }   

    
	
}