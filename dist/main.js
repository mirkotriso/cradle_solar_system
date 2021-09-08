/**
 * Main script to visualise planet and asteroids in the Solar System using THREE.js and WebGL.
 * 
 * Author: Mirko Trisolini
 * 
 */

// asteroid data paths
asteroidAssets = [{key: 'Amors', url: 'amors.json'}, {key: 'Atens', url: 'atens.json'}, {key: 'Apollos', url: 'apollos.json'},
    {key: 'Inner Belt', url: 'inner_belt.json'}, {key: 'Main Belt', url: 'main_belt.json'}, {key: 'Outer Belt', url: 'outer_belt.json'},
    {key: 'Mars Crossing', url: 'mars_crossing.json'}, {key: 'NEOs', url: 'neos.json'}, {key: 'Trojans', url: 'trojans.json'}];


/**
 * Fetch all asteroid data files into an object
 * @param {*} items 
 * @returns 
 */
const fetchExternalData = items => {
    return Promise.all(
      items.map(item =>
        fetch(`./assets/${item.url}`)
      )
    )
    .then(
      responses => Promise.all(
        responses.map(response => response.json())
      )
    )
    // use `Array.reduce` to map your responses to appropriate keys
    .then(results =>
      results.reduce((acc, result, idx) => {
        const key = items[idx].key;
        
        // use destructing assignment to add 
        // a new key/value pair to the final object
        return {
          ...acc,
          [key]: result['data']
        };
      }, {})
    );
  };
 

