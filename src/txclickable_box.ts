
import resources from "src/resources";

export class Txclickable_box extends Entity {
	
	public id:string;
	public transform:Transform;
	public parent;

	public text_shape:TextShape;
	public text_transform:Transform;
	public box_transform;

	public visible = 1;
	public visible_ypos ;

	public userData = "";

	constructor(
			lbl:string,
			id:string,
			transform_args: TranformConstructorArgs,
			parent,
			stage,
            material
	) {

		super();
		
		this.id = id;
		this.parent = parent;
		this.transform = new Transform( transform_args );
		this.setParent( parent );
		
		this.addComponent( this.transform );
		this.transform.rotation.eulerAngles = new Vector3( 0 , 0 , 0 );
		

		let box_entity 		= new Entity();
		let box_transform   = new Transform( {
			position: new Vector3( 0, 0, 0),
			scale   : new Vector3( 8, 1.5, 0.5)
		});
		let box_shape 		= new BoxShape();
		let box_material 	= material;

		box_entity.addComponent( box_transform );
		box_entity.addComponent( box_shape );
		box_entity.addComponent( box_material );
		box_entity.addComponent( new OnPointerDown(
			(e) => {
				stage.txclickable_button_onclick( this.id , this.userData );
			},
			{
			   	distance: 38
			}
		));
		box_entity.setParent(this);
		this.box_transform = box_transform;
			


		let text_entity 	 = new Entity();
		this.text_shape 		 = new TextShape( lbl );
		this.text_shape.color    = Color3.White();
		this.text_transform  = new Transform({
			position : new Vector3 ( 0,  0 , 0.3 ), 
    		scale    : new Vector3 ( 0.75,  0.75,  0.75 )
		});
		this.text_transform.rotation.eulerAngles = new Vector3(0,180,0);

		text_entity.addComponent(this.text_shape);
		text_entity.addComponent(this.text_transform);
		text_entity.setParent( this);
		
		this.visible_ypos = this.transform.position.y;		

	}

	//--------------------------
	// This is like a timer
	update(dt: number) {

    }

    //-----
    hide() {
    	this.visible = 0;
    	this.transform.position.y = -999;
    }

    show() {
    	this.visible = 1;
    	this.transform.position.y = this.visible_ypos;
    }
}