/**
 * Created by Xingguang on 2015/9/8.
 */
/**
 * Created by Xingguang on 2015/9/8.
 */

var camera, controls, scene, renderer;
//GUI variables
var gui, parameters, PLaw,Controled_Radius;

var geometry, bodys=[];
var lastdate= Date.now(),timestep=0.0,SkySphereRadius=5000.0;
var ObjN= 3;

var PosScale=4000.0,VelocityScale=800.0,BodyRadius=180.0;

var BODY_MASS=3000.0;
var G=100;

var SlowRate=50.0;


function Obj(mesh,radius,position,velocity,acceleration,index,mass) {
    this.mesh=mesh;
    this.index=index;
    this.position=position;
    this.velocity=velocity;
    this.acceleration=acceleration;
    this.radius=radius;
    this.mass=mass;
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
    var canvasWidth = window.innerWidth;
    var canvasHeight = window.innerHeight;
    var canvasRatio = canvasWidth / canvasHeight;

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
    var sun_texture=THREE.ImageUtils.loadTexture('textures/texture_sun.jpg');
    var earth_texture=THREE.ImageUtils.loadTexture('textures/texture_earth_clouds.jpg');
    var moon_texture=THREE.ImageUtils.loadTexture('textures/texture_moon.jpg');
    var galaxy_texture=THREE.ImageUtils.loadTexture('textures/galaxy.png');
    var material = [new THREE.MeshBasicMaterial( { map: sun_texture}),
                    new THREE.MeshLambertMaterial( { map: earth_texture} ),
                    new THREE.MeshLambertMaterial( { map: moon_texture})
                    ];
    for(var i=0;i<ObjN;i++){
        var mesh = new THREE.Mesh( spheregeometry, material[i] );
        var position=RandomVector(PosScale);
        var velocity=RandomVector(VelocityScale);
        var acceleration=RandomVector(0.0);
        bodys.push( new Obj(mesh,BodyRadius, position,velocity,acceleration,i,BODY_MASS)  );
        mesh.position.copy(bodys[i].position);
        scene.add( mesh );
    }

    //skySphere
    var skySphereGeometry = new THREE.SphereGeometry( SkySphereRadius, 32,32 );
    var skySphereMaterial = new THREE.MeshBasicMaterial( { map:galaxy_texture, side: THREE.BackSide } );
    var skySphere = new THREE.Mesh( skySphereGeometry, skySphereMaterial );
    scene.add(skySphere);

    var ptlight = new THREE.PointLight(0xffffff,1);
    ptlight.position.set( bodys[0].position.x,bodys[0].position.y,bodys[0].position.z );
    //ptlight.castShadow=true;
    scene.add( ptlight );
    scene.add( new THREE.AmbientLight( 0x333333 ) );

    gui = new dat.GUI();
    parameters = {PhysicsLaw:"/R^2",
                    Radius:BodyRadius};
    PLaw = gui.add( parameters, 'PhysicsLaw', [ "/R^2", "/R"] ).name('Physical law').listen();

    //Controled_Radius = gui.add( parameters, 'Radius' ).min(128).max(1000).step(16).name('Body Radius');
    //Controled_Radius.onChange(function(value)
    //{   for(var i=0;i<ObjN;i++){bodys[i].radius=value;bodys[i].mesh.geometry.radius=value;}   });
    PLaw.onChange(function(value)
    {   updateLaw();   });
}
function updateLaw() {
    var value=parameters.PhysicsLaw;
    if(value == "/R"){
        BODY_MASS=300.0;
        G=10;
    }else{
        BODY_MASS=30000.0;
        G=10000;
    }
}
function render() {
    renderer.render(scene, camera);
    controls.update();
}
/*
*   update for each frame, according to timestep change
* */
function update(timestep){
    var i, j,velocity_increment=new THREE.Vector3(0,0,0);
    //calculate acceleration
    for(i=0;i<ObjN;i++){
        var total_ac = new THREE.Vector3(0.0,0.0,0.0);
        var mypos = new THREE.Vector3();mypos.copy(bodys[i].position);
        for(j=0;j<ObjN;j++)if(i!=j){
            var relative = new THREE.Vector3();relative.copy(bodys[j].position);relative.sub(mypos);
            var distance = relative.length();
            var yourmass = bodys[j].mass;
            relative.normalize();
            if(parameters.PhysicsLaw=="/R") {
                relative.multiplyScalar(G * yourmass / (distance));
            }else{relative.multiplyScalar(G * yourmass / (distance*distance));}

            total_ac.add(relative);

            if(distance<bodys[i].radius+bodys[j].radius){
                var norm = new THREE.Vector3();
                norm.crossVectors(bodys[i].velocity,relative);  //norm :=velocity x wall(the wall direction)
                norm.cross(relative);                           //norm :=norm x relative
                bodys[i].velocity.copy(VelocityAfterCollision(bodys[i].velocity,norm));
            }
        }
        bodys[i].acceleration.copy(total_ac);
    }
    for(i=0;i<ObjN;i++){
        velocity_increment.copy(bodys[i].acceleration);velocity_increment.multiplyScalar(timestep);
        bodys[i].velocity.add(velocity_increment);

        var displacement=new THREE.Vector3();
        displacement.copy(bodys[i].velocity);
        displacement.multiplyScalar(timestep/SlowRate);
        bodys[i].position.add( displacement );

        // if the body hit the SkySphere then bounce back by set its velocity back like mirror reflection
        if(bodys[i].position.length()>SkySphereRadius){

            var norm=new THREE.Vector3();norm.sub(bodys[i].position);
            bodys[i].velocity.copy(VelocityAfterCollision(bodys[i].velocity,norm));
            bodys[i].velocity.multiplyScalar(0.8);
        }

        bodys[i].mesh.position.copy(bodys[i].position);
    }
}
function animate() {

    requestAnimationFrame( animate );
    timestep = Date.now() - lastdate;
    update(1);
    render();
    lastdate = Date.now();
}

init();
animate();