// EVERYTHING STARTS HERE
fetchExternalData(asteroidAssets).then(asteroidData => {

/**
 * USEFUL CONSTANTS
 */
DEG2RAD = Math.PI / 180;
RAD2DEG = 180 / Math.PI;

/** 
 * INITIALISE TIME OF THE SIMULATION AND CLOCK
 */ 
var clock = new THREE.Clock();
const JD0 = 20001;  // starting Julian date of the simulation
var jd = JD0;  // julian data --> used as the time pf the simulation
const JDPS = 40;  // julian years per second of simulation. Standard for the simulation

/**
 * VISUALISATION SETTINGS
 */
const sunSize = 2;
const planetSize = 0.1;
const orbitScale = 2;
const showTextures = false;
const bkgrndMaxRadius = 300

/**
 * GLOBAL VARIABLES
 */
var controls, scene, camera, renderer, pointLight;
var planetSegments = 24;  // segments use in the rendering of a sphere
// initialise variables for the planets and asteroids
var sun
var planet_list = [];
var asteroids_list = [];

/**
 * TEXTURES and COLORS
 */
backgroundTexPath = "./img/starmap_2020_8k_gal.jpg";

/**
 * PLANET EPHEMERIDES. https://ssd.jpl.nasa.gov/txt/aprx_pos_planets.pdf
 */
const mercuryEphem = {'a': 0.38709927, 'e': 0.20563593, 'i': 7.00497902, 'om': 48.33076593, 'w': 29.12703035, 'mlong': 252.25032350, 'epoch': 2451545.0};
const venusEphem = {'a': 0.72333566, 'e': 0.00677672, 'i': 3.39467605, 'om': 76.67984255, 'w': 54.92262463, 'mlong': 181.97909950, 'epoch': 2451545.0};
const earthEphem = {'a': 1.00000261, 'e': 0.01671123, 'i': -0.00001531, 'om': 0.0, 'w': 102.93768193, 'mlong': 100.46457166, 'epoch': 2451545.0};
const marsEphem = {'a': 1.52371034, 'e': 0.09339410, 'i': 1.84969142, 'om': 49.55953891, 'w': 286.4968315, 'n': 0.5240613, 'mlong': 355.44656795, 'epoch': 2451545.0};
const jupiterEphem = {'a': 5.20288700, 'e': 0.04838624, 'i': 1.30439695, 'om': 100.47390909, 'w': 274.25457073, 'mlong': 34.39644051, 'epoch': 2451545.0};
const saturnEphem = {'a': 9.53667594, 'e': 0.05386179, 'i': 2.48599187, 'om': 113.66242448, 'w': 338.93645383, 'mlong': 49.95424423, 'epoch': 2451545.0};
const uranusEphem = {'a': 19.18916464, 'e': 0.04725744, 'i': 0.77263783, 'om': 74.01692503, 'w': 96.93735127, 'mlong': 313.23810451, 'epoch': 2451545.0};
const neptuneEphem = {'a': 30.06992276, 'e': 0.00859048, 'i': 1.77004347, 'om': 131.78422574, 'w': 273.18053653, 'mlong': 304.87997031, 'epoch': 2451545.0};
const plutoEphem = {'a': 39.48211675, 'e': 0.24882730, 'i': 17.14001206, 'om': 110.30393684, 'w': 113.76497945, 'mlong': 238.92903833, 'epoch': 2451545.0};

planetsDefinitions = {'Mercury': {type: 'Planet', ephem: mercuryEphem, tex: "./img/mercury.jpg", color: 0x6e304b, seg: planetSegments, size: planetSize/1.5},
    'Venus': {type: 'Planet', ephem: venusEphem, tex: "./img/venus.jpg", color: 0xfcdf87, seg: planetSegments, size: planetSize/1.5},
    'Earth': {type: 'Planet', ephem: earthEphem, tex: "./img/earth.jpg", color: 0x007a79, seg: planetSegments, size: planetSize},
    'Mars': {type: 'Planet', ephem: marsEphem, tex: "./img/mars.jpg", color: 0xc33124, seg: planetSegments, size: planetSize},
    'Jupiter': {type: 'Planet', ephem: jupiterEphem, tex: "./img/jupiter.jpg", color: 0xbc6d4c, seg: planetSegments, size: planetSize*4},
    'Saturn': {type: 'Planet', ephem: saturnEphem, tex: "./img/saturn.jpg", color: 0xc7cedf, seg: planetSegments, size: planetSize*3},
    'Uranus': {type: 'Planet', ephem: uranusEphem, tex: "./img/uranus.jpg", color: 0xa1dffb, seg: planetSegments, size: planetSize*2},
    'Neptune': {type: 'Planet', ephem: neptuneEphem, tex: "./img/neptune.jpg", color: 0x1b96f3, seg: planetSegments, size: planetSize*2},
    'Pluto': {type: 'Planet', ephem: plutoEphem, tex: "./img/pluto.jpg", color: 0xf6eddc, seg: planetSegments, size: planetSize}}

/**
 * OBJECTS STORING PLANET DATA
 */
planetsData = []
for (const key in planetsDefinitions) {
    const item = planetsDefinitions[key];
    const pl = constructObjectData(key, item.type, item.ephem, item.tex, item.size, item.seg, item.color);
    planetsData.push(pl);
}

/**
 * CREATE THE GUI
 */

// gui options
var options = {
    jdps: JDPS,
    showOrbits: true,
    asteroidFamily: 'All',
    stop: function() {
        this.jdps = 0;
    },
    start: function() {
        this.jdps = JDPS;
    }
};

/**
 * EVENT LISTENERS FOR MAIN MENU BUTTONS
 */

document.getElementById("show-orbit").addEventListener("click", function() {
    if (options.showOrbits) {
        options.showOrbits = false;
    } else {
        options.showOrbits = true;
    }
})

document.getElementById("play").addEventListener("click", function() {
    options.jdps = JDPS;
})

document.getElementById("pause").addEventListener("click", function() {
    options.jdps = 0;
})

// asteroid family selector
document.getElementById("menu-bar").addEventListener("click",function(e) {
    options.asteroidFamily = e.target.innerText;
    label = e.target.innerText;
    if (label == 'All') { label = 'Solar System'}
    $("#infoBoxTitle").html(label.concat(" Asteroids"));

    tableData = null;
    for (var i=0; asteroids_list.length; i++) {
        if (asteroids_list[i].name == e.target.innerText) {
            tableData = asteroids_list[i].ephem;
            break;
        }
    }
    var tbl = document.getElementById('info-table');
    if (tbl.rows.length != 0) {
        $("#info-table").empty();
    } else if (e.target.innerText == 'All') {
        $("#info-table").html("");
    }
    console.log(tableData)
    constructTable(tableData, "#info-table");
});

// var gui = new dat.GUI();

// controls the motion of the objects
// var folder1 = gui.addFolder('Controls');
// folder1.add(options, 'jdps', 20, 200).name('Speed (days / s)').listen();
// folder1.add(options, 'start').name('Start');
// folder1.add(options, 'stop').name('Stop');
// folder1.open();
// constrols the visualisation
// var folder2 = gui.addFolder('Visualisation')
// folder2.add(options, 'showOrbits').name('Show orbits').onChange(function (value) {
//     if (value) {
//         options.showOrbits = true;
//     } else {
//         options.showOrbits = false;
//     }
// })
// folder2.add(options, 'asteroidFamily', Object.keys(asteroidData).concat(['All']) ).name('Select asteroid family');
// folder2.open();

/**
 * MAIN FUNCTIONS
 */

/**
 * UPDATE FUNCTION
 * @param {type} renderer
 * @param {type} scene
 * @param {type} camera
 * @param {type} controls
 * @returns {undefined}
 */
 function update(renderer, scene, camera, controls, options) {

    controls.update();

    // update the time
    delta = Math.min(0.05, clock.getDelta());
    jd = jd + delta * options.jdps;

    // move the planets
    planet_list.forEach(function (item) {
        item.move(jd);
      });

    // move asteroids
    // move the planets
    asteroids_list.forEach(function (item) {
        item.move(jd);
      });

    // control asteroid family to show
    asteroids_list.forEach(function (item) {
        if (options.asteroidFamily == 'All' && item.parent !== scene) {
            item.addToScene(scene);
        } else if ( item.name == options.asteroidFamily &&  item.parent !== scene ) {
            item.addToScene(scene);
        } else if ( item.name != options.asteroidFamily && options.asteroidFamily != 'All' && item.parent == scene ) {
            item.removeFromScene(scene);
        }
      });

    // control orbits drawing
    planet_list.forEach(function (item) {
        if (!options.showOrbits) {
            item.removeOrbit(scene);
        } else if (options.showOrbits && item.ellipse.parent !== scene) {
            item.drawOrbit(scene);
        }
      });

    renderer.render(scene, camera);
    requestAnimationFrame(function () {
        update(renderer, scene, camera, controls, options);
    });
}

/**
 * INITIALISER FUNCTION
 * @returns {THREE.Scene|scene}
 */
function init() {
    // Create the renderer that controls animation.
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor("#121212", 1);
    // Attach the renderer to the div element.
    document.getElementById('main-canvas').appendChild(renderer.domElement);
    // Create the scene that holds all of the visible objects.
    scene = new THREE.Scene();
    // Create the camera that allows us to view into the scene.
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.up.set(0, 0, 1);
    camera.position.set( 0, 20, 70 );
    // Create controls that allows a user to move the scene with a mouse.
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.minDistance = 0.2;
    controls.maxDistance = bkgrndMaxRadius - 10;
    controls.update();
    
    // BACKGROUND
    createBackground();
    
    // LIGHTING
    pointLight = getPointLight(3, 0xffffff);
    scene.add(pointLight);
    // Create light that is viewable from all directions.
    var ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    // SUN
    createSun();
    // CREATE PLANETS AT INITIALISATION
    planetsData.forEach(function (item) {
        planet = new Planet(item);
        planet.addToScene(scene);
        planet.drawSprite();
        planet.drawOrbit(scene);
        planet_list.push(planet);
      });

    // CREATE ASTEROIDS AT INITIALISATION
    for (const key in asteroidData) {
        ast = new AsteroidFamily(key, asteroidData[key]);
        // do not add NEOs at init as they are the sum of Apollos, Atens, and Amors.
        if (key != 'NEOs') {
            ast.addToScene(scene);
        }
        asteroids_list.push(ast);
    }

    window.addEventListener( 'resize', onWindowResize );

    // START ANIMATION
    update(renderer, scene, camera, controls, options);
}

/**
 * Resize window
 */
function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

/**
 * Asteroid family class
 * Used to create entire families of asteroids in one object
 */
class AsteroidFamily extends THREE.Points {
    constructor (name, data) {
        super();

        const positions = [];
        const colors = [];
        data.forEach(function (item, index) {
            const ephem = {'a': item.a, 'e': item.e, 'i': item.i, 'om': item.om, 'w': item.w,
                'mlong': item.mlong, 'ma': item.ma, 'n': item.n, 'epoch': item.epoch};
            // var pos = getEclipticPosition(ephem, JD0);
            const pos = kep2car(item.ma, ephem);
            positions.push(pos[0]*orbitScale, pos[1]*orbitScale, pos[2]*orbitScale);
            // colors.push(255, 255, 255);
            colors.push(1, 1, 1);
            })

        const geometry = new THREE.BufferGeometry();

        geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
        geometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
        geometry.computeBoundingSphere();
        const sprite = new THREE.TextureLoader().load( './img/asteroid_sprite.png' );
        // TODO: to change size and texture need to loop and create array of points
        // https://stackoverflow.com/questions/53786863/points-opacity-size-within-three-js
        const material = new THREE.PointsMaterial( { size: 0.15, map: sprite, vertexColors: true,
            blending: THREE.AdditiveBlending, transparent: true, alphaTest: 0.5} );

        this.geometry = geometry;
        this.material = material;
        this.name = name;
        this.ephem = data;
        this.sortParticles = true;

    }

    move(jd) {

        const positions = this.geometry.attributes.position.array;
        var j = 0;
        // update the position here
        this.ephem.forEach(function (item, index) {
            // const pos = getEclipticPosition(item, jd);
            const pos = getAsteroidPosition(item, jd);
            positions[j*3] = pos[0]*orbitScale;
            positions[j*3+1] = pos[1]*orbitScale;
            positions[j*3+2] = pos[2]*orbitScale;
            j += 1;
        });
        // allow the position to be updated
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.computeBoundingSphere();
    }

    addToScene(scene) {
        scene.add(this);
    }

    removeFromScene(scene) {
        var selectedObject = scene.getObjectByName(this.name);
        scene.remove( selectedObject );       
    }

}

/**
 * MAIN CLASS FOR OBJECT DEFINITION AND MOTION
 */
class Planet extends THREE.Object3D {

    /**
     * 
     * @param {*} objData object data obtained from constructObjectData
     */
    constructor (objData) {
        super();

        this.data = objData;

        var objMaterial;
        // get object material
        if (showTextures) {
            objMaterial = getMaterial(objData.color, objData.texture);
        } else {
            objMaterial = getMaterial(objData.color, null);
        }
        // objMaterial.receiveShadow = true;
        // objMaterial.castShadow = true;

        this.material = objMaterial;
        // create a planet
        var geometry = getSphere(objMaterial, objData.size, objData.segments);
        // geometry.receiveShadow = true;
        geometry.name = objData.name;
        // set the planet's initial position
        // var pos = getEclipticPosition(objData.ephem, JD0);
        var pos = getAsteroidPosition(this.data.ephem, JD0);
        geometry.position.set(pos[0] * orbitScale, pos[1] * orbitScale, pos[2] * orbitScale);

        this.geometry = geometry;
        this.ellipse = createEllipse(objData, orbitScale)
    }

    move (jd) {
        var pos = getAsteroidPosition(this.data.ephem, jd);
        // var pos = getEclipticPosition(this.data.ephem, jd);
        this.geometry.position.x = pos[0] * orbitScale;
        this.geometry.position.y = pos[1] * orbitScale;
        this.geometry.position.z = pos[2] * orbitScale;
    }

    addToScene(scene) {
        this.geometry.name = this.data.name;
        scene.add(this.geometry);
    }

    removeFromScene(scene) {
        var selectedObject = scene.getObjectByName(this.geometry.name);
        scene.remove( selectedObject );       
    }

    removeOrbit(scene) {
        var selectedObject = scene.getObjectByName(this.ellipse.name);
        scene.remove( selectedObject );
    }

    drawOrbit(scene) {
        this.ellipse.name = 'ellipse';
        scene.add(this.ellipse);
    }

    drawSprite() {
        addSprite(this.geometry, this.data.size * 8, this.data.color, 0.85);
    }
}

/**
 * From Meeus Astronomical Algorithms
 * @param {*} ephem 
 * @param {*} jd 
 * @returns 
 */
 function getAsteroidPosition(ephem, jd) {
    dj = jd - ephem.epoch;
    // compute mean motion if not present (in deg / day)
    if (!ephem.hasOwnProperty('n')) {
        n = 1 / Math.sqrt(ephem.a**3);
    } else {
        n = ephem.n;
    }

    if (ephem.hasOwnProperty('ma')) {
        M0 = ephem.ma;
    } else if (ephem.hasOwnProperty('mlong')) {
        M0 = ephem.mlong - ephem.w - ephem.om;
    } else{
        throw 'Mean anomaly or mean longitude must be defined!';
    }
    // compute mean anomaly after time dj
    M = M0 + n * dj;
    // adjust the mean anomaly to be within 0 - 360
    M = M % 360;

    return kep2car(M, ephem);
}

/**
 * From Meeus, Astronomical Algorithms
 * @param {} M 
 * @param {*} ephem 
 * @returns 
 */
function kep2car (M, ephem) {

    Mrad = M * DEG2RAD;
    wrad = ephem.w * DEG2RAD;
    omrad = ephem.om * DEG2RAD;
    irad = ephem.i * DEG2RAD;

    const secl = 0.397777156;
    const cecl = 0.917482062;
    com = Math.cos(omrad);
    som = Math.sin(omrad);
    cinc = Math.cos(irad);
    sinc = Math.sin(irad);

    F = com;
    G = som * cecl;
    H = som * secl;
    P = -som * cinc;
    Q = com * cinc * cecl - sinc * secl;
    R = com * cinc * secl + sinc * cecl;

    A = Math.atan2(F, P);
    B = Math.atan2(G, Q);
    C = Math.atan2(H, R);
    a = Math.sqrt(F**2 + P**2);
    b = Math.sqrt(G**2 + Q**2);
    c = Math.sqrt(H**2 + R**2);

    xx = (Math.cos(Mrad) - ephem.e);
    yy = Math.sin(Mrad);
    E = Math.atan(yy / xx);
    if (xx < 0){
        if (yy < 0) {
            E = E - Math.PI;
        } else {
            E = E + Math.PI;
        }
    }
    nu = 2 * Math.atan( Math.sqrt( (1 + ephem.e) / (1 - ephem.e) ) * Math.tan(E / 2) );
    r = ephem.a * (1 - ephem.e**2) / (1 + ephem.e * Math.cos(nu))

    xeq = r * a * Math.sin(A + wrad + nu);
    yeq = r * b * Math.sin(B + wrad + nu);
    zeq = r * c * Math.sin(C + wrad + nu);

    yecl = yeq * cecl + zeq * secl;
    zecl = -yeq * secl + zeq * cecl;

    return [xeq, yecl, zecl]
}

/**
 * CREATE THE BACKGROUND OF THE SCENE
 * uses the Tycho star catalogue
 * the background is crated as a large sphere
 * TODO: need to slow down the zoom out to avoid getting out of the sphere
 */
function createBackground() {

  //Space background is a large sphere
  var backgroundSphere = new THREE.Mesh(
    new THREE.SphereBufferGeometry(bkgrndMaxRadius, 32, 32),
    new THREE.MeshBasicMaterial({
        map: (new THREE.TextureLoader).load( backgroundTexPath ),
        side: THREE.DoubleSide
    }));
    // add the background to the scene
    scene.add(backgroundSphere)
}

/**
 * Create the sun as overlap of sprites
 */
function createSun() {
    // Create the sun.
    var sunMaterial = getMaterial(0xfffff, null);
    sun = getSphere(sunMaterial, sunSize/1000, 12);
    scene.add(sun);

    addSprite(sun, sunSize/2, 0xe8a628, 0.75);
    addSprite(sun, sunSize, 0xf9de59, 0.4);
}

/**
 * USEFUL FUNCTIONS
 */

/**
 * This eliminates the redundance of having to type property names for a planet object.
 * @param {type} obj_name string
 * @param {type} obj_type string
 * @param {type} obj_ephem object
 * @param {type} viz_texture
 * @param {type} viz_size decimal
 * @param {type} viz_segments integer
 * @param {type} viz_color hex
 * @returns {constructObjectData.mainAnonym$0}
 */
 function constructObjectData(obj_name, obj_type, obj_ephem, viz_texture, viz_size, viz_segments, viz_color) {
    // return an object
    return {name: obj_name, type: obj_type, ephem: obj_ephem,
            tex: viz_texture, size: viz_size, segments: viz_segments, color: viz_color
    };
}

/**
 * Simplifies the creation of a sphere.
 * @param {type} material THREE.SOME_TYPE_OF_CONSTRUCTED_MATERIAL
 * @param {type} size decimal
 * @param {type} segments integer
 * @returns {getSphere.obj|THREE.Mesh}
 */
 function getSphere(material, size, segments) {
    var geometry = new THREE.SphereGeometry(size, segments, segments);
    var obj = new THREE.Mesh(geometry, material);
    obj.castShadow = true;
    return obj;
}

/**
 * Simplifies the creation of materials used for visible objects.
 * @param {type} type
 * @param {type} color
 * @param {type} myTexture
 * @returns {THREE.MeshStandardMaterial|THREE.MeshLambertMaterial|THREE.MeshPhongMaterial|THREE.MeshBasicMaterial}
 */
 function getMaterial(color, tex) {

    let currentTexture;
    // load texture image if passed
    if (tex && tex !== "") {
        currentTexture = new THREE.TextureLoader().load( tex );
    }

    var materialOptions = {
        color: color === undefined ? 'rgb(255, 255, 255)' : color,
        map: currentTexture === undefined ? null : currentTexture
    };

    return new THREE.MeshStandardMaterial(materialOptions);
}

/**
 * Simplifies creating a light that disperses in all directions.
 * @param {type} intensity decimal
 * @param {type} color HTML color
 * @returns {THREE.PointLight|getPointLight.light}
 */
 function getPointLight(intensity, color) {
    var light = new THREE.PointLight(color, intensity);
    light.castShadow = true;

    light.shadow.bias = 0.001;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;

    return light;
}

/**
 * Create a tube to visualise the orbits
 * @param {*} objData 
 * @param {*} scale 
 */
 function createEllipse(objData, scale) {

    class OrbitCurve extends THREE.Curve {

        constructor( obj, scale ) {
    
            super();
    
            this.obj = obj;
            this.scale = scale;
    
        }
    
        getPoint( t, optionalTarget=new THREE.Vector3() ) {

            const ma = t * 360;
            var pos = kep2car(ma, this.obj.ephem);
            const tx = pos[0] * this.scale;
            const ty = pos[1] * this.scale;
            const tz = pos[2] * this.scale;
    
            return optionalTarget.set( tx, ty, tz );
    
        }
    
    }
    
    const path = new OrbitCurve(objData, scale);
    const geometry = new THREE.TubeGeometry( path, 360, 0.015, 6, false );
    const material = new THREE.MeshBasicMaterial( { color: objData.color } );
    const mesh = new THREE.Mesh( geometry, material );

    return mesh
}

/**
 * Add sprite to the planet
 * @param {*} obj 
 * @param {*} size 
 * @param {*} color 
 */
function addSprite(obj, size, color, opacity) {
    // Create the glow of the sun.
    var spriteMaterial = new THREE.SpriteMaterial(
        {
            map: new THREE.TextureLoader().load("./img/glow.png")
            , color: color
            , transparent: false
            , blending: THREE.AdditiveBlending
            , opacity: opacity
        });
    var sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(size, size, 1.0);

    obj.add(sprite);
}

// from THREE.js examples
function generateSprite() {

    var canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;

    var context = canvas.getContext('2d');
    var gradient = context.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(0,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(0,0,64,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,1)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;

}

function constructTable(list, selector) {
              
    // Getting the all column names
    var cols = Headers(list, selector);  

    // Traversing the JSON data
    // for (var i = 0; i < list.length; i++) {
    for (var i = 0; i < 10; i++) {
        var row = $('<tr/>');   
        for (var colIndex = 0; colIndex < cols.length; colIndex++)
        {
            // add only selected columns
            if (['a', 'e', 'i'].includes(cols[colIndex])) {
            var val = list[i][cols[colIndex]];
              
            // If there is any key, which is matching
            // with the column name
            if (val == null) val = "";  
                row.append($('<td/>').html(val));
            }
        }
          
        // Adding each row to the table
        $(selector).append(row);
    }
}
  
function Headers(list, selector) {
    var columns = [];
    var header = $('<tr/>');
      
    for (var i = 0; i < list.length; i++) {
        var row = list[i];
          
        for (var k in row) {
            if ($.inArray(k, columns) == -1) {
                if (['a', 'e', 'i'].includes(k)) {
                columns.push(k);
                // Creating the header
                header.append($('<th/>').html(k));
                }
            }
        }
    }
      
    // Appending the header to the table
    $(selector).append(header);
        return columns;
}

// Start everything.
init();

})
.catch(console.error);