import resources from "./resources";

export class Sicbo extends Entity implements ISystem {

    public stage;
    public materials ;
    
    public sicbo_set;
    public sicbo_cup;
    public sicbo_base;
    public sicbo_pad ;


    public anim_dealing = 0;
    public dices_ent = [];
    public wager_ent = {};
    public final_scores ;
    
    public ui_root_for_distance_toggle;
    public ui_announcement;
    public ui_announcement_tick = 0;
    public ui_network_msg;

    public last_results = [];
    public sounds = {} ;

    public update_score_tick = 0;


    
    constructor( stage ){
        
        super();
        this.setParent(stage);
        this.stage = stage;

        this.createMaterials();
        this.createUI();
        this.init_sounds();

        this.init_entities();
        this.final_scores = stage.final_scores;

        engine.addSystem( this );

    }

     //--------
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
		
        ui_network_msg.value = "SicBo: Single Player Mode";
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

    //---------------
    init_sounds() {
        this.sounds = this.stage.sounds;
    }

    //---------
    init_entities() {
        
        this.addComponent( new Transform({
            position: new Vector3(8, 1.05 ,8),
            scale: new Vector3(1 , 1, 1 )
        }));
        
        



        let sicbo_pad_root = new Entity();
        sicbo_pad_root.setParent( this );
        sicbo_pad_root.addComponent( new Transform({
            position: new Vector3(0,-0.05, -0.3),
            scale: new Vector3(1,1,1)
        }))

        let sicbo_pad = new Entity();
        sicbo_pad.setParent(sicbo_pad_root);
        sicbo_pad.addComponent( new Transform({
            position: new Vector3( 0,  0.025, 0 ),
            scale: new Vector3( 1.9 , 1.5 , 1)
        }));
        sicbo_pad.addComponent( new PlaneShape() );
        sicbo_pad.addComponent( this.materials[8] );
        sicbo_pad.getComponent( Transform ).rotation.eulerAngles = new Vector3( 90, 180, 0);
        
        sicbo_pad["onpointerdown"] = new OnPointerDown(
            (e)=>{
                this.sicbo_pad_onclick(e);
            },{
                hoverText:"E. Place your bet. F to remove"
            }
        )
        sicbo_pad.addComponent( sicbo_pad["onpointerdown"] );
        

        this.sicbo_pad = sicbo_pad


        let sicbo_set = new Entity();
        sicbo_set.setParent( this );
        sicbo_set.addComponent( new Transform({
            position: new Vector3(0, -0.05, 0.76 ),
            scale: new Vector3( 0.28, 0.28 ,0.28 )
        }))
        sicbo_set["ori_pos"] = new Vector3( 
            sicbo_set.getComponent(Transform).position.x, 
            sicbo_set.getComponent(Transform).position.y, 
            sicbo_set.getComponent(Transform).position.z 
        );

        
        this.sicbo_set = sicbo_set;


        let sicbo_base = new Entity() ;
        sicbo_base.setParent( sicbo_set );
        sicbo_base.addComponent( new Transform({
            position: new Vector3(0,0,0),
            scale: new Vector3(1,1,1)
        })) 
        sicbo_base.addComponent( resources.models.sicbo_base);
        sicbo_base["onpointerdown"] = new OnPointerDown(
            (e)=>{  
                this.start_roll_dice();
            },{ 
                hoverText:"Roll Dice"
            }
        )
        sicbo_base.addComponent( sicbo_base["onpointerdown"] );
        this.sicbo_base = sicbo_base;
        
        let sicbo_cup = new Entity() ;
        sicbo_cup.setParent( sicbo_set );
        sicbo_cup.addComponent( new Transform({
            position: new Vector3(0,0,0),
            scale: new Vector3(1,1,1)
        })) 
        sicbo_cup.addComponent( resources.models.sicbo_cup);
        this.sicbo_cup = sicbo_cup;
        
        sicbo_cup["onpointerdown"] = new OnPointerDown(
            (e)=>{  
                this.start_roll_dice();
            },{ 
                hoverText:"Roll Dice"
            }
        )
        sicbo_cup.addComponent( sicbo_cup["onpointerdown"] );
        
        
        let dice = new Entity();
        dice.setParent( sicbo_set );
        dice.addComponent( new Transform({
            position: new Vector3(0, 0.35 ,0),
            scale: new Vector3( 0.3 ,0.3 , 0.3 )
        }))
        dice.addComponent( resources.models.dice );
        this.dices_ent.push( dice );


        dice = new Entity();
        dice.setParent( sicbo_set );
        dice.addComponent( new Transform({
            position: new Vector3(-0.35, 0.35 ,0),
            scale: new Vector3( 0.3 ,0.3 , 0.3 )
        }))
        dice.addComponent( resources.models.dice );
        this.dices_ent.push( dice );
        

        dice = new Entity();
        dice.setParent( sicbo_set );
        dice.addComponent( new Transform({
            position: new Vector3( 0.35, 0.35 ,0),
            scale: new Vector3( 0.3 ,0.3 , 0.3 )
        }))
        dice.addComponent( resources.models.dice );
        this.dices_ent.push( dice );
        
        let common_planeshape = new PlaneShape();

       

    }

