
function UNet() {

    // /////////////////////////////////////////////////////////////////////////////
    //                     ///////    Helper Functions    ///////
    // /////////////////////////////////////////////////////////////////////////////

    let nWise = (n, array) => {
      iterators = Array(n).fill().map(() => array[Symbol.iterator]());
      iterators.forEach((it, index) => Array(index).fill().forEach(() => it.next()));
      return Array(array.length - n + 1).fill().map(() => (iterators.map(it => it.next().value)));
    };

    let pairWise = (array) => nWise(2, array);

    let sum = (arr) => arr.reduce((a,b)=>a+b);

    let rand = (min, max) => Math.random() * (max - min) + min;

    Array.prototype.last = function() { return this[this.length - 1]; };


    // /////////////////////////////////////////////////////////////////////////////
    //                       ///////    Variables    ///////
    // /////////////////////////////////////////////////////////////////////////////

    var w = window.innerWidth;
    var h = window.innerHeight;

    var clr_vol = '#eeeeee';
    var clr_conv = '#99ddff';
    var clr_upconv = '#ffbbbb';
    var clr_pool = '#ffbbbb';
    var clr_conn = '#ffbbbb';

    var line_material = new THREE.LineBasicMaterial( { 'color':0x000000 } );
    var vol_material = new THREE.MeshBasicMaterial( {'color':clr_vol, 'side':THREE.DoubleSide, 'transparent':true, 'opacity':1, 'depthWrite':false, 'needsUpdate':true} );

    var architecture = [];
    var architecture2 = [];
    var betweenLayers = 20;

    var logDepth = true;
    var depthScale = 10;
    var logWidth = true;
    var widthScale = 10;

    var showDims = false;

    let depthFn = (depth) => logDepth ? (Math.log(depth) * depthScale) : (depth * depthScale);
    let widthFn = (width) => logWidth ? (Math.log(width) * widthScale) : (width * widthScale);

    function wh(layer) { return widthFn(layer['widthAndHeight']); }

    var layers = new THREE.Group();
    var sprites = new THREE.Group();


    var scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xffffff );

    // var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 100000 );
    var camera = new THREE.OrthographicCamera( w / - 2, w / 2, h / 2, h / - 2, -10000000, 10000000 );
    camera.position.set(-219, 92, 84);

    var renderer;
    var rendererType = 'webgl';

    var controls;


    // /////////////////////////////////////////////////////////////////////////////
    //                       ///////    Draw Graph    ///////
    // /////////////////////////////////////////////////////////////////////////////

    function restartRenderer({rendererType_=rendererType}={}) {

        rendererType = rendererType_;

        clearThree(scene);

        if (rendererType === 'webgl') { renderer = new THREE.WebGLRenderer( { 'alpha':true } ); }
        else if (rendererType === 'svg') { renderer = new THREE.SVGRenderer(); }

        renderer.setPixelRatio(window.devicePixelRatio || 1);
        renderer.setSize( window.innerWidth, window.innerHeight );

        graph_container = document.getElementById('graph-container')
        while (graph_container.firstChild) { graph_container.removeChild(graph_container.firstChild); }
        graph_container.appendChild( renderer.domElement );

        if (controls) { controls.dispose(); }
        controls = new THREE.OrbitControls( camera, renderer.domElement );

        animate();

    }

    function animate() {
        requestAnimationFrame( animate );
        renderer.render(scene, camera);
    };

    restartRenderer();

    function redraw({architecture_=architecture,
                     architecture2_=architecture2,
                     betweenLayers_=betweenLayers,
                     logDepth_=logDepth,
                     depthScale_=depthScale,
                     logWidth_=logWidth,
                     widthScale_=widthScale,
                     showDims_=showDims}={}) {

        architecture = architecture_;
        architecture2 = architecture2_;
        betweenLayers = betweenLayers_;
        logDepth = logDepth_;
        depthScale = depthScale_;
        logWidth = logWidth_;
        widthScale = widthScale_;
        showDims = showDims_;

        clearThree(scene);

        z_offset = -(sum(architecture.map(layer => depthFn(layer['depth']))) + (betweenLayers * (architecture.length - 1))) / 3;
        layer_offsets = pairWise(architecture).reduce((offsets, layers) => offsets.concat([offsets.last() + depthFn(layers[0]['depth'])/2 + betweenLayers + depthFn(layers[1]['depth'])/2]), [z_offset]);
        layer_offsets = layer_offsets.concat(architecture2.reduce((offsets, layer) => offsets.concat([offsets.last() + widthFn(2) + betweenLayers]), [layer_offsets.last() + depthFn(architecture.last()['depth'])/2 + betweenLayers + widthFn(2)]));

        architecture.forEach( function( layer, index ) {

            // Layer
            layer_geometry = new THREE.BoxGeometry( wh(layer), wh(layer), depthFn(layer['depth']) );
            layer_object = new THREE.Mesh( layer_geometry, vol_material );
            layer_object.position.set(0, 0, layer_offsets[index]);
            layers.add( layer_object );

            layer_edges_geometry = new THREE.EdgesGeometry( layer_geometry );
            layer_edges_object = new THREE.LineSegments( layer_edges_geometry, line_material );
            layer_edges_object.position.set(0, 0, layer_offsets[index]);
            layers.add( layer_edges_object );

            if (showDims) {

                // Dims
                sprite = makeTextSprite(layer['depth'].toString());
                sprite.position.copy( layer_object.position ).sub( new THREE.Vector3( wh(layer)/2 + 2, wh(layer)/2 + 2, 0 ) );
                sprites.add( sprite );

                sprite = makeTextSprite(layer['widthAndHeight'].toString());
                sprite.position.copy( layer_object.position ).sub( new THREE.Vector3( wh(layer)/2 + 3, 0, depthFn(layer['depth'])/2 + 3 ) );
                sprites.add( sprite );

                sprite = makeTextSprite(layer['widthAndHeight'].toString());
                sprite.position.copy( layer_object.position ).sub( new THREE.Vector3( 0, -wh(layer)/2 - 3, depthFn(layer['depth'])/2 + 3 ) );
                sprites.add( sprite );

            }

        });

        architecture2.forEach( function( layer, index ) {

            // Dense
            layer_geometry = new THREE.BoxGeometry( widthFn(2), depthFn(layer), widthFn(2) );
            layer_object = new THREE.Mesh( layer_geometry, vol_material );
            layer_object.position.set(0, 0, layer_offsets[architecture.length + index]);
            layers.add( layer_object );

            layer_edges_geometry = new THREE.EdgesGeometry( layer_geometry );
            layer_edges_object = new THREE.LineSegments( layer_edges_geometry, line_material );
            layer_edges_object.position.set(0, 0, layer_offsets[architecture.length + index]);
            layers.add( layer_edges_object );

            direction = new THREE.Vector3( 0, 0, 1 );
            origin = new THREE.Vector3( 0, 0, layer_offsets[architecture.length + index] - betweenLayers - widthFn(2)/2 + 1 );
            length = betweenLayers - 2;
            headLength = betweenLayers/3;
            headWidth = 5;
            arrow = new THREE.ArrowHelper( direction, origin, length, 0x000000, headLength, headWidth );
            pyramids.add( arrow );

            if (showDims) {

                // Dims
                sprite = makeTextSprite(layer.toString());
                sprite.position.copy( layer_object.position ).sub( new THREE.Vector3( 3, depthFn(layer)/2 + 3, 3 ) );
                sprites.add( sprite );

            }


        });

        scene.add( layers );
        scene.add( sprites );

    }

    function clearThree(obj) {

        while(obj.children.length > 0) {
            clearThree( obj.children[0] )
            obj.remove( obj.children[0] );
        }

        if ( obj.geometry ) { obj.geometry.dispose(); }
        if ( obj.material ) { obj.material.dispose(); }
        if ( obj.texture ) { obj.texture.dispose(); }
    }


    function makeTextSprite(message, opts) {
        var parameters = opts || {};
        var fontface = parameters.fontface || 'Helvetica';
        var fontsize = parameters.fontsize || 120;
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        context.font = fontsize + "px " + fontface;

        // get size data (height depends only on font size)
        var metrics = context.measureText(message);
        var textWidth = metrics.width;

        // text color
        context.fillStyle = 'rgba(0, 0, 0, 1.0)';
        context.fillText(message, 0, fontsize);

        // canvas contents will be used for a texture
        var texture = new THREE.Texture(canvas)
        texture.minFilter = THREE.LinearFilter;
        texture.needsUpdate = true;

        var spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        var sprite = new THREE.Sprite( spriteMaterial );
        sprite.scale.set( 10, 5, 1.0 );
        sprite.center.set( 0,1 );
        return sprite;
    }
    function style({clr_vol_=clr_vol,
                    clr_conv_=clr_conv,
                    clr_upconv_=clr_upconv,
                    clr_pool_=clr_pool,
                    clr_conn_=clr_conn}={}) {
        clr_vol        = clr_vol_;
        clr_conv        = clr_conv_;
        clr_upconv        = clr_upconv_;
        clr_pool        = clr_pool_;
        clr_conn        = clr_conn_;

        vol_material.color = new THREE.Color(clr_vol);
    }

    // /////////////////////////////////////////////////////////////////////////////
    //                  ///////    Window Resize    ///////
    // /////////////////////////////////////////////////////////////////////////////

    function onWindowResize() {

        renderer.setSize(window.innerWidth, window.innerHeight);

        camFactor = window.devicePixelRatio || 1;
        camera.left = -window.innerWidth / camFactor;
        camera.right = window.innerWidth / camFactor;
        camera.top = window.innerHeight / camFactor;
        camera.bottom = -window.innerHeight / camFactor;
        camera.updateProjectionMatrix();

    }

    window.addEventListener('resize', onWindowResize, false);


    /////////////////////////////////////////////////////////////////////////////
                          ///////    Return    ///////
    /////////////////////////////////////////////////////////////////////////////

    return {
        'redraw'           : redraw,
        'restartRenderer'  : restartRenderer,
        'style'            : style,

    }

}
