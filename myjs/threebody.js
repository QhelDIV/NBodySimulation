/**
 * Created by Xingguang on 2015/9/8.
 */
/**
 * Created by Xingguang on 2015/9/8.
 */

var camera, controls, scene, renderer;
//GUI variables
var gui, parameters, PLaw,Controled_Radius;

var geometry, bodys=[],material=[], ptlight;
var lastdate= Date.now(),timestep=0.0,SkySphereRadius=7000.0;

var PosScale=3000.0,VelocityScale=1000.0,BodyRadius=300.0;
var MAXOBJN=10;

var BODY_MASS=10000000.0;
var G=10000;
var Crash_slowdown=1.0;
var SlowRate=1.0;

var texture_dict={
    0:'textures/texture_sun.jpg',
    1:'textures/texture_mercury.jpg',
    2:'textures/texture_venus_surface.jpg',
    3:'textures/texture_earth_clouds.jpg',
    4:'textures/texture_mars.jpg',
    5:'textures/texture_jupiter.jpg',
    6:'textures/texture_saturn.jpg',
    7:'textures/texture_uranus.jpg',
    8:'textures/texture_neptune.jpg',
    9:'textures/texture_moon.jpg'
};

function Obj(mesh,radius,index,mass) {
    this.mesh=mesh;
    this.index=index;
    this.position=new THREE.Vector3();
    this.mesh.position = this.position;
    this.velocity=new THREE.Vector3();
    this.acceleration=new THREE.Vector3();

    this.radius=radius;
    this.mass=mass;
    this.motion_init = function (){
        this.position=RandomVector(PosScale);
        this.velocity=RandomVector(VelocityScale);
        this.mesh.position = this.position;
    }
}
function RandomVector(radius){
    return new THREE.Vector3(   Math.random()*radius*2-radius,
        Math.random()*radius*2-radius,
        Math.random()*radius*2-radius);
}
function VelocityAfterCollision(Velocity,SurfaceNorm){
    var norm=new THREE.Vector3();norm.copy(SurfaceNorm);
    var NewVelocity=new THREE.Vector3();NewVelocity.copy(Velocity);
    norm.normalize();
    norm.multiplyScalar(-2.0*norm.dot(Velocity));
    NewVelocity.add(norm);
    return NewVelocity;
}

function init () {
    var i;
    var canvasWidth = window.innerWidth;
    var canvasHeight = window.innerHeight;
    var canvasRatio = canvasWidth / canvasHeight;


    //GUI
    gui = new dat.GUI();
    parameters = {
        PhysicsLaw:"/R^2",
        Radius:BodyRadius,
        ObjN:3
    };
    PLaw = gui.add( parameters, 'PhysicsLaw', [ "/R^2", "/R"] ).name('Physical law').listen();
    var objn = gui.add( parameters, 'ObjN').min(1).max(9).step(1).name('Object Number').listen();
    console.log(parameters['ObjN']);
    //Controled_Radius = gui.add( parameters, 'Radius' ).min(128).max(1000).step(16).name('Body Radius');
    //Controled_Radius.onChange(function(value)
    //{   for(var i=0;i<ObjN;i++){bodys[i].radius=value;bodys[i].mesh.geometry.radius=value;}   });
    PLaw.onChange(function(value)
    {   updateLaw(value);   });
    objn.onChange(function(value)
    { updateBodys(value);});

    scene = new THREE.Scene();
//    renderer.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );
//    renderer.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
//    renderer.domElement.addEventListener( 'mouseup', onDocumentMouseUp, false );
    camera = new THREE.PerspectiveCamera(45,canvasRatio, 1, 100000);
    camera.position.z = SkySphereRadius;
    scene.add(camera);


    if (Detector.webgl )  renderer = new THREE.WebGLRenderer( {antialias:true}); else  renderer = new THREE.CanvasRenderer( {antialias:true});
    // renderer.setClearColor( 0xffffff, 1 );
    renderer.setSize( canvasWidth/4*3, canvasHeight/4*3);
    renderer.shadowMapEnabled=true;
    document.getElementById("center").appendChild(renderer.domElement);
    controls = new THREE.OrbitControls( camera, renderer.domElement );
    var spheregeometry = new THREE.SphereGeometry(BodyRadius,48,48);
    var galaxy_texture=THREE.ImageUtils.loadTexture('textures/galaxy.png');
    material.push(new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture(texture_dict[0])}));
    for(i=1;i<MAXOBJN;i++){
        material.push(new THREE.MeshPhongMaterial( { map: THREE.ImageUtils.loadTexture(texture_dict[i])} )    );
        material[i].shininess=100;
    }
    for(i=0;i<MAXOBJN;i++){
        var mesh = new THREE.Mesh( spheregeometry, material[i] );
        bodys.push( new Obj(mesh,BodyRadius,i,BODY_MASS)  );
        bodys[i].motion_init();
        if(i>=parameters.ObjN)
            bodys[i].mesh.visible=false;
        scene.add( bodys[i].mesh );

    }

    //skySphere
    var skySphereGeometry = new THREE.SphereGeometry( SkySphereRadius, 32,32 );
    var skySphereMaterial = new THREE.MeshBasicMaterial( { map:galaxy_texture, side: THREE.BackSide } );
    var skySphere = new THREE.Mesh( skySphereGeometry, skySphereMaterial );
    scene.add(skySphere);

    ptlight = new THREE.PointLight(0xffffff,1);
    ptlight.position.set( bodys[0].position.x,bodys[0].position.y,bodys[0].position.z );
    //ptlight.castShadow=true;
    scene.add( ptlight );
    scene.add( new THREE.AmbientLight( 0x333333 ) );

}
function updateLaw(v) {
    var value=parameters.PhysicsLaw;
    if(value == "/R"){
        BODY_MASS=30000.0;
        G=100;
    }else if(value == "/R^2"){
        BODY_MASS=1000000.0;
        G=10000;
    }
}
function updateBodys(v){
    var i;
    for(i=1;i<MAXOBJN;i++) {
        if(bodys[i].mesh.visible==false)bodys[i].motion_init();
        bodys[i].mesh.visible=false;
    }
    for(i=1;i<parameters.ObjN;i++){
        bodys[i].mesh.visible=true;
    }
}
function render() {
    renderer.render(scene, camera);
    controls.update();
}
/*
 *   update for each frame, according to timestep change
 *   first update acceleration
 *   then update velocity and position
 *   Object Orientation are updated as well
 * */