    //---------
    sicbo_pad_onclick(e) {
        
        let but_id = e.buttonId ;

        //log("sicbo_pad_onclick", e.hit.hitPoint.x , e.hit.hitPoint.z );
        let rem_off_x = e.hit.hitPoint.x - this.sicbo_pad.getParent().getComponent(Transform).position.x  ;
        let rem_off_z = e.hit.hitPoint.z - this.sicbo_pad.getParent().getComponent(Transform).position.z  ;

        rem_off_x = rem_off_x - this.getComponent(Transform).position.x ;
        rem_off_z = rem_off_z - this.getComponent(Transform).position.z ;

        rem_off_x = rem_off_x - this.getParent().getComponent(Transform).position.x;
        rem_off_z = rem_off_z - this.getParent().getComponent(Transform).position.z;

        log("sicbo_pad_onclick", rem_off_x, rem_off_z );

        let size_x = this.sicbo_pad.getComponent(Transform).scale.x;
        let size_z = this.sicbo_pad.getComponent(Transform).scale.y;

        let z_row = (( rem_off_z +  size_z / 2 ) * 5.0 / size_z  ) >> 0;
        let x_col = 0;

        if ( z_row == 0 ) {
            
            x_col =   (( rem_off_x + size_x / 2 ) * 6.0 / size_x ) >> 0;
            
        } else if ( z_row == 1 ) {

            x_col =   (( rem_off_x + size_x / 2 ) * 16.0 / size_x ) >> 0;
        
        } else if ( z_row == 2 ) {

            x_col =   (( rem_off_x + size_x / 2 ) * 14.0 / size_x ) >> 0;
        
        } else if ( z_row == 3 ) {

            x_col =   (( rem_off_x + size_x / 2 ) * 19.0 / size_x ) >> 0;
            if ( x_col < 5 ) {
                x_col = 2;
            }
            if ( x_col >= 8 && x_col <= 10) {
                x_col = 9;
            }
            if ( x_col >= 14 ) {
                x_col = 16;
            }
            

            
        } else if ( z_row == 4 ) {

            x_col =   (( rem_off_x + size_x / 2 ) * 12.0 / size_x ) >> 0;
            if ( x_col <= 2 ) {
                z_row = 3;
                x_col = 2;

            }
            if ( x_col >= 9 ) {
                z_row = 3;
                x_col = 16;
            }
            
        }   
        
        log( z_row , x_col );
        this.create_wager_ent_ondemand( z_row , x_col , but_id );
        
        
    }

