
//--------------
export class CannonBox extends Entity {

    public boxBody:CANNON.Body ;

    public ori_pos:Vector3 = new Vector3;
    public ori_rot:Vector3 = new Vector3;
    public isLeftOver:boolean;

   
    constructor( position: Vector3 , scale: Vector3 , world:CANNON.World , physicMaterial , mass:number , gltfshape:Shape ) {

        super();
        
        this.addComponent( new Transform({
            position: new Vector3( position.x , position.y , position.z ),
            scale: new Vector3(  scale.x , scale.y , scale.z )
        }));    
        this.addComponent( gltfshape );
        this.boxBody = new CANNON.Body({
            mass: mass, // kg
            position: new CANNON.Vec3( position.x , position.y , position.z ), // m
            shape: new CANNON.Box( new CANNON.Vec3( scale.x/2 , scale.y/2 , scale.z/2 ) )
        })

        this.boxBody.material = physicMaterial
        this.boxBody.linearDamping = 0.1
        this.boxBody.angularDamping = 0.1
        world.addBody(this.boxBody) // Add ball body to the world
    }

    //------
    updatePos() {
        //this.getComponent(Transform).position.copyFrom( this.boxBody.position);
        this.getComponent(Transform).position.x = this.boxBody.position.x;
        
        if ( this.boxBody.position.y < 32 ) {
            this.getComponent(Transform).position.y = this.boxBody.position.y;
        }
        this.getComponent(Transform).position.z = this.boxBody.position.z;
        
    }

    //----
    updateRot() {
        this.getComponent(Transform).rotation.copyFrom( this.boxBody.quaternion);
    }

    //------
    setPos( x , y , z  ) {

        this.boxBody.velocity.x = 0;
        this.boxBody.velocity.y = 0;
        this.boxBody.velocity.z = 0;
        this.boxBody.angularVelocity.x = 0;
        this.boxBody.angularVelocity.y = 0;
        this.boxBody.angularVelocity.z = 0;
        

        this.boxBody.position.x = x;
        this.boxBody.position.y = y;
        this.boxBody.position.z = z;
        this.updatePos();
    }

    //-----
    setRot( x , y , z ) {
        this.boxBody.quaternion.x = x ;
        this.boxBody.quaternion.y = y ;
        this.boxBody.quaternion.z = z ;
        this.updateRot();
    }

    setVelocity( x,y,z) {
        this.boxBody.velocity.x = x;
        this.boxBody.velocity.y = y;
        this.boxBody.velocity.z = z;
        
    }

    setAngularVelocity( x,y,z) {
        this.boxBody.angularVelocity.x = x;
        this.boxBody.angularVelocity.y = y;
        this.boxBody.angularVelocity.z = z;
        
    }

   //------
    rememberOriginal() {
       
        this.ori_pos.copyFrom( this.boxBody.position );
        this.ori_rot.copyFrom( this.boxBody.quaternion );
        
    }

   //-----
   updateIsLeftOver() {
        
        
        let diff_x = this.boxBody.position.x - this.ori_pos.x ;
        let diff_y = this.boxBody.position.y - this.ori_pos.y ;
        let diff_z = this.boxBody.position.z - this.ori_pos.z ;
        
        if ( diff_x * diff_x + diff_y * diff_y + diff_z * diff_z > 0.02 ) {
            this.isLeftOver = false;
            return false;
        }

        let diff_rx = this.boxBody.quaternion.x - this.ori_rot.x ;
        let diff_ry = this.boxBody.quaternion.y - this.ori_rot.y ;
        let diff_rz = this.boxBody.quaternion.z - this.ori_rot.z ;

        if ( diff_rx * diff_rx + diff_ry * diff_ry + diff_rz * diff_rz > 0.04 ) {
            this.isLeftOver = false;
            return false;
        }

        this.boxBody.sleep();   
        this.isLeftOver = true;    
        

        return true;

   }
}