function update(timestep){
    var i, j,velocity_increment=new THREE.Vector3(0,0,0),displacement=new THREE.Vector3(),pos=new THREE.Vector3();

    //calculate acceleration
    for(i=0;i<parameters['ObjN'];i++){
        var total_ac = new THREE.Vector3(0.0,0.0,0.0);
        var mypos = new THREE.Vector3();mypos.copy(bodys[i].position);
        for(j=0;j<parameters['ObjN'];j++)if(i!=j){
            var relative = new THREE.Vector3();relative.copy(bodys[j].position);relative.sub(mypos);
            var distance = relative.length();


            //Collision detection
            var displacement1=new THREE.Vector3(),displacement2=new THREE.Vector3();
            displacement1.copy(bodys[i].velocity);displacement2.copy(bodys[j].velocity);
            displacement1.multiplyScalar(timestep/SlowRate);displacement2.multiplyScalar(timestep/SlowRate);
            displacement.subVectors(displacement2,displacement1);
            relative.add(displacement);
            distance=relative.length();
            if(distance<bodys[i].radius+bodys[j].radius){
                var norm = new THREE.Vector3();
                norm.crossVectors(bodys[i].velocity,relative);  //norm :=velocity x wall(the wall direction)
                norm.cross(relative);                           //norm :=norm x relative
                bodys[i].velocity.copy(VelocityAfterCollision(bodys[i].velocity,norm));
                bodys[i].velocity.multiplyScalar(Crash_slowdown);
            }
        }

        var multiplier;
        relative.normalize();
        if(parameters.PhysicsLaw=="/R") {
            multiplier= G * BODY_MASS / (distance);
        }else{multiplier=G * BODY_MASS / (distance*distance);}
        if(multiplier>800)multiplier=800;
        relative.multiplyScalar(multiplier);
        total_ac.add(relative);

        bodys[i].acceleration.copy(total_ac);
    }
    for(i=0;i<parameters['ObjN'];i++){
        velocity_increment.copy(bodys[i].acceleration);velocity_increment.multiplyScalar(timestep);
        bodys[i].velocity.add(velocity_increment);

        displacement=new THREE.Vector3();
        displacement.copy(bodys[i].velocity);
        displacement.multiplyScalar(timestep/SlowRate);
        bodys[i].position.add( displacement );

        // if the body hit the SkySphere then bounce back by set its velocity back like mirror reflection
        if(bodys[i].position.length()+bodys[i].radius>SkySphereRadius){

            norm=new THREE.Vector3();norm.sub(bodys[i].position);
            bodys[i].velocity.copy(VelocityAfterCollision(bodys[i].velocity,norm));
            displacement.copy(bodys[i].velocity);displacement.multiplyScalar(timestep);
            bodys[i].position.add(displacement);
        }

        bodys[i].mesh.position.copy(bodys[i].position);

        //update orientation
        var adir=new THREE.Vector3();adir.copy(bodys[i].acceleration);adir.normalize();
        var x=adir.x,y =adir.y,z=adir.z;
        bodys[i].mesh.rotation.x+=0.005;
        bodys[i].mesh.rotation.y+=0.002;
        bodys[i].mesh.rotation.z+=0.0001;
    }

    ptlight.position.copy(bodys[0].position);
}
var current;
function animate() {

    requestAnimationFrame( animate );
    current = Date.now();
    timestep = current - lastdate;
    lastdate = current;
    //console.log(lastdate);
    //console.log(current);
    //console.log(timestep);
    update(timestep/1000);
    render();
}

init();
lastdate=Date.now();
animate();