    //--------
    create_wager_ent_ondemand( z_tile, x_tile , but_id ) {

        let bet_val = 1;

        if ( z_tile == 1 && x_tile == 0 ){
            // Cannot place bet here.
            return;
        }

        if ( but_id <= 1 ) {

            if ( this.final_scores[0] > 0 ) {
                
                this.final_scores[0] -= bet_val;
                this.stage.render_scores();
                this.update_score_tick = 60;

                this.sounds["placechip"].playOnce();
        
            } else {
                this.displayAnnouncement("Not enough Points to place bet.", 5, Color4.Yellow(), 14, false );
                return ;
            }
        

            if ( this.wager_ent[ z_tile + "," + x_tile ] == null ) {
                
                log("Create new ent", z_tile , x_tile );

                let size_x = this.sicbo_pad.getComponent(Transform).scale.x;
                let size_z = this.sicbo_pad.getComponent(Transform).scale.y;

                let col_count = [6,16,14,19,12][z_tile];

                let colsize = size_x / col_count;
                let rowsize = size_z / 5;

                let ent = new Entity();
                let z = -size_z / 2 + rowsize / 2 + z_tile * rowsize;
                let x = -size_x / 2 + colsize / 2 + x_tile * colsize;

                if ( z_tile == 4 ) {
                    z += 0.05;
                }
                if ( z_tile == 3 && x_tile >= 5 && x_tile <= 7) {
                    z += 0.05;
                }
                if ( z_tile == 3 && x_tile >= 11 && x_tile <= 13 ) {
                    z += 0.05;
                }



                ent.setParent( this.sicbo_pad.getParent() );
                ent.addComponent( new Transform({
                    position: new Vector3( x , 0.03 ,z ),
                    scale: new Vector3( 1 , 1 , 1)
                }))
                ent.addComponent( resources.models.chip );

                let ent_val = new Entity();
                ent_val.setParent( ent );
                ent_val.addComponent( new Transform({
                    position: new Vector3(0, 0.05 ,0),
                    scale: new Vector3( 0.06, 0.06 , 0.06 ),
                }))
                ent_val.addComponent( new TextShape( bet_val.toString() ) );
                ent_val.getComponent( TextShape ).color = Color3.Black();
                ent["ent_val"] = ent_val;
                
                this.wager_ent[ z_tile + "," + x_tile ] = ent;


            } else {
                let ent_val_txt = this.wager_ent[ z_tile + "," + x_tile ]["ent_val"].getComponent(TextShape);
                ent_val_txt.value = parseInt( ent_val_txt.value ) + bet_val;

            }

        } else if ( but_id == 2 ) {
            
            if ( this.wager_ent[ z_tile + "," + x_tile ] != null ) {
                let ent_val_txt = this.wager_ent[ z_tile + "," + x_tile ]["ent_val"].getComponent(TextShape);
                let new_value = parseInt( ent_val_txt.value ) - bet_val;
                ent_val_txt.value = new_value ;
                
                this.final_scores[0] += bet_val;
                this.stage.render_scores();
                this.update_score_tick = 60;
                

                this.sounds["removechip"].playOnce();

                if ( new_value <= 0 ) {
                    engine.removeEntity( this.wager_ent[ z_tile + "," + x_tile ]["ent_val"] );
                    engine.removeEntity( this.wager_ent[ z_tile + "," + x_tile ] );
                    this.wager_ent[ z_tile + "," + x_tile ] = null;
                    
                } 
            }
        }
    }


    //---------
    safe_incr( obj , key, val ) {
        if ( obj[key] == null ) {
            obj[key] = 0;
        }
        obj[key] += val;
    }


    //------------------
    verdict() {

        let winning_sum = 0;
        let losing_sum  = 0;

        let tmp_stat = {};
        let sum = 0;
        for ( let d = 0 ; d < this.last_results.length ; d++ ) {
            this.safe_incr( tmp_stat, this.last_results[d], 1 );
            sum += ( this.last_results[d] + 1)
        }
        

        log( "last_results", this.last_results );

        for ( let z_tile = 0 ; z_tile < 5 ; z_tile++ ) {
            let col_count = [6,16,14,19,12][z_tile];

            for ( let x_tile = 0 ; x_tile < col_count ; x_tile += 1 ) {
                if ( this.wager_ent[ z_tile + "," + x_tile ] != null ) {

                    log("has bet on", z_tile , x_tile , "sum" , sum , Object.keys(tmp_stat) );

                    let bet_val = parseInt( this.wager_ent[ z_tile + "," + x_tile ]["ent_val"].getComponent(TextShape).value );
                    let multiplier = 0;

                    if ( z_tile == 0 ) {
                        // Single number. every die gives 1 x
                        for ( let d = 0 ; d < this.last_results.length ; d++ ) {
                            if ( this.last_results[d] == 5 - x_tile ) {
                                multiplier += 1;
                            }
                        }
                    } else if ( z_tile == 1 ) {
                        // 2 numbers. 
                        
                        if ( x_tile == 1 && tmp_stat[0] >= 1 && tmp_stat[1] >= 1 ) {
                            multiplier += 5;
                        } else if ( x_tile == 2 && tmp_stat[1] >= 1 && tmp_stat[3] >= 1 ) {
                            multiplier += 5;
                        } else if ( x_tile == 3 && tmp_stat[0] >= 1 && tmp_stat[3] >= 1 ) {
                            multiplier += 5;
                        
                        } else if ( x_tile == 4 && tmp_stat[1] >= 1 && tmp_stat[2] >= 1 ) {
                            multiplier += 5;
                        } else if ( x_tile == 5 && tmp_stat[2] >= 1 && tmp_stat[3] >= 1 ) {
                            multiplier += 5;
                        
                        } else if ( x_tile == 6 && tmp_stat[1] >= 1 && tmp_stat[4] >= 1 ) {
                            multiplier += 5;
                        
                        } else if ( x_tile == 7 && tmp_stat[2] >= 1 && tmp_stat[4] >= 1 ) {
                            multiplier += 5;
                        
                        } else if ( x_tile == 8 && tmp_stat[1] >= 1 && tmp_stat[5] >= 1 ) {
                            multiplier += 5;
                        
                        } else if ( x_tile == 9 && tmp_stat[3] >= 1 && tmp_stat[4] >= 1 ) {
                            multiplier += 5;    
                        } else if ( x_tile == 10 && tmp_stat[2] >= 1 && tmp_stat[5] >= 1 ) {
                            multiplier += 5;    
                        
                        } else if ( x_tile == 11 && tmp_stat[0] >= 1 && tmp_stat[4] >= 1 ) {
                            multiplier += 5;    
                        
                        } else if ( x_tile == 12 && tmp_stat[0] >= 1 && tmp_stat[5] >= 1 ) {
                            multiplier += 5;    
                        
                        } else if ( x_tile == 13 && tmp_stat[3] >= 1 && tmp_stat[5] >= 1 ) {
                            multiplier += 5;    
                        
                        } else if ( x_tile == 14 && tmp_stat[4] >= 1 && tmp_stat[5] >= 1 ) {
                            multiplier += 5;    
                        } else if ( x_tile == 15 && tmp_stat[0] >= 1 && tmp_stat[2] >= 1 ) {
                            multiplier += 5;   
                        }


                    } else if ( z_tile == 2 ) {
                        // Sum
                        if ( (17 - x_tile) == sum ) {
                            multiplier += [50,18,14,12,8,6,6,6,6,8,12,14,18,50][x_tile];
                        }

                    } else if ( z_tile == 3 ) {

                        if ( x_tile == 2 && sum <= 10 && Object.keys(tmp_stat).length > 1 ) {
                            log("SMALL");
                            multiplier = 1;
                        } else if ( x_tile == 16 && sum >= 11 && Object.keys(tmp_stat).length > 1 ) {
                            log("BIG");
                            multiplier = 1;
                        } else if ( x_tile == 9 &&  Object.keys(tmp_stat).length == 1 ) {
                            multiplier = 24;
                        
                        }
                        
                        if ( x_tile == 5 && tmp_stat[1] >= 2 ) {
                           multiplier = 8;
                        } else if ( x_tile == 6 && tmp_stat[2] >= 2 ) {
                            multiplier = 8;
                        } else if ( x_tile == 7 && tmp_stat[4] >= 2 ) {
                            multiplier = 8;
                        } else if ( x_tile == 11 && tmp_stat[3] >= 2 ) {
                            multiplier = 8;
                        } else if ( x_tile == 12 && tmp_stat[0] >= 2 ) {
                            multiplier = 8;
                        } else if ( x_tile == 13 && tmp_stat[5] >= 2 ) {
                            multiplier = 8;
                             
                        }

                        
                    } else if ( z_tile == 4 ) {
                        if ( x_tile == 3 && tmp_stat[5] >= 3 ) {
                            multiplier = 150;
                        } else if ( x_tile == 4 && tmp_stat[4] >= 3 ) {
                            multiplier = 150;
                        } else if ( x_tile == 5 && tmp_stat[3] >= 3 ) {
                            multiplier = 150;
                        } else if ( x_tile == 6 && tmp_stat[2] >= 3 ) {
                            multiplier = 150;
                        } else if ( x_tile == 7 && tmp_stat[1] >= 3 ) {
                            multiplier = 150;
                        } else if ( x_tile == 8 && tmp_stat[0] >= 3 ) {
                            multiplier = 150;
                        }
                        
                    }



                    if ( multiplier > 0 ) {
                        winning_sum += bet_val * multiplier;
                    } else {
                        losing_sum += bet_val;

                        engine.removeEntity( this.wager_ent[ z_tile + "," + x_tile ]["ent_val"] );
                        engine.removeEntity( this.wager_ent[ z_tile + "," + x_tile ] );
                        this.wager_ent[ z_tile + "," + x_tile ] = null;

                    }
                }
            }
        }
        if ( winning_sum > 0 && losing_sum == 0 ) {
            this.displayAnnouncement("You Won " + winning_sum + " pts.", 5, Color4.Yellow(), 14, false );
            

        } else if ( winning_sum == 0 && losing_sum > 0 ) {

            this.displayAnnouncement("You Lose " + losing_sum + " pts.", 5, Color4.Yellow(), 14, false );

        } else if ( winning_sum > 0 && losing_sum > 0 ) {

            this.displayAnnouncement("You Won " + winning_sum + " pts but lose " + losing_sum + " pts.", 5, Color4.Yellow(), 14, false );
        }

        this.final_scores[0] += winning_sum;
        this.stage.render_scores();
        this.update_score_tick = 60;
                
        
    }






    
    //------------------
    start_roll_dice() {
        
        this.sicbo_cup.getComponent(Transform).position.x = 0;
        this.sicbo_cup.getComponent(Transform).position.y = 0;
        
        this.sicbo_set.getComponent(Transform).position.x = this.sicbo_set["ori_pos"].x;
        this.sicbo_set.getComponent(Transform).position.y = this.sicbo_set["ori_pos"].y;
        this.sicbo_set.getComponent(Transform).position.z = this.sicbo_set["ori_pos"].z;
        this.sicbo_set.getComponent(Transform).rotation.z = 0;
        
        /*
        this.dices_ent[1].getComponent(Transform).position.x = Math.random() * 0.15 + -0.35;
        this.dices_ent[1].getComponent(Transform).position.z = Math.random() - 0.5;
        
        this.dices_ent[2].getComponent(Transform).position.z = Math.random() - 0.5;
        this.dices_ent[2].getComponent(Transform).position.x = Math.random() * 0.15 + 0.35;
        */

        
        for ( let i = 0 ; i < 3 ; i++ ) {
            
            let r = 0.2 + Math.random() * 0.5;
            let theta_radian = ( i * 120  + Math.random() * 60 ) * Math.PI / 180.0;

            let x = Math.cos(theta_radian) * r;
            let z = Math.sin(theta_radian) * r;
            this.dices_ent[i].getComponent(Transform).position.x = x;
            this.dices_ent[i].getComponent(Transform).position.z = z;

            //this.dices_ent[i].getComponent(Transform).rotation.y = Math.random() * 180 * Math.PI/ 180.0;

            let rolled = (Math.random() * 6) >> 0;
            
            // DEBUG
            
            this.last_results[i] = rolled;
            
            this.rolled_to_transform( this.dices_ent[i], rolled );
            
            
        }

        this.sicbo_base.removeComponent( OnPointerDown );
        this.sicbo_cup.removeComponent( OnPointerDown );
        this.sicbo_pad.removeComponent( OnPointerDown );
                
        
        this.sounds["rolldice"].playOnce();


        this.anim_dealing = 1;

    }


    //-------------------
    rolled_to_transform( ent, rolled ) {
        
        let x_rot = 0;
        let y_rot = 0;
        let z_rot = 0;

        y_rot = Math.random() * 360 - 180;
        
        if ( rolled == 0 ) {
            z_rot = -90; 
        }
        if ( rolled == 1 ) {
            x_rot = -90;
        }
        if ( rolled == 2 ) {
            x_rot = 180;
        }
        if ( rolled == 4 ) {
            x_rot = 90;
        }
        if ( rolled == 5 ) {
            z_rot = 90;
        }
        ent.getComponent(Transform).rotation.eulerAngles = new Vector3( x_rot ,y_rot , z_rot );


    }


            

    //------------------
    update(dt ) {

        if ( this.anim_dealing == 1 ) {
            this.sicbo_set.getComponent(Transform).position.y += 0.035;
            if (this.sicbo_set.getComponent(Transform).position.y > this.sicbo_set["ori_pos"].y + 0.5 ) {
                this.anim_dealing = 2;
            }
        } else if ( this.anim_dealing >= 2 && this.anim_dealing % 2 == 0 && this.anim_dealing <= 8 ) {
            this.sicbo_set.getComponent(Transform).rotation.z += 0.15;
            if (this.sicbo_set.getComponent(Transform).rotation.z > 0.5 ) {
                this.anim_dealing += 1;
            }
        } else if (this.anim_dealing >= 3 && this.anim_dealing % 2 == 1 && this.anim_dealing <= 8 ) {
            this.sicbo_set.getComponent(Transform).rotation.z -= 0.15;
            if (this.sicbo_set.getComponent(Transform).rotation.z < -0.5 ) {
                this.anim_dealing += 1;
            }  
        } else if ( this.anim_dealing == 9 ) {
            this.sicbo_set.getComponent(Transform).rotation.z -= 0.1;
            if (this.sicbo_set.getComponent(Transform).rotation.z <= 0.0 ) {
                this.sicbo_set.getComponent(Transform).rotation.z = 0.0
                this.anim_dealing = 10;
            }
        } else if ( this.anim_dealing == 10 ) {
            this.sicbo_set.getComponent(Transform).position.y -= 0.035;
            if (this.sicbo_set.getComponent(Transform).position.y <= this.sicbo_set["ori_pos"].y  ) {
                this.anim_dealing = 11;
            }
        } else if ( this.anim_dealing == 11 ) {
            this.sicbo_cup.getComponent(Transform).position.y += 0.2;
            if (this.sicbo_cup.getComponent(Transform).position.y >= 1  ) {
                this.anim_dealing = 12;
            }
        } else if ( this.anim_dealing == 12 ) {
            this.sicbo_cup.getComponent(Transform).position.x += 0.2;
            if (this.sicbo_cup.getComponent(Transform).position.x >= 2  ) {
                this.anim_dealing = 13;
            }
        } else if ( this.anim_dealing == 13 ) {
            this.sicbo_cup.getComponent(Transform).position.y -= 0.2;
            if (this.sicbo_cup.getComponent(Transform).position.y <= 0  ) {
                
                this.anim_dealing = 14;
                this.verdict();
                this.sicbo_base.addComponent( this.sicbo_base["onpointerdown"] );
                this.sicbo_cup.addComponent( this.sicbo_cup["onpointerdown"]  );
                this.sicbo_pad.addComponent( this.sicbo_pad["onpointerdown"] );

            }
        }


        if ( this.ui_announcement_tick > 0 ) {
            this.ui_announcement_tick -= 1;
            if ( this.ui_announcement_tick <= 0 ) {
                this.ui_announcement.value = "";
            }
        }

        if ( this.update_score_tick > 0 ) {
            this.update_score_tick -= 1;
            if ( this.update_score_tick <= 0 ) {
                this.stage.on_score_updated( this.final_scores , 0, this.stage.round , "sicbo" , 0 );
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


